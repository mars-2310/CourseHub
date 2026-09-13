import prisma from "../lib/prisma";
import { badRequest, notFound, unprocessable } from "../utils/errors";
import { deepestFirst, isDescendantOf, subtreeIds } from "../utils/tree";
import * as coursesService from "./course.service";
import type { ContentNode, User } from "../lib/generated/prisma/client";
import type { CreateNodeInput, UpdateNodeInput } from "../types/node.schema";

/** What the requester is allowed to see of a course tree. */
export type TreeAccess = "manage" | "enrolled" | "preview";

/**
 * A manager sees everything. An enrolled student sees everything. Anyone else
 * looking at a published course gets the curriculum outline only -- titles and
 * structure, no content URLs. Gating this server-side is the whole point:
 * hiding a video URL in the frontend hides nothing.
 */
export async function resolveTreeAccess(
  user: User | undefined,
  courseId: string,
): Promise<{ access: TreeAccess; course: Awaited<ReturnType<typeof coursesService.loadCourse>> }> {
  const course = await coursesService.loadCourse(courseId);

  if (coursesService.canManage(user, course)) return { access: "manage", course };
  if (!course.published) throw notFound("Course not found.");

  if (user) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId: course.id } },
    });
    if (enrollment) return { access: "enrolled", course };
  }
  return { access: "preview", course };
}

async function loadNode(nodeId: string): Promise<ContentNode> {
  const node = await prisma.contentNode.findUnique({ where: { id: nodeId } });
  if (!node) throw notFound("Content node not found.");
  return node;
}

/** Loads a node and asserts the caller manages its course. */
export async function loadManagedNode(user: User, nodeId: string): Promise<ContentNode> {
  const node = await loadNode(nodeId);
  const course = await coursesService.loadCourse(node.courseId);
  coursesService.assertCanManage(user, course);
  return node;
}

/**
 * Validates a prospective parent: it must exist, sit in the same course, and be
 * a FOLDER. Restricting parenthood to folders keeps ordering and deletion
 * coherent -- a video that secretly owns children is a tree nobody can reason about.
 */
async function assertValidParent(courseId: string, parentId: string): Promise<void> {
  const parent = await prisma.contentNode.findUnique({ where: { id: parentId } });
  if (!parent) throw unprocessable("Parent node does not exist.");
  if (parent.courseId !== courseId) {
    throw unprocessable("Parent node belongs to a different course.");
  }
  if (parent.type !== "FOLDER") {
    throw unprocessable("Only FOLDER nodes can contain other nodes.");
  }
}

/** Next free sibling slot, so a new node lands at the end of its level. */
async function nextOrder(courseId: string, parentId: string | null): Promise<number> {
  const last = await prisma.contentNode.findFirst({
    where: { courseId, parentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last ? last.order + 1 : 0;
}

export async function createNode(
  user: User,
  courseId: string,
  input: CreateNodeInput,
): Promise<ContentNode> {
  const course = await coursesService.loadCourse(courseId);
  coursesService.assertCanManage(user, course);

  const parentId = input.parentId ?? null;
  if (parentId) await assertValidParent(course.id, parentId);

  const { type, title } = input;
  return prisma.contentNode.create({
    data: {
      courseId: course.id,
      parentId,
      type,
      title,
      order: await nextOrder(course.id, parentId),
      videoUrl: "videoUrl" in input ? input.videoUrl : null,
      pdfUrl: "pdfUrl" in input ? input.pdfUrl : null,
      text: "text" in input ? (input.text ?? null) : null,
      link: "link" in input ? input.link : null,
      duration: "duration" in input ? (input.duration ?? null) : null,
    },
  });
}

export async function getNodeForViewer(
  user: User | undefined,
  nodeId: string,
): Promise<{ node: ContentNode; access: TreeAccess }> {
  const node = await loadNode(nodeId);
  const { access } = await resolveTreeAccess(user, node.courseId);
  return { node, access };
}

export async function listCourseNodes(courseId: string): Promise<ContentNode[]> {
  return prisma.contentNode.findMany({ where: { courseId }, orderBy: { order: "asc" } });
}

/**
 * Edits, moves and reorders a node.
 *
 * A move must not make a node its own ancestor: turning C into the parent of A
 * when A already contains C would detach that whole branch from the course and
 * make it unreachable. The check walks the prospective parent's ancestry before
 * anything is written.
 *
 * Moving or reordering renumbers the affected sibling sets inside a transaction,
 * so orders stay dense and no two siblings share a slot.
 */
export async function updateNode(
  user: User,
  nodeId: string,
  input: UpdateNodeInput,
): Promise<ContentNode> {
  const node = await loadManagedNode(user, nodeId);

  assertPayloadMatchesType(node, input);

  const movingParent = input.parentId !== undefined;
  const targetParentId = movingParent ? (input.parentId ?? null) : node.parentId;

  if (movingParent && targetParentId !== node.parentId && targetParentId !== null) {
    if (targetParentId === node.id) throw unprocessable("A node cannot be its own parent.");

    await assertValidParent(node.courseId, targetParentId);

    const rows = await prisma.contentNode.findMany({
      where: { courseId: node.courseId },
      select: { id: true, parentId: true },
    });
    if (isDescendantOf(rows, targetParentId, node.id)) {
      throw unprocessable("Cannot move a node into one of its own descendants.");
    }
  }

  const { parentId: _p, order: requestedOrder, ...fields } = input;

  return prisma.$transaction(async tx => {
    const siblings = await tx.contentNode.findMany({
      where: { courseId: node.courseId, parentId: targetParentId, id: { not: node.id } },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const position =
      requestedOrder === undefined
        ? Math.min(node.parentId === targetParentId ? node.order : siblings.length, siblings.length)
        : Math.min(requestedOrder, siblings.length);

    const ordered = [...siblings];
    ordered.splice(position, 0, { id: node.id });

    for (const [index, sibling] of ordered.entries()) {
      await tx.contentNode.update({
        where: { id: sibling.id },
        data:
          sibling.id === node.id
            ? { ...fields, parentId: targetParentId, order: index }
            : { order: index },
      });
    }

    return tx.contentNode.findUniqueOrThrow({ where: { id: node.id } });
  });
}

/** Rejects payload fields that do not belong to the node's own type. */
function assertPayloadMatchesType(node: ContentNode, input: UpdateNodeInput): void {
  const allowed: Record<string, readonly string[]> = {
    FOLDER: [],
    VIDEO: ["videoUrl", "duration"],
    PDF: ["pdfUrl"],
    TEXT: ["text"],
    LINK: ["link"],
    QUIZ: ["text"],
    ASSIGNMENT: ["text"],
  };
  const payloadKeys = ["videoUrl", "pdfUrl", "text", "link", "duration"] as const;
  const permitted = allowed[node.type] ?? [];

  for (const key of payloadKeys) {
    if (input[key] !== undefined && !permitted.includes(key)) {
      throw badRequest(`${key} is not a valid field for a ${node.type} node.`);
    }
  }
}

/**
 * Deletes a node and its entire subtree, then closes the gap in its sibling order.
 *
 * Progress rows go first, then nodes deepest-first so the parent foreign key
 * holds at every intermediate step. One transaction, because a half-deleted
 * subtree is unreachable but still counted.
 */
export async function deleteNode(user: User, nodeId: string): Promise<{ deleted: number }> {
  const node = await loadManagedNode(user, nodeId);

  const rows = await prisma.contentNode.findMany({
    where: { courseId: node.courseId },
    select: { id: true, parentId: true },
  });
  const doomed = subtreeIds(rows, node.id);
  const doomedRows = rows.filter(r => doomed.includes(r.id));

  await prisma.$transaction(async tx => {
    await tx.progress.deleteMany({ where: { nodeId: { in: doomed } } });
    for (const row of deepestFirst(doomedRows)) {
      await tx.contentNode.delete({ where: { id: row.id } });
    }

    const siblings = await tx.contentNode.findMany({
      where: { courseId: node.courseId, parentId: node.parentId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    for (const [index, sibling] of siblings.entries()) {
      await tx.contentNode.update({ where: { id: sibling.id }, data: { order: index } });
    }
  });

  return { deleted: doomed.length };
}

export function assertTrackable(node: ContentNode): void {
  if (node.type === "FOLDER") {
    throw unprocessable("Folders are containers, not learning content.");
  }
}

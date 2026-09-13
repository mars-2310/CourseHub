import prisma from "../lib/prisma";
import { forbidden, notFound, unprocessable } from "../utils/errors";
import { deepestFirst } from "../utils/tree";
import type { Course, Organisation, User } from "../lib/generated/prisma/client";
import type {
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from "../types/course.schema";

type CourseWithOrg = Course & { organisation: Organisation };

/**
 * Loads a course together with its owning organisation, which every
 * authorization decision needs.
 */
export async function loadCourse(courseId: string): Promise<CourseWithOrg> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { organisation: true },
  });
  if (!course) throw notFound("Course not found.");
  return course;
}

/** Owner of the course's organisation, or a platform ADMIN. */
export function assertCanManage(user: User, course: CourseWithOrg): void {
  if (course.organisation.ownerId === user.id) return;
  if (user.role === "ADMIN") return;
  throw forbidden("You do not manage this course.");
}

export function canManage(user: User | undefined, course: CourseWithOrg): boolean {
  if (!user) return false;
  return course.organisation.ownerId === user.id || user.role === "ADMIN";
}

/**
 * Creates a course inside the caller's own academy.
 *
 * The organisation is derived from the authenticated user rather than read from
 * the request body, so a client cannot plant a course in someone else's academy.
 */
export async function createCourse(user: User, input: CreateCourseInput): Promise<CourseWithOrg> {
  const organisation = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
  if (!organisation) {
    throw unprocessable("Create an organisation before adding courses.");
  }

  const course = await prisma.course.create({
    data: {
      title: input.title,
      description: input.description,
      thumbnail: input.thumbnail,
      price: input.price,
      organisationId: organisation.id,
    },
  });
  return { ...course, organisation };
}

/** Public catalogue. Unpublished courses are never listed, for anyone. */
export async function listPublishedCourses(query: ListCoursesQuery) {
  const where = {
    published: true,
    ...(query.organizationId ? { organisationId: query.organizationId } : {}),
    ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: { organisation: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.course.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}

/** Courses in the caller's own academy, published or not. */
export async function listOwnedCourses(user: User) {
  const organisation = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
  if (!organisation) return [];
  return prisma.course.findMany({
    where: { organisationId: organisation.id },
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A published course is readable by anyone; an unpublished one only by whoever
 * manages it. Returning 404 rather than 403 avoids confirming that a draft exists.
 */
export async function getCourseForViewer(
  user: User | undefined,
  courseId: string,
): Promise<CourseWithOrg> {
  const course = await loadCourse(courseId);
  if (!course.published && !canManage(user, course)) throw notFound("Course not found.");
  return course;
}

export async function updateCourse(
  user: User,
  courseId: string,
  input: UpdateCourseInput,
): Promise<CourseWithOrg> {
  const course = await loadCourse(courseId);
  assertCanManage(user, course);

  const updated = await prisma.course.update({ where: { id: course.id }, data: input });
  return { ...updated, organisation: course.organisation };
}

export async function setPublished(
  user: User,
  courseId: string,
  published: boolean,
): Promise<CourseWithOrg> {
  const course = await loadCourse(courseId);
  assertCanManage(user, course);

  // Publishing an empty course would put a shell in the public catalogue.
  if (published) {
    const nodes = await prisma.contentNode.count({ where: { courseId: course.id } });
    if (nodes === 0) throw unprocessable("Add content before publishing this course.");
  }

  const updated = await prisma.course.update({ where: { id: course.id }, data: { published } });
  return { ...updated, organisation: course.organisation };
}

/**
 * Deletes a course and everything hanging off it.
 *
 * Progress and enrollments go first, then content nodes deepest-first so the
 * self-referencing parent foreign key stays satisfied at every step. All of it
 * runs in one transaction: a partial delete would strand orphan rows.
 */
export async function deleteCourse(user: User, courseId: string): Promise<void> {
  const course = await loadCourse(courseId);
  assertCanManage(user, course);

  const nodes = await prisma.contentNode.findMany({
    where: { courseId: course.id },
    select: { id: true, parentId: true },
  });

  await prisma.$transaction(async tx => {
    const nodeIds = nodes.map(n => n.id);
    if (nodeIds.length) {
      await tx.progress.deleteMany({ where: { nodeId: { in: nodeIds } } });
      for (const node of deepestFirst(nodes)) {
        await tx.contentNode.delete({ where: { id: node.id } });
      }
    }
    await tx.enrollment.deleteMany({ where: { courseId: course.id } });
    await tx.course.delete({ where: { id: course.id } });
  });
}

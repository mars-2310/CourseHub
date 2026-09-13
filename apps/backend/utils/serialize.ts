import type { User } from "../lib/generated/prisma/client";

/**
 * Response shaping.
 *
 * Prisma rows are never returned directly: internal columns stay internal, and
 * `Decimal` money values are rendered as fixed-precision strings so no precision
 * is lost to JSON's float serialization.
 */
export const toUserDTO = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const toMoney = (value: { toFixed(dp: number): string } | null | undefined): string | null =>
  value == null ? null : value.toFixed(2);

export const toOrganisationDTO = (org: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  description: org.description,
  logo: org.logo,
  ownerId: org.ownerId,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,
});

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  price: { toFixed(dp: number): string };
  published: boolean;
  organisationId: string;
  createdAt: Date;
  updatedAt: Date;
  organisation?: { id: string; name: string; slug: string; logo: string | null };
}

export const toCourseDTO = (course: CourseRow) => ({
  id: course.id,
  title: course.title,
  description: course.description,
  thumbnail: course.thumbnail,
  price: toMoney(course.price),
  published: course.published,
  organisationId: course.organisationId,
  ...(course.organisation
    ? {
        organisation: {
          id: course.organisation.id,
          name: course.organisation.name,
          slug: course.organisation.slug,
          logo: course.organisation.logo,
        },
      }
    : {}),
  createdAt: course.createdAt,
  updatedAt: course.updatedAt,
});

interface NodeRow {
  id: string;
  title: string;
  type: string;
  order: number;
  parentId: string | null;
  courseId: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  text: string | null;
  link: string | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `preview` callers (not enrolled, not the owner) get the curriculum outline
 * without any content payload. The tree shape stays visible so a course page can
 * advertise what it teaches; the material itself does not leave the server.
 */
export const toNodeDTO = (node: NodeRow, access: "manage" | "enrolled" | "preview") => {
  const base = {
    id: node.id,
    title: node.title,
    type: node.type,
    order: node.order,
    parentId: node.parentId,
    courseId: node.courseId,
    duration: node.duration,
  };
  if (access === "preview") return { ...base, locked: true };
  return {
    ...base,
    locked: false,
    videoUrl: node.videoUrl,
    pdfUrl: node.pdfUrl,
    text: node.text,
    link: node.link,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

/** Nests serialized nodes, preserving sibling order. */
export const toTreeDTO = (
  nodes: NodeRow[],
  access: "manage" | "enrolled" | "preview",
): unknown[] => {
  const wrapped = new Map(
    nodes.map(n => [n.id, { ...toNodeDTO(n, access), children: [] as unknown[] }]),
  );
  const roots: { order: number; children: unknown[] }[] = [];

  for (const node of nodes) {
    const entry = wrapped.get(node.id)!;
    const parent = node.parentId ? wrapped.get(node.parentId) : undefined;
    if (parent) parent.children.push(entry);
    else roots.push(entry);
  }

  const sortRecursive = (list: { order: number; children: unknown[] }[]) => {
    list.sort((a, b) => a.order - b.order);
    for (const item of list) sortRecursive(item.children as typeof list);
  };
  sortRecursive(roots);
  return roots;
};

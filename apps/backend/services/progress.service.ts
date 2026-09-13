import prisma from "../lib/prisma";
import { notFound, unprocessable } from "../utils/errors";
import * as coursesService from "./course.service";
import * as enrollmentsService from "./enrollment.service";
import type { Progress, User } from "../lib/generated/prisma/client";

/**
 * Records or clears completion of a single node.
 *
 * Only enrolled students may track progress, and only on nodes that carry
 * learning content -- ticking off a folder would inflate the denominator with
 * something nobody actually studies.
 *
 * The write is an upsert keyed on the unique (studentId, nodeId) pair, which
 * makes repeat calls idempotent rather than a constraint violation.
 */
export async function setNodeCompletion(
  user: User,
  nodeId: string,
  completed: boolean,
): Promise<Progress> {
  const node = await prisma.contentNode.findUnique({ where: { id: nodeId } });
  if (!node) throw notFound("Content node not found.");

  if (node.type === "FOLDER") {
    throw unprocessable("Folders are containers, not learning content.");
  }

  const course = await coursesService.loadCourse(node.courseId);
  if (!course.published) throw notFound("Content node not found.");

  await enrollmentsService.assertEnrolled(user, node.courseId);

  return prisma.progress.upsert({
    where: { studentId_nodeId: { studentId: user.id, nodeId: node.id } },
    update: { completed, completedAt: completed ? new Date() : null },
    create: {
      studentId: user.id,
      nodeId: node.id,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
}

export interface CourseProgress {
  total: number;
  completed: number;
  percentage: number;
  completedNodeIds: string[];
}

/**
 * Progress across a course.
 *
 * Folders are excluded from both sides of the ratio, so a course's percentage
 * reflects material studied rather than the shape of its navigation.
 */
export async function getCourseProgress(user: User, courseId: string): Promise<CourseProgress> {
  const course = await coursesService.loadCourse(courseId);

  // Managers may inspect a draft's progress; students must be enrolled.
  if (!coursesService.canManage(user, course)) {
    if (!course.published) throw notFound("Course not found.");
    await enrollmentsService.assertEnrolled(user, course.id);
  }

  const trackable = await prisma.contentNode.findMany({
    where: { courseId: course.id, type: { not: "FOLDER" } },
    select: { id: true },
  });
  const trackableIds = trackable.map(n => n.id);

  const done = trackableIds.length
    ? await prisma.progress.findMany({
        where: { studentId: user.id, completed: true, nodeId: { in: trackableIds } },
        select: { nodeId: true },
      })
    : [];

  const total = trackableIds.length;
  const completed = done.length;

  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    completedNodeIds: done.map(p => p.nodeId),
  };
}

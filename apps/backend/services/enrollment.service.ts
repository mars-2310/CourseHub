import prisma from "../lib/prisma";
import { conflict, notFound, unprocessable } from "../utils/errors";
import * as coursesService from "./course.service";
import type { Enrollment, User } from "../lib/generated/prisma/client";

/**
 * Enrolls the caller in a published course.
 *
 * Phase 1 enrollment is free; payment is explicitly a later phase. The unique
 * constraint on (studentId, courseId) is the real guard against duplicates, and
 * a pre-check turns the raw constraint violation into a clear 409.
 */
export async function enroll(user: User, courseId: string): Promise<Enrollment> {
  const course = await coursesService.loadCourse(courseId);

  // Drafts are invisible to students, so report them as missing rather than
  // confirming that an unpublished course exists.
  if (!course.published) throw notFound("Course not found.");

  if (coursesService.canManage(user, course)) {
    throw unprocessable("You manage this course, so you cannot enroll in it.");
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId: course.id } },
  });
  if (existing) throw conflict("You are already enrolled in this course.");

  return prisma.enrollment.create({ data: { studentId: user.id, courseId: course.id } });
}

/** The caller's enrollment in one course, or null. */
export async function getMyEnrollment(user: User, courseId: string): Promise<Enrollment | null> {
  return prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });
}

/** Courses the caller is enrolled in, most recent first. */
export async function listMyEnrollments(user: User) {
  return prisma.enrollment.findMany({
    where: { studentId: user.id },
    include: { course: { include: { organisation: true } } },
    orderBy: { enrolledAt: "desc" },
  });
}

/** Used by progress: recording completion requires an active enrollment. */
export async function assertEnrolled(user: User, courseId: string): Promise<void> {
  const enrollment = await getMyEnrollment(user, courseId);
  if (!enrollment) throw unprocessable("Enroll in this course before tracking progress.");
}

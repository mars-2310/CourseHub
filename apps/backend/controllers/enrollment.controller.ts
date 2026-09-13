import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import * as enrollments from "../services/enrollment.service";
import { toCourseDTO } from "../utils/serialize";
import { param } from "../utils/http";

export const enroll: RequestHandler = async (req, res) => {
  const enrollment = await enrollments.enroll(currentUser(req), param(req, "courseId"));
  res.status(201).json({
    enrollment: { id: enrollment.id, courseId: enrollment.courseId, enrolledAt: enrollment.enrolledAt },
  });
};

/** Enrollment status for one course — null when the caller is not enrolled. */
export const getMine: RequestHandler = async (req, res) => {
  const enrollment = await enrollments.getMyEnrollment(currentUser(req), param(req, "courseId"));
  res.json({
    enrolled: Boolean(enrollment),
    enrollment: enrollment
      ? { id: enrollment.id, courseId: enrollment.courseId, enrolledAt: enrollment.enrolledAt }
      : null,
  });
};

export const listMine: RequestHandler = async (req, res) => {
  const rows = await enrollments.listMyEnrollments(currentUser(req));
  res.json({
    courses: rows.map(row => ({
      ...toCourseDTO(row.course),
      enrolledAt: row.enrolledAt,
    })),
  });
};

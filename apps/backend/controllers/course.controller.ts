import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import { validatedQuery } from "../middleware/validate";
import * as courses from "../services/course.service";
import { toCourseDTO } from "../utils/serialize";
import { param } from "../utils/http";
import type { ListCoursesQuery } from "../types/course.schema";

export const create: RequestHandler = async (req, res) => {
  const course = await courses.createCourse(currentUser(req), req.body);
  res.status(201).json({ course: toCourseDTO(course) });
};

/** Public catalogue: published courses only. */
export const list: RequestHandler = async (req, res) => {
  const query = validatedQuery<ListCoursesQuery>(res);
  const { items, total, page, limit } = await courses.listPublishedCourses(query);
  res.json({
    courses: items.map(toCourseDTO),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

/** The caller's own courses, drafts included. */
export const listMine: RequestHandler = async (req, res) => {
  const items = await courses.listOwnedCourses(currentUser(req));
  res.json({ courses: items.map(toCourseDTO) });
};

export const getById: RequestHandler = async (req, res) => {
  const course = await courses.getCourseForViewer(req.user, param(req, "courseId"));
  res.json({ course: toCourseDTO(course), canManage: courses.canManage(req.user, course) });
};

export const update: RequestHandler = async (req, res) => {
  const course = await courses.updateCourse(currentUser(req), param(req, "courseId"), req.body);
  res.json({ course: toCourseDTO(course) });
};

export const publish: RequestHandler = async (req, res) => {
  const course = await courses.setPublished(currentUser(req), param(req, "courseId"), true);
  res.json({ course: toCourseDTO(course) });
};

export const unpublish: RequestHandler = async (req, res) => {
  const course = await courses.setPublished(currentUser(req), param(req, "courseId"), false);
  res.json({ course: toCourseDTO(course) });
};

export const remove: RequestHandler = async (req, res) => {
  await courses.deleteCourse(currentUser(req), param(req, "courseId"));
  res.status(204).send();
};

import type { User } from "../lib/generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      /**
       * The CourseHub `User` row for the authenticated Clerk session.
       * Populated by `requireUser` / `attachUser`; never trust it to exist
       * on a route that does not use one of those middlewares.
       */
      user?: User;
    }
  }
}

export {};

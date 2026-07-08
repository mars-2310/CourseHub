import { Router } from "express";
import { requireAuth, getAuth, clerkClient } from "@clerk/express";
import prisma from "../lib/prisma";

const authRouter = Router();

authRouter.get("/me", requireAuth(), async (req, res) => {
  const { userId: clerkId } = getAuth(req);

  let user = await prisma.user.findUnique({ where: { clerkId: clerkId! } });

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkId!);
    user = await prisma.user.create({
      data: {
        clerkId: clerkId!,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser.firstName ?? "New User",
        role: "STUDENT",
      },
    });
  }

  res.json({ user });
});

export default authRouter;

import { clerkClient } from "@clerk/express";
import prisma from "../lib/prisma";
import type { Role, User } from "../lib/generated/prisma/client";

/**
 * Resolves a Clerk session into a CourseHub `User`, creating the local record on
 * first sight (just-in-time provisioning).
 *
 * Clerk owns identity; CourseHub owns authorization and application data. New
 * users always start as STUDENT — roles are never taken from the client.
 */
export async function syncClerkUser(clerkId: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error(`Clerk user ${clerkId} has no email address.`);
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0]!;

  // upsert on clerkId guards against two concurrent first requests racing.
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email, name, role: "STUDENT" },
  });
}

/** Promotes a STUDENT to TEACHER. Idempotent for users who already rank higher. */
export async function promoteToTeacher(
  userId: string,
  tx: { user: { update: typeof prisma.user.update } } = prisma,
): Promise<void> {
  await tx.user.update({ where: { id: userId }, data: { role: "TEACHER" } });
}

export const hasRole = (user: User, roles: readonly Role[]): boolean =>
  roles.includes(user.role);

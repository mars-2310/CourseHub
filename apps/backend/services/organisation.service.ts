import prisma from "../lib/prisma";
import { conflict, forbidden, notFound } from "../utils/errors";
import { uniqueSlug } from "../utils/slug";
import type { Organisation, User } from "../lib/generated/prisma/client";
import type {
  CreateOrganisationInput,
  UpdateOrganisationInput,
} from "../types/organisation.schema";

/**
 * Creates the caller's academy.
 *
 * The current product model is one organisation per teacher, enforced in the
 * schema by `Organisation.ownerId @unique`. Creating an academy also promotes a
 * STUDENT to TEACHER in the same transaction: signup via Clerk always yields a
 * STUDENT, and Phase 1 requires the teacher flow to work without hand-editing
 * the database. ADMIN is never granted this way.
 */
export async function createOrganisation(
  user: User,
  input: CreateOrganisationInput,
): Promise<Organisation> {
  const existing = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
  if (existing) {
    throw conflict("You already own an organisation.", { organisationId: existing.id });
  }

  const slug =
    input.slug ??
    (await uniqueSlug(input.name, async candidate =>
      Boolean(await prisma.organisation.findUnique({ where: { slug: candidate } })),
    ));

  return prisma.$transaction(async tx => {
    const organisation = await tx.organisation.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        logo: input.logo,
        ownerId: user.id,
      },
    });

    if (user.role === "STUDENT") {
      await tx.user.update({ where: { id: user.id }, data: { role: "TEACHER" } });
    }

    return organisation;
  });
}

/**
 * Public academy lookup. Accepts either the id or the slug, since the slug is
 * the public-facing handle and is guaranteed unique.
 */
export async function getOrganisation(idOrSlug: string): Promise<Organisation> {
  const organisation = await prisma.organisation.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
  if (!organisation) throw notFound("Organisation not found.");
  return organisation;
}

export async function getOwnedOrganisation(user: User): Promise<Organisation | null> {
  return prisma.organisation.findUnique({ where: { ownerId: user.id } });
}

/**
 * Updates an academy. Ownership is derived from the authenticated user and
 * re-checked here -- never taken from the request body.
 */
export async function updateOrganisation(
  user: User,
  idOrSlug: string,
  input: UpdateOrganisationInput,
): Promise<Organisation> {
  const organisation = await getOrganisation(idOrSlug);
  assertCanManage(user, organisation);

  if (input.slug && input.slug !== organisation.slug) {
    const taken = await prisma.organisation.findUnique({ where: { slug: input.slug } });
    if (taken) throw conflict("That slug is already taken.");
  }

  return prisma.organisation.update({ where: { id: organisation.id }, data: input });
}

/** Owner or platform ADMIN. Used by every organisation-scoped write. */
export function assertCanManage(user: User, organisation: Organisation): void {
  if (organisation.ownerId === user.id) return;
  if (user.role === "ADMIN") return;
  throw forbidden("You do not manage this organisation.");
}

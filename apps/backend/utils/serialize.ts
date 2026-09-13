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

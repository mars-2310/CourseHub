/** Slug rules shared by validation and generation: lowercase, alphanumeric, hyphen-separated. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");

/**
 * Finds a free slug by appending -2, -3, ... until `isTaken` reports otherwise.
 *
 * The database unique constraint remains the real guard; this only spares the
 * caller an avoidable 409 on the common case.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "academy";
  if (!(await isTaken(root))) return root;

  for (let n = 2; n < 100; n++) {
    const candidate = `${root.slice(0, 46)}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${root.slice(0, 40)}-${Date.now().toString(36)}`;
}

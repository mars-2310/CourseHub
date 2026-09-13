# CourseHub — Project Status

_Snapshot taken 2026-09-12 on branch `main` @ `b549b0b` (Merge PR #1 from `Auth`)._

## TL;DR

CourseHub is an early-stage multi-tenant course platform (organisations → courses → a
tree of content nodes → enrolments → per-node progress). The **data model is complete
and migrated**, and a **Clerk → Express → Prisma → Neon auth path has been proven
end-to-end once**. Everything else is scaffolding: 8 of 9 API routers are empty stubs,
all 10 controller files are literally 0 bytes, and the frontend is still the unmodified
Bun + React starter template.

**The backend does not currently start.** Two small config breakages (detailed in
[Blockers](#blockers-fix-these-first)) stop it before it serves a request. Both were
reproduced and confirmed fixed locally during this review.

---

## Architecture

Bun-managed Turborepo (`bun@1.3.14`, `turbo ^2.10.0`):

```
CourseHub/
├── apps/
│   ├── backend/    Bun + Express 5 + Clerk + Prisma 7 → Neon Postgres
│   └── frontend/   Bun.serve + React 19 + Tailwind 4 + shadcn/ui  ⚠ embedded git repo
└── packages/
    ├── ui/                 @repo/ui — from the turbo starter, unused by either app
    ├── eslint-config/      @repo/eslint-config — unused by either app
    └── typescript-config/  @repo/typescript-config — unused by either app
```

---

## What works

### Data model — complete (`apps/backend/prisma/schema.prisma`)

Seven models / two enums, with one applied migration
(`prisma/migrations/20260707221737_init`, 129 lines):

| Model | Purpose | Notes |
|---|---|---|
| `User` | Account | `clerkId @unique` bridges Clerk sessions to local rows |
| `Organisation` | Tenant | `ownerId @unique` ⇒ **one org per user, max** |
| `Course` | Sellable unit | `price Float`, `published Boolean` |
| `ContentNode` | Curriculum | Self-referencing `"Tree"` relation; `NodeType` = FOLDER/VIDEO/PDF/TEXT/QUIZ/ASSIGNMENT/LINK |
| `Enrollment` | Student ↔ course | `@@unique([studentId, courseId])` |
| `Progress` | Per-node completion | `@@unique([studentId, nodeId])` |
| `Role` enum | STUDENT / TEACHER / ADMIN | Defined, **never enforced anywhere** |

The single-table content tree is the design's best idea — folders, videos, quizzes and
assignments are all one recursive `ContentNode`, so reordering and nesting is one model
rather than the usual Course→Section→Lesson triple.

### Auth wiring (`apps/backend/app.ts`, `routes/auth.routes.ts`)

- `clerkMiddleware()` mounted globally; all nine route groups mounted under `/api/*`.
- `GET /api/auth/me` is the **only real endpoint**: `requireAuth()` → `getAuth(req)` →
  look up `User` by `clerkId` → **just-in-time provision** from `clerkClient.users.getUser()`
  if absent, defaulting to `role: STUDENT`.
- `GET /api/dashboard-test` — token-verification smoke check.
- Prisma connects to Neon via the driver adapter (`PrismaPg` + `DATABASE_URL`).

Verified locally after applying the two fixes below: server boots, the placeholder node
route returns `200`, and both protected routes correctly `302` to sign-in with no token.

### Frontend

Runs (`bun --hot src/index.ts`) and builds (`build.ts` → Bun.build + Tailwind plugin,
minified, linked sourcemaps). Six shadcn/ui primitives are vendored in
`src/components/ui/` (button, card, input, label, select, textarea). That is the whole of it.

---

## Blockers — fix these first

**1. Prisma client import path is wrong — the server cannot boot.**

`apps/backend/lib/prisma.ts:1` does `from "./generated/prisma"`, but Prisma 7 generates
no barrel `index.ts` in a custom output dir. Actual boot error:

```
error: Cannot find module './generated/prisma' from '.../apps/backend/lib/prisma.ts'
```

Fix: import from `./generated/prisma/client`.

**2. Clerk publishable key is under the wrong env name — every route 500s.**

`apps/backend/.env` defines `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, a Next.js convention this
app doesn't use. `@clerk/express` reads `CLERK_PUBLISHABLE_KEY`, finds nothing, and throws
inside the global middleware — so *all* routes, public ones included, return 500:

```
Error: Publishable key is missing. Ensure that your publishable key is correctly configured.
```

Fix: rename the key to `CLERK_PUBLISHABLE_KEY` (there is no Next.js app to serve the
`NEXT_PUBLIC_` name). Confirmed: with this set, routes respond correctly.

**3. Generated Prisma client is untracked and stale.**

`lib/generated/` is in no commit (`git ls-files lib/generated` → 0 files), so a fresh clone
has no client at all. The local copy is dated 28 Jun — *before* the 7 Jul migration — so it
may not match the current schema. Run `bun --bun run prisma generate` and add it to a
documented setup step (or a `postinstall`).

---

## Not built yet

**Backend — all 10 controllers are empty files (0 bytes):**
`admin`, `analytics..controller.ts` (note the typo'd double dot), `auth`, `course`,
`enrollment`, `lesson`, `organisation`, `payment`, `section`, `upload`.

**Eight of nine routers are bare `Router()` instances with no handlers:**
`admin`, `analytics`, `course`, `enrollment`, `organisation`, `payment`, `upload`
(empty), and `node` (one hardcoded placeholder JSON). Only `auth` is real.

So `/api/courses`, `/api/organisation`, `/api/enrollment` etc. are mounted but return
404 for every path — there is no course CRUD, no enrolment, no upload, no payment, no
analytics, and **no role/ownership authorization** beyond "is signed in".

**Frontend — no product code at all.** `App.tsx` still renders the starter's spinning
Bun + React logos and an `APITester` widget pointed at the template's own `/api/hello`.
There is no Clerk provider (`@clerk/clerk-react` is not even a dependency), no router, no
pages, no backend API client. Despite commit `4e5e310` ("Frontend scaffolding with
ClerkAuth"), that commit changed only `bun.lock` — the frontend has no Clerk integration.

**Also missing:** zero tests anywhere; no input validation (no zod/valibot); `README.md`
is still the verbatim `create-turbo` starter text describing nonexistent `docs`/`web` apps.

---

## Repo hygiene

- **`apps/frontend` is an embedded git repo, not a real submodule.** It is committed as a
  gitlink (`160000 968c6b4`) but there is no `.gitmodules`, so **the frontend source is
  not tracked by the main repo** and does not clone with it. Its inner repo has a single
  `init` commit and one uncommitted tweak (a logo spin duration in `src/App.tsx`). This is
  the highest-risk hygiene issue: the frontend is effectively unbacked. Fix by removing the
  inner `.git` and committing the files into the monorepo (or registering a proper submodule).
- **Turbo pipelines are mostly no-ops.** `turbo.json` declares `build` / `lint` /
  `check-types`, but backend defines only `dev` + `prisma`, and frontend only
  `dev`/`start`/`build`. So `bun run lint` and `bun run check-types` at the root do nothing
  for either app. `build` outputs are also declared as `.next/**`, which neither app produces.
- **Stray root dependency.** Uncommitted `package.json` adds `@clerk/express ^2.1.38` to
  the *root* workspace; it belongs in `apps/backend` only (where it already is at `^2.1.37`).
- **`CLAUDE.md` is an empty untracked file.**
- Good: `.env` is correctly gitignored and untracked — no secrets in history.
- Default `PORT` is 5000, which collides with macOS AirPlay Receiver (returns 403 on
  localhost:5000). Worth changing the default to something like 5001.

### Working tree

```
 m apps/frontend    (embedded repo: uncommitted App.tsx change)
 M bun.lock
 M package.json     (adds root @clerk/express)
?? CLAUDE.md        (empty)
?? PROGRESS.md      (this file)
```

---

## Suggested next steps

1. **Unblock the backend** — fix the Prisma import, rename `CLERK_PUBLISHABLE_KEY`,
   regenerate the client, move the root `@clerk/express` dep into `apps/backend`.
2. **Untangle `apps/frontend`** from its embedded repo before more frontend work lands
   outside version control.
3. **Build the first real vertical slice** — organisation create + course CRUD + the
   `ContentNode` tree read — with role/ownership checks, since `Role` is currently decorative.
4. **Wire the frontend to Clerk** (`@clerk/clerk-react` + a router) and replace the starter
   page with a real shell that calls `/api/auth/me`.
5. **Add per-app `lint` / `check-types` scripts** so the turbo pipeline does something, and
   correct the `build` outputs.
6. Decide whether `packages/ui` is going to be used; delete it if not.
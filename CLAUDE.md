# CourseHub — Project Instructions

## Project Overview

CourseHub is a multi-tenant SaaS platform for educators.

core product idea: Shopify for teachers.

Teachers can create their own online academies, build and sell courses, customize their academy, manage students, and eventually connect custom domains.

Students can discover/enroll in courses, consume course content, and track their learning progress.

CourseHub is NOT intended to be a traditional rigid LMS.

The platform must support arbitrary nested course structures.

Example:

Course
├── Introduction
│   ├── Welcome Video
│   ├── Syllabus PDF
│   └── Quiz
├── DSA
│   ├── Arrays
│   │   ├── Theory
│   │   │   ├── Video
│   │   │   └── Notes
│   │   └── Practice
│   └── Trees
└── Projects
    └── Project 1

Content is therefore represented as a tree using ContentNode.

---

# Technology

Backend:

- TypeScript
- Node.js
- Express
- PostgreSQL
- Prisma ORM
- Clerk for authentication

Planned infrastructure:

- Object storage for uploaded files/videos
- Stripe or Razorpay for payments
- Redis/background workers when scale requires them

---

# Architecture

The backend follows:

Client
  ↓
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Prisma
  ↓
PostgreSQL

Responsibilities:

## Routes

Routes define HTTP endpoints and attach middleware/controllers.

Routes must NOT contain business logic.

## Controllers

Controllers handle HTTP concerns:

- request parameters
- request body
- authenticated user
- status codes
- response formatting

Controllers must NOT contain substantial business logic or direct Prisma queries.

## Services

Services contain business logic.

Services:

- validate business rules
- coordinate multiple database operations
- enforce ownership rules
- call Prisma
- return domain/application results

Services must not depend on Express request/response objects.

## Prisma

Prisma is responsible for database access.

Do not put business logic into Prisma queries unless it is inherently database-level behavior.

## Middleware

Middleware handles cross-cutting concerns:

- authentication
- authorization
- validation
- rate limiting
- error handling

---

# Project Structure

src/
├── routes/
├── controllers/
├── services/
├── middleware/
├── prisma/
├── lib/
├── utils/
├── types/
└── index.ts

Routes and controllers are kept separate.

Services are separate from controllers.

---

# Authentication

Use Clerk.

Do NOT implement custom(future goals not current):

- password hashing
- JWT generation
- password reset
- email verification
- OAuth
- session management

Clerk is responsible for identity/authentication.

CourseHub's database maintains its own User record.

The User model contains a unique clerkId.

Conceptually:

Clerk
  ↓
clerkId
  ↓
CourseHub User
  ↓
Application data

Clerk answers:

"Who is this user?"

CourseHub answers:

"What can this user do and what data do they own?"

---

# Authorization

Application roles:

- STUDENT
- TEACHER
- ADMIN

Authentication and authorization are separate.

A valid Clerk session does not automatically mean the user can perform every action.

Examples:

- Only TEACHER/authorized organization members can create courses.
- Students cannot modify courses.
- Teachers can only modify organizations/courses they own or have permission to manage.
- ADMIN can perform platform-level administrative operations.

Always enforce authorization on the backend.

Never rely solely on frontend restrictions.

---

# Multi-Tenancy

CourseHub is multi-tenant.

An Organization represents a teacher's academy.

Data ownership must always be checked.

Example:

Teacher A must not be able to modify:

- Teacher B's organization
- Teacher B's courses
- Teacher B's content

Never trust organizationId supplied by the client without validating ownership.

Prefer deriving ownership from the authenticated user where possible.

---

# Course Architecture

Do NOT introduce a rigid:

Course → Section → Lesson

architecture.

The platform uses:

Course → ContentNode tree

ContentNode supports arbitrary nesting.

Example:

Course
└── ContentNode
    ├── ContentNode
    │   ├── ContentNode
    │   └── ContentNode
    └── ContentNode

Current node types:

- FOLDER
- VIDEO
- PDF
- TEXT
- QUIZ
- ASSIGNMENT
- LINK

New content types should preferably be implemented as new ContentNode types rather than redesigning the hierarchy.

---

# Important ContentNode Operations

The system must eventually support:

- create node
- update node
- delete node
- move node
- reorder siblings
- retrieve course tree
- retrieve subtree

Moving a node must validate that the operation does not create a cycle.

For example:

A
└── B
    └── C

C cannot become the parent of A.

---

# API Design

Use RESTful APIs.

Prefer:

POST
GET
PATCH
DELETE

Use resource-oriented URLs.

Examples:

POST /courses
GET /courses/:courseId
PATCH /courses/:courseId
DELETE /courses/:courseId

POST /courses/:courseId/nodes
GET /courses/:courseId/tree

Avoid action-heavy URLs unless the operation is genuinely an action.

Examples of acceptable actions:

POST /courses/:id/publish
POST /courses/:id/unpublish

---

# Validation

Validate all external input.

Never assume req.body is valid.

Use a schema validation library such as Zod.

Validation should happen before controller business logic.

---

# Error Handling

Use centralized error handling.

Controllers should not contain repetitive try/catch blocks for every operation if a centralized async error mechanism is available.

Use appropriate HTTP statuses:

400 - invalid request
401 - unauthenticated
403 - unauthorized
404 - resource not found
409 - conflict
422 - validation/business input error when appropriate
500 - unexpected server error

Do not expose internal database errors directly to clients.

---

# Database Rules

Use Prisma migrations.

Never manually modify production database structure.

Use:

npx prisma migrate dev

during development.

Use Prisma transactions when multiple database operations must succeed/fail together.

Financial data must use Decimal rather than Float.

---

# Security

Never trust:

- user IDs from the frontend
- organization IDs from the frontend
- course ownership claims
- payment success claims from the frontend

Always validate ownership server-side.

Never expose:

- Clerk secrets
- database credentials
- payment secrets
- storage credentials

Never commit `.env` files.

---

# Development Principles

Prefer simple architecture over premature abstraction.

Do not introduce:

- microservices
- Redis
- queues
- Elasticsearch
- complex repository patterns

unless the current phase explicitly requires them.

For now:

Routes → Controllers → Services → Prisma

is the preferred architecture.

---

# Implementation Rules

Before implementing a feature:

1. Understand the existing schema.
2. Check existing routes.
3. Check existing services.
4. Check existing middleware.
5. Reuse existing utilities.
6. Avoid duplicating functionality.
7. Update tests where applicable.
8. Keep changes scoped to the current phase.

Do not redesign unrelated parts of the application while implementing a feature.

---

# Phase Discipline

The project is divided into phases.

Only implement functionality belonging to the current phase unless explicitly requested.

Do not jump ahead to payments, custom domains, advanced analytics, etc. during Phase 1.

See:

docs/phases/PHASE-1.md
docs/phases/PHASE-2.md
docs/phases/PHASE-3.md
docs/phases/PHASE-4.md
docs/phases/PHASE-5.md

---

# Current Product Priority

The most important architectural feature is the flexible ContentNode tree.

The second most important concern is correct multi-tenant authorization.

The third is keeping the backend modular enough that payments, custom domains, analytics, and advanced learning features can be added without rewriting the core.

Build for correctness first, then scale.



1. **Unblock the backend** — fix the Prisma import, rename `CLERK_PUBLISHABLE_KEY`,
   regenerate the client, move the root `@clerk/express` dep into `apps/backend`.
2. **Untangle `apps/frontend`** from its embedded repo before more frontend work lands
   outside version control.


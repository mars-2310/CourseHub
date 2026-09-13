# Phase 1 — Core MVP

## Objective

Build a functional CourseHub MVP.

At the end of Phase 1:

A teacher must be able to:

1. Authenticate using Clerk.
2. Create an organization/academy.
3. Create courses.
4. Build arbitrarily nested course content.
5. Upload/reference course resources.

A student must be able to:

1. Authenticate.
2. Browse courses.
3. Enroll in a course.
4. Navigate course content.
5. Mark content as complete.
6. View course progress.

---

# Scope

## Authentication

Use Clerk.

Implement:

- Clerk integration
- authenticated requests
- local User synchronization
- role handling
- authentication middleware

Do not implement custom authentication.

---

# Authorization

Implement:

- authenticated user middleware
- teacher authorization
- student authorization
- admin authorization where required
- organization ownership checks

Every protected resource must verify ownership.

---

# Organization

Implement:

POST /organizations

GET /organizations/:id

PATCH /organizations/:id

GET /me/organization

Requirements:

- teacher can create an organization
- teacher can only have the intended number of organizations according to the current product model
- teacher can modify only their organization
- organization slug must be unique

---

# Course

Implement:

POST /courses

GET /courses

GET /courses/:courseId

PATCH /courses/:courseId

DELETE /courses/:courseId

POST /courses/:courseId/publish

POST /courses/:courseId/unpublish

Requirements:

- course belongs to an organization
- only authorized organization users can modify it
- unpublished courses should not appear in public course listings
- course ownership must be checked server-side

---

# ContentNode

Implement:

POST /courses/:courseId/nodes

GET /nodes/:nodeId

PATCH /nodes/:nodeId

DELETE /nodes/:nodeId

GET /courses/:courseId/tree

Content types:

- FOLDER
- VIDEO
- PDF
- TEXT
- QUIZ
- ASSIGNMENT
- LINK

Requirements:

- arbitrary nesting
- sibling ordering
- parent/child relationships
- course ownership validation
- node ownership validation
- cycle prevention
- safe deletion

---

# Tree Operations

Implement:

## Create

Create a node under:

- course root
- another folder/node

## Move

Allow changing parentId.

Prevent cycles.

## Reorder

Allow changing node order among siblings.

## Delete

Define and implement recursive deletion semantics.

Deleting a folder should handle its descendants consistently.

Use transactions where necessary.

---

# Enrollment

Implement:

POST /courses/:courseId/enroll

GET /me/courses

GET /courses/:courseId/enrollment

Requirements:

- student can enroll
- duplicate enrollment is prevented
- unpublished/private course access must follow product rules
- enrollment ownership must be enforced

For Phase 1, enrollment can be free.

Do NOT implement payments yet.

---

# Progress

Implement:

POST /nodes/:nodeId/complete

GET /courses/:courseId/progress

Requirements:

- only enrolled students can record progress
- only trackable nodes should contribute to progress
- folders should not count as completed learning content
- progress must be unique per student/node
- completion should be idempotent

---

# Uploads

Implement the initial upload architecture.

Prefer:

Frontend
↓
Backend requests upload authorization
↓
Signed upload URL
↓
Frontend uploads directly
↓
Storage provider
↓
Backend stores resource metadata

Do not proxy large video files through Express.

The exact storage provider can be selected during implementation.

---

# API Quality

All endpoints must:

- validate input
- authenticate where required
- authorize the action
- return appropriate HTTP status codes
- use centralized errors
- avoid exposing internal errors

---

# Phase 1 Database

Core models:

- User
- Organization
- Course
- ContentNode
- Enrollment
- Progress

Do not add payment models yet unless required for a technical dependency.

---

# Phase 1 Completion Criteria

Phase 1 is complete when this workflow works end-to-end:

Teacher
↓
Clerk signup
↓
Create organization
↓
Create course
↓
Create folders
↓
Create nested folders
↓
Create content nodes
↓
Publish course

Student
↓
Clerk signup
↓
Browse course
↓
Enroll
↓
Open course tree
↓
Consume content
↓
Mark nodes complete
↓
View progress

This workflow must work without manually editing the database.
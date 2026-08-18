# PeerSkill AI Development Instructions

## 1. Project

PeerSkill is a private, single-college skill-sharing and doubt-solving network.

The core product loop is:

signup
→ profile
→ skills
→ ask doubt
→ answer
→ accept answer
→ skill-specific reputation

Build the product incrementally.

---

## 2. Source of Truth

Product scope:
- `docs/Product_Scope.md`

Product strategy:
- `docs/Product_Strategy.md`

Product and overall requirements:
- `docs/Product_Document.md`

UX research, user flows and information architecture:
- `docs/Product_UX-Research_User-Flow_IA.md`

UI/design:
- `docs/Product_UI.md`

Backend architecture and business rules:
- `docs/Product_Backend.md`

Technical implementation:
- `docs/Product_Tech-Stack.md`

Build phases:
- `BUILD_PLAN.md`

When implementing a feature, read the relevant documentation before changing code.

Do not invent product requirements.

If requirements conflict or are ambiguous:
- stop
- explain the conflict
- ask for a decision

Do not silently choose a requirement.

---

## 3. Current Development Target

The current target is Phase 0 of `BUILD_PLAN.md`.

Do NOT implement Phase 1 or later unless explicitly instructed.

Phase 0 is the engineering foundation only.

---

## 4. Architecture

The initial application is a local-first Next.js application.

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite

Use one Next.js application.

Do NOT create a separate backend server.

Backend logic should live inside the Next.js application using the project's agreed server-side mechanisms.

Do NOT introduce microservices.

---

## 5. Avoid Premature Infrastructure

Do not introduce the following unless explicitly requested:

- PostgreSQL
- Redis
- BullMQ
- WebSockets
- Docker
- S3
- Cloudflare R2
- Meilisearch
- OpenSearch
- embeddings
- external email providers
- push notifications
- unnecessary third-party services

Keep the application simple and understandable.

---

## 6. Database

Use Prisma with SQLite during the initial local build.

Use Prisma migrations for schema changes.

Keep the schema understandable.

Do not add future product entities simply because they might be useful later.

---

## 7. Code Quality

Prefer:

- simple solutions
- small modules
- clear naming
- strong TypeScript types
- reusable components where appropriate
- server-side validation
- explicit error handling

Avoid:

- unnecessary abstractions
- premature optimization
- duplicate logic
- large files when smaller modules are clearer
- unrelated refactoring

---

## 8. Security

Never commit:

- passwords
- API keys
- tokens
- secrets
- private credentials

Environment variables must be used for secrets.

Do not expose server-only values to the client.

Validate data at server boundaries.

---

## 9. Testing

Every implementation task must be tested appropriately.

Before declaring a task complete:

1. Run relevant tests.
2. Run type checking.
3. Run linting if configured.
4. Run the production build when appropriate.
5. Report the commands executed and their results.

Never claim that something works without verification.

---

## 10. Scope Control

Do not:

- implement future phases
- add features not requested
- redesign the product
- change the technology stack
- modify product documentation
- modify unrelated code

If a change outside the current task appears necessary, explain it before making the change.

---

## 11. Working Method

Work in small, verifiable steps.

Before making substantial changes:

1. Inspect the existing repository.
2. Read the relevant documentation.
3. Explain the intended changes.
4. Implement only the requested scope.
5. Run verification.
6. Report what changed.
7. Report what was tested.

Do not build the entire application at once.

---

## 12. Git Safety

Do not reset, delete, or overwrite existing work without explicit permission.

Do not rewrite Git history.

Do not modify unrelated files.

Keep changes focused on the current task.

---

## 13. Definition of Done

A task is complete only when:

- requested functionality is implemented
- relevant tests pass
- type checking passes
- linting passes when configured
- build passes when applicable
- no unrelated functionality was changed
- the result is reported clearly

---

## 14. Important Rule

When uncertain, do not guess.

Ask for clarification.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

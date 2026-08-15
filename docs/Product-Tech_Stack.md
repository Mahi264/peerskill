# PeerSkill Tech Stack 2

This is the practical stack for building PeerSkill locally first. Keep it simple. Do not optimize for production deployment yet.

## Goal

Build a working MVP that can run on one developer machine.

The first product goal is:

> A verified student can create a profile, add skills, ask a doubt, receive an answer, accept it, and give the helper skill-specific reputation.

## Main Stack

| Layer | Choice |
|---|---|
| App framework | Next.js |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | lucide-react |
| Forms | React Hook Form |
| Validation | Zod |
| Database | SQLite |
| ORM | Prisma |
| Auth | Simple local auth first |
| File storage | Local filesystem |
| Search | Basic database search |
| Realtime | Not in first version |
| Deployment | Not planned initially |

## Architecture

Use one Next.js app.

Do not create a separate backend server initially.

Use:

- Next.js App Router
- Server Actions or API routes for backend logic
- Prisma for database access
- SQLite for local database
- Tailwind and shadcn/ui for UI

Suggested structure:

```text
peerskill/
|-- app/
|-- components/
|-- lib/
|-- prisma/
|-- public/
|-- uploads/
|-- package.json
```

## Why This Stack

### Next.js

Use Next.js because it can handle frontend pages and backend logic in one project.

This keeps the project easier to build, run, and understand locally.

### TypeScript

Use TypeScript to reduce mistakes as the app grows.

It helps with form data, API responses, Prisma models, and component props.

### Tailwind CSS

Use Tailwind for fast UI development.

It is easy to adjust spacing, colors, responsive layouts, and design polish.

### shadcn/ui

Use shadcn/ui for accessible, customizable components.

Use it for:

- Buttons
- Inputs
- Dialogs
- Tabs
- Dropdowns
- Toasts
- Cards
- Command/search UI

### Prisma

Use Prisma to define and access the database cleanly.

It makes the database easier for AI agents and humans to understand.

### SQLite

Use SQLite at the start because it runs locally with no server setup.

Later, SQLite can be replaced with PostgreSQL when deployment becomes necessary.

### Local File Storage

Store uploaded files locally in an `uploads/` folder during development.

Do not use S3, R2, or cloud storage yet.

### Basic Search

Use simple database search first.

Search should initially cover:

- Doubts
- Skills
- People

Do not add Meilisearch, OpenSearch, embeddings, or semantic search yet.

## Do Not Use Initially

Avoid these in the first working version:

- Separate backend server
- Microservices
- Redis
- BullMQ
- PostgreSQL
- Docker unless necessary
- WebSockets
- Cloud file storage
- Push notifications
- Email provider integration
- AI/NLP duplicate detection
- Advanced analytics
- Complex role systems beyond basic student/admin

These can come later after the core product works.

## Build Phases

### Phase 1: App Foundation

Build:

- Basic app layout
- Navigation
- Landing/login screen
- Local signup/login
- Profile setup
- Skill setup

User should be able to:

- Create an account
- Complete profile
- Add at least 3 skills

### Phase 2: Doubt Loop

Build:

- Create doubt
- Doubt list
- Doubt detail page
- Add answer
- Accept answer

User should be able to:

- Ask a doubt
- Answer a doubt
- Mark an answer as accepted

### Phase 3: Reputation

Build:

- Upvote/downvote answers
- Skill-specific reputation points
- Simple per-skill leaderboard

User should be able to:

- Gain reputation when answers are upvoted or accepted
- View reputation by skill

### Phase 4: Discovery

Build:

- Search people by skill
- Filter by level, department, year, availability
- Mentor list

User should be able to:

- Find students who know a skill
- See why a student is suggested

### Phase 5: Connections

Build:

- Send connection request
- Accept/decline request
- Show connection status

User should be able to:

- Connect with another student

### Phase 6: Messaging

Build:

- 1:1 conversations
- Send messages
- Message list

Keep it simple:

- No realtime at first
- Use refresh or simple polling later

Messaging rule:

- Chat is allowed after users are connected
- Chat is also allowed if one user answered the other user's doubt

### Phase 7: Safety And Admin

Build:

- Report user/content
- Block user
- Basic admin dashboard
- Manual user verification
- Hide reported content

User should be able to:

- Report unsafe behavior
- Block another user

Admin should be able to:

- Verify users
- Review reports
- Hide content

### Phase 8: UX Polish

Build:

- Better empty states
- Smooth search overlay
- Better onboarding
- Accepted-answer animation
- Reputation feedback toast
- Responsive mobile layout

Only add polish after the main flow works.

## Initial Auth Strategy

For local development, keep auth simple.

Recommended initial version:

- Email and password login
- Store users in SQLite
- Use hashed passwords
- Add a `collegeEmailVerified` boolean
- For development, allow manual verification from admin page

Later:

- Replace with OTP or magic-link verification
- Add real college email sending
- Add secure production session handling

## Initial Database Models

Start with these models only:

- User
- Profile
- Skill
- UserSkill
- Doubt
- DoubtSkill
- Answer
- Vote
- ReputationEvent
- SkillReputation
- Connection
- Conversation
- Message
- Report
- Block

Do not add future features yet:

- Feed posts
- Clubs
- Groups
- Events
- Resource library
- Badges
- Anonymous posts
- Push notifications

## Development Rules For AI Agents

When building this project:

- Keep the app local-first.
- Prefer simple working features over production infrastructure.
- Do not add cloud services unless explicitly asked.
- Do not add Redis, queues, or WebSockets in early phases.
- Do not build deferred features from `Scope.md`.
- Follow the phases in order.
- Keep database schema easy to understand.
- Use Prisma migrations for schema changes.
- Use shadcn/ui components where possible.
- Keep UI polished but do not block core functionality for animations.
- Make every phase runnable and testable before moving to the next.

## Later Upgrade Path

When the local MVP works:

| Current | Later Upgrade |
|---|---|
| SQLite | PostgreSQL |
| Local auth | OTP/magic-link college email auth |
| Local uploads | S3 or Cloudflare R2 |
| Basic DB search | PostgreSQL full-text search |
| Refresh/polling messages | WebSockets |
| Local app | Vercel + managed backend/database |
| Simple admin | Full moderation/admin dashboard |

## Final Instruction

Build PeerSkill step by step.

Do not build the whole platform at once.

First prove the core loop:

```text
signup -> profile -> skills -> ask doubt -> answer -> accept answer -> reputation
```

Everything else comes after that loop works.

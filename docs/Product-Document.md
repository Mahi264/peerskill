# PeerSkill Product Documentation

PeerSkill is a private, single-college skill-sharing and doubt-solving network for students.

The current product direction is decided around one focused v1 wedge: verified students can find peers by skill, ask doubts, receive answers, build skill-specific reputation, and message safely within a moderated campus network.

## Documentation Map

| File | Purpose |
|---|---|
| [Product-Strategy.md](Product-Strategy.md) | Problem, product thesis, target users, principles, and resolved decisions |
| [Scope.md](Scope.md) | Decided MVP scope, v2 backlog, and success metrics |
| [UX-Design.md](UX-Design.md) | Moodboard, brand direction, design tokens, component library, key screens, and interaction specs |
| [Backend-Architecture.md](Backend-Architecture.md) | Backend architecture, schema, API contract, auth strategy, and scaling notes |

## Current Decisions

- PeerSkill v1 is **single-college only**.
- Access is restricted through **college email verification**, with manual club-admin approval as fallback.
- The launch audience is the founding club plus incoming orientation students.
- The v1 product is **not** a full social network yet. Social feed, clubs, events, groups, resource library, career prep, anonymous posting, and advanced smart routing are deferred.
- The founding club owns moderation and verification for v1.
- Alumni retain access after graduation.
- The product is free initially.

## MVP Product Loop

1. A student verifies their college email.
2. They create a basic profile and add at least three skills.
3. They ask a doubt or search for a student who knows a skill.
4. Another student answers.
5. The asker accepts the best answer.
6. The helper gains skill-specific reputation.
7. The two students can connect or message if useful.
8. Reports, blocks, rate limits, and moderation keep the network safe.

## Source Of Truth

For build planning, treat [Scope.md](Scope.md) as the source of truth for what ships in v1.

For product and design intent, use [Product-Strategy.md](Product-Strategy.md) and [UX-Design.md](UX-Design.md).

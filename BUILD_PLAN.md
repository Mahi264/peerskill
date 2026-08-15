# PeerSkill Build Plan

## Build Principle

Build PeerSkill incrementally.

Each phase must be:
- implemented
- tested
- manually verified
- committed to Git

Do not implement future phases early.

---

# Phase 0 — Engineering Foundation

Goal:
Create a clean, runnable Next.js application with the agreed local-first architecture.

Stack:
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite

Deliverables:
- Project structure
- Development environment
- Prisma + SQLite
- Base UI system
- Environment configuration
- Error handling foundation
- Testing foundation
- Git/AI development instructions

Definition of Done:
- App runs locally
- Database connects
- Prisma works
- Tests run
- Production build succeeds

---

# Phase 1 — Authentication & Student Onboarding

Goal:
A student can create an account and complete their profile.

Features:
- Signup
- Login
- Logout
- Basic local authentication
- Student profile
- Department
- Branch
- Year
- Section
- Bio
- Avatar/initials
- At least 3 skills
- Skill level per skill
- Available to help
- Privacy settings

Definition of Done:
A new student can create an account, complete their profile, add at least 3 skills, and reach Home.

---

# Phase 2 — Core Doubt Loop

Goal:
Prove the central PeerSkill loop.

Features:
- Create doubt
- Title
- Description
- Attachments
- Skill tags
- Urgency
- Doubt list
- Doubt detail
- Submit answer
- Answer list
- Accept answer
- Resolved doubt state

Definition of Done:
One student can ask a doubt, another student can answer it, and the asker can accept the answer.

---

# Phase 3 — Reputation

Goal:
Make helping visible and meaningful.

Features:
- Answer voting
- Vote rules
- Reputation events
- Skill-specific reputation
- Accepted-answer reputation
- Per-skill leaderboard

Definition of Done:
A helper receives skill-specific reputation from accepted answers and votes, and the reputation is visible.

---

# Phase 4 — Discovery

Goal:
Allow students to find useful people and knowledge.

Features:
- Search
- Search people
- Search skills
- Search doubts
- Skill filters
- Department filter
- Year filter
- Availability filter
- Skill-level filter
- Mentor profiles
- Suggested helpers

Definition of Done:
A student can find another student based on a skill and understand why that person is relevant.

---

# Phase 5 — Connections

Goal:
Allow students to establish a relationship before messaging.

Features:
- Send connection request
- Accept request
- Decline request
- Connection status
- Connection list

Definition of Done:
Two students can establish a connection and see the correct relationship state.

---

# Phase 6 — Messaging

Goal:
Allow controlled 1:1 communication.

Messaging is allowed when:
- users are connected, OR
- one user answered the other's doubt

Features:
- Conversation
- Message list
- Send message
- Message history
- Locked messaging state
- Report/block access

No realtime messaging initially.

Definition of Done:
Eligible students can exchange messages and blocked users cannot message each other.

---

# Phase 7 — Safety & Admin

Goal:
Make the network safe and manageable.

Features:
- Report user
- Report doubt
- Report answer
- Report message
- Block user
- Moderation queue
- Hide content
- User verification
- Suspend/reactivate user
- Basic admin dashboard
- Moderation actions/audit trail

Definition of Done:
Users can report/block safely and authorized admins/moderators can manage reports and verification.

---

# Phase 8 — Notifications & Search Completion

Goal:
Complete important supporting interactions.

Features:
- In-app notifications
- New answer notification
- Accepted answer notification
- Connection request notification
- Connection accepted notification
- Moderation notification
- Similar resolved doubt suggestions
- Search refinement

Definition of Done:
Important user actions produce the expected in-app feedback and discovery works reliably.

---

# Phase 9 — UX Polish

Goal:
Improve usability after the core product works.

Features:
- Empty states
- Loading states
- Error states
- Search overlay refinement
- Onboarding refinement
- Accepted-answer animation
- Reputation feedback
- Responsive refinement
- Accessibility refinement

Definition of Done:
Core flows are polished across supported screen sizes without changing product behavior.

---

# Core MVP Loop

signup
  ↓
profile
  ↓
3+ skills
  ↓
ask doubt
  ↓
answer
  ↓
accept answer
  ↓
skill-specific reputation

Everything else comes after this loop works.




---

# Phase 0 Detailed Checklist

## 0.1 Repository

- [ ] Git repository initialized
- [ ] `.gitignore` configured
- [ ] README exists
- [ ] Project has a clean directory structure
- [ ] No unnecessary files or dependencies

## 0.2 Next.js Application

- [ ] Next.js application created
- [ ] TypeScript configured
- [ ] App Router configured
- [ ] Development server runs
- [ ] Production build succeeds

## 0.3 UI Foundation

- [ ] Tailwind CSS configured
- [ ] shadcn/ui configured
- [ ] Base typography established
- [ ] Base layout established
- [ ] Responsive foundation established

## 0.4 Database

- [ ] Prisma installed/configured
- [ ] SQLite configured
- [ ] Database connection works
- [ ] Initial Prisma schema created
- [ ] Prisma migration works
- [ ] Prisma client works

## 0.5 Application Structure

- [ ] Application routes structure established
- [ ] Components structure established
- [ ] Shared utilities structure established
- [ ] Database access structure established
- [ ] Validation structure established
- [ ] Server/client boundaries are clear

## 0.6 Configuration

- [ ] Environment variable strategy established
- [ ] `.env` excluded from Git
- [ ] `.env.example` created
- [ ] No secrets committed

## 0.7 Testing

- [ ] Testing framework configured
- [ ] At least one test executes successfully
- [ ] Test command documented
- [ ] Build command documented
- [ ] Lint/type-check commands documented

## 0.8 AI Development Rules

- [ ] `AGENTS.md` created
- [ ] AI understands project documentation
- [ ] AI is instructed not to implement future phases
- [ ] AI is instructed to run tests after changes
- [ ] AI is instructed not to modify unrelated files

## Phase 0 Exit Criteria

Phase 0 is complete only when:

1. The application starts locally.
2. The application builds successfully.
3. The database can be created/reset through Prisma.
4. Tests execute successfully.
5. The repository has no committed secrets.
6. The project structure is understandable.
7. `AGENTS.md` contains the development rules.
8. No Phase 1+ product functionality has been implemented.
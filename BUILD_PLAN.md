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

# Phase 0 — Engineering Foundation (Completed)

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

# Phase 1 — Authentication & Student Onboarding (Completed)

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
- A new student can create an account, complete their profile, add at least 3 skills, and reach Home.

---

# Phase 2 — Core Doubt Loop (Completed)

Goal:
Prove the central PeerSkill doubt-solving loop.

Features:
- Create doubt (title, description, skill selection, urgency)
- Doubt feed (campus doubt cards with urgency, status, skill tags, answer count)
- Skill, urgency, and status filtering
- Doubt detail view
- Submit answer
- Answer list
- Accept answer
- Resolved doubt state & reusable campus knowledge
- Author deletion of eligible doubts (author-only, OPEN status, 0 answers)

Q&A Behavior Rules:
- OPEN doubts: answers allowed.
- RESOLVED doubts (an accepted answer exists): answers are still allowed.
- CLOSED doubts: answers are NOT allowed.
- The doubt author MAY answer their own doubt.
- The doubt author MAY accept any answer, including their own.
- There is only one accepted answer at a time.
- The author may change the accepted answer later.
- Accepting an answer changes OPEN → RESOLVED but does NOT lock the doubt.

Doubt Status Lifecycle:
- **OPEN**: Default status when a doubt is created.
- **RESOLVED**: Set when the author accepts an answer. The doubt remains open for additional answers and the accepted answer can be changed.
- **CLOSED**: Reserved moderation/safety state. CLOSED is NOT user-triggered in the current phase. It will be used by future moderation/admin functionality (Phase 6 — Safety & Moderation). No user action currently sets a doubt to CLOSED.

Definition of Done:
- One student can ask a doubt, another student can answer it, the asker can accept the answer to resolve the doubt, and the author can delete open doubts with zero answers.

---

# Product Philosophy & Direction

PeerSkill prioritizes being a campus-native doubt-solving product, not a gamified reputation or leaderboard platform.

The core loop is:

Student has doubt
  ↓
Sees relevant campus doubts
  ↓
Answers / help is exchanged with minimal friction
  ↓
Useful answers are accepted
  ↓
Resolved doubts become reusable campus knowledge

### Borrowed Principles (Stack Overflow Influence)
PeerSkill borrows useful interaction principles from Stack Overflow:
- Low-friction question and answer flow
- Strong accepted-answer concept
- Useful campus knowledge archive
- Clear answer quality signals

*Note: PeerSkill retains its campus-native identity and design system, and is NOT a visual or feature-for-feature clone of Stack Overflow.*

---

# Next Planned Refinements (Post-Phase 2 Roadmap)

Rather than proceeding with a gamified reputation system, development will focus on UX refinements that maximize utility and reduce friction for campus doubt-solving.

### 1. Feed-First Help UX Refinement
- **Feed as Primary Experience:** Make the campus doubt feed the primary authenticated experience on `/home`, rather than a profile dashboard.
- **Inline Answering:** Reduce friction by exploring an inline answer composer/expansion directly on feed cards, while retaining `/doubts/[id]` for full discussion and history.
- **Card Clarity:** Ensure doubt cards immediately convey title, useful preview, skill tags, urgency, author context, answer count, and resolution status.
- **Prominent Asking:** Keep the "Ask a Doubt" action prominent but non-intrusive.
- **Knowledge Signals:** Highlight accepted answers and resolved status as primary quality and trust signals.

### 2. Low-Friction Onboarding Refinement
- **Revisit Entry Requirements:** Reduce onboarding friction so students reach useful product features immediately without thinking "I'll finish this later."
- **Minimum Required Setup:** Limit initial setup to essential information:
  - Name
  - Academic context (department/year)
  - At least 3 skills
- **Progressive Setup:** Move availability and privacy configurations to optional progressive setup rather than blocking entry into the application.

### 3. Authentication & Trust Architecture (Approved: Institutional Google OAuth)

PeerSkill is a private, single-college network for Madhav Institute of Technology & Science (MITS). Institutional Google OAuth / OpenID Connect (OIDC) is approved as the **PRIMARY and ONLY** authentication mechanism for MITS student accounts.

#### Approved Student Domain & Scope
- **Approved Student Domain:** `@mitsgwl.ac.in` (strictly enforced during OAuth callback via ID token `hd` claim and email domain validation).
- **Faculty/Staff Domain:** `@mitsgwalior.in` (Faculty access remains out of initial product scope).

#### Approved Account Lifecycle
```
Sign in with MITS Google account (@mitsgwl.ac.in)
           ↓
Google-authenticated verified institutional identity
           ↓
Existing PeerSkill account OR Create PENDING account
           ↓
Low-Friction Onboarding (Name + Department + 3 Skills)
           ↓
ACTIVE
           ↓
/home (Campus Doubt Feed)
```

#### Authentication Architecture & Security Rules
- **Identity Layer:** Google OAuth 2.0 / OpenID Connect (OIDC) authenticates institutional student identity.
- **Application Session Management:** PeerSkill continues using its existing local HTTP-only `peerskill_session` cookie and SQLite `Session` model (`tokenHash`) for application session persistence and revocation.
- **No Local Passwords:** PeerSkill does **NOT** store local passwords.
- **No Custom Verification Tokens:** PeerSkill does **NOT** use custom local email verification tokens or verification links.
- **No Custom Password-Reset Tokens:** PeerSkill does **NOT** use custom local password reset tokens, forgot-password endpoints, or reset forms. Account recovery is delegated entirely to the institution's Google Workspace IT administration.
- **OAuth Callback Security:** The OAuth callback must validate PKCE code verifiers, state parameters (CSRF protection), ID token signatures (Google JWKS), expiration (`exp`), audience (`aud`), issuer (`iss`), and strictly enforce `hd === "mitsgwl.ac.in"`.
- **Future SSO Integration:** Future integration with Microsoft Azure AD / Office 365, Google Workspace Enterprise SSO, or SAML/OIDC providers remains future scope.

#### Obsoleted Functionality (Reclassified)
Under this approved architecture, the following previously planned local features are **OBSOLETE** and removed from scope:
- Local email/password signup and login
- Local email ownership verification tokens and verification pages
- Local forgot-password and password-reset token flows
- Local development email logger service for verification/reset links

---

# Deferred / Reconsidered Functionality

### Reconsidered / Deferred from Phase 3:
- **Reputation Points & Events:** No point counters, upvote/downvote point deltas, or audit events.
- **Answer Voting:** No upvote/downvote controls for now.
- **Skill-Specific Reputation:** No point accumulation per skill.
- **Leaderboards:** No per-skill or institutional leaderboards, rankings, or leaderboard UI.

### Deferred Future Phases (Preserved Boundaries):

# Phase 3 (Future) — Search & Knowledge Discovery

Goal:
Allow students to search campus knowledge, skills, and peers.

Features:
- Search people, skills, and doubts
- Department, year, availability, and skill-level filters
- Suggested helpers and mentor profiles

---

# Phase 4 — Connections

Goal:
Allow students to establish a relationship before messaging.

Features:
- Send / accept / decline connection requests
- Connection status and list

---

# Phase 5 — Messaging

Goal:
Allow controlled 1:1 communication between connected users or doubt participants.

Features:
- Conversation and message list
- Message history and locked messaging state
- Report / block access

---

# Phase 6 — Safety & Moderation

Goal:
Make the network safe and manageable.

Features:
- User, doubt, answer, and message reporting
- Block user
- Moderation queue, content hiding, and admin actions

---

# Phase 7 — Notifications & Polish

Goal:
Complete supporting interactions and polish UI flows.

Features:
- In-app notifications (answers, accepted status, connection requests)
- Similar resolved doubt suggestions
- Responsive & accessibility polish

---

# Core Product Loop

Sign in with MITS Google account (@mitsgwl.ac.in)
  ↓
Google-authenticated institutional identity
  ↓
academic profile + 3+ skills (low-friction onboarding)
  ↓
browse campus doubt feed / ask doubt
  ↓
answer doubt (inline / detail)
  ↓
accept answer
  ↓
resolved campus knowledge archive

Everything else comes after this loop works.

---

# Phase 0 Detailed Checklist

## 0.1 Repository

- [x] Git repository initialized
- [x] `.gitignore` configured
- [x] README exists
- [x] Project has a clean directory structure
- [x] No unnecessary files or dependencies

## 0.2 Next.js Application

- [x] Next.js application created
- [x] TypeScript configured
- [x] App Router configured
- [x] Development server runs
- [x] Production build succeeds

## 0.3 UI Foundation

- [x] Tailwind CSS configured
- [x] shadcn/ui configured
- [x] Base typography established
- [x] Base layout established
- [x] Responsive foundation established

## 0.4 Database

- [x] Prisma installed/configured
- [x] SQLite configured
- [x] Database connection works
- [x] Initial Prisma schema created
- [x] Prisma migration works
- [x] Prisma client works

## 0.5 Application Structure

- [x] Application routes structure established
- [x] Components structure established
- [x] Shared utilities structure established
- [x] Database access structure established
- [x] Validation structure established
- [x] Server/client boundaries are clear

## 0.6 Configuration

- [x] Environment variable strategy established
- [x] `.env` excluded from Git
- [x] `.env.example` created
- [x] No secrets committed

## 0.7 Testing

- [x] Testing framework configured
- [x] At least one test executes successfully
- [x] Test command documented
- [x] Build command documented
- [x] Lint/type-check commands documented

## 0.8 AI Development Rules

- [x] `AGENTS.md` created
- [x] AI understands project documentation
- [x] AI is instructed not to implement future phases
- [x] AI is instructed to run tests after changes
- [x] AI is instructed not to modify unrelated files

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
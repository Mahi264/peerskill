# PeerSkill Product Strategy

## 1. Problem

Students often get stuck on doubts that would be easy to solve if they could find the right peer on campus. Search engines, videos, AI tools, and large public forums can help, but they do not reliably connect a student to someone who understands the same college context, coursework, professors, and constraints.

The missing layer is not only content discovery. It is people discovery: "Who in my college knows this well enough to explain it?"

## 2. Product Thesis

PeerSkill is a private, verified campus network where students can:

- Create a skill-based profile.
- Ask and answer doubts.
- Search for peers and mentors by skill.
- Build visible reputation for helping others.
- Message safely when deeper help is needed.

The goal is to make useful peer expertise visible inside one institution.

## 3. Positioning

**One-line positioning:** PeerSkill is the private skill graph for your college.

**Short pitch:** Find students who know the skills you need, ask doubts, get answers, and build reputation by helping your campus.

**What it is:**

- A campus-only doubt-solving and skill-discovery platform.
- A searchable peer network.
- A lightweight reputation system for student helpers.

**What v1 is not:**

- A full LinkedIn replacement.
- A general social feed.
- A Discord replacement.
- A multi-college public network.
- An anonymous confession or gossip platform.

## 4. Target Users

### Primary

Students at a single college or institution, verified through institutional email.

### Initial Launch Segment

- Founding club members, around 40 students.
- Incoming orientation students, around 150-200 students.

### Future Users

- Alumni who retain access and may mentor juniors.
- Faculty or TAs who optionally help or moderate.
- Institution admins if the product later grows into an analytics or admin-supported platform.

## 5. Core Principles

1. **Single-college trust:** relevance and safety come from everyone belonging to the same verified institution.
2. **People-first discovery:** users should find the right person, not only old threads.
3. **Low-friction help:** asking and answering should feel quick, lightweight, and non-intimidating.
4. **Recognition drives contribution:** skill-specific reputation makes helping socially valuable.
5. **Safety is part of the core product:** reports, blocks, rate limits, and moderation must ship from day one.

## 6. Decided Product Scope

PeerSkill v1 focuses on the Q&A and skill-discovery loop:

- Verified account creation.
- Student profiles.
- Skill tags with self-rated levels.
- Asking and answering doubts.
- Upvotes, downvotes, and accepted answers.
- Skill-specific reputation.
- Search across people and resolved doubts.
- Basic mentor discovery.
- Connection requests.
- 1:1 messaging under clear rules.
- In-app notifications.
- Moderation, reporting, blocking, and admin verification.

Detailed feature scope lives in [Scope.md](Scope.md).

## 7. Engagement Drivers

- **Immediate utility:** students can get unstuck faster.
- **Bounded trust:** answers come from people in the same institution.
- **Recognition:** helping creates visible skill reputation.
- **Discovery:** users can find students outside their existing friend circle.
- **Institutional launch channel:** orientation and the founding club can solve cold start.

## 8. Resolved Decisions

| Question | Decision |
|---|---|
| Who seeds the network? | Founding club members plus orientation students |
| Who moderates v1? | The founding club |
| Is it free? | Yes, initially |
| Is v1 single-college or multi-college? | Single-college only |
| Do alumni retain access? | Yes |
| Does v1 include anonymous doubts? | No, deferred until moderation is proven |
| Does v1 include social feed, groups, events, and clubs? | No, deferred |

## 9. Product Risks

- **Cold start:** not enough skilled helpers for early doubts.
- **Trust and safety:** student-to-student messaging can create harassment or spam risk.
- **Quality control:** self-rated skills may be inaccurate before reputation history exists.
- **Retention:** if doubt volume is low, users may not return often.
- **Moderation capacity:** the founding club needs clear responsibility and escalation rules.

## 10. Product Strategy Response

- Start with one department or orientation cohort before expanding college-wide.
- Require at least three skill tags during onboarding.
- Show "people who might help" during doubt creation to prove discovery value.
- Make accepted answers the key reputation event.
- Ship reporting, blocking, rate limiting, and moderation queue in v1.
- Defer broad social features until the core doubt-resolution loop works.

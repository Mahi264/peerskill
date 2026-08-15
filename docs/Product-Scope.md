# PeerSkill MVP Scope

This file is the source of truth for what ships in v1.

## 1. MVP Goal

Prove that a verified student can ask a doubt and receive a useful answer from another student they may not already know.

**North Star Metric:** percentage of posted doubts that receive an accepted answer within 24 hours.

## 2. Must Have In V1

### 2.1 Identity & Profiles

- College email verification using OTP or magic link.
- Manual club-admin approval fallback.
- Profile fields: name, avatar or generated initials, department, branch, year, section, and bio.
- Skill tags with self-rated levels: Beginner, Intermediate, Advanced, Mentor.
- Privacy controls for contact visibility and chat request visibility.
- "Available to help" toggle.

Deferred:

- Resume upload.
- Portfolio links.
- Verified or endorsed skill badges.

### 2.2 Doubt-Solving

- Raise a doubt with title, description, attachments, skill tags, and urgency.
- Urgency values: Just curious, Assignment stuck, Project blocked, Exam prep.
- Answers on doubts.
- Upvote and downvote on doubts and answers.
- Asker can mark one answer as accepted.
- Resolved doubts remain searchable as a campus knowledge base.
- While posting, show a lightweight "people who might help" list based on matching Advanced or Mentor skill tags.
- Similar doubt suggestions use simple keyword search in v1.

Deferred:

- Automated top-mentor notification routing.
- NLP duplicate detection.
- Anonymous doubt posting.

### 2.3 Connections & Messaging

- Mutual connection requests.
- 1:1 chat.
- Chat is allowed after a connection is accepted or after one user answers the other's doubt.
- Blocking users.

Deferred:

- Follow model.
- Group chat.
- Native video, voice, or screen sharing.

### 2.4 Reputation

- Skill-specific points.
- Points for answer upvotes.
- Points for accepted answers.
- Per-skill college-wide leaderboard.

Deferred:

- Badges and titles.
- Department leaderboards.
- College-sponsored rewards.
- Resume-style "helped X students" impact stat.

### 2.5 Discovery & Search

- Search across people, skills, and resolved doubts.
- Filter people by skill, level, department, year, and availability.
- "Find a mentor" view for Advanced and Mentor users in a selected skill.

Deferred:

- Trending skills dashboard.
- People You May Know.
- Full campus directory browsing unrelated to skills.

### 2.6 Notifications

- New answer on your doubt.
- Your answer was accepted.
- New connection request.
- Connection accepted.
- Moderator action on your content.
- In-app notifications only.

Deferred:

- Email digests.
- Push notifications.
- Weekly summaries.

### 2.7 Moderation & Trust

These are non-negotiable for v1.

- Report users, doubts, answers, comments, and messages.
- Block users.
- Admin moderation queue.
- Hide or restore content.
- Warn or suspend users.
- Basic profanity and spam filtering.
- Rate limits on registration, verification, doubt creation, answers, comments, and messages.
- Published community guidelines.
- Moderation action logs.

### 2.8 Admin Tooling

- Bulk account verification.
- User search for verification and moderation.
- Moderation queue access.
- User suspension and reactivation.

Deferred:

- Full analytics dashboard.
- Rewards tooling.
- Institution-level reporting.

## 3. Explicitly Later

| Theme | Deferred Features | Reason |
|---|---|---|
| Social feed | Posts, achievements, reactions, ranked feed, milestone posts | Retention layer after core loop is validated |
| Campus networking | People You May Know, batch groups, club pages, presence | Valuable but larger than the v1 doubt-solving wedge |
| Groups and events | Study circles, workshops, RSVP, project boards | Separate product surface |
| Resource library | Notes, cheat sheets, course boards | Better after Q&A archive has content |
| Career prep | Interview experiences, resume reviews, mock interviews | Strong future use case, not needed for v1 proof |
| Skill verification | Peer endorsement, quizzes, verified badges | Needs activity history first |
| Smart routing | Auto-notify top mentors | Needs mentor density and anti-spam tuning |
| Semantic search | Embeddings or NLP duplicate detection | Needs enough resolved doubts to be useful |
| Anonymous posting | Anonymous doubts | Revisit after moderation is proven |

## 4. Success Metrics

### Activation

- Percentage of verified signups who complete a profile with at least three skill tags within 48 hours.
- Percentage of new users who post or answer a doubt within 7 days.

### Core Loop Health

- Doubt resolution rate within 24 hours.
- Median time to first answer.
- Answers per doubt.
- Percentage of doubts answered by someone the asker had no prior connection with.

### Engagement

- Weekly active users.
- Doubts posted per active user per week.
- Week 1 and Week 4 retention.
- Retention comparison between users who received an accepted answer and users who did not.

### Trust & Safety

- Reports per 1,000 user-generated items.
- Median moderation queue resolution time.
- Repeat offender rate.

### Growth

- New verified signups per week.
- Percentage of eligible campus population registered.

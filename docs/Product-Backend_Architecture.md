# PeerSkill Backend Architecture

## 1. Architecture Overview

PeerSkill v1 should use a modular monolith backend with a relational database. The product is still early, single-college, and trust-heavy, so the best backend posture is simple deployment, strong data integrity, and clean module boundaries that can later split into services if usage demands it.

Recommended stack:

- **API:** Node.js with NestJS or Express/Fastify, or Django/FastAPI if the team is stronger in Python.
- **Database:** PostgreSQL.
- **Cache / rate limits / sessions:** Redis.
- **File storage:** S3-compatible object storage for avatars, doubt attachments, and chat attachments.
- **Search:** PostgreSQL full-text search for v1; upgrade to Meilisearch/OpenSearch when search quality or scale requires it.
- **Realtime:** WebSocket gateway for chat and live notifications; polling is acceptable for the first internal pilot.
- **Background jobs:** BullMQ/Celery-style queue for email OTP, moderation checks, notification fanout, search indexing, and reputation recalculation.

Primary backend modules:

- Auth & verification
- Profiles & privacy
- Skills & reputation
- Doubts & answers
- Connections & messaging
- Search & discovery
- Notifications
- Moderation & safety
- Admin tooling

## 2. Core Data Model

Use UUID primary keys for externally visible entities. Add `created_at`, `updated_at`, and nullable `deleted_at` to user-generated tables to support moderation, soft deletes, and auditability.

### 2.1 Institution & Identity

```sql
institutions (
  id uuid primary key,
  name text not null,
  email_domain text not null unique,
  verification_mode text not null check (verification_mode in ('email_domain', 'manual')),
  created_at timestamptz not null
)

users (
  id uuid primary key,
  institution_id uuid not null references institutions(id),
  email citext not null unique,
  password_hash text,
  role text not null default 'student'
    check (role in ('student', 'club_admin', 'moderator', 'institution_admin')),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'active', 'suspended', 'deleted')),
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

email_verification_tokens (
  id uuid primary key,
  user_id uuid not null references users(id),
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null
)

profiles (
  user_id uuid primary key references users(id),
  full_name text not null,
  avatar_url text,
  department text not null,
  branch text,
  graduation_year int,
  section text,
  bio text,
  help_available boolean not null default true,
  help_status text,
  contact_visibility text not null default 'connections'
    check (contact_visibility in ('nobody', 'connections', 'college')),
  chat_request_visibility text not null default 'connections'
    check (chat_request_visibility in ('nobody', 'connections', 'college')),
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### 2.2 Skills & Reputation

```sql
skills (
  id uuid primary key,
  institution_id uuid references institutions(id),
  name citext not null,
  slug citext not null,
  category text,
  created_at timestamptz not null,
  unique (institution_id, slug)
)

user_skills (
  id uuid primary key,
  user_id uuid not null references users(id),
  skill_id uuid not null references skills(id),
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'mentor')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, skill_id)
)

skill_reputation (
  user_id uuid not null references users(id),
  skill_id uuid not null references skills(id),
  points int not null default 0,
  accepted_answers_count int not null default 0,
  upvotes_count int not null default 0,
  primary key (user_id, skill_id)
)

reputation_events (
  id uuid primary key,
  user_id uuid not null references users(id),
  skill_id uuid references skills(id),
  source_type text not null check (source_type in ('answer_upvote', 'answer_accepted', 'vote_reversal', 'moderation_reversal')),
  source_id uuid not null,
  points_delta int not null,
  created_at timestamptz not null
)
```

### 2.3 Doubts, Answers, Comments, Votes

```sql
doubts (
  id uuid primary key,
  institution_id uuid not null references institutions(id),
  author_id uuid not null references users(id),
  title text not null,
  body text not null,
  urgency text not null check (urgency in ('curious', 'assignment_stuck', 'project_blocked', 'exam_prep')),
  status text not null default 'open'
    check (status in ('open', 'answered', 'resolved', 'closed', 'hidden')),
  accepted_answer_id uuid,
  answer_count int not null default 0,
  score int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
)

doubt_skills (
  doubt_id uuid not null references doubts(id),
  skill_id uuid not null references skills(id),
  primary key (doubt_id, skill_id)
)

answers (
  id uuid primary key,
  doubt_id uuid not null references doubts(id),
  author_id uuid not null references users(id),
  body text not null,
  score int not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
)

comments (
  id uuid primary key,
  parent_type text not null check (parent_type in ('doubt', 'answer')),
  parent_id uuid not null,
  author_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
)

votes (
  id uuid primary key,
  user_id uuid not null references users(id),
  target_type text not null check (target_type in ('doubt', 'answer')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, target_type, target_id)
)

attachments (
  id uuid primary key,
  owner_type text not null check (owner_type in ('profile', 'doubt', 'answer', 'message')),
  owner_id uuid not null,
  uploader_id uuid not null references users(id),
  file_url text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  created_at timestamptz not null
)
```

### 2.4 Connections & Messaging

```sql
connections (
  id uuid primary key,
  requester_id uuid not null references users(id),
  receiver_id uuid not null references users(id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (requester_id, receiver_id),
  check (requester_id <> receiver_id)
)

conversation_members (
  conversation_id uuid not null,
  user_id uuid not null references users(id),
  last_read_at timestamptz,
  created_at timestamptz not null,
  primary key (conversation_id, user_id)
)

conversations (
  id uuid primary key,
  type text not null default 'direct' check (type in ('direct')),
  created_at timestamptz not null,
  updated_at timestamptz not null
)

messages (
  id uuid primary key,
  conversation_id uuid not null references conversations(id),
  sender_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null,
  deleted_at timestamptz
)
```

Messaging rule for v1: a direct conversation can be started only if users are connected, or if one user answered the other's doubt. Store that as service-layer authorization, not as a database-only rule.

### 2.5 Notifications, Moderation, Safety

```sql
notifications (
  id uuid primary key,
  user_id uuid not null references users(id),
  type text not null,
  actor_id uuid references users(id),
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null
)

reports (
  id uuid primary key,
  reporter_id uuid not null references users(id),
  target_type text not null check (target_type in ('user', 'doubt', 'answer', 'comment', 'message')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_moderator_id uuid references users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
)

moderation_actions (
  id uuid primary key,
  moderator_id uuid not null references users(id),
  target_type text not null,
  target_id uuid not null,
  action text not null check (action in ('hide', 'restore', 'warn', 'suspend_user', 'dismiss_report')),
  reason text,
  created_at timestamptz not null
)

blocks (
  blocker_id uuid not null references users(id),
  blocked_id uuid not null references users(id),
  created_at timestamptz not null,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
)
```

## 3. Indexing Strategy

Critical indexes:

- `users(institution_id, status)`
- `profiles(department, graduation_year, section)`
- `skills(institution_id, slug)`
- `user_skills(skill_id, level)`
- `skill_reputation(skill_id, points desc)`
- `doubts(institution_id, status, created_at desc)`
- `doubt_skills(skill_id, doubt_id)`
- `answers(doubt_id, score desc, created_at asc)`
- `votes(target_type, target_id)`
- `connections(receiver_id, status)` and `connections(requester_id, status)`
- `messages(conversation_id, created_at desc)`
- `notifications(user_id, read_at, created_at desc)`
- `reports(status, created_at asc)`

Search indexes:

- PostgreSQL `tsvector` index on `doubts(title, body)`.
- PostgreSQL `tsvector` index on `profiles(full_name, department, branch, bio)`.
- Trigram index on `skills.name` for typo-tolerant skill search.

## 4. API Contract

Use REST for v1. Keep resource URLs predictable and versioned under `/api/v1`. Use cursor pagination for feeds, messages, search results, and leaderboards.

Common response shape:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "nextCursor": null
  }
}
```

Common error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required.",
    "details": {}
  }
}
```

### 4.1 Auth

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create pending user with college email |
| `POST` | `/auth/send-verification` | Send OTP or magic link |
| `POST` | `/auth/verify-email` | Verify token and activate user |
| `POST` | `/auth/login` | Login with email/password or magic link completion |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET` | `/me` | Current user, role, profile completion |

Example register:

```json
POST /api/v1/auth/register
{
  "email": "student@college.edu",
  "fullName": "Aarav Mehta",
  "department": "Computer Science",
  "graduationYear": 2027,
  "section": "B"
}
```

### 4.2 Profiles & Skills

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/profiles/{userId}` | Public profile within institution |
| `PATCH` | `/profiles/me` | Update own profile |
| `PATCH` | `/profiles/me/privacy` | Update privacy controls |
| `PATCH` | `/profiles/me/availability` | Toggle help availability |
| `GET` | `/skills` | Search/list skills |
| `PUT` | `/profiles/me/skills` | Replace own skill list |
| `GET` | `/profiles/{userId}/reputation` | Skill-specific reputation |

Example skill update:

```json
PUT /api/v1/profiles/me/skills
{
  "skills": [
    { "skillId": "uuid", "level": "advanced" },
    { "name": "React", "level": "mentor" }
  ]
}
```

### 4.3 Doubts & Answers

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/doubts` | Raise a doubt |
| `GET` | `/doubts` | List doubts by status, skill, search |
| `GET` | `/doubts/{doubtId}` | Doubt detail with answers |
| `PATCH` | `/doubts/{doubtId}` | Edit own doubt |
| `DELETE` | `/doubts/{doubtId}` | Soft-delete own doubt |
| `POST` | `/doubts/{doubtId}/answers` | Answer a doubt |
| `PATCH` | `/answers/{answerId}` | Edit own answer |
| `POST` | `/answers/{answerId}/accept` | Asker accepts an answer |
| `POST` | `/votes` | Upvote/downvote doubt or answer |
| `DELETE` | `/votes/{voteId}` | Remove vote |
| `POST` | `/comments` | Add comment to doubt or answer |

Example create doubt:

```json
POST /api/v1/doubts
{
  "title": "How do C++ include guards actually prevent duplicate imports?",
  "body": "I understand #include copies files, but I get confused when headers include each other.",
  "urgency": "assignment_stuck",
  "skillIds": ["uuid-cpp", "uuid-dsa"],
  "attachmentIds": []
}
```

Example create answer:

```json
POST /api/v1/doubts/{doubtId}/answers
{
  "body": "Think of #include as textual copy-paste before compilation..."
}
```

### 4.4 Discovery & Search

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/search?q=&type=` | Unified search across people and doubts |
| `GET` | `/people` | Filter people by skill, level, department, year |
| `GET` | `/mentors?skillId=` | Advanced/Mentor users for a skill |
| `GET` | `/doubts/suggestions?title=` | Keyword-based similar doubts before posting |
| `GET` | `/leaderboards/skills/{skillId}` | Per-skill leaderboard |

Example people query:

```text
GET /api/v1/people?skillId=uuid-react&level=mentor&department=Computer%20Science&available=true
```

### 4.5 Connections & Messaging

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/connections` | Send connection request |
| `GET` | `/connections` | List pending/accepted connections |
| `POST` | `/connections/{id}/accept` | Accept request |
| `POST` | `/connections/{id}/decline` | Decline request |
| `POST` | `/conversations` | Start direct conversation if allowed |
| `GET` | `/conversations` | List conversations |
| `GET` | `/conversations/{id}/messages` | Paginated messages |
| `POST` | `/conversations/{id}/messages` | Send message |
| `POST` | `/blocks` | Block a user |

### 4.6 Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notifications` | List in-app notifications |
| `POST` | `/notifications/{id}/read` | Mark one read |
| `POST` | `/notifications/read-all` | Mark all read |

Notification events in v1:

- New answer on your doubt
- Your answer was accepted
- New connection request
- Connection accepted
- Moderator action on your content

### 4.7 Moderation & Admin

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/reports` | Report user/content/message |
| `GET` | `/admin/reports` | Moderation queue |
| `POST` | `/admin/reports/{id}/assign` | Assign moderator |
| `POST` | `/admin/moderation/actions` | Hide/restore/warn/suspend/dismiss |
| `GET` | `/admin/users` | Search users for verification/moderation |
| `POST` | `/admin/users/bulk-verify` | Bulk activate verified students |
| `PATCH` | `/admin/users/{id}/status` | Suspend/reactivate user |

## 5. Authentication Strategy

### 5.1 Verification

V1 should use college email verification as the primary trust boundary.

Flow:

1. Student enters college email and basic profile details.
2. Backend validates email domain against `institutions.email_domain`.
3. Backend creates a `pending_verification` user.
4. OTP or magic link is sent.
5. Verification activates the account and creates default profile records.
6. If the institution uses manual approval, the account remains pending until a club admin verifies it.

OTP rules:

- Store only hashed OTP/token values.
- Expire tokens after 10-15 minutes.
- Rate-limit sends by email and IP.
- Invalidate old tokens after successful verification.

### 5.2 Sessions

Recommended approach:

- Short-lived access token: 15 minutes.
- Rotating refresh token: 14-30 days.
- Store refresh token hashes server-side for revocation.
- Use secure, HTTP-only cookies for web clients.
- Use Authorization Bearer tokens only if a mobile client needs it.

### 5.3 Authorization

Use role-based access control plus ownership checks.

Roles:

- `student`: normal app access.
- `club_admin`: account verification and basic admin tooling.
- `moderator`: moderation queue and content actions.
- `institution_admin`: future analytics and institution-level controls.

Rules:

- Users can only access data inside their own institution.
- Users can edit only their own profile, doubts, answers, comments, and messages.
- Moderators can hide content and suspend users, but all actions must write `moderation_actions`.
- Anonymous posting is out of v1 scope, but the schema should avoid exposing author email through public APIs.

### 5.4 Privacy

Enforce privacy in API serializers, not only on the frontend.

- Hide contact details unless visibility allows it.
- Hide blocked users from search, feeds, messaging, and profile discovery.
- Do not return deleted or hidden content to normal users.
- Messages should only be visible to conversation members.

## 6. Business Logic Rules

### Doubt lifecycle

- New doubt starts as `open`.
- First answer changes status to `answered`.
- Accepted answer changes status to `resolved`.
- Moderator hide changes status to `hidden`.
- Owner delete sets `deleted_at`.

### Voting

- One vote per user per target.
- Users cannot vote on their own answers or doubts.
- Vote changes update denormalized `score`.
- Answer upvote creates reputation event for the answer author.

### Accepted answer

- Only the doubt author can accept an answer.
- Only one accepted answer per doubt.
- Accepting an answer creates skill reputation events for all skills attached to that doubt.
- Changing accepted answer should reverse prior reputation events and apply new ones.

### Messaging

- User A can message User B if they are connected.
- User A can message User B if either answered the other's doubt.
- Blocked users cannot create conversations or send messages.
- Message attachments require file scanning and size limits.

## 7. Scaling Notes

### MVP scale assumptions

Initial expected usage is one college, starting with 40 club users plus 150-200 orientation users. A modular monolith with PostgreSQL can comfortably handle this and many more institutions later if tenant isolation is done correctly from day one.

### Near-term scaling posture

- Keep `institution_id` on all major user/content tables for tenant filtering.
- Add strict pagination to all list endpoints.
- Use Redis for rate limits, hot counters, and notification unread counts.
- Run file uploads directly to object storage using signed URLs.
- Move notification fanout, reputation updates, and moderation scanning to background jobs.
- Denormalize counts like `answer_count`, `score`, and unread counts, but preserve source-of-truth event rows.

### Search scaling

V1:

- PostgreSQL full-text search and trigram indexes.
- Simple keyword-based similar doubt suggestions.

V2:

- Move unified search to Meilisearch/OpenSearch if ranking, typo tolerance, or result speed becomes a bottleneck.
- Add asynchronous indexing jobs.
- Add embeddings only after there is enough resolved-doubt data to justify semantic search.

### Database scaling

V1:

- Single PostgreSQL primary with automated backups.
- Read replicas are unnecessary at launch.
- Use connection pooling.

V2:

- Add read replica for search-heavy discovery if needed.
- Partition high-volume tables by institution or time: `messages`, `notifications`, `votes`, `reputation_events`.
- Archive old notifications and soft-deleted message bodies after a retention period.

### Realtime scaling

V1:

- In-app notifications can use polling.
- Chat can start with polling or a single WebSocket gateway.

V2:

- Use Redis pub/sub or a managed realtime service to fan out events across multiple API instances.
- Store delivery/read receipts separately if chat becomes central.

### Safety scaling

- Rate-limit register, OTP send, login, doubt creation, answer creation, comment creation, and message send.
- Add spam/profanity checks before publishing user-generated text.
- Queue suspicious content for moderation instead of blocking everything synchronously.
- Maintain immutable moderation action logs.

## 8. Security Requirements

- Hash passwords with Argon2id or bcrypt if password login is supported.
- Hash OTP and refresh tokens before storage.
- Validate file type and size before accepting uploads.
- Virus-scan attachments if file sharing becomes active.
- Use signed URLs for private attachments.
- Escape/sanitize rich text and code blocks before rendering.
- Apply CSRF protection if cookie-based auth is used.
- Add audit logs for admin actions, user suspension, report resolution, and bulk verification.
- Encrypt secrets using environment-level secret management.
- Back up PostgreSQL daily at minimum, with restore drills before public launch.

## 9. Suggested MVP Build Order

1. Auth, email verification, profile setup.
2. Skills and user skill levels.
3. Raise doubt, answer, accept answer.
4. Voting and skill reputation.
5. People/mentor discovery.
6. Connections and gated 1:1 messaging.
7. In-app notifications.
8. Reports, blocks, moderation queue.
9. Admin bulk verification.
10. Search and similar doubt suggestions.

This order preserves the core loop: verified student joins, declares skills, asks a doubt, discovers someone useful, receives an answer, accepts it, and the helper earns visible reputation.

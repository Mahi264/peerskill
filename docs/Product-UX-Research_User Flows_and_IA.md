## Core IA / Sitemap
```text
PeerSkill
├─ Auth & Verification
│  ├─ Sign up / Log in
│  ├─ College email OTP / magic link
│  └─ Manual approval pending
│
├─ Onboarding
│  ├─ Basic profile
│  ├─ Department / branch / year / section
│  ├─ Add 3+ skill tags
│  ├─ Set skill levels
│  └─ Privacy + help availability
│
├─ Home
│  ├─ Search
│  ├─ Raise a Doubt
│  ├─ Recent / relevant doubts
│  ├─ Suggested people who can help
│  └─ Notifications
│
├─ Doubts
│  ├─ Raise a Doubt
│  ├─ Doubt detail
│  ├─ Answers
│  ├─ Accepted answer
│  └─ Resolved archive
│
├─ Find Help
│  ├─ Search people
│  ├─ Filter by skill
│  ├─ Filter by department / year
│  └─ Mentor profile preview
│
├─ Messages
│  ├─ Connection requests
│  ├─ 1:1 chat
│  └─ Post-answer chat unlock
│
├─ Profile
│  ├─ Skills + levels
│  ├─ Skill-specific reputation
│  ├─ Doubts asked
│  ├─ Answers given
│  ├─ Privacy settings
│  └─ Available to help toggle
│
├─ Leaderboards
│  └─ Per-skill college-wide ranking
│
├─ Safety
│  ├─ Report post / answer / user
│  ├─ Block user
│  └─ Community guidelines
│
└─ Admin, non-student MVP surface
   ├─ Bulk verification
   └─ Moderation queue
```

## Primary User Flows
### 1. New Student Activation Flow
```mermaid
flowchart TD
A[Land on PeerSkill] --> B[Sign up with college email]
B --> C{Email pattern verified?}
C -->|Yes| D[OTP or magic link verified]
C -->|No| E[Manual approval pending]
E --> F[Admin approves]
F --> D
D --> G[Create basic profile]
G --> H[Select department, branch, year, section]
H --> I[Add at least 3 skill tags]
I --> J[Set skill level per tag]
J --> K[Set privacy + chat preferences]
K --> L[Choose Available to Help on/off]
L --> M[Home with suggested doubts and mentors]
```

Success criteria:
- Student completes profile within 48 hours.
- Student adds 3+ skill tags.
- Student sees immediate value on first session.

### 2. Raise a Doubt Flow
```mermaid
flowchart TD
A[Student stuck on problem] --> B[Tap Raise a Doubt]
B --> C[Enter title]
C --> D[Add description]
D --> E[Attach image/file/code if needed]
E --> F[Add skill tags]
F --> G[Set urgency]
G --> H[Search-as-you-type shows similar resolved doubts]
H --> I{Existing answer useful?}
I -->|Yes| J[Open resolved doubt]
I -->|No| K[Post doubt]
K --> L[Show people who might help]
L --> M[Asker may send connection/chat request]
K --> N[Doubt appears in relevant feeds/search]
N --> O[Answers received]
O --> P[Asker marks accepted answer]
P --> Q[Doubt becomes resolved archive item]
```

Success criteria:
- Doubt posted in under 60 seconds.
- Similar resolved doubts reduce duplicate posting.
- Accepted answer within 24 hours.

### 3. Answer / Help Flow
```mermaid
flowchart TD
A[Student opens Home or skill feed] --> B[Sees doubt matching skill]
B --> C[Open doubt detail]
C --> D{Can answer now?}
D -->|Yes| E[Write answer]
D -->|No| F[Save / ignore]
E --> G[Submit answer]
G --> H[Asker notified]
H --> I{Answer accepted?}
I -->|Yes| J[Earn skill-specific reputation]
I -->|No| K[May receive upvotes]
J --> L[Ranking improves on skill leaderboard]
K --> L
```

Success criteria:
- Helpers can identify relevant doubts quickly.
- Answering creates visible recognition.
- Reputation is tied to the specific skill tag.

### 4. Find a Mentor Flow
```mermaid
flowchart TD
A[Student needs a person, not just an answer] --> B[Open Find Help]
B --> C[Search skill or topic]
C --> D[Filter by skill level: Advanced/Mentor]
D --> E[Optional filters: department/year]
E --> F[View mentor profiles]
F --> G{Connection allowed?}
G -->|Yes| H[Send connection request]
G -->|No| I[View public profile only]
H --> J{Accepted?}
J -->|Yes| K[1:1 chat unlocked]
J -->|No| L[Wait / find another mentor]
```

Success criteria:
- Student can discover someone outside their existing network.
- Supports metric: doubts answered by someone with no prior connection.

### 5. Messaging Unlock Flow
```mermaid
flowchart TD
A[Student wants to chat] --> B{Relationship context}
B -->|Mutual connection| C[Chat available]
B -->|Helper answered my doubt| C
B -->|No connection/no answer| D[Send connection request]
D --> E{Accepted?}
E -->|Yes| C
E -->|No| F[Chat unavailable]
C --> G[1:1 conversation]
G --> H[Report/block available from chat]
```

Success criteria:
- Messaging supports help without becoming open DM spam.
- Safety controls remain reachable.

## Key UX Decisions
- Home should prioritize **Search**, **Raise a Doubt**, and **relevant unanswered doubts**, not a general social feed.
- “Find a mentor” should be a top-level student destination because people discovery is part of the product’s differentiation.
- Onboarding should require 3 skill tags before the experience feels complete, matching activation metrics.
- The Q&A archive is the MVP knowledge base; no separate resource library in v1.
- Anonymous posting, social feed, groups, events, badges, and advanced dashboards stay out of MVP.

## Test Plan
Validate with 5-8 institution students across new and existing cohorts:
- Can a new student complete signup and profile setup without explanation?
- Can a student raise a doubt in under 60 seconds?
- Can a helper find a relevant unanswered doubt within 2 minutes?
- Can a student find a mentor for a skill and understand why that person is suggested?
- Do students understand when chat is available and when it is locked?
- Do students notice report/block controls without feeling unsafe?
- Can students distinguish self-rated skill level from earned reputation?

## Assumptions
- MVP is single-institution only.
- Student club handles moderation and manual approvals.
- In-app notifications only for launch.
- Alumni retain access but are not a primary MVP journey.
- Admin tooling is minimal and separate from the student IA.

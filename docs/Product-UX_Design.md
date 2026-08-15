# PeerSkill UX Design

## 1. Experience North Star

PeerSkill should feel like the campus finally became searchable.

The product should feel trusted enough for academic help, lightweight enough for students to ask without embarrassment, and rewarding enough that skilled students want to answer.

**Design keywords:** campus-native, helpful, credible, focused, searchable, low-pressure, high-craft.

**Emotional promise:** "Someone here knows this, and I can reach them without feeling awkward."

## 1.1 Craft Direction

PeerSkill should borrow the polish of Awwwards-level digital products without copying their common usability traps.

The app should feel premium through detail: rhythm, typography, motion, depth, empty states, and memorable identity. It should not feel premium by hiding navigation, slowing the user down, or turning basic actions into experiments.

Use high-craft moments around:

- College verification and first onboarding.
- Search opening and live result grouping.
- Raising a doubt.
- Suggested helpers appearing after skill tags are selected.
- Accepted answer and reputation gain.
- Profile skill/reputation presentation.

Keep these surfaces simple and direct:

- Doubt reading.
- Answer writing.
- Moderation actions.
- Report/block controls.
- Admin verification.
- Messaging.

Product rule: if a student is stressed, stuck, or reporting a safety issue, the interface becomes calm and obvious.

## 2. Moodboard

### Visual References

- LinkedIn for credible profiles, but warmer and less corporate.
- Stack Overflow for structured answers, accepted solutions, and reputation, but less intimidating.
- Notion and Linear for calm hierarchy, useful empty states, and fast search.
- Campus ID cards, notice boards, club posters, and workshop photos for local identity.
- Awwwards-style craft for refined typography, cinematic but short transitions, tactile hover states, and memorable onboarding.

### Mood

- **Trust:** off-white backgrounds, readable type, visible verification, restrained borders.
- **Helpfulness:** clear question cards, obvious answer states, visible mentor availability.
- **Recognition:** skill reputation, leaderboard surfaces, accepted-answer moments.
- **Safety:** report/block controls that are visible but not alarming.

### Art Direction

- Prefer real campus and student activity imagery when available.
- Avoid generic stock laptop illustrations.
- Use initials avatars with department-colored rings when users do not upload photos.
- Use small badge and tag accents rather than decorative graphics.
- Build a recognizable visual motif around "skill nodes": small connected points used in onboarding, search loading, profile skill maps, and accepted-answer moments.
- Use subtle paper/card textures only if they stay very light and do not reduce readability.
- Use asymmetry sparingly on landing/auth/onboarding screens; keep core app pages structured and scannable.

### Awwwards-Inspired, Product-Safe Patterns

- **Command-style search reveal:** search can open as a polished overlay with grouped results, keyboard support, and soft background dim.
- **Tactile cards:** cards can lift by 2-4px on hover with border brightening and a small content shift, but content must not reflow.
- **Skill node trail:** selected skill tags can connect visually to suggested helpers, making the matching logic feel tangible.
- **Accepted answer moment:** a short check animation, reputation delta, and pinned answer transition.
- **Profile identity panel:** student profiles can have a distinctive header with skill chips, reputation, and availability arranged like a compact personal dashboard.
- **Empty states:** use clever, useful empty states that suggest the next best action instead of generic illustration filler.

Avoid:

- Mystery navigation.
- Long loaders.
- Horizontal scroll as a primary interaction.
- Scroll-jacked pages.
- Hidden controls.
- Decorative motion on answer-reading or admin screens.
- Oversized hero-style layouts inside the logged-in app.

## 3. Branding Direction

**Brand positioning:** the private skill graph for your college.

**Tone:** friendly, direct, student-native, and non-corporate.

**Visual identity idea:** a quiet academic base with bright, precise skill signals. The product should look like a serious tool that still belongs to students, not an enterprise dashboard.

Preferred copy:

- "Ask a doubt"
- "Find someone who knows React"
- "Help a peer"
- "Available to help"
- "Accepted answer"

Avoid:

- "Grow your professional network"
- "Unlock your potential"
- "Synergize peer learning"

Tagline options:

- "Find the skill next door."
- "Your campus, searchable."
- "Ask peers. Build skills. Get known."

Logo direction:

- Wordmark: `PeerSkill`
- Icon concept: a `P` formed from two connected nodes or a profile/chat overlap.
- Motion concept: the two nodes connect on app launch, then settle quickly into the wordmark or app icon.

## 4. Design Tokens

### Color

| Token | Value | Usage |
|---|---:|---|
| `--color-bg` | `#F7F6F2` | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels, menus |
| `--color-surface-muted` | `#EEF3F2` | Secondary panels |
| `--color-text` | `#17201D` | Primary text |
| `--color-text-muted` | `#65716C` | Metadata and helper text |
| `--color-border` | `#DCE3DF` | Dividers and input borders |
| `--color-primary` | `#145C54` | Primary actions and active nav |
| `--color-primary-hover` | `#0F4943` | Primary hover state |
| `--color-accent` | `#F6B73C` | Reputation and achievement highlights |
| `--color-skill-blue` | `#2F80ED` | Technical skill tags |
| `--color-skill-green` | `#27AE60` | Mentor and available states |
| `--color-danger` | `#D64545` | Reports and destructive actions |
| `--color-warning` | `#B7791F` | Urgent doubts and pending moderation |
| `--color-success` | `#1F8A5B` | Accepted answers and completed states |
| `--color-glow-primary` | `rgba(20, 92, 84, 0.16)` | Focus glow and premium hover accents |
| `--color-glow-accent` | `rgba(246, 183, 60, 0.22)` | Reputation and accepted-answer glow |

### Typography

| Token | Value | Usage |
|---|---|---|
| `--font-sans` | `Inter`, `Geist`, `system-ui`, sans-serif | Product UI |
| `--font-mono` | `JetBrains Mono`, `Consolas`, monospace | Code snippets |
| `--text-xs` | `12px / 16px` | Metadata and labels |
| `--text-sm` | `14px / 20px` | Compact body |
| `--text-md` | `16px / 24px` | Default body |
| `--text-lg` | `20px / 28px` | Section titles |
| `--text-xl` | `28px / 36px` | Page titles |
| `--text-hero` | `48px / 56px` | Auth/onboarding intro only |

### Spacing

| Token | Value |
|---|---:|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### Radius, Shadow, Motion

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Inputs and chips |
| `--radius-md` | `8px` | Cards and menus |
| `--radius-lg` | `14px` | Modals and large panels |
| `--shadow-sm` | `0 1px 2px rgba(23, 32, 29, 0.08)` | Card lift |
| `--shadow-md` | `0 8px 24px rgba(23, 32, 29, 0.12)` | Menus and modals |
| `--motion-fast` | `120ms ease-out` | Hover and tap feedback |
| `--motion-base` | `180ms ease-out` | Drawers, menus, cards |
| `--motion-slow` | `260ms ease-out` | Page transitions and modals |
| `--motion-spring` | `320ms cubic-bezier(.2, .9, .2, 1)` | Accepted answer, search reveal, onboarding step change |

### Motion Principles

- Motion should explain state change, not decorate it.
- Most interactions should complete within 120-260ms.
- Premium transitions can use 320ms only for onboarding, search reveal, and accepted-answer moments.
- Respect reduced-motion settings by replacing movement with opacity and color changes.
- Never animate text in ways that delay reading a doubt or answer.

## 5. Component Library

### Navigation

- **App shell:** left sidebar on desktop, bottom tab bar on mobile.
- **Primary nav:** Home, Ask, Search, Messages, Profile.
- **Admin nav:** Verification, Reports, Users.
- **Global search:** persistent search across people, skills, and resolved doubts.
- **Search command overlay:** premium interaction layer for desktop and mobile, with grouped results and keyboard-first navigation.

### Identity

- **Student avatar:** photo or initials with department-colored ring.
- **Profile header:** name, department/year, skill summary, availability, primary CTA.
- **Skill chip:** skill name plus level.
- **Availability pill:** Available, Busy, or Not accepting help requests.
- **Reputation badge:** skill-specific points and accepted answers.
- **Skill constellation:** optional profile module that visually groups top skills and reputation without replacing the normal list.

### Doubt Solving

- **Doubt card:** title, urgency, tags, answer count, status, author context.
- **Doubt composer:** title, description, attachments, tags, urgency, and suggested helpers.
- **Answer card:** author, skill credibility, answer body, vote controls, accepted state.
- **Similar doubts panel:** keyword-based suggestions before posting.
- **Accepted answer state:** check icon, green border, pinned position.
- **Helper match strip:** horizontal row of suggested helpers that appears after tags are selected; each card explains why the user is suggested.
- **Reputation delta toast:** compact post-action feedback such as `+10 React reputation`.

### Discovery

- **People card:** avatar, name, year, department, top skills, availability, CTA.
- **Mentor row:** skill level, reputation, accepted answers, response CTA.
- **Filter controls:** skill, level, department, year, availability.
- **Leaderboard row:** rank, student, skill reputation, accepted answers.

### Messaging

- **Conversation list item:** user, latest message, unread count, context label.
- **Message bubble:** sender, content, attachment preview, timestamp.
- **Connection request card:** requester context and accept/decline actions.
- **Blocked state:** clear disabled messaging state with unblock control.

### Moderation/Admin

- **Report queue item:** target preview, reason, reporter, status, action buttons.
- **User verification row:** email, profile info, status, approve/reject.
- **Moderation action modal:** action, reason, confirmation, audit note.

## 6. Key Screens

### 6.1 College Verification

Purpose: establish trust before the user enters the network.

Key elements:

- College email field.
- OTP or magic-link verification.
- Manual approval status when needed.
- Clear copy that the space is limited to verified college members.

Craft notes:

- First screen can be the most visually expressive part of the product.
- Use the skill-node motif, college-domain trust cue, and a short transition from email verification into onboarding.
- Keep the email field and CTA immediately visible. No cinematic intro before the form.

### 6.2 Profile Setup

Purpose: collect enough data to make discovery useful.

Key elements:

- Name, department, branch, year, section.
- Avatar or generated initials.
- Bio.
- At least three skill tags.
- Skill level for each tag.
- Availability to help.
- Privacy controls.

Craft notes:

- Show onboarding progress as a clean stepper.
- Skill selection should feel tactile: selected tags snap into a small cluster, and suggested tags adapt based on department/year.
- After three skills are added, show a small preview of matching doubts or mentors to create immediate value.

### 6.3 Home Dashboard

Purpose: orient the student around their active help loop.

Key modules:

- Ask a doubt CTA.
- Open doubts matching my skills.
- My recent doubts.
- New answers and accepted-answer notifications.
- Suggested mentors for recently searched skills.

This is not a social feed in v1.

Craft notes:

- Home should feel like a focused mission control surface, not a feed wall.
- Use a strong "Ask a doubt" module, but keep matching doubts and notifications above the fold.
- Avoid decorative hero sections once the user is logged in.

### 6.4 Ask A Doubt

Purpose: make asking fast and route the student toward useful people.

Flow:

1. Enter title.
2. Show similar resolved doubts.
3. Add description, attachments, skill tags, and urgency.
4. Show people who might help.
5. Publish doubt.

Urgency labels:

- Just curious
- Assignment stuck
- Project blocked
- Exam prep

Craft notes:

- Treat this as the signature interaction of v1.
- Similar doubts should slide in gently without stealing focus.
- Suggested helpers should appear as evidence of the product promise: "the right person exists here."
- The final publish state should be calm and reassuring, not celebratory.

### 6.5 Doubt Detail

Purpose: support readable answers and clear resolution.

Key elements:

- Question title, body, urgency, and tags.
- Author context.
- Answer editor.
- Ranked answers.
- Vote controls.
- Accepted answer state.
- Comments for follow-up.
- Related resolved doubts.

Craft notes:

- This screen should prioritize reading comfort over visual drama.
- Code blocks must use excellent spacing, copy controls, and readable contrast.
- Accepted answer animation should be brief: pin, check, reputation delta.

### 6.6 Search And Mentor Discovery

Purpose: find people and resolved answers quickly.

Key elements:

- Search input.
- Segmented results: People, Skills, Doubts.
- Filters for department, year, skill level, and availability.
- Mentor list for Advanced and Mentor users.

Craft notes:

- Search is the second signature interaction after asking a doubt.
- Results should explain why each person appears: skill match, level, reputation, department, availability.
- Keyboard navigation on desktop makes the experience feel fast and polished.

### 6.7 Student Profile

Purpose: show identity, credibility, and safe contact options.

Key elements:

- Name, avatar, department, year.
- Availability state.
- Skills and levels.
- Skill-specific reputation.
- Recent answers.
- Connection or message CTA based on permissions.
- Report/block menu.

Craft notes:

- Profiles should feel personally distinctive but remain comparable.
- Use skill reputation as the visual anchor, not vanity metrics.
- Contact actions should be clear and permission-aware.

### 6.8 Messages

Purpose: allow deeper help after trust is established.

Key elements:

- Conversation list.
- Direct chat.
- Connection request entry points.
- Context label when chat was unlocked through a doubt.
- Block/report controls.

### 6.9 Admin Moderation

Purpose: let the founding club operate trust and safety.

Key elements:

- Bulk verification.
- Report queue.
- User search.
- Hide/restore content.
- Warn/suspend users.
- Moderation action history.

## 7. Information Architecture

```text
PeerSkill
|-- Home
|   |-- Matching doubts
|   |-- My doubts
|   |-- Notifications summary
|-- Ask
|   |-- Create doubt
|   |-- Similar doubts
|   |-- Suggested helpers
|-- Search
|   |-- People
|   |-- Skills
|   |-- Resolved doubts
|   |-- Leaderboards
|-- Messages
|   |-- Conversations
|   |-- Connection requests
|-- Profile
|   |-- Skills
|   |-- Reputation
|   |-- Privacy
|-- Admin
    |-- Verification
    |-- Reports
    |-- Users
```

## 8. Interaction Specs

### Search

- Search expands into grouped live results.
- Empty search shows popular skills and recent resolved doubts.
- People results prioritize matching skill level and availability.
- Opening search dims the app behind it and focuses the input immediately.
- Pressing `/` should open search on desktop.
- Result groups should animate in with a stagger no longer than 120ms total.

### Ask A Doubt

- Similar doubt suggestions appear after a meaningful title is entered.
- Skill tag selection updates suggested helpers immediately.
- Publishing shows a confirmation with the number of suggested helpers available.
- If similar doubts appear, keep the post form visible so the user does not feel blocked.
- Suggested helper cards should show the reason: `Mentor in C++`, `12 accepted answers`, `Available now`.
- The post success state should offer two actions: view doubt or find more helpers.

### Voting And Accepted Answers

- Vote changes update score instantly, then reconcile with the server.
- Accepting an answer pins it and shows the helper's reputation gain.
- If the asker upvotes an answer but does not accept it, the interface can gently ask whether it solved the doubt.
- Accepted answer uses a short check animation and green left border.
- Reputation gain appears as a compact toast, then disappears automatically.

### Availability

- Availability toggle updates immediately.
- Users can add a short status such as "Busy with exams" or "Back tomorrow."
- Help CTAs adapt based on availability and messaging permissions.
- Availability should feel like a status signal, not a commitment to answer everything.
- Turning availability off should never block normal connections unless privacy settings do.

### Page Transitions

- Auth to onboarding can use the strongest transition.
- Main app navigation should be quick: fade and slight vertical movement only.
- Back navigation should feel instant.
- Admin screens should avoid expressive transitions.

### Moderation

- Report action is available from profile, doubt, answer, comment, and message menus.
- Blocking immediately prevents messaging and hides the blocked user from discovery where appropriate.
- Moderator actions require a reason and create an audit record.

## 9. Responsive Behavior

- Desktop uses sidebar navigation and a centered content column.
- Search and filter results can use a secondary right panel on desktop.
- Mobile uses bottom navigation.
- Filters open in a full-screen sheet on mobile.
- People cards become compact rows on mobile.
- Vote controls remain reachable on doubt detail screens.

## 10. Accessibility And Trust

- Meet WCAG AA contrast for all text and controls.
- Icon-only buttons need accessible labels and tooltips.
- Do not rely on color alone for accepted answers, urgency, or status.
- Respect reduced-motion preferences.
- Privacy and moderation copy must be plain and specific.
- Hidden or deleted content should never appear in normal user views.

## 11. Design Quality Bar

Before a screen is considered ready, check:

- The primary action is visible within 3 seconds.
- The layout is understandable without onboarding text.
- Motion helps the user understand what changed.
- Empty states suggest a useful next action.
- Search and Ask remain faster than asking in a random group chat.
- Safety actions are reachable but not visually dominant.
- Mobile screens preserve the same core action priority as desktop.
- The interface feels crafted, but never precious.

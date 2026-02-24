# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Context

The user is a product manager learning to vibe code with no prior coding experience. When explaining changes, decisions, or errors:
- Use plain language — avoid jargon or explain it briefly when unavoidable
- Explain *what* is happening and *why*, not just *how*
- When something breaks, explain the root cause in simple terms before jumping to the fix
- Keep responses concise but never assume prior knowledge of code concepts

## Commands

- **Dev server:** `npm run dev` (Next.js development server on port 3000)
- **Build:** `npm run build` (production build)
- **Start:** `npm start` (production server)
- **Run migrations:** `npx tsx lib/migrate.ts` (creates database tables)
- **Cleanup job:** `npx tsx lib/cleanup.ts` (deletes old rooms and expired sessions)
- **Clear build cache:** `rm -rf .next` (fixes webpack module errors)
- **No test runner configured** — manual testing only (see PRD Testing Checklist)

## Project Overview

SpinDecide is a real-time, multiplayer decision-making web app built with Next.js 14. A host creates a room, shares a link, and friends join. Everyone submits options (e.g., restaurants, movies), can veto one option they don't like, then a spinning wheel picks the winner.

**Tech Stack:**
- Next.js 14 (App Router) + TypeScript
- PostgreSQL 15+ (hosted on Railway)
- Tailwind CSS + Poppins font
- HTTP polling (GET every 2s) — **NO WebSockets/Socket.io**
- Session management via HTTP-only cookies

## Architecture

### Database Schema

Four tables: `rooms`, `sessions`, `participants`, `options`

**Key relationships:**
- Room has many participants (host is first participant with `is_host = true`)
- Room has many options
- Room has `winner_option_id` (nullable FK to options)
- Participant has many options (max 3 per participant)
- Participant can veto exactly one option (`has_vetoed` boolean)
- Session links to participant (1:1 for 24 hours)

**Room lifecycle:**
- `status = 'gathering'`: accepting options/vetos
- `status = 'decided'`: spin complete, room locked

### Session Management

- All auth uses `spin_session` HTTP-only cookie
- Cookie contains signed session token (32 random bytes as 64-char hex)
- Sessions expire after 24 hours
- `lib/session.ts` provides: `createSession()`, `verifySession()`, `deleteSession()`
- Most API routes verify session except `POST /api/rooms` and `POST /api/rooms/[code]/join`

### API Routes Structure

All routes in `app/api/`:
- `POST /api/rooms` — create room + host participant, set cookie, return room code
- `GET /api/rooms/[code]` — public endpoint, returns full room state (participants + options)
- `POST /api/rooms/[code]/join` — join room, set cookie
- `POST /api/rooms/[code]/options` — submit option (max 3 per participant)
- `POST /api/rooms/[code]/options/[optionId]/veto` — veto option (one per participant)
- `POST /api/rooms/[code]/spin` — host only, picks winner, sets status to 'decided'
- `GET /api/recent` — returns last 10 decided rooms with winner info (for homepage)
- `GET /api/health` — health check for Railway

**Error format:** All errors return `{ error: "message", code: "ERROR_CODE" }` with appropriate HTTP status.

### Page Routes

- `/` — Homepage with 3 category buttons + Recent Decisions list
- `/room/[code]` — Shows join form (no session) OR room view (active session) OR result view (if status='decided')

### Component Structure

**RoomView** (main room interface):
- Shows interactive UI (add options, veto, spin) for active participants
- Switches to SpinWheel component when spinning
- Shows ResultView for late joiners (users who join after status='decided')

**ResultView** (read-only result display):
- Shown to users who join after the room has decided
- Displays winner, participants list (read-only), all options with vetoed strikethrough
- "🎲 New Round" button navigates to homepage
- Prevents late joiners from seeing interactive UI

**RecentDecisions** (homepage):
- Fetches from `/api/recent` on mount
- Displays cards with category emoji, winner text (truncated 50 chars), participant count, relative time
- Uses `date-fns` for time formatting

### Real-time Updates

**Polling strategy:** Client polls `GET /api/rooms/[code]` every 2000ms.
- Implemented with `useEffect` + `setInterval` in room page client component
- Host immediately shows wheel after clicking Spin (doesn't wait for poll)
- Participants detect `status = 'decided'` via next poll (0-2s delay)

### Security Requirements

**CRITICAL:** All database queries MUST use parameterized queries with `$1`, `$2` placeholders. NEVER use string interpolation or concatenation in SQL.

**Input validation:**
- Room codes: exactly 6 chars, uppercase alphanumeric excluding `0`, `O`, `I`, `1` (regex: `^[A-HJ-NP-Z2-9]{6}$`)
- Participant names: 1-50 chars after trimming, unique per room
- Option text: 1-100 chars after trimming
- Category: must be `eat`, `watch`, or `do`

**Rate limiting:** In-memory Map with sliding window (see `lib/rateLimit.ts`):
- `POST /api/rooms`: 5 req/min per IP
- `POST /api/rooms/[code]/join`: 10 req/min per IP
- `POST /api/rooms/[code]/options`: 20 req/min per IP
- `POST /api/rooms/[code]/spin`: 5 req/min per IP

## Key Patterns

### Room Code Generation

`lib/generateRoomCode.ts` uses `crypto.randomInt()` to generate 6-char codes excluding confusing characters. API route retries up to 3 times on collision, returns 409 if all fail.

### Spin Logic

**Server-side (API route):**
1. Query non-vetoed options: `WHERE is_vetoed = false`
2. Reject if < 2 options
3. Use `crypto.randomInt(0, options.length)` to pick winner (cryptographically secure)
4. Transaction: set room `status = 'decided'` and `winner_option_id`

**Client-side (SpinWheel component):**
1. Calculate rotation: 5 full spins (1800°) + angle to land winner under top pointer
2. Formula: `targetRotation = 360 - (segmentSize * winnerIndex + segmentSize/2)`
3. Animation: 5 seconds for host, 3 seconds for participants
4. Easing: `cubic-bezier(0.17, 0.67, 0.12, 0.99)`
5. Ticking sound via Web Audio API + `requestAnimationFrame`
6. Post-spin: 1s pause → confetti (3s) + winner text → "New Round" button

### Wheel Rotation Math

The wheel rotates **clockwise** with pointer at top-center (12 o'clock, pointing down). To land the winner segment's center under the pointer:

```typescript
const segmentSize = 360 / totalOptions;
const winnerAngle = segmentSize * winnerIndex + (segmentSize / 2);
const targetRotation = 360 - winnerAngle;
const finalRotation = 1800 + targetRotation; // 5 full spins + landing
```

### Transaction Isolation

For critical operations (option submission, veto), use transactions with `READ COMMITTED` isolation to prevent race conditions:
- Veto: atomically set option.is_vetoed, option.vetoed_by_id, participant.has_vetoed
- Spin: atomically set room.status and room.winner_option_id

### Optimistic UI

Options list uses optimistic updates: immediately show new option, then rollback if API returns error. Show error message inline below input for 3 seconds.

## Milestone Execution Order

**CRITICAL:** Execute milestones sequentially (see MILESTONES.md). Do not skip ahead.

1. Project Setup + Security Foundation
2. Room Creation & Joining with Sessions
3. Submitting & Displaying Options
4. Veto System
5. The Spinning Wheel
6. Polish & Edge Cases
7. Deployment to Railway

Each milestone has detailed build steps and acceptance criteria in MILESTONES.md.

### Updating MILESTONES.md

**IMPORTANT:** When you complete a milestone or significant work, you MUST update the MILESTONES.md file located at `../MILESTONES.md` (one level up from this directory):

1. Update the Progress Overview table with completion status (🟢 Completed) and dates
2. Update the milestone's Status field from 🔴 Not Started → 🟡 In Progress → 🟢 Completed
3. Fill in the Timeline dates (Started/Completed)
4. Check off acceptance criteria as you complete them
5. Add notes about any decisions, blockers, or observations in the Notes section

Example workflow:
- When starting Milestone 2: Mark status as 🟡 In Progress, add start date
- When completing Milestone 2: Mark status as 🟢 Completed, add completion date, check all acceptance criteria, add summary notes

This tracking helps maintain project progress visibility and provides context for future work.

## Design Constraints

- **Mobile-first:** Base styles for 375px width (iPhone SE)
- **Touch targets:** All interactive elements ≥ 44px tall (use `h-11` for buttons)
- **Responsive padding:** Use `p-4 sm:p-6 md:p-8` pattern (16px mobile → 24px tablet → 32px desktop)
- **Responsive text:** Room code uses `text-4xl sm:text-5xl` to prevent overflow on small screens
- **Font:** Poppins (weights: 400, 600, 700, 800) loaded from Google Fonts
- **Room code display:** Monospace, wide letter-spacing (`font-mono tracking-widest`)
- **Category gradients:**
  - "Where to Eat": `bg-gradient-to-r from-orange-400 to-red-500`
  - "What to Watch": `bg-gradient-to-r from-purple-400 to-pink-500`
  - "What to Do": `bg-gradient-to-r from-green-400 to-teal-500`
- **No horizontal scroll:** Use `overflow-x-hidden` globally

## Explicit Non-Goals

DO NOT build:
- User accounts or login systems (only session cookies)
- WebSockets, Socket.io, or Server-Sent Events (polling only)
- Chat or messaging
- Editing/deleting options after submission
- Multiple spin rounds per room
- External API integrations (Google Maps, Yelp, TMDB, etc.)
- PWA, service workers, native features
- Admin panel
- Analytics (beyond server logs)
- Dark mode (single theme)
- Unit/E2E tests
- i18n (English only)
- Host migration

## Environment Variables

Create `.env.local` for development:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
SESSION_SECRET=<64-char hex string from crypto.randomBytes(32)>
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Railway), same variables but:
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://<your-app>.up.railway.app`
- `DATABASE_URL` auto-provided by Railway Postgres plugin

## Common Gotchas

- **Polling cleanup:** Always clear interval in `useEffect` cleanup to prevent memory leaks
- **Host-only actions:** Check `participant.is_host` before showing spin button
- **Option count validation:** Count existing options in transaction to prevent race conditions
- **Vetoed options excluded:** Always filter `is_vetoed = false` when querying for spin
- **No host migration:** If host leaves, room becomes orphaned (participants can't spin)
- **24-hour cleanup:** Rooms auto-delete after 24 hours via cron job
- **Late joiner detection:** Check `status='decided' && !spinResult && !isSpinning` to show ResultView

## Troubleshooting

**"Cannot find module" or webpack errors:**
- Run `rm -rf .next` to clear build cache, then restart dev server
- This happens when Next.js build cache gets corrupted after file changes

**ESLint errors in build:**
- Unused catch variables: Use `catch` instead of `catch (err)` if error isn't used
- Unused props: Remove from interface if not needed in component
- `any` types: Replace with proper types (e.g., `Option[]` instead of `any[]`)

**TypeScript Map iteration errors:**
- Use `Map.forEach()` instead of `for...of` with `Map.entries()`
- Example: `store.forEach((record, key) => { ... })` instead of `for (const [key, record] of store.entries())`

## Reference Documents

All project documentation is located in the parent directory (`../` relative to this project root):

- **../requirements_1.md** — Complete PRD with detailed specs, API contracts, user flows, and acceptance criteria
- **../MILESTONES.md** — Progress tracker with 7 milestones, build steps, and acceptance criteria (update this as you complete work!)
- **../TECHNICAL_SPEC.md** — Implementation-level details: database patterns, query examples, transaction handling, component specs
- **../PROJECT_STRUCTURE.md** — Full file structure with descriptions of every file/component in the finished project
- **../CLAUDE.md** — This file (also exists in parent directory)

When implementing features, reference these files frequently:
- Start with MILESTONES.md to understand what to build next
- Use requirements_1.md for detailed API contracts and user flows
- Reference TECHNICAL_SPEC.md for code patterns and implementation examples
- Check PROJECT_STRUCTURE.md to understand where files should be created

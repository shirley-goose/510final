# SPEC.md — Pet2Companion

## Project Overview

**Pet2Companion** transforms real-world pet photos into interactive 3D desktop companions. Users upload images of their pets, which are converted into lightweight 3D models that live on the desktop, responding to user behavior with simple animations (idle, follow cursor, sleep).

---

## Team & Contract

| Role      | Name               |
|-----------|--------------------|
| Client    | Finnick Chen       |
| Developer | Shirley He |

**Agreed Development Fee:** 10 GIX Bucks

### Contract Terms

**Client (Finnick Chen) agrees to:**
- Review all Pull Requests within **48 hours** of submission
- Provide specific, actionable written feedback on every PR
- Respond to developer questions within **48 hours**
- Never write implementation code in the project repo
- Conduct acceptance testing at each milestone and document results as GitHub Issue comments

**Developer agrees to:**
- Submit at least **one Pull Request per 2-week period**
- Respond to all PR review comments within **48 hours**
- Keep the client informed of any blockers via GitHub Issues
- Reference the relevant GitHub Issue in every Pull Request
- Use agentic engineering tools (Cursor / Claude Code) as primary development method
- Deliver `ARCHITECTURE.md` with C4 diagram, data model, and tech stack justification before writing any feature code

**Escalation:** If either party is unresponsive or breaches the above terms, the other party opens a GitHub Issue tagged `escalation`. The instructor will review the GitHub audit trail within 1 week.

---

## Revenue Model

### Target Users
Pet owners (age 18–40) who work or study at a computer and feel emotionally connected to their pets — particularly users living away from their pets (students, remote workers).

### Monetization Tiers

| Tier         | Price           | Features                                                                 |
|--------------|-----------------|--------------------------------------------------------------------------|
| **Free**     | $0              | 1 companion, basic animations, watermarked overlay, 1 free generation   |
| **Pro**      | $4.99/month     | Up to 5 companions, all animations, no watermark, 5 generations/month   |
| **Lifetime** | $29.99 one-time | Unlimited companions, all Pro features, future updates included          |

### Unit Economics (estimated)
- Meshy API cost per generation: ~$0.20
- Hosting (Supabase + Vercel) at 1,000 users: ~$25/month
- Break-even: ~10 Pro subscribers/month
- Year 1 target: 500 free users → 50 Pro conversions → ~$250 MRR

### Stretch Revenue Streams
- **Companion Marketplace**: users share companion presets; platform takes 20% cut
- **Gifting Flow**: "Send a digital pet" for memorial or adoption campaigns

---

## User Stories

1. **As a user**, I want to upload photos of my pet so the app can generate a 3D model that resembles my real pet.
2. **As a user**, I want to see my 3D pet as a floating desktop companion so I feel connected to my pet while working.
3. **As a user**, I want my pet to walk around, follow my cursor, and sleep when idle so the experience feels alive.
4. **As a user**, I want to choose my pet's personality (active, calm, playful) so the animations reflect my real pet's traits.
5. **As a user**, I want my companion to persist across sessions so I don't regenerate it every time.
6. **As a user**, I want a dashboard to manage multiple companions (rename, delete, set active).

---

## Functional Specifications

### 1. Photo Upload & 3D Generation
- Accept 1–5 images (JPEG/PNG, max 10MB each)
- Send to 3D AI Studio or Meshy API; poll for completion with progress indicator
- Store `.glb` model in Supabase Storage
- Show in-browser preview before activating

### 2. Personality Mapping
- User selects: **Active**, **Calm**, or **Playful**
- Active → fast walk cycle, frequent cursor-following
- Calm → slow idle sway, minimal movement
- Playful → spin/jump animations, quick cursor reaction

### 3. Desktop Companion Overlay
- Three.js rendered, always-on-top browser overlay
- **Idle**: breathing/sway loop
- **Follow**: walks toward cursor
- **Sleep**: triggers after 5 min of no mouse movement
- Draggable; configurable screen corner

### 4. Companion Dashboard
- List: name, thumbnail, date created
- Actions: rename, set active, delete
- Active companion auto-loads on launch

### 5. Auth & Persistence
- Supabase Auth (email / magic link)
- Supabase DB: user + companion metadata
- Supabase Storage: images + model files

---

## Non-Functional Requirements
- ≥ 30 FPS on a mid-range laptop
- Model size < 5MB
- Generation completes within 2 minutes
- No API keys exposed client-side
- Responsive at 1080p+

---

## Tech Stack

| Layer        | Technology                   |
|--------------|------------------------------|
| Frontend     | Next.js 14 (App Router)      |
| Backend/API  | Next.js API Routes           |
| Database     | Supabase (PostgreSQL)        |
| File Storage | Supabase Storage             |
| Auth         | Supabase Auth                |
| 3D Rendering | Three.js + React Three Fiber |
| AI / 3D Gen  | 3D AI Studio API or Meshy API     |
| Deployment   | Vercel                       |

---

## Data Model

### `companions`
| Field         | Type      | Description                   |
|---------------|-----------|-------------------------------|
| id            | uuid      | Primary key                   |
| user_id       | uuid      | FK → auth.users               |
| name          | string    | User-given name               |
| personality   | enum      | active / calm / playful       |
| model_url     | string    | Supabase Storage URL (.glb)   |
| thumbnail_url | string    | Preview image URL             |
| is_active     | boolean   | Currently shown on desktop    |
| created_at    | timestamp |                               |

---

## Pages

1. **Landing / Auth** — Sign up / log in
2. **Upload / Onboarding** — Upload photos, set name & personality, trigger generation
3. **Dashboard** — Manage saved companions
4. **Desktop Overlay** — Always-on-top 3D companion viewer

---

## Overall Acceptance Criteria

- [ ] User can upload photos and receive a 3D model within 2 minutes
- [ ] Companion displays idle, follow-cursor, and sleep animations
- [ ] Personality selection visibly changes animation behavior
- [ ] Companions persist and reload across sessions
- [ ] Dashboard supports rename and delete
- [ ] App runs without crashes for 30 minutes
- [ ] No API keys or secrets exposed in client-side code
- [ ] All automated tests pass

---

## Out of Scope
- Voice interaction
- Mobile app
- Multi-user / social features
- Real-time multiplayer

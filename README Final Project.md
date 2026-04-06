# 🐾 Pet2Companion

> Transform your real pet into a digital 3D companion that lives on your desktop.

---

## Overview

**Pet2Companion** bridges emotional attachment and technology. Upload photos of your real pet, and AI automatically generates an interactive 3D desktop companion. The pet walks around, follows your cursor, and falls asleep when you're away — keeping your best friend with you while you work or study.

---

## Features

- 📸 **Photo Upload** — Upload 1–5 photos of your pet
- 🤖 **AI 3D Generation** — Auto-convert photos into a 3D model via Meshy / Tripo3D
- 🖥️ **Desktop Companion** — Floating 3D pet living on your screen
- 🐕 **Behavior Animations** — Idle, cursor-follow, sleep
- 🎭 **Personality Mapping** — Active / Calm / Playful affects animation style
- 💾 **Persistent Companions** — Save and reload via Supabase
- 🗂️ **Dashboard** — Manage multiple companions

---

## Team

| Role      | Name               |
|-----------|--------------------|
| Client    | Finnick Chen       |
| Developer | Shirley He |

**Development Fee:** 10 GIX Bucks

---

## Tech Stack

| Layer        | Technology                   |
|--------------|------------------------------|
| Frontend     | Next.js 14 + Tailwind CSS    |
| 3D Rendering | Three.js + React Three Fiber |
| Backend      | Next.js API Routes           |
| Database     | Supabase (PostgreSQL)        |
| File Storage | Supabase Storage             |
| Auth         | Supabase Auth                |
| AI / 3D Gen  | Meshy API / Tripo3D API      |
| Deployment   | Vercel                       |

---

## Timeline & Progress Check-ins

> Estimated development time: **40–60 hours**
> Client commits to reviewing all PRs within **48 hours**.

| # | Milestone | Due | Required Progress |
|---|-----------|-----|-------------------|
| 1 | **Architecture Review** | Week 1, Day 5 | `ARCHITECTURE.md` submitted with C4 diagram, data model, and tech stack justification. Supabase schema and auth working. PR open for client review. |
| 2 | **Core Pipeline** | Week 2, Day 5 | Photo upload → AI generation → `.glb` stored in Supabase. Model viewable in browser via Three.js. Personality selection wired to animation parameters. |
| 3 | **Companion Behaviors** | Week 3, Day 3 | Idle, cursor-follow, and sleep animations complete. Companion persists and reloads across sessions. Dashboard functional (list, rename, delete, set active). |
| 4 | **Final Delivery** | Week 3, Day 7 | All acceptance criteria met. Automated tests passing. Deployed to Vercel. Bug fixes complete. Demo-ready. |

---

## Branch Protection

- `main` branch is protected: **requires 1 approved review** before merging
- Developer opens a PR for every feature; client reviews within 48 hours
- Direct pushes to `main` are disabled

---

## Getting Started

```bash
git clone https://github.com/YOUR_ORG/pet2companion.git
cd pet2companion
npm install
cp .env.example .env.local
# Fill in Supabase URL, anon key, and Meshy/Tripo API key
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MESHY_API_KEY=your_meshy_api_key
```

---

## Project Structure

```
pet2companion/
├── app/
│   ├── page.tsx               # Landing / Auth
│   ├── upload/page.tsx        # Onboarding & photo upload
│   ├── dashboard/page.tsx     # Companion management
│   └── companion/page.tsx     # 3D desktop overlay
├── components/
│   ├── PetViewer.tsx          # Three.js 3D renderer
│   ├── BehaviorController.tsx # Animation state machine
│   └── UploadForm.tsx
├── lib/
│   ├── supabase.ts
│   └── meshyClient.ts
├── SPEC.md
└── ARCHITECTURE.md            # To be created by developer
```

---

## License

MIT

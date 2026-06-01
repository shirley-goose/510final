# Pet2Companion

## 1. System Architecture Overview

Pet2Companion operates on a modern Serverless/BaaS architecture. The application is a unified Next.js web application deployed on Vercel. It acts as the orchestration layer between the user interface (React/React Three Fiber), the backend state/storage (Supabase), and the generative AI service (Tripo3D / Meshy API).

### Core Data Flow: Image to 3D Companion

1. **Client:** User uploads an image via the Next.js frontend.
2. **Backend (Proxy):** Next.js API Route receives the image and securely forwards it to the 3D Generation API (Meshy) using server-side environment variables to protect API keys.
3. **Database:** The API route creates a `companion` record in Supabase with a `status` of `pending`.
4. **Polling:** The client polls a Next.js API route to check the generation status.
5. **Storage:** Once complete, the backend downloads the `.glb` file and uploads it to Supabase Storage.
6. **Client (Render):** The frontend fetches the `.glb` URL from Supabase and renders it in the browser overlay using React Three Fiber.

---

## 2. Tech Stack & Justification


| Technology                  | Role                    | Justification                                                                                                                                                                                                       |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 14 (App Router)** | Full-stack Framework    | Enables seamless sharing of types between frontend UI and backend API routes. Server Actions and API routes allow us to securely interact with the 3D generation APIs without exposing keys to the client.          |
| **Supabase**                | Database, Auth, Storage | Provides an all-in-one backend. PostgreSQL handles relational data (users -> companions), Storage holds the potentially large `.glb` files and thumbnails, and Auth provides out-of-the-box secure login.           |
| **React Three Fiber (R3F)** | 3D Rendering            | Writing vanilla Three.js in React can lead to complex and messy component lifecycles. R3F provides a declarative, component-based approach to 3D, making it vastly easier to manage animations, models, and states. |
| **Tripo3D / Meshy API**     | AI 3D Generation        | State-of-the-art Image-to-3D APIs. Outsourcing this prevents the need to build and host heavy, expensive GPU clusters.                                                                                              |
| **Zustand**                 | State Management        | (Recommended addition) A lightweight, unopinionated state manager to handle the "active companion" state and mouse cursor coordinates across the Next.js app and the R3F canvas.                                    |
| **Vercel**                  | Hosting/Deployment      | Native, zero-config deployment for Next.js with automatic CI/CD from GitHub.                                                                                                                                        |


---

## 3. Data Model

The data layer relies on Supabase's PostgreSQL database.

### Table: `users` (Managed by Supabase Auth)

Handles standard user authentication (UUID, email, created_at).

### Table: `companions`

Stores the metadata and references to the 3D assets for each generated pet. 
*(Note: Added `status` and `task_id` to handle the asynchronous API generation process gracefully).*


| Field           | Type        | Attributes                                | Description                                               |
| --------------- | ----------- | ----------------------------------------- | --------------------------------------------------------- |
| `id`            | uuid        | Primary Key, Default `uuid_generate_v4()` | Unique identifier for the companion.                      |
| `user_id`       | uuid        | Foreign Key (`auth.users.id`)             | Links the companion to the owner.                         |
| `name`          | text        | Not Null                                  | User-given name for the pet.                              |
| `personality`   | enum        | `active`, `calm`, `playful`               | Drives animation behavior logic.                          |
| `model_url`     | text        | Nullable                                  | Public URL to the `.glb` file in Supabase Storage.        |
| `thumbnail_url` | text        | Nullable                                  | Public URL to the preview image in Supabase Storage.      |
| `is_active`     | boolean     | Default `false`                           | Indicates if this is the currently displayed desktop pet. |
| `status`        | enum        | `pending`, `success`, `failed`            | Tracks the state of the 3D API generation.                |
| `api_task_id`   | text        | Nullable                                  | The ID returned by Tripo3D/Meshy to poll for progress.    |
| `created_at`    | timestamptz | Default `now()`                           | Timestamp of creation.                                    |


---

## 4. Agentic Engineering Plan

Given the contract specifies the use of Agentic tools (Cursor / Claude Code), development should be divided into highly modular, context-bounded phases. You will act as the "Lead Architect" providing strict prompts to the AI.

### Phase 1: Scaffolding & Auth

**Goal:** Setup repo, styling, and user login.

- **Agent Prompt Strategy:** *"Create a new Next.js 14 App Router project. Integrate Supabase SSR for authentication. Create a login/signup page using email/password. Ensure auth state is protected via middleware. Do not implement any 3D features yet."*

### Phase 2: Database & Storage Provisioning

**Goal:** Define the schema and storage buckets.

- **Agent Prompt Strategy:** *"Generate the Supabase SQL migration script for a `companions` table with the following schema [insert schema]. Create Row Level Security (RLS) policies so users can only read/write/delete their own companions. Create a public Supabase Storage bucket named 'companion-models'."*

### Phase 3: The 3D Generation Pipeline (API Routes)

**Goal:** Handle the complex async API logic securely.

- **Agent Prompt Strategy:** *"Create a Next.js API route that accepts an image upload. It should forward this image to the Meshy API to start a generation task. Save the returned `task_id` to the `companions` table with status `pending`. Create a second API route that polls the Meshy API using the `task_id`. When complete, download the `.glb` file, upload it to Supabase Storage, and update the database row."*
- **Architect Note to Dev:** Watch the agent carefully here. Ensure it uses `process.env.MESHY_API_KEY` and does not leak it to client components.

### Phase 4: React Three Fiber (The Desktop Companion)

**Goal:** Render the `.glb` and apply animations.

- **Agent Prompt Strategy:** *"Create a React Three Fiber `<Canvas>` component. Load a `.glb` model using `@react-three/drei`'s `useGLTF`. Create a `useFrame` hook to manage animations. If the `personality` prop is 'active', implement a fast sway. Use standard React state to track mouse position (`mousemove` event) and make the 3D model look toward the cursor coordinates."*

### Phase 5: Dashboard & Wiring

**Goal:** Connect the UI to the data.

- **Agent Prompt Strategy:** *"Build a Dashboard page that fetches the user's companions from Supabase. Display them in a grid. Add buttons to 'Delete' and 'Set Active'. When 'Set Active' is clicked, update the database so only one companion has `is_active = true`, and refresh the global state so the 3D Canvas updates."*

### Agentic Best Practices for this Project

1. **Keep Context Small:** Do not ask Cursor to "Build the 3D companion app." Ask it to "Build the database schema," then "Build the API proxy," then "Build the Canvas."
2. **Enforce `.glb` Caching:** Explicitly tell the AI to use R3F's `useGLTF.preload()` so switching between active pets is instantaneous.
3. **Strict Typing:** Instruct the AI to generate a `types/supabase.ts` file via the Supabase CLI to ensure the frontend and database models are strictly typed throughout the codebase.


# IsipAgham

> **"Aral Physics, libre para sa lahat. Kaya mo 'yan!"**
> A free, mobile-first browser study application for Grade 12 Academic Track students in the Philippines covering **Physics 1, Physics 2, and Physics 3**. Runs online in any modern browser and can be added to Android and iPhone home screens via Web App Manifest (online-only; no offline mode).

---

## Core Features

- **47 Built-in Curriculum Lessons (Terms 1, 2, and 3 only — no Term 4)**:
  - **Term 1 (Physics 1)**: Measurements and Translational Kinematics (`1.1–1.11`)
  - **Term 2 (Physics 1)**: Dynamics (`2.1–2.14`)
  - **Term 3 (Physics 2)**: Gravity, Fluid Mechanics, Heat, and Thermodynamics (`3.1–3.22`)
  - Each lesson includes a clear learning objective, KaTeX-rendered formulas, humanist-serif explanation (`Source Serif 4`), worked example, 2 interactive check questions, Text-to-Speech, and 1-tap buttons for **Make Flashcards**, **Quiz Me**, **Ask the AI**, **3D Lab**, and **Next Lesson**.
- **AI Note-to-Study-Set Generator**: Upload `.pdf`, `.pptx`, `.docx`, photo notes (`.png`/`.jpg` OCR), or paste text to generate KaTeX flashcards, a structured reviewer summary, and mixed quizzes (Multiple Choice, True/False, and Short Answer).
- **SM-2 Spaced Repetition Flashcards**: Honest 4-button rating (**Again / Hard / Good / Easy**) with live next-interval previews (`10m`, `12h`, `1d`, `4d`), **"Due Today"** queue, inline set renaming, and card add/edit/delete.
- **Calm Focus Pomodoro Timer**: Adjustable work/break intervals, **Calm Full-Screen** SVG progress ring mode, audio chime + vibration cue, and a visible session log.
- **Streaks, Daily Goal & Class Leaderboard**: Tracks daily streaks, daily minute goals, per-term lesson completion, quiz trends, and Weekly / All-Time class leaderboards filtered by optional class code (usernames and XP only; every new student starts at `0 XP`).
- **Lesson-Aware AI Tutor**: Supports grounding in any of the 47 built-in lessons or uploaded materials, KaTeX equations, and an **"Explain like I'm 12"** toggle.
- **18 Interactive 3D Simulations (Three.js)**: Real-time sliders and live readouts across Physics 1, 2, and 3, including a Heat Engine PV cycle with live **Net Work ($W_{\text{net}}$)**, **Heat Absorbed ($Q_{\text{in}}$)**, **Engine Efficiency ($e$)**, and **Carnot Max Efficiency**.

---

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, React Router, KaTeX (`katex`)
- **3D Visualizer**: Three.js (`three`, `@react-three/fiber`, `@react-three/drei`) with lazy per-scene loading
- **Backend / AI**: Express (`server.ts` for local & preview runtime) and Firebase Cloud Functions v2 (`functions/src/index.ts`) calling **Google Gemini API (`@google/genai`)** strictly server-side
- **Database & Auth**: Firebase Authentication (Username + Password with optional email, or Google Sign-In) & Cloud Firestore
- **Home Screen Support**: `public/manifest.webmanifest` (`standalone`) + PNG icons (`192x192`, `512x512`, `apple-touch-icon.png`) and `"No Internet Connection"` banner when offline (no offline caching)

---

## Environment Variables

Copy `.env.example` to `.env` and set the values for your deployment:

| Variable | Where Used | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server / Cloud Functions only | Google Gemini API key (never exposed to the client) |
| `APP_URL` | Server | Hosted application URL |
| `VITE_STUDY_SURVEY_URL` | Client (`ChecklistPage`) | External Google Form URL for end-of-week evaluation |
| `VITE_FIREBASE_VAPID_KEY` | Client (`notifications.ts`) | Optional Web Push VAPID public key for Firebase Cloud Messaging |

---

## Local Setup & Running

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and configure `GEMINI_API_KEY`.
3. Start the full-stack development server (Express API + Vite on port `3000`):
   ```bash
   npm run dev
   ```
4. Typecheck, lint, and build for production:
   ```bash
   npm run lint
   npm run build
   ```

---

## Editing the 47 Built-in Lessons (Terms 1–3 JSON Data)

All 47 built-in lessons live in structured JSON files under `src/data/lessons/`:

- `src/data/lessons/term1.json` — Lessons `1.1` through `1.11` (Physics 1)
- `src/data/lessons/term2.json` — Lessons `2.1` through `2.14` (Physics 1)
- `src/data/lessons/term3.json` — Lessons `3.1` through `3.22` (Physics 2)
- `src/data/lessons/index.ts` — Exports `TERMS_META`, `ALL_LESSONS`, `getLessonById`, `getNextLesson`, and `buildLessonStudyText`

Each lesson object follows the `BuiltInLesson` schema in `src/types/index.ts`:
- `id`, `term` (`1 | 2 | 3`), `code`, `title`, `course`
- `objective`, `keyFormula` (supports `$...$` KaTeX)
- `explanation` (includes clear `[Teacher/Module Placeholder]` blocks where schools can insert DepEd SLM figures, class lab instructions, or Filipino context notes)
- `workedExample`: `{ problem, solutionSteps[], finalAnswer }`
- `checkQuestions`: 2 multiple-choice items with `{ question, choices[], correctIndex, explanation }`
- `suggestedSceneId`: optional ID matching a 3D simulation in `src/components/visualizer/scenesCatalog.ts`

To customize any lesson with school-specific module notes, edit the corresponding JSON entry in `term1.json`, `term2.json`, or `term3.json` and rebuild.

---

## Privacy & Study Safeguards (RA 10173)

- Sign up requires only a **username and password** (email is optional); no full name, address, or phone number is collected.
- Bare usernames map to an internal synthetic auth identifier while storing `username` and optional `email` in Firestore.
- Public leaderboard (`/leaderboard`) exposes only `uid`, `nickname` (username), `xp`, `weeklyXp`, `weekKey`, and optional `classCode`.
- Document extraction and AI chat redact common email/phone patterns before calling Gemini.
- Students can permanently delete their account and all study records (`materials`, `studySets`, `quizAttempts`, `studySessions`, `aiMessages`, `users`, `leaderboard`) from **Profile -> Privacy & Home Screen -> Delete Account & Data**.

---

## Assumptions

1. **Online-Only Runtime**: As specified, IsipAgham provides a Web App Manifest + PNG icons for Add to Home Screen on Android and iPhone, with no offline service-worker cache; an active internet connection is required for auth, Firestore sync, file extraction, and AI features.
2. **Term Scope**: Built-in lessons cover Terms 1, 2, and 3 (47 lessons total, Physics 1 & 2) with no Term 4, while Physics 3 remains selectable in Profile settings, Study Materials, AI Tutor, and the 3D Visualizer (electromagnetism & circuits).
3. **Username Sign-In Mapping**: Firebase Authentication Email/Password provider is used with a deterministic `@users.isipagham.app` internal domain when students omit an optional email address, keeping sign-up friction-free and RA 10173 minimal.
4. **Placeholder Content**: Lessons include clearly marked `[Teacher/Module Placeholder]` notes so teachers or researchers can drop in local DepEd module references or class lab tasks directly in the `src/data/lessons/term*.json` files.

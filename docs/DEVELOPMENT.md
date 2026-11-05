# NursePrep development notes

## Runtime

Use Node.js 22 LTS (Node 20.19 or later is required by the current Vite toolchain) and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` to the NursePrep Supabase project values. Only a publishable key belongs in browser code. Never place a Supabase secret or service-role key in this repository.

## Current implementation

- React + TypeScript + Vite app shell.
- IndexedDB persistence using Dexie.
- Ten subject JSON bank files, with the Fundamentals bank currently holding the first 10 original questions. The other nine files are valid empty bank containers.
- Local quiz selection, answer selection, flagging, previous/next navigation, practice feedback, exam-mode feedback suppression, countdown timer, auto-submit, and local result history.
- Supabase email/password authentication UI.
- Supabase PostgreSQL tables for profiles, preferences, quiz attempts, and per-question answers, with RLS ownership policies.
- Automatic sync attempts on sign-in, network reconnection, and quiz submission.
- Service worker and web app manifest for an installable offline-capable web shell.
- GitHub Actions build workflow.

## Important content status

The question-bank target remains 200 original questions in each of ten subjects (2,000 total). The current committed bank contains 10 Fundamentals questions and 0 in each other subject. Do not present the planned total as completed content. Clinical content requires review by a qualified nursing educator before use for high-stakes preparation.

## Current limitations

- The quiz UI can only start in a subject that has questions loaded. At present, that is Fundamentals.
- Exam mode suppresses answer feedback while the quiz is in progress; the current result screen shows the score but does not yet provide a detailed post-exam answer-review screen.
- Cloud sync is an initial implementation. Cross-device conflict resolution, retry visibility, detailed sync status, and sync telemetry still need hardening.
- The desktop wrapper (Tauri 2) is intentionally deferred until the browser application is stable.

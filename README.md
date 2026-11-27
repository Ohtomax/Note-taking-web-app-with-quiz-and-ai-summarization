# AI-Powered Note-Taking and Study Platform

Organize study notes by project, turn them into summaries and quizzes, and track what you learn across quiz attempts. For example, a student preparing for a networking exam could select their OSI model and TCP/IP notes, generate a combined study guide, and retake a quiz a week later to see which concepts still need practice.

The repository implements project notes, source-linked generation, saved summaries and quizzes, study attempts, history, dashboard and analytics, plus the [project brief](./docs/PROJECT_BRIEF.md), [task checklist](./docs/task.md) and [verification log](./docs/PROGRESS.md). Hosted configuration, deployment and manual browser/accessibility acceptance remain deferred.

## Study workflow

1. **Collect notes.** Create a project for a course or topic. Write, search, and organize rich-text notes with autosave.
2. **Generate a study guide.** Summarize a passage, one note, selected notes, or an entire project. Each saved summary identifies its source notes and flags later changes to the source material.
3. **Take a quiz.** Generate questions from the same materials. Practice mode gives feedback after each recorded answer. Exam mode reveals answers and explanations after the whole attempt is submitted.
4. **Track progress.** Review missed questions and compare scores across attempts. Each retake uses a saved quiz version, preserves earlier results, and requires no additional AI generation.

## Application stack

| Area | Tools and responsibilities |
| --- | --- |
| Frontend | React, TypeScript, and Vite for the app. React Router for navigation, Tailwind CSS for styling, TanStack Query for API data, and Zustand for temporary UI state. |
| Backend | Node.js and Express with TypeScript for the REST API. Zod validates requests, environment settings, and generated AI output. |
| Identity and data | Firebase Authentication manages credentials. The backend verifies ID tokens with Firebase Admin and scopes Prisma queries against Supabase PostgreSQL to the signed-in user. |
| AI generation | A backend service processes authorized source notes, validates model output, and tracks usage. Groq uses the OpenAI-compatible adapter with structured output; deterministic mock generation is used for local tests. |
| Deployment | Vercel for the frontend, Render for the Dockerized API, and Supabase for PostgreSQL. |

## Development phases

| Phase | Scope |
| --- | --- |
| 1 | Plan the architecture and initialize the project. |
| 2 | Set up the API, database, authentication, and ownership checks. |
| 3 | Build project folders, rich-text notes, and autosave. |
| 4 | Generate and save source-linked summaries and versioned quizzes. |
| 5 | Build the study interfaces, quiz attempts, history, and analytics. |
| 6 | Verify the complete workflow, optimize performance, and deploy. |

The [roadmap](./docs/ROADMAP.md) maps requirements to tasks. The owner authorized implementation through Phase 5 with one commit and push per task. Phase 6 and deployment are separate work.

## Local setup

Use Node 24.12.0 or a newer Node 24 release and npm. Phase 1 startup works with defaults and requires no Firebase, database, Redis or AI credentials.

Install and check the server from the repository root.

```powershell
cd server
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run dev
```

The development listener uses port 3001. GET /api/health/live returns 200. GET /api/health/ready and private APIs return 503 while infrastructure settings are blank. With configured dependencies, GET/PATCH /api/v1/me verifies Firebase identity and accesses the current user's profile. The root returns a JSON 404. Stop with Ctrl+C. Use npm start after npm run build to run compiled output.

Open a second terminal at the repository root for the frontend.

```powershell
cd client
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run dev
```

Open http://127.0.0.1:5173/ for the frontend. Stop it with Ctrl+C. To serve the production build locally, run npm run preview and open http://127.0.0.1:4173/. Preview serves the static build and is intended for local verification.

Environment templates live in client/.env.example and server/.env.example. Populate local .env files when the relevant features are implemented. Keep real credentials out of Git. The [environment reference](./docs/DEPLOYMENT.md#environment-reference) identifies when each setting becomes necessary.

Run npm test in server/ for the credential-free suite. Database tests use npm run test:db with an isolated loopback STUDY_TEST_DATABASE_URL named study_test_<uuid>, as described in the [testing plan](./docs/TESTING.md). Prisma Client is generated during installation and build. Application scripts load server/.env when it exists. Rich-text editing, source-linked generation, saved summaries/quizzes, practice and exam attempts, retakes, history, dashboard, usage and analytics are implemented. Live integrations require the owner-supplied settings.

## Design documents

Phase 6 local validation is available through `pwsh -NoProfile -File scripts/test-local.ps1 -Repetitions 2 -CleanCheckout`. It requires Node 24, PowerShell 7 and local PostgreSQL 18 tools, and uses synthetic identities and mock AI. See the [local handover](./docs/HANDOVER.md) for verified behavior, benchmarks, dependency findings and deferred browser/deployment work. The latest complete candidate run passes 150 tests; production release acceptance remains open.

- [Architecture and source conventions](./docs/ARCHITECTURE.md)
- [Database and retention](./docs/DATABASE.md)
- [API contract](./docs/API.md)
- [Security and ownership](./docs/SECURITY.md)
- [AI integration and cost estimates](./docs/AI_INTEGRATION.md)
- [Quiz scoring and history](./docs/QUIZ_SYSTEM.md)
- [Analytics definitions](./docs/ANALYTICS.md)
- [Deployment and recovery](./docs/DEPLOYMENT.md)
- [Local validation and repeatable checks](./docs/PHASE6_VALIDATION.md)
- [Dependency audit and remaining blockers](./docs/DEPENDENCY_AUDIT.md)
- [Recovery rehearsal](./docs/RECOVERY.md)

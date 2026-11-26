# AI-Powered Note-Taking and Study Platform

Organize study notes by project, turn them into summaries and quizzes, and track what you learn across quiz attempts. For example, a student preparing for a networking exam could select their OSI model and TCP/IP notes, generate a combined study guide, and retake a quiz a week later to see which concepts still need practice.

**Project status:** Planning. This repository contains the [full project brief](./PROJECT_BRIEF.md). The first milestone is to review and approve the architecture, database design, and six-phase roadmap before starting implementation.

## Planned study workflow

1. **Collect notes.** Create a project for a course or topic. Write, search, and organize rich-text notes with autosave.
2. **Generate a study guide.** Summarize a passage, one note, selected notes, or an entire project. Each saved summary identifies its source notes and flags later changes to the source material.
3. **Take a quiz.** Generate questions from the same materials. Practice mode gives feedback after each recorded answer. Exam mode reveals answers and explanations after the whole attempt is submitted.
4. **Track progress.** Review missed questions and compare scores across attempts. Each retake uses a saved quiz version, preserves earlier results, and requires no additional AI generation.

## Planned stack

| Area | Tools and responsibilities |
| --- | --- |
| Frontend | React, TypeScript, and Vite for the app. React Router for navigation, Tailwind CSS for styling, TanStack Query for API data, and Zustand for temporary UI state. |
| Backend | Node.js and Express with TypeScript for the REST API. Zod validates requests, environment settings, and generated AI output. |
| Identity and data | Firebase Authentication manages credentials. The backend verifies ID tokens with Firebase Admin and scopes Prisma queries against Supabase PostgreSQL to the signed-in user. |
| AI generation | A backend service processes authorized source notes, validates model output, and tracks usage. Provider selection is part of planning. |
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

The [development roadmap](./PROJECT_BRIEF.md#9-development-roadmap--divide-and-conquer) lists the work for each phase. The [development workflow](./PROJECT_BRIEF.md#11-development-workflow-and-rules) calls for testing each task and getting approval before moving to the next one.

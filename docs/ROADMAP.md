# Scope and roadmap

The first release follows the full core workflow in the [brief](../PROJECT_BRIEF.md). Detailed task IDs, prerequisites and completion tests are in [task.md](../task.md).

| Requirement | Tasks and release scope |
| --- | --- |
| Registration, login, logout, recovery, persistence, profile | P2-T16–T19, P3-T16–T17, P3-T23 |
| Folder create/read/update/search, counts, dates, color/icon, archive, restore, confirmed deletion | P3-T01–T06, P3-T19–T20 |
| Note CRUD, duplicate, move, title/content search, sort, pin, archive, formatting and conflict-safe autosave | P3-T07–T15, P3-T21–T24 |
| Passage, note, selected notes and whole-project source scopes | P4-T02–T06, P4-T12–T13, P4-T19, P5-T01 |
| Summary formats, lengths, preview, edit, copy, save, history, rename, delete and source change notices | P4-T11–T15, P5-T02–T03 |
| Quiz types, difficulty, count, mode, explanations, editing, duplicate, regenerate and versions | P4-T16–T23, P5-T04–T06 |
| Practice, exam, deterministic scoring, resume, abandonment and idempotent submission | P5-T07–T15 |
| Independent retakes, shuffle, immutable history and comparison | P5-T16–T18 |
| Global, project and quiz analytics and metric definitions | P5-T19–T23 |
| Dashboard recents, quick actions, usage and responsive accessible themes | P3-T18, P5-T24–T27 |
| Authentication, authorization, application security and AI cost controls | P2-T01–T20, P4-T04–T10, P4-T24, P6-T01–T12 |
| Docker, migration, Render, Vercel, Firebase production, monitoring and restore | P6-T13–T23 |

## Release journey

1. Register through Firebase and synchronize the verified UID with PostgreSQL.
2. Create a Networking project and two rich-text notes about OSI and TCP/IP.
3. Select both notes and generate a saved source-linked study guide.
4. Generate and save a four-question quiz, then complete a practice attempt.
5. Retake the saved quiz in exam mode without generating again.
6. Review both attempts against the version each used and compare progress in project analytics.

## Six development phases

1. Planning, architecture and reproducible initialization.
2. Database, API security and identity foundation.
3. Folder and note workspace.
4. Backend AI generation and saved study material.
5. Interactive study UI, attempts, history and analytics.
6. Release verification, optimization, deployment and recovery.

## Deferred enhancements

Topic analytics (P5-T28) requires trustworthy topic metadata. Background workers (P4-T25) require measured need. Local Compose (P6-T14) requires a demonstrated setup benefit. Record the disposition of each at its phase review. Nested folders are outside the initial scope. All other tasks remain MVP proposals per the brief.

## Scope verification

The six-step journey reaches two independent results using MVP tasks alone. Every feature group in brief sections 3–7 maps to the table above. Security and tests accompany feature phases and receive regression coverage in Phase 6.

## Phase 1 decision review

The owner's 2026-11-26 instruction authorizes all Phase 1 tasks and individual pushes, superseding the earlier per-task approval gate for this phase. Credential-dependent setup is explicitly deferred to the owner.

| Design deliverable | Reference |
| --- | --- |
| Overview, MVP and six-phase dependencies | This roadmap and task.md |
| Style review, stack, MVC and frontend trees | ARCHITECTURE.md |
| Relational dictionary, ER diagram and retention | DATABASE.md |
| Identity and authorization | SECURITY.md |
| Endpoint contracts | API.md |
| Provider comparison, costs and lifecycle | AI_INTEGRATION.md |
| Scoring, player modes, versions and retakes | QUIZ_SYSTEM.md |
| Aggregates and worked metric fixtures | ANALYTICS.md |
| Testing and technical risk scenarios | TESTING.md and SECURITY.md |
| Deployment boundaries, migration and recovery | DEPLOYMENT.md |

Reviewed one Networking session across all documents. Project/Note ownership agrees with the API predicates. SummarySource and version-bound QuizSource retain revisions. Both attempts pin QuizVersion. Accuracy and mean percentage have distinct denominators. The main open items are owner account configuration, live provider quality and measured limits. The next authorized task is repository preparation, followed by initialization.

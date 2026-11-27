# Study platform development tasks

Use this checklist to take the [study platform brief](./PROJECT_BRIEF.md) from design review to a verified release. The owner authorized all Phase 1 tasks on 2026-11-26 with a separate push after each task. Credential-dependent account setup is deferred to the owner.

| Phase | What a reviewer should be able to verify |
| --- | --- |
| [1 · Planning and initialization](#phase-1) | The design explains one study session end to end, and both projects build from a clean checkout. |
| [2 · Backend foundation](#phase-2) | Two accounts can sign in and access only their own data through the API. |
| [3 · Folders and notes](#phase-3) | A learner can organize and edit notes, including recovering from a conflicting save. |
| [4 · AI generation](#phase-4) | The backend can turn authorized material into a source-linked summary or a versioned quiz within usage limits. |
| [5 · Study experience and analytics](#phase-5) | A learner can take and retake a quiz, review the original answers, and see how the scores were calculated. |
| [6 · Testing and deployment](#phase-6) | The release can be built, deployed, smoke-tested, and recovered using documented steps. |

### Working agreements

- **Scope.** MVP marks work proposed for the first release. Optional items can be deferred with a recorded decision. The brief remains the reference for the full product.
- **Order.** Read the phase prerequisites first. Each task lists its additional dependencies within the phase. Complete and push one Phase 1 task before advancing. Later phases require another instruction.
- **Status.** An unchecked task is pending. If blocked, leave it unchecked and record the task ID, blocker, and next decision in the progress log. Check a task only after its acceptance criteria pass. Record the changed paths and verification evidence alongside its ID.
- **Paths.** Paths below are proposed, relative to the repository root. Phase 1 establishes the layout and records any path changes here. Commands and results belong in the progress log when each task is performed.

<a id="phase-1"></a>

## Phase 1 — Planning, architecture, and project initialization

**Objective** Turn the approved design into reviewed technical decisions and a reproducible frontend and backend starting point.

**Prerequisites** Obtain the project owner’s approval of the architecture, database design, and roadmap before starting this phase. Use the existing repository and the study platform brief.

**Deliverables** Reviewed design documents, a progress log, buildable TypeScript projects, environment examples, and local setup instructions.

### Task checklist

- [x] **P1-T01 · Map requirements to a first release** (MVP)
  - **Work and purpose** Walk through registration, creating a project and notes, generating study material, taking a quiz, and reviewing a retake. Map each requirement to a task and propose which enhancements can wait.
  - **Files** `PROJECT_BRIEF.md`, `task.md`, `docs/ROADMAP.md` · **Depends on** None
  - **Output** A scope checklist with a learner journey and explicit deferrals.
  - **Accept when** Every required feature has a phase and the learner can complete the journey using MVP items alone.
  - **Verify** Trace one learner from an empty account to two scored attempts.

- [x] **P1-T02 · Review SmileCheck conventions** (MVP)
  - **Work and purpose** Inspect a representative SmileCheck route, controller, service, repository, validator, error handler, and React feature. Record file paths and examples the study platform can follow. Request samples if the reference is unavailable.
  - **Files** `docs/ARCHITECTURE.md` · **Depends on** None
  - **Output** A short conventions guide grounded in source files.
  - **Accept when** A contributor can name and place a new notes endpoint and matching React hook using actual examples.
  - **Verify** Trace one existing request from its React caller to its database query and compare it with the proposed layout.

- [x] **P1-T03 · Check stack and dependency compatibility** (MVP)
  - **Work and purpose** Check Node, TypeScript, React/Vite, Express, Prisma and the PostgreSQL adapter together. Identify the minimum editor, charts, and test dependencies that the scope justifies.
  - **Files** `docs/ARCHITECTURE.md`, `docs/TESTING.md` · **Depends on** P1-T01
  - **Output** A supported version matrix with reasons for additions.
  - **Accept when** The matrix covers browser, API, database, and test tooling with compatible runtimes.
  - **Verify** Check the maintainers’ compatibility documentation and pin the chosen versions when scaffolding.

- [x] **P1-T04 · Draw the application boundaries** (MVP)
  - **Work and purpose** Diagram the browser, Firebase, Express, PostgreSQL, and AI provider. Include frontend and backend folder trees, request flow, deployment boundaries, and where credentials reside.
  - **Files** `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md` · **Depends on** P1-T02, P1-T03
  - **Output** A system diagram and file layout that distinguish UI, HTTP, business logic, and persistence.
  - **Accept when** Reviewers can trace a note read and an AI request to the component that authorizes each operation.
  - **Verify** Follow both requests on the diagram and identify each network hop and credential.

- [x] **P1-T05 · Design authentication and ownership** (MVP)
  - **Work and purpose** Map token acquisition, verification, user synchronization, and owner-scoped repository queries. Cover nested resources, both ends of a note move, and account changes in the browser.
  - **Files** `docs/SECURITY.md`, `docs/ARCHITECTURE.md` · **Depends on** P1-T04
  - **Output** An identity sequence and resource ownership table.
  - **Accept when** Every private resource traces back to a verified Firebase UID and has a defined absent-or-inaccessible response.
  - **Verify** Walk through a two-account example involving a note, a quiz attempt, and an analytics query.

- [x] **P1-T06 · Design the relational schema** (MVP)
  - **Work and purpose** Describe the brief’s thirteen model candidates, keys, relations, unique constraints, timestamps, indexes, and referential actions. Model project ownership and immutable history in the ER diagram.
  - **Files** `docs/DATABASE.md` · **Depends on** P1-T04, P1-T05
  - **Output** An ER diagram and model-by-model data dictionary.
  - **Accept when** The schema can represent a summary with two sources and two attempts against the same fixed question set.
  - **Verify** Insert both examples on paper, then trace what remains after a source note moves or is deleted.

- [x] **P1-T07 · Decide note format and retention rules** (MVP)
  - **Work and purpose** Evaluate the rich-text editor and content representation for formatting, search, safe rendering, and AI text extraction. Define revision conflicts, archive/restore, confirmed deletion, and retention of source references and attempts.
  - **Files** `docs/ARCHITECTURE.md`, `docs/DATABASE.md` · **Depends on** P1-T06
  - **Output** A note format decision, deletion matrix, and autosave conflict contract.
  - **Accept when** Deleting or archiving a project has a specified effect on each child type and stale writes cannot win silently.
  - **Verify** Trace a rich-text checklist through storage and extraction, a two-tab edit, and a deletion involving a completed attempt.

- [x] **P1-T08 · Specify the REST API** (MVP)
  - **Work and purpose** List methods, paths, owner scope, requests, success and error responses, pagination, and idempotency for profile, projects, notes, generations, summaries, quizzes, attempts, analytics, and usage.
  - **Files** `docs/API.md` · **Depends on** P1-T05, P1-T06, P1-T07
  - **Output** An endpoint inventory with example payloads.
  - **Accept when** Every step of the first-release journey maps to an endpoint with a defined authorization rule.
  - **Verify** Review route examples for a note save conflict, a forbidden source selection, and a retried attempt submission.

- [x] **P1-T09 · Compare AI providers and cost** (MVP)
  - **Work and purpose** Compare current official information for Gemini, OpenAI, and Groq. Record the date, model, pricing, free tier, context limits, structured output, privacy terms, and reliability considerations. Use an authorized study fixture to assess quality when available.
  - **Files** `docs/AI_INTEGRATION.md` · **Depends on** P1-T01, P1-T03
  - **Output** A provider recommendation, evidence for quality, and example costs for a note and a large folder.
  - **Accept when** A reviewer can reproduce the estimates from input/output token assumptions and see which claims still need a pilot.
  - **Verify** Recalculate the two examples, including intermediate calls for folder processing, and flag unmeasured results.

- [x] **P1-T10 · Design the generation lifecycle** (MVP)
  - **Work and purpose** Specify selection, source revision capture, token budgeting, chunking, reduction, validation, storage, and retrieval. Decide how timeouts, retries, quotas, and generation status work within the hosting limits.
  - **Files** `docs/AI_INTEGRATION.md`, `docs/API.md` · **Depends on** P1-T07, P1-T08, P1-T09
  - **Output** A generation sequence for a passage and for an oversized folder.
  - **Accept when** Each eligible chunk is accounted for, source references survive reduction, and an interrupted request has a recovery path.
  - **Verify** Walk a three-chunk folder through success, failure after chunk two, and a repeated request.

- [x] **P1-T11 · Specify scoring, versioning, and disclosure** (MVP)
  - **Work and purpose** Define typed answer keys, accepted identification variants, normalization limits, and mode-specific responses. Pin attempts to immutable versions and specify in-progress, abandoned, and completed transitions.
  - **Files** `docs/QUIZ_SYSTEM.md`, `docs/API.md` · **Depends on** P1-T06, P1-T08
  - **Output** A scoring table, attempt state diagram, and visibility matrix covering delivery and authoring routes.
  - **Accept when** A retake can use the same version without AI, and a completed result remains reproducible after an edit.
  - **Verify** Hand-grade each question type and trace a practice answer, exam submission, and subsequent quiz edit.

- [x] **P1-T12 · Define analytics and activity measures** (MVP)
  - **Work and purpose** Document global, project, and quiz metrics. Specify denominators, unanswered items, eligible statuses, version grouping, elapsed time, ties, and empty states. Evaluate a lightweight chart option against the planned views.
  - **Files** `docs/ANALYTICS.md` · **Depends on** P1-T06, P1-T11
  - **Output** A metric dictionary with worked examples and chart choices.
  - **Accept when** Overall accuracy weights answered questions while mean attempt percentage weights completed attempts equally.
  - **Verify** Use completed attempts scoring 1/1 and 1/3 with all questions answered. Confirm 50% accuracy and about 66.7% mean score.

- [x] **P1-T13 · Review security and data exposure risks** (MVP)
  - **Work and purpose** Map untrusted inputs and trust boundaries to controls and tests. Include rich text, forged owner fields, private note exposure to AI, premature exam feedback, leaked logs, and provider cost abuse.
  - **Files** `docs/SECURITY.md`, `docs/TESTING.md` · **Depends on** P1-T05, P1-T07, P1-T10, P1-T11
  - **Output** A threat model linking each material risk to a control, owner, and verification scenario.
  - **Accept when** The review covers both the browser and direct API use, and only necessary study content reaches the provider.
  - **Verify** Review the model against two users, a malformed model response, a repeated submission, and a shared browser session.

- [x] **P1-T14 · Plan testing, deployment, and recovery** (MVP)
  - **Work and purpose** Choose unit, integration, component, and end-to-end boundaries. Outline mock Firebase/AI and isolated database use, plus Docker, Render, Vercel, Supabase migrations, health, backups, and recovery.
  - **Files** `docs/TESTING.md`, `docs/DEPLOYMENT.md` · **Depends on** P1-T04, P1-T10, P1-T12, P1-T13
  - **Output** A test matrix and deployment diagram with a staging-to-production sequence.
  - **Accept when** Every critical study flow has a test layer, and the release plan identifies how to recover data and restore service.
  - **Verify** Trace a schema migration failure and an unavailable AI provider through the plans.

- [x] **P1-T15 · Record design decisions and review outcomes** (MVP)
  - **Work and purpose** Reconcile the API, schema, six-phase roadmap, and security decisions with the approved scope. Record open questions, decisions, blockers, and the selected next task.
  - **Files** `docs/ROADMAP.md`, `docs/PROGRESS.md`, `task.md` · **Depends on** P1-T01, P1-T08, P1-T10, P1-T11, P1-T12, P1-T13, P1-T14
  - **Output** A coherent planning baseline and progress log keyed by task ID.
  - **Accept when** The brief’s design deliverables have a location and any changes to approved assumptions are visible for review.
  - **Verify** Cross-check endpoint names, model relationships, and task dependencies against one complete study session.

- [x] **P1-T16 · Prepare the existing Git repository** (MVP)
  - **Work and purpose** Inspect the checkout, preserve its documentation, and add ignore rules for credentials, dependencies, generated files, and build products.
  - **Files** `README.md`, `.gitignore` · **Depends on** P1-T15
  - **Output** A repository ready to receive the two TypeScript projects.
  - **Accept when** The project brief, README, and roadmap remain available and secret-bearing paths are ignored.
  - **Verify** Use Git’s ignore check on example secret and build paths, then review tracked documentation.

- [x] **P1-T17 · Initialize the Express TypeScript project** (MVP)
  - **Work and purpose** Create the server package, strict TypeScript configuration, development and build scripts, and the approved route/controller/service/repository layout. Configure source aliases and verify compiled imports.
  - **Files** `server/package.json`, `server/tsconfig.json`, `server/src/`, `server/server.ts` · **Depends on** P1-T02, P1-T03, P1-T16
  - **Output** A small executable backend entry point.
  - **Accept when** Both the dev runner and the compiled entry point can load a module through the configured import paths.
  - **Verify** Install from the lockfile, type-check, build, and start the emitted entry point locally.

- [ ] **P1-T18 · Initialize the React TypeScript project** (MVP)
  - **Work and purpose** Scaffold React, Vite, Tailwind, routing, and the feature structure. Give the smallest page a loading boundary so future routes have a working pattern.
  - **Files** `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/src/` · **Depends on** P1-T02, P1-T03, P1-T16
  - **Output** A runnable frontend shell with a build script.
  - **Accept when** A direct visit renders the initial route and a production build passes strict checking.
  - **Verify** Install from the lockfile, build, and open the development and preview versions of the route.

- [x] **P1-T19 · Document the environment contract** (MVP)
  - **Work and purpose** Separate public client settings from Firebase Admin, PostgreSQL, Redis, and AI secrets. Describe local, test, and deployed values using placeholders and explain which phase first requires each.
  - **Files** `client/.env.example`, `server/.env.example`, `docs/DEPLOYMENT.md` · **Depends on** P1-T04, P1-T17, P1-T18
  - **Output** Two environment examples and a configuration reference.
  - **Accept when** Every expected setting has a purpose and no privileged value is exposed to the client build.
  - **Verify** Compare example keys with the architecture and inspect the built frontend using nonsecret test markers.

- [x] **P1-T20 · Set up linting and formatting** (MVP)
  - **Work and purpose** Configure ESLint and Prettier for both projects, using the language and naming conventions established in the review.
  - **Files** `client/package.json`, `server/package.json`, `client/eslint.config.js`, `server/eslint.config.js`, `.prettierrc.json` · **Depends on** P1-T02, P1-T17, P1-T18
  - **Output** Repeatable lint and format-check commands.
  - **Accept when** Both projects pass the checks and a deliberately unused variable is reported in a disposable sample.
  - **Verify** Run both checks from a clean checkout, then verify the sample detects the intended issue.

- [x] **P1-T21 · Document and rehearse local setup** (MVP)
  - **Work and purpose** Write exact install, configure, build, run, test, and stop instructions for the agreed layout. Identify which services are required at this stage.
  - **Files** `README.md`, `docs/TESTING.md`, `docs/PROGRESS.md` · **Depends on** P1-T17, P1-T18, P1-T19, P1-T20
  - **Output** An onboarding guide with verified commands and recorded results.
  - **Accept when** A clean checkout reaches the frontend and server entry points by following the guide in order.
  - **Verify** Repeat the instructions in a disposable directory and record the exit codes and observed startup output.

### Phase verification

- Walk from registration through a historical retake using the API contract, ER diagram, security model, and worked scoring example.
- Follow setup instructions in a fresh checkout and run type, lint, and build checks for both projects.

**Complete when** The planning documents agree on ownership, source handling, scoring, and retention, and a reviewer can reproduce both builds.

<a id="phase-2"></a>

## Phase 2 — Backend foundation, database, authentication, and security

**Objective** Establish a verified identity and an ownership-enforcing database/API boundary for all later features.

**Prerequisites** The owner authorized Phase 2 on 2026-11-26 while Phase 1 browser verification remains deferred. Use the local toolchains and disposable test fixtures. Secret collection, hosted URLs, provider account setup and deployment are explicitly deferred.

**Deliverables** A protected Express API, version-controlled Prisma schema and migrations, profile synchronization, reusable validation, and two-account regression fixtures.

### Task checklist

- [x] **P2-T01 · Connect the backend test harness** (MVP)
  - **Work and purpose** Create an isolated test entry point with disposable fixtures and injectable token verifiers. Keep external services and production credentials outside normal test execution.
  - **Files** `server/tests/setup.ts`, `server/package.json`, `docs/TESTING.md` · **Depends on** None
  - **Output** A repeatable backend test command and fixture lifecycle.
  - **Accept when** Tests fail early on an unsafe database target and clean up their own records.
  - **Verify** Run the harness twice, including an intentionally failing sample, and confirm deterministic cleanup.

- [x] **P2-T02 · Validate runtime configuration** (MVP)
  - **Work and purpose** Parse server settings with Zod at startup. Handle optional provider keys until AI is enabled, and validate required CORS, Firebase, Redis, and database settings by environment.
  - **Files** `server/config/env.ts`, `server/.env.example`, `server/tests/config.test.ts` · **Depends on** None
  - **Output** Typed configuration and a redacted startup failure.
  - **Accept when** A missing required value fails startup with the setting name and no secret value.
  - **Verify** Try a missing variable, a malformed URL, and a valid test configuration.

- [x] **P2-T03 · Create the Express application and health routes** (MVP)
  - **Work and purpose** Separate application construction from listening on a port. Provide a minimal liveness endpoint and a readiness response that reflects required dependencies.
  - **Files** `server/src/app.ts`, `server/server.ts`, `server/src/routes/health.routes.ts` · **Depends on** P2-T01, P2-T02
  - **Output** An importable app and documented health endpoints.
  - **Accept when** The test harness can exercise routes without a global listener and public health responses expose no credentials.
  - **Verify** Request liveness while simulating an unavailable dependency and verify readiness returns a non-success response.

- [x] **P2-T04 · Define request validation and error responses** (MVP)
  - **Work and purpose** Validate params, query, and body against strict Zod schemas. Reject extra writable fields and translate typed service and unexpected errors into consistent client responses.
  - **Files** `server/src/middlewares/validate.ts`, `server/src/utils/input-validators/`, `server/src/utils/error-handler/`, `docs/API.md` · **Depends on** P2-T03
  - **Output** A validation and error-handling pattern reusable across modules.
  - **Accept when** Malformed input is rejected before a service runs and unexpected errors return a generic response.
  - **Verify** Exercise bad pagination, an injected owner field, and a thrown internal exception using test fixtures.

- [x] **P2-T05 · Protect the HTTP boundary** (MVP)
  - **Work and purpose** Configure Helmet, allowed CORS origins and headers, request body limits, and proxy trust appropriate to the deployment. Allow authorized frontend preflight requests.
  - **Files** `server/src/app.ts`, `server/config/env.ts`, `server/tests/http-policy.test.ts` · **Depends on** P2-T03, P2-T04
  - **Output** A documented HTTP policy with integration coverage.
  - **Accept when** An approved origin can call the API, oversized bodies are rejected, and policy headers appear on error responses.
  - **Verify** Check approved and unknown origins, a protected-route preflight, and body sizes on both sides of the limit.

- [ ] **P2-T06 · Install route-group rate limits** (MVP)
  - **Work and purpose** Back module-specific limits with Redis. Document stricter auth and generation limits, shared counters across API instances, and behavior when the store is unavailable.
  - **Files** `server/src/utils/rate-limiter/`, `server/config/redis.ts`, `server/src/app.ts` · **Depends on** P2-T02, P2-T03, P2-T04
  - **Output** A reusable route limiter and meaningful retry response.
  - **Accept when** Requests above the configured threshold receive the documented response across two app instances.
  - **Verify** Use a test Redis instance, split requests across two clients, and exercise store loss and window expiry.

- [x] **P2-T07 · Redact application and error logs** (MVP)
  - **Work and purpose** Use structured logging with request IDs. Exclude bearer tokens, note bodies, prompts, answers, credential material, and personal profile fields from routine and error logs.
  - **Files** `server/src/utils/logger.ts`, `server/src/app.ts`, `server/tests/logging.test.ts` · **Depends on** P2-T03, P2-T04
  - **Output** Correlatable request logs with controlled fields.
  - **Accept when** A failed authenticated request can be traced by request ID while its private contents remain absent from captured logs.
  - **Verify** Pass synthetic markers in headers and payloads, force an error, and search the captured output for each marker.

- [ ] **P2-T08 · Configure Prisma and verified PostgreSQL access** (MVP)
  - **Work and purpose** Set up multi-file Prisma generation and the PostgreSQL adapter using the approved Supabase connection and CA. Separate migration and pooled runtime settings when the chosen deployment needs distinct endpoints.
  - **Files** `server/prisma.config.ts`, `server/prisma/schema.prisma`, `server/config/db.ts`, `server/.env.example` · **Depends on** P2-T02
  - **Output** A generated client and a verified database connection.
  - **Accept when** The schema validates and the test connection succeeds with the configured CA and rejects a mismatched trust configuration.
  - **Verify** Generate the client, connect to the isolated PostgreSQL target, and check TLS behavior with a disposable configuration.

- [x] **P2-T09 · Model users, projects, and notes** (MVP)
  - **Work and purpose** Create user, project, and note models with unique Firebase UIDs, ownership relations, archive state, timestamps, structured content, and an atomic note revision field.
  - **Files** `server/prisma/user.prisma`, `server/prisma/project.prisma`, `server/prisma/note.prisma` · **Depends on** P2-T08
  - **Output** Prisma definitions for the editable workspace.
  - **Accept when** A project has exactly one owner and each note belongs to one project. Database constraints prevent orphan records.
  - **Verify** Validate and generate the schema, then apply it in the disposable database and exercise FK and UID uniqueness checks.

- [x] **P2-T10 · Model generated summaries and sources** (MVP)
  - **Work and purpose** Define summary content, editable title, generation time, source note/revision links, and the snapshot metadata required by the retention policy.
  - **Files** `server/prisma/summary.prisma`, `server/prisma/summary-source.prisma` · **Depends on** P2-T09
  - **Output** Summary storage with provenance and stale-source inputs.
  - **Accept when** A saved summary can cite two notes and retain meaningful provenance when a source changes.
  - **Verify** Create a two-source fixture, edit one source, then exercise the approved deletion behavior and inspect the links.

- [x] **P2-T11 · Model versioned quizzes and questions** (MVP)
  - **Work and purpose** Separate quiz identity from immutable versions. Relate generation sources to their version, preserve option IDs and grading keys, and enforce question ordering and key uniqueness.
  - **Files** `server/prisma/quiz.prisma`, `server/prisma/quiz-source.prisma`, `server/prisma/quiz-version.prisma`, `server/prisma/quiz-question.prisma`, `server/prisma/quiz-question-option.prisma` · **Depends on** P2-T09
  - **Output** Versioned quiz, source, question, and option definitions.
  - **Accept when** Two versions of a quiz can hold different questions, grading keys, and source revisions independently.
  - **Verify** Build both versions in an isolated fixture, then query each question set with its sources.

- [x] **P2-T12 · Model attempts and submitted answers** (MVP)
  - **Work and purpose** Link each attempt to a single quiz version and record lifecycle timestamps, mode, question/option order, answers, and final scoring facts. Enforce one logical answer per attempt question and version consistency.
  - **Files** `server/prisma/quiz-attempt.prisma`, `server/prisma/quiz-attempt-answer.prisma`, `docs/DATABASE.md` · **Depends on** P2-T11
  - **Output** Attempt and answer definitions that preserve a historical result.
  - **Accept when** Retakes receive distinct attempt IDs, duplicate logical answers fail, and a mismatched version/question association is rejected.
  - **Verify** Create two attempts for one version, try inserting a duplicate answer and a question from another version, and check constraints.

- [x] **P2-T13 · Model AI usage and request identity** (MVP)
  - **Work and purpose** Record owner, operation, model, generation identity, status, timestamps, token usage and cost inputs. Plan reservation and settlement fields for concurrent calls and failed generations.
  - **Files** `server/prisma/ai-usage.prisma`, `docs/DATABASE.md` · **Depends on** P2-T09
  - **Output** An owner-scoped usage ledger with a unique request identity.
  - **Accept when** Repeated use of an idempotency key for the same user cannot create two ledger entries, and different users may use the same key independently.
  - **Verify** Insert matching and distinct user/key pairs and aggregate a known input/output usage fixture.

- [x] **P2-T14 · Add indexes for scoped lists and history** (MVP)
  - **Work and purpose** Match indexes to project ownership, note lists, source links, version lookups, attempt timelines, and usage windows. Select a search strategy appropriate to the approved database and scope.
  - **Files** `server/prisma/`, `docs/DATABASE.md` · **Depends on** P2-T09, P2-T10, P2-T11, P2-T12, P2-T13
  - **Output** An index inventory mapping index order to query shape.
  - **Accept when** Common lists support bounded pagination and stable ordering, including items with tied timestamps.
  - **Verify** Seed representative data, inspect plans and confirm paging produces neither gaps nor duplicate rows.

- [x] **P2-T15 · Create and rehearse the initial migrations** (MVP)
  - **Work and purpose** Generate and review migrations in dependency order. Check referential actions against retention rules and rehearse deployment and recovery against a disposable PostgreSQL database.
  - **Files** `server/prisma/migrations/`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md` · **Depends on** P2-T14
  - **Output** Version-controlled migrations and repeatable migration instructions.
  - **Accept when** A clean database reaches the expected schema and a second deploy has no pending changes.
  - **Verify** Apply migrations to an empty test database, inspect constraints, re-run deploy, and record results.

- [ ] **P2-T16 · Configure Firebase Admin and token verification** (MVP)
  - **Work and purpose** Initialize Admin on the server, document Firebase email/password setup, and implement bearer-token verification with an injectable test verifier. Derive the request identity from the verified UID.
  - **Files** `server/config/firebase.ts`, `server/src/middlewares/verifyToken.ts`, `server/tests/auth.test.ts`, `docs/SECURITY.md` · **Depends on** P2-T02, P2-T03, P2-T04
  - **Output** An authentication middleware and a project-specific Firebase setup guide.
  - **Accept when** Missing, invalid, expired, and wrong-project tokens are rejected and a valid token yields only its verified identity.
  - **Verify** Run controlled verifier cases and verify one emulator-issued or isolated-project ID token through the middleware.

- [x] **P2-T17 · Synchronize the database user** (MVP)
  - **Work and purpose** Upsert the user by verified UID before application data access. Use controlled provider fields, preserve editable profile fields, and handle parallel first requests.
  - **Files** `server/src/services/user.service.ts`, `server/src/repositories/user.repository.ts`, `server/tests/user-sync.test.ts` · **Depends on** P2-T15, P2-T16
  - **Output** An idempotent first-login path.
  - **Accept when** Two concurrent requests for one new UID create exactly one profile and later sign-ins preserve edits.
  - **Verify** Send parallel authenticated requests in the integration harness, edit a display field, and sign in again.

- [x] **P2-T18 · Enforce resource ownership consistently** (MVP)
  - **Work and purpose** Resolve the application user from the verified UID. Apply the database-backed role guard on protected route groups and scope project, child, attempt, and usage queries to their ownership chain.
  - **Files** `server/src/middlewares/`, `server/src/repositories/`, `docs/SECURITY.md` · **Depends on** P2-T04, P2-T06, P2-T17
  - **Output** Reusable ownership queries and protected route composition.
  - **Accept when** Wrong-owner and missing IDs receive the same public resource response. Supplied owner or role fields grant no access.
  - **Verify** Use seeded accounts and projects to exercise owner, other-owner, missing, and forged-field cases directly at the API.

- [x] **P2-T19 · Expose current-user profile endpoints** (MVP)
  - **Work and purpose** Add authenticated profile read and update routes with allow-listed editable fields. Return the client profile shape and keep credentials and provider-owned fields outside the response/update contract.
  - **Files** `server/src/routes/user.routes.ts`, `server/src/controllers/user.controller.ts`, `server/src/services/user.service.ts`, `server/src/utils/input-validators/user.ts` · **Depends on** P2-T17, P2-T18
  - **Output** Working read and update operations for the current user.
  - **Accept when** A user can edit their own permitted profile fields and cannot select an arbitrary account or set its role.
  - **Verify** Read and edit a test profile, then send another UID and a role field and verify neither account gains privileges.

- [x] **P2-T20 · Establish the cross-user regression suite** (MVP)
  - **Work and purpose** Build a reusable two-user fixture with similar project and child data. Test identity verification and authorized query boundaries and provide fixture helpers for future feature endpoints.
  - **Files** `server/tests/fixtures/`, `server/tests/ownership.test.ts`, `docs/TESTING.md` · **Depends on** P2-T05, P2-T06, P2-T07, P2-T15, P2-T18, P2-T19
  - **Output** A repeatable authentication and ownership suite.
  - **Accept when** Valid same-owner queries pass, nested cross-owner lookups fail consistently, and test fixtures run in isolation.
  - **Verify** Run the suite in both account orders, exercise missing credentials, and inspect response bodies and captured logs.

### Phase verification

- Migrate a clean database, then run the backend suite against isolated data.
- Issue equivalent private requests as the owner, as another signed-in user, and without credentials. Check response shapes and redaction.
- Check shared rate counters, allowed browser origins, request limits, and health behavior with a dependency unavailable.

**Complete when** Migrations, trusted identities, scoped data access, safe errors, and profile operations pass the documented checks.

<a id="phase-3"></a>

## Phase 3 — Project folders and note-taking

**Objective** Give each learner a private workspace for organizing subjects and editing notes across sessions.

**Prerequisites** Approved Phase 2 foundation, including verified identity, owner-scoped persistence, migrations and separate-user fixtures.

**Deliverables** Authenticated workspace, project and note APIs, rich-text editor with recovery, and project and note integration checks.

### Task checklist

- [x] **P3-T01 · Create a project** (MVP)
  - **Work and purpose** Accept a name, description and allowed display settings, deriving ownership from the verified account so folders are private from creation.
  - **Files** `server/src/routes/projects.routes.ts`, `server/src/controllers/projects.controller.ts`, `server/src/services/projects.service.ts`, `server/src/repositories/projects.repository.ts` · **Depends on** None
  - **Output** Project creation endpoint returning the new project.
  - **Accept when** A valid request creates one owned folder and an invalid request writes nothing.
  - **Verify** Create a folder as one account, then send an empty name and an unexpected owner field.

- [x] **P3-T02 · List and search projects** (MVP)
  - **Work and purpose** Page and order the caller’s folders in the database, filter by archive state and search the title to support navigation.
  - **Files** `server/src/repositories/projects.repository.ts`, `server/src/utils/input-validators/projects.ts` · **Depends on** P3-T01
  - **Output** Project list endpoint with note counts and timestamps.
  - **Accept when** Pages have stable ordering and counts follow the documented active-note rule.
  - **Verify** Seed folders for two accounts, including equal timestamps and archived records, then compare pages and counts.

- [x] **P3-T03 · Read one project** (MVP)
  - **Work and purpose** Fetch a single folder through the ownership predicate to support direct navigation without leaking another learner’s project.
  - **Files** `server/src/services/projects.service.ts`, `server/src/repositories/projects.repository.ts` · **Depends on** P3-T01
  - **Output** Project detail endpoint.
  - **Accept when** An owner sees the project metadata and another account receives the same response as for a missing project.
  - **Verify** Read a known folder as its owner, as another account and with an unknown ID.

- [x] **P3-T04 · Edit project metadata** (MVP)
  - **Work and purpose** Allow partial updates to the name, description, color and icon using an explicit field allowlist to preserve ownership.
  - **Files** `server/src/controllers/projects.controller.ts`, `server/src/utils/input-validators/projects.ts`, `server/src/repositories/projects.repository.ts` · **Depends on** P3-T03
  - **Output** Validated project edit endpoint.
  - **Accept when** Only approved fields change and edits advance the modification timestamp.
  - **Verify** Edit one field, then send an invalid color and an ownership field and confirm the original owner.

- [x] **P3-T05 · Archive and restore projects** (MVP)
  - **Work and purpose** Implement reversible state changes and enforce the approved archive rules on project access and mutation so learners can set subjects aside.
  - **Files** `server/src/services/projects.service.ts`, `server/src/repositories/projects.repository.ts` · **Depends on** P3-T02, P3-T03
  - **Output** Archive and restore operations.
  - **Accept when** Archiving hides the project from the active list, restoring brings it back and both preserve its contents.
  - **Verify** Repeat each operation and compare project identity, listing and retained records.

- [x] **P3-T06 · Confirm project deletion** (MVP)
  - **Work and purpose** Report affected content, require explicit confirmation and apply the approved retention policy atomically so a folder action cannot erase historical attempts accidentally.
  - **Files** `server/src/services/projects.service.ts`, `server/src/repositories/projects.repository.ts`, `server/tests/projects/deletion.test.ts` · **Depends on** P3-T03, P3-T05
  - **Output** Deletion preview and confirmed project removal behavior.
  - **Accept when** The confirmation targets the same owned project and its current impact, and protected history remains reviewable.
  - **Verify** Use a populated fixture, change its contents after preview, and test cancel, stale confirmation and confirmed deletion.

- [x] **P3-T07 · Define the rich-text document** (MVP)
  - **Work and purpose** Specify a versioned document format, allowed nodes, size limits and plain-text extraction so the editor, search and AI share one content contract. Record the storage tradeoffs.
  - **Files** `server/src/utils/input-validators/note-content.ts`, `client/src/features/notes`, `docs/DATABASE.md` · **Depends on** None
  - **Output** Validated rich-text fixtures and a documented storage format.
  - **Accept when** All required formatting survives serialization and unsupported markup or attributes cannot execute when rendered.
  - **Verify** Round-trip each node and mark and submit malformed, oversized and unsafe attribute fixtures.

- [x] **P3-T08 · Create and read notes** (MVP)
  - **Work and purpose** Create a note in a writable owned project and retrieve it by checking both project and note identity so nested URLs stay private.
  - **Files** `server/src/routes/notes.routes.ts`, `server/src/controllers/notes.controller.ts`, `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** P3-T03, P3-T05, P3-T07
  - **Output** Note creation and detail endpoints returning revision and timestamps.
  - **Accept when** A new note belongs to the requested folder and mismatched or foreign parent IDs reveal no content.
  - **Verify** Create and reopen a note, then retry using another owned folder and a foreign folder.

- [x] **P3-T09 · Protect edits with revisions** (MVP)
  - **Work and purpose** Require the last-read revision for title or content changes and atomically compare and advance it to prevent stale edits replacing newer work.
  - **Files** `server/src/repositories/notes.repository.ts`, `server/src/services/notes.service.ts`, `server/src/utils/input-validators/notes.ts` · **Depends on** P3-T08
  - **Output** Version-aware note update endpoint.
  - **Accept when** Two updates using the same revision have one winner and one explicit conflict, and neither produces a partial write.
  - **Verify** Submit concurrent edits from the same revision, including one title-only update, then read the winning record.

- [ ] **P3-T10 · Search and sort notes** (MVP)
  - **Work and purpose** Implement paginated note lists with database-level title and plain-text content search and deterministic sorting by title, creation or modification date.
  - **Files** `server/src/repositories/notes.repository.ts`, `server/src/utils/input-validators/notes.ts` · **Depends on** P3-T07, P3-T08
  - **Output** Scoped project note list with query controls.
  - **Accept when** Search matches formatted text, sort ties are stable and results stay inside the requested owned project.
  - **Verify** Use tied titles and dates, a multi-page fixture and the same search phrase in a second account.

- [ ] **P3-T11 · Pin and unpin notes** (MVP)
  - **Work and purpose** Persist the pin state in an owned project so frequently used study material is easy to find.
  - **Files** `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** P3-T08, P3-T10
  - **Output** Pin and unpin operations and list metadata.
  - **Accept when** The flag survives reload and repeat requests converge on the requested state.
  - **Verify** Pin twice, reload the list, unpin and verify a foreign account cannot change the flag.

- [ ] **P3-T12 · Archive and restore notes** (MVP)
  - **Work and purpose** Separate active and archived notes while preserving each note’s identity, revision and links so archived material can be recovered.
  - **Files** `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** P3-T08, P3-T10
  - **Output** Reversible note archive operations.
  - **Accept when** Restored notes return to the correct project and the default list excludes archived notes.
  - **Verify** Archive and restore a formatted note, then compare identity, contents and list results.

- [ ] **P3-T13 · Remove a note safely** (MVP)
  - **Work and purpose** Apply the approved deletion and source-retention rules to a confirmed owner-scoped request so saved study history remains intelligible.
  - **Files** `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts`, `server/tests/notes/deletion.test.ts` · **Depends on** P3-T08, P3-T12
  - **Output** Confirmed note deletion with retained historical references as designed.
  - **Accept when** An owner can remove the note from active use and historical quiz snapshots remain reviewable.
  - **Verify** Delete a fixture linked to a quiz attempt, read the old snapshot and repeat the request from a second account.

- [ ] **P3-T14 · Duplicate a note** (MVP)
  - **Work and purpose** Copy the title and rich-text content into an independently versioned note for learners who need a new draft.
  - **Files** `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** P3-T07, P3-T08
  - **Output** Duplicate-note operation.
  - **Accept when** The copy has a new ID and editing it leaves the source content and revision intact.
  - **Verify** Duplicate a note with lists and code blocks, edit the copy and reread both.

- [ ] **P3-T15 · Move a note between projects** (MVP)
  - **Work and purpose** Check the note, its current parent and the destination against the same owner within the move operation to prevent cross-account transfers.
  - **Files** `server/src/services/notes.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** P3-T05, P3-T08, P3-T09
  - **Output** Atomic note move operation.
  - **Accept when** A permitted move retains the note ID and contents and a rejected move preserves the original parent.
  - **Verify** Move between two owned folders, then try a foreign destination and an archived destination.

- [ ] **P3-T16 · Build authentication screens** (MVP)
  - **Work and purpose** Connect sign-up, sign-in, sign-out and password recovery/reset screens to Firebase so credentials stay with the identity provider.
  - **Files** `client/src/features/auth`, `client/src/routes` · **Depends on** None
  - **Output** Accessible authentication and recovery flow with persistence.
  - **Accept when** A learner can register, sign in again after recovery, reload their session and sign out.
  - **Verify** Run the flows with the Firebase test environment and check invalid and expired reset links.

- [ ] **P3-T17 · Bind requests and caches to the current user** (MVP)
  - **Work and purpose** Gate protected routes until Firebase resolves, attach the current token to protected requests and clear account-scoped queries and drafts on identity changes.
  - **Files** `client/src/api`, `client/src/features/auth`, `client/src/routes`, `client/src/store` · **Depends on** P3-T16
  - **Output** Protected routing and session-aware TanStack Query integration.
  - **Accept when** Switching accounts cannot render the previous user’s cached data, and a late response from the old session cannot populate the new workspace.
  - **Verify** Delay a query, sign out and switch users, then open a protected URL and resolve the delayed request.

- [ ] **P3-T18 · Build the dashboard shell** (MVP)
  - **Work and purpose** Provide a responsive dashboard, sidebar, breadcrumbs and quick actions. Keep UI preferences in Zustand and fetch project data through TanStack Query.
  - **Files** `client/src/features/dashboard`, `client/src/components`, `client/src/store` · **Depends on** P3-T02, P3-T17
  - **Output** Navigable authenticated workspace shell.
  - **Accept when** Keyboard and touch users can reach project and note actions and see meaningful loading, empty and error states.
  - **Verify** Walk through the shell at mobile, tablet and desktop widths using keyboard navigation.

- [ ] **P3-T19 · Build the project library** (MVP)
  - **Work and purpose** Present search, paginated cards, note counts and dates with controls to create, customize, archive, restore and confirm deletion of folders.
  - **Files** `client/src/features/projects`, `client/src/api/projects.ts` · **Depends on** P3-T02, P3-T04, P3-T05, P3-T06, P3-T18
  - **Output** Interactive project library backed by project APIs.
  - **Accept when** Mutations refresh affected queries and cancellation leaves the targeted project intact.
  - **Verify** Create a folder, rename it, search, archive, restore and cancel a deletion after reviewing the impact.

- [ ] **P3-T20 · Build the project detail view** (MVP)
  - **Work and purpose** Connect an owned project to its paginated note list and expose note actions, sort, search and archive controls in context.
  - **Files** `client/src/features/projects`, `client/src/features/notes`, `client/src/api/notes.ts` · **Depends on** P3-T03, P3-T10, P3-T11, P3-T12, P3-T13, P3-T14, P3-T15, P3-T19
  - **Output** Project workspace with note actions.
  - **Accept when** Mutations update affected project counts and note lists, including source and destination after a move.
  - **Verify** Create, duplicate, move, pin, archive and restore notes across two projects and check lists after reload.

- [ ] **P3-T21 · Implement the note editor** (MVP)
  - **Work and purpose** Render the approved document format with headings, paragraphs, bold, italic, underline, lists, checklists, code and quotes. Support title edits and keyboard controls.
  - **Files** `client/src/features/notes/editor`, `client/src/features/notes` · **Depends on** P3-T07, P3-T09, P3-T20
  - **Output** Accessible rich-text editor with explicit save.
  - **Accept when** A saved and reopened note retains every supported format and pasted content is normalized to allowed elements.
  - **Verify** Edit all supported styles, paste mixed markup, use keyboard controls and compare the reopened document.

- [ ] **P3-T22 · Queue autosaves and recover conflicts** (MVP)
  - **Work and purpose** Debounce edits, serialize writes per note and retain the latest draft across in-flight saves. Offer recovery when a newer server revision or a connection failure interrupts a save.
  - **Files** `client/src/features/notes/editor`, `client/src/features/notes/hooks`, `client/src/store` · **Depends on** P3-T09, P3-T17, P3-T21
  - **Output** Autosave status and conflict recovery with draft retention.
  - **Accept when** Late acknowledgments cannot erase newer typing, retries preserve the draft and switching notes never sends one note’s content to another.
  - **Verify** Simulate delayed saves, offline edits, rapid navigation and competing tabs, then inspect local and server content.

- [ ] **P3-T23 · Edit the signed-in profile** (MVP)
  - **Work and purpose** Add a settings form backed by the current-user profile API. Show editable display fields, validate them and refresh the signed-in account’s cached profile after saving.
  - **Files** `client/src/features/settings/ProfileForm.tsx`, `client/src/api/profile.ts` · **Depends on** P3-T17, P3-T18
  - **Output** An accessible profile settings screen with saved and error states.
  - **Accept when** A permitted edit survives reload and changing accounts displays the new account’s profile.
  - **Verify** Change a display name, reload, submit an invalid value, then switch to a second account and inspect its profile.

- [ ] **P3-T24 · Verify the private study workspace** (MVP)
  - **Work and purpose** Run project and note workflows through the real API with two identities and exercise account changes in the UI to verify the complete ownership boundary.
  - **Files** `server/tests/projects`, `server/tests/notes`, `client/src/features/notes`, `docs/TESTING.md` · **Depends on** P3-T06, P3-T15, P3-T17, P3-T20, P3-T22, P3-T23
  - **Output** Repeatable workspace integration results.
  - **Accept when** The authenticated workflow passes and every foreign read or mutation case leaves the second account’s data intact.
  - **Verify** Repeat the full fixture suite with fresh accounts and compare stored data before and after rejected operations.

### Phase verification

- [ ] Exercise registration, sign-in, credential recovery and sign-out in the Firebase test environment.
- [ ] Use two accounts to check isolation through project lists, note reads, moves, deletes and account switches.
- [ ] Check rich-text round trips, keyboard interaction, autosave conflicts, network failures and narrow layouts.

**Complete when** The MVP tasks pass their checks, both accounts can complete the workspace flow, and concurrent or failed saves preserve recoverable content.

<a id="phase-4"></a>

## Phase 4 — AI summaries and quiz generation

**Objective** Generate source-grounded summaries and editable, versioned quizzes from a learner’s own notes while bounding provider usage.

**Prerequisites** Approved Phase 3 note and project flows, a Phase 1 provider decision and cost policy, and the Phase 2 identity, schema and rate-limiting foundations.

**Deliverables** Backend generation endpoints, validated source references, summary and quiz management APIs, immutable quiz versions and usage records.

### Task checklist

- [ ] **P4-T01 · Configure the backend AI client** (MVP)
  - **Work and purpose** Wrap the selected provider behind a small generation service, validate its server-only configuration with Zod and provide a deterministic test adapter.
  - **Files** `server/src/ai`, `server/src/services/ai.service.ts`, `server/tests/ai` · **Depends on** None
  - **Output** Configured production client and mock client with the same result contract.
  - **Accept when** Invalid settings fail early with a redacted message and automated tests run without credentials or network access.
  - **Verify** Start with missing configuration, then invoke the test adapter and check logs for redaction.

- [ ] **P4-T02 · Resolve a note or selection** (MVP)
  - **Work and purpose** Define a source request for a whole note or a range in a specific revision. Derive the excerpt from the owned server copy so generation uses exactly the intended material.
  - **Files** `server/src/utils/input-validators/ai-sources.ts`, `server/src/services/ai-sources.service.ts`, `server/src/repositories/notes.repository.ts` · **Depends on** None
  - **Output** Resolver for single-note and selected-text generation.
  - **Accept when** Stale revisions, invalid ranges and foreign resources fail before any provider call.
  - **Verify** Test a valid excerpt with Unicode text, changed content, out-of-range offsets and a second account’s note.

- [ ] **P4-T03 · Resolve multiple notes and full folders** (MVP)
  - **Work and purpose** Verify each selected ID against one owned project, and enumerate all eligible folder notes in stable pages with revisions so a mixed-ownership batch fails as a whole.
  - **Files** `server/src/services/ai-sources.service.ts`, `server/src/repositories/notes.repository.ts`, `server/tests/ai/sources.test.ts` · **Depends on** P4-T02
  - **Output** A source manifest for selected notes and whole folders.
  - **Accept when** Empty folders return a clear result, edits during collection are detected, and every eligible note appears exactly once.
  - **Verify** Compare the manifest against a multi-page fixture containing archived notes, then submit a mixed-owner selection.

- [ ] **P4-T04 · Build bounded, source-grounded prompts** (MVP)
  - **Work and purpose** Place source IDs, revisions and note text in a data section separate from trusted generation instructions. Restrict citations to the provided material and omit unrelated user data.
  - **Files** `server/src/ai/prompts`, `server/tests/ai/prompts.test.ts` · **Depends on** P4-T01, P4-T02, P4-T03
  - **Output** Versioned summary and quiz prompt templates.
  - **Accept when** Each prompt retains source boundaries, requests grounded output and exposes no credentials, tools or other user material.
  - **Verify** Inspect mock requests for each scope with confusing formatting and instruction-like prose in a note.

- [ ] **P4-T05 · Plan tokens and chunk coverage** (MVP)
  - **Work and purpose** Estimate input and reserved output against the chosen model’s context limit, then split long notes into ordered ranges with stable source references.
  - **Files** `server/src/ai/chunking`, `server/tests/ai/chunking.test.ts` · **Depends on** P4-T02, P4-T03, P4-T04
  - **Output** Token-budgeted chunk planner and coverage manifest.
  - **Accept when** Every eligible text range is covered, normal requests fit one call where appropriate and over-limit requests fail clearly before billing.
  - **Verify** Use fixtures on either side of the budget boundary, one long note and many small notes, then compare covered ranges.

- [ ] **P4-T06 · Merge results for large source sets** (MVP)
  - **Work and purpose** Combine chunk results in bounded stages, carry source IDs into each merge and fail the generation if any required chunk is missing so a partial result cannot appear complete.
  - **Files** `server/src/ai/chunking`, `server/src/services/ai.service.ts`, `server/tests/ai/coverage.test.ts` · **Depends on** P4-T04, P4-T05
  - **Output** Bounded multi-stage processing with traceable inputs.
  - **Accept when** Material in the last chunk can influence the result and a failed chunk prevents a completed artifact.
  - **Verify** Place distinct concepts in the first and last chunks, inspect mock calls and interrupt a middle chunk.

- [ ] **P4-T07 · Bound provider retries and duration** (MVP)
  - **Work and purpose** Set per-call timeouts and an overall deadline, classify transient failures, honor retry delays and account for actual calls so failed generations have predictable cost and duration.
  - **Files** `server/src/ai`, `server/src/services/ai.service.ts`, `server/tests/ai/retries.test.ts` · **Depends on** P4-T01, P4-T05
  - **Output** Provider call policy with bounded retry and recovery behavior.
  - **Accept when** Timeouts end the request, stable validation errors cause no retry, and exhausted retries return a recoverable generation state.
  - **Verify** Use a fake clock to simulate throttling, temporary service failure, a timeout and a malformed request.

- [ ] **P4-T08 · Record AI usage** (MVP)
  - **Work and purpose** Persist generation identity, user, provider/model, timestamps, status and available token counts. Use the configured price schedule for estimates and distinguish unknown costs from zero.
  - **Files** `server/src/services/ai-usage.service.ts`, `server/src/repositories/ai-usage.repository.ts`, `server/tests/ai/usage.test.ts` · **Depends on** P4-T01, P4-T07
  - **Output** Attributable usage records and an owner-scoped usage query.
  - **Accept when** Failed and successful calls remain attributable, estimated values are labeled and note text stays out of logs.
  - **Verify** Replay fixed usage results, an unknown usage result and a failed call, then query with two users.

- [ ] **P4-T09 · Enforce quotas and concurrency** (MVP)
  - **Work and purpose** Reserve the estimated allowance atomically, apply per-user request and concurrency limits, and settle or expire reservations so parallel requests cannot overspend a shared quota.
  - **Files** `server/src/services/ai-usage.service.ts`, `server/src/repositories/ai-usage.repository.ts`, `server/src/utils/rate-limiter/ai.ts` · **Depends on** P4-T05, P4-T07, P4-T08
  - **Output** Generation admission checks with clear limit responses.
  - **Accept when** Rejections incur no provider call and failed or interrupted work releases capacity according to the approved accounting policy.
  - **Verify** Race requests near the quota and concurrency thresholds and simulate stale reservation recovery.

- [ ] **P4-T10 · Deduplicate generation requests** (MVP)
  - **Work and purpose** Bind an idempotency key to the owner, request settings and source revisions, then return the original result or status on a retry to avoid duplicate charges.
  - **Files** `server/src/services/ai-generation.service.ts`, `server/src/repositories/ai-usage.repository.ts`, `server/tests/ai/idempotency.test.ts` · **Depends on** P4-T03, P4-T07, P4-T08, P4-T09
  - **Output** Retry-safe generation lifecycle with explicit success and failure states.
  - **Accept when** Concurrent identical submissions perform one logical generation, unrelated input cannot reuse the key and intentional regeneration starts a new request.
  - **Verify** Send simultaneous duplicates, drop a response, retry, then compare provider calls, usage and stored artifacts.

- [ ] **P4-T11 · Validate summary settings and results** (MVP)
  - **Work and purpose** Define schemas for short, medium and detailed summaries in paragraph, bullet, key-concept and study-guide formats. Check output bounds and require citations from the resolved input.
  - **Files** `server/src/utils/input-validators/summaries.ts`, `server/src/ai/schemas/summary.ts` · **Depends on** P4-T02, P4-T03, P4-T04
  - **Output** Validated summary request and output contracts.
  - **Accept when** Unknown formats, missing required content and citations outside the manifest fail validation.
  - **Verify** Parse valid fixtures for each format and length, then try an invented source ID and an oversized result.

- [ ] **P4-T12 · Generate single-note and excerpt summaries** (MVP)
  - **Work and purpose** Connect the summary prompt and validator to authorized whole notes and selected ranges, allowing important concepts to be extracted without changing source notes.
  - **Files** `server/src/services/summary-generation.service.ts`, `server/src/controllers/summaries.controller.ts`, `server/src/routes/summaries.routes.ts` · **Depends on** P4-T02, P4-T05, P4-T06, P4-T10, P4-T11
  - **Output** Single-note and selection generation endpoint.
  - **Accept when** A selection sends only the selected range, and successful or failed generation leaves source content and revision unchanged.
  - **Verify** Generate both scopes from the same note and compare the mock input and stored note before and after.

- [ ] **P4-T13 · Generate combined summaries** (MVP)
  - **Work and purpose** Process multiple selected notes and full folders with the coverage manifest, then combine related topics while retaining citations to each contributing note.
  - **Files** `server/src/services/summary-generation.service.ts`, `server/tests/ai/folder-summaries.test.ts` · **Depends on** P4-T03, P4-T06, P4-T12
  - **Output** Multi-note and folder summaries with source references.
  - **Accept when** All eligible inputs are processed and a final summary links each cited concept to an allowed source.
  - **Verify** Compare selected and full-folder runs and test missing-chunk failure and topic merging with mock outputs.

- [ ] **P4-T14 · Save summaries and track source revisions** (MVP)
  - **Work and purpose** Store generated content, title, timestamps and source versions together. Return saved history with a stale-source indicator so learners can judge when material has changed.
  - **Files** `server/src/routes/summaries.routes.ts`, `server/src/services/summaries.service.ts`, `server/src/repositories/summaries.repository.ts` · **Depends on** P4-T12, P4-T13
  - **Output** Owner-scoped save, detail and history endpoints with source metadata.
  - **Accept when** Saved content can be reread without a provider call and a revised or removed source is identified.
  - **Verify** Save a summary, change one source and remove another, then read its owner-scoped history and check the call count.

- [ ] **P4-T15 · Manage saved summaries** (MVP)
  - **Work and purpose** Allow owners to edit text, rename or delete a summary. Route explicit regeneration through the metered generator while preserving the saved original until a replacement is accepted.
  - **Files** `server/src/controllers/summaries.controller.ts`, `server/src/services/summaries.service.ts`, `server/tests/summaries` · **Depends on** P4-T10, P4-T14
  - **Output** Summary lifecycle API for editing and regeneration.
  - **Accept when** Ordinary management incurs no AI calls, and a failed regeneration preserves the saved summary.
  - **Verify** Edit and rename, force a regeneration error, retry successfully and attempt deletion from a second account.

- [ ] **P4-T16 · Validate quiz settings** (MVP)
  - **Work and purpose** Accept a title, source scope, count, difficulty, question-type selection, practice or exam mode and explanation preference so the generator receives an explicit bounded request.
  - **Files** `server/src/utils/input-validators/quizzes.ts`, `server/tests/ai/quiz-settings.test.ts` · **Depends on** P4-T02, P4-T03
  - **Output** Quiz request schema with defined limits.
  - **Accept when** Easy, medium, hard and mixed-type requests validate and unsupported combinations fail before generation.
  - **Verify** Exercise each setting boundary and verify the mock provider remains unused for invalid requests.

- [ ] **P4-T17 · Validate choice-based questions** (MVP)
  - **Work and purpose** Define Zod shapes for multiple choice, true/false and multiple-select items, enforcing valid option IDs, distinct choices and correct answer cardinality.
  - **Files** `server/src/ai/schemas/quiz-question.ts`, `server/tests/ai/quiz-questions.test.ts` · **Depends on** P4-T16
  - **Output** Checked option and answer-key structures for three question types.
  - **Accept when** Each key references an existing option and duplicate choices or impossible answer sets are rejected.
  - **Verify** Parse valid question fixtures and invalid fixtures with repeated options, missing keys and extra true/false choices.

- [ ] **P4-T18 · Validate identification questions** (MVP)
  - **Work and purpose** Represent accepted answer variants explicitly and apply the same approved text-normalization rules planned for scoring so generated items can be graded deterministically.
  - **Files** `server/src/ai/schemas/quiz-question.ts`, `server/src/services/answer-normalization.ts`, `server/tests/ai/identification.test.ts` · **Depends on** P4-T16
  - **Output** Identification question schema and normalization fixtures.
  - **Accept when** Blank normalized answers fail and distinct accepted variants survive validation.
  - **Verify** Try case differences, extra spaces and punctuation-sensitive technical terms according to the documented rules.

- [ ] **P4-T19 · Generate quizzes from every source scope** (MVP)
  - **Work and purpose** Connect the quiz prompt, admission policy and bounded chunk processing to whole notes, excerpts, selected notes and full folders. Preserve references for each proposed question.
  - **Files** `server/src/services/quiz-generation.service.ts`, `server/src/controllers/quizzes.controller.ts`, `server/src/routes/quizzes.routes.ts` · **Depends on** P4-T03, P4-T04, P4-T06, P4-T10, P4-T16, P4-T17, P4-T18
  - **Output** Generation endpoint with a structured draft for editing.
  - **Accept when** Each requested source scope reaches the provider only after ownership checks, and a large folder has explicit coverage.
  - **Verify** Generate one mock quiz per scope and verify that an unauthorized or stale selection makes zero calls.

- [ ] **P4-T20 · Check quiz quality before persistence** (MVP)
  - **Work and purpose** Validate the complete draft for requested count and types, non-repetitive questions, correct answer references, explanation settings and citations, rejecting invalid output before saving.
  - **Files** `server/src/ai/schemas/quiz.ts`, `server/src/services/quiz-generation.service.ts`, `server/tests/ai/quiz-quality.test.ts` · **Depends on** P4-T17, P4-T18, P4-T19
  - **Output** Whole-quiz validation with clean generation errors.
  - **Accept when** Malformed or incomplete quizzes produce no saved questions or versions, and mixed quizzes follow their requested settings.
  - **Verify** Inject malformed JSON, repeated prompts, invented citations and a wrong number of questions and inspect persisted data.

- [ ] **P4-T21 · Persist an immutable quiz version** (MVP)
  - **Work and purpose** Store each accepted draft and its sources, questions, options and answer key atomically under a version ID so an attempt can always resolve the exact material it used.
  - **Files** `server/src/services/quizzes.service.ts`, `server/src/repositories/quizzes.repository.ts`, `server/tests/quizzes/versioning.test.ts` · **Depends on** P4-T19, P4-T20
  - **Output** Save and management-detail endpoints bound to immutable quiz versions.
  - **Accept when** A save commits the entire version or nothing, and the author’s management view requires ownership.
  - **Verify** Force a mid-save failure and compare row counts, then save and retrieve the full version as its owner.

- [ ] **P4-T22 · Edit quiz content through new versions** (MVP)
  - **Work and purpose** Validate changes to questions, options and keys through the same schemas and publish a new immutable version while keeping old versions addressable by existing attempts.
  - **Files** `server/src/services/quizzes.service.ts`, `server/src/repositories/quizzes.repository.ts`, `server/tests/quizzes/versioning.test.ts` · **Depends on** P4-T20, P4-T21
  - **Output** Version-aware quiz edit and explicit regeneration operations.
  - **Accept when** Edits create a new version without a provider call, regeneration uses metered generation, and the previous version retains its original key.
  - **Verify** Record an attempt fixture for version one, edit its key and compare the attempt’s answer review against both versions.

- [ ] **P4-T23 · Manage the saved quiz library** (MVP)
  - **Work and purpose** Provide owner-scoped history, detail, rename, duplicate and confirmed deletion. Preserve attempt-linked versions according to the approved retention policy.
  - **Files** `server/src/routes/quizzes.routes.ts`, `server/src/services/quizzes.service.ts`, `server/src/repositories/quizzes.repository.ts` · **Depends on** P4-T21, P4-T22
  - **Output** Paginated quiz library and lifecycle endpoints.
  - **Accept when** A duplicate has its own identity, deleted quizzes leave active listings, and historical attempts still resolve their snapshots.
  - **Verify** Duplicate and rename a quiz, delete the source, review an existing attempt and verify every operation rejects another account.

- [ ] **P4-T24 · Verify generation boundaries end to end** (MVP)
  - **Work and purpose** Run the full generation and management path with mock AI and a two-user database fixture to catch authorization, quota, output-validation and artifact-integrity regressions.
  - **Files** `server/tests/ai`, `server/tests/quizzes`, `server/tests/summaries`, `docs/TESTING.md` · **Depends on** P4-T09, P4-T10, P4-T15, P4-T20, P4-T22, P4-T23
  - **Output** Repeatable safety and integration checks with expected call counts.
  - **Accept when** No rejected source reaches the provider, no invalid output becomes an artifact, and a legitimate retry has one logical charge.
  - **Verify** Run the suite against fresh fixtures and reconcile provider requests, usage rows, revisions and saved artifact ownership.

- [ ] **P4-T25 · Evaluate background execution for long folders** (Optional)
  - **Work and purpose** Measure the largest supported folder on the target request path and adopt persistent generation status and background execution only if measurements exceed the approved synchronous deadline.
  - **Files** `server/src/services/ai-generation.service.ts`, `server/tests/ai/long-generation.test.ts`, `docs/AI_INTEGRATION.md` · **Depends on** P4-T06, P4-T07, P4-T10, P4-T24
  - **Output** Documented duration decision and, if justified, recoverable job status.
  - **Accept when** Timing evidence supports the chosen path and interrupted work has explicit status without duplicate billing.
  - **Verify** Run a timed large-folder fixture, interrupt it and check recovery and usage reconciliation.

### Phase verification

- [ ] Run all automated generation scenarios against a deterministic mock provider.
- [ ] Use a two-account fixture to cover every source scope and management endpoint.
- [ ] Verify chunk coverage, output validation, failure recovery, quota races and the integrity of historical quiz versions.

**Complete when** The MVP tasks pass using mock responses, all four source scopes work for both outputs, and saved results, costs and version history can be verified from stored records.

<a id="phase-5"></a>

## Phase 5 — Interactive quizzes, AI study interfaces, history, and analytics

**Objective** Let a learner turn owned notes into study materials, complete a quiz, and compare progress across independent attempts.

**Prerequisites** Phases 1–4 are complete. The workspace can save notes, the generation API returns validated source-linked material, and quizzes have immutable versions.

**Deliverables** Summary and quiz interfaces, practice and exam players, persistent attempt history, backend analytics, a dashboard, and a verified end-to-end study session.

### Task checklist

- [ ] **P5-T01 · Choose source material** (MVP)
  - **Work and purpose** Build a shared picker for a passage, one note, selected notes in one project, or the whole project. Show what will be sent to the external AI provider before generation.
  - **Files** `client/src/features/notes/SourcePicker.tsx` · **Depends on** None
  - **Output** A source picker available from both the note editor and project detail view.
  - **Accept when** Changing projects clears the selection, and an empty or outdated passage prompts reselection.
  - **Verify** Switch projects after selecting notes and edit a passage before submitting it.

- [ ] **P5-T02 · Generate and preview a summary** (MVP)
  - **Work and purpose** Offer short, medium and detailed summaries in paragraph, bullet, key-concept or study-guide form. Keep the preview separate from the editor and show generation, failure and retry states.
  - **Files** `client/src/features/summaries/SummaryGenerator.tsx` · **Depends on** P5-T01
  - **Output** An editable, copyable preview with source references, save and regenerate actions.
  - **Accept when** A retry preserves the selection and settings, and the source note retains its saved contents.
  - **Verify** Mock success, timeout and quota exhaustion, then compare the saved note before and after a successful generation.

- [ ] **P5-T03 · Manage the summary library** (MVP)
  - **Work and purpose** List saved summaries by project and generation date. Open, edit, rename and delete them with confirmation, retaining source references and indicating changed source revisions.
  - **Files** `client/src/features/summaries/SummaryLibrary.tsx` · **Depends on** P5-T02
  - **Output** A searchable or paginated history of saved summaries.
  - **Accept when** Reopening a saved summary uses the stored text, and editing a source note makes the change visible in its summary.
  - **Verify** Save and rename a summary, revise a source note, reopen the summary, then delete it and refresh the list.

- [ ] **P5-T04 · Configure quiz generation** (MVP)
  - **Work and purpose** Collect the title, sources, question count, difficulty, question type or mixed set, practice or exam mode, and explanation preference. Surface validation, quota, loading and recovery states.
  - **Files** `client/src/features/quizzes/QuizGenerator.tsx` · **Depends on** P5-T01
  - **Output** A quiz form backed by the generation API.
  - **Accept when** A valid submission opens a preview, and a failed submission retains the form values.
  - **Verify** Test each question type and difficulty with a mock provider and retry a failed request.

- [ ] **P5-T05 · Preview and edit a quiz version** (MVP)
  - **Work and purpose** Edit prompts, options, accepted answers and explanations in the owner’s authoring view. Validate each question type and save edits through the versioned API.
  - **Files** `client/src/features/quizzes/QuizEditor.tsx` · **Depends on** P5-T04
  - **Output** A quiz preview with version-aware editing and saving.
  - **Accept when** A saved edit produces the expected successor version and an invalid key identifies the question to fix.
  - **Verify** Change a correct option, reopen the old version through a fixture attempt and compare the two versions.

- [ ] **P5-T06 · Manage saved quizzes** (MVP)
  - **Work and purpose** List project quizzes and connect rename, duplicate, delete with confirmation, and regenerate from the same sources. Present regeneration as a new AI request with its source selection visible.
  - **Files** `client/src/features/quizzes/QuizLibrary.tsx` · **Depends on** P5-T05
  - **Output** A quiz library with management actions.
  - **Accept when** Duplicating a quiz leaves the original intact, and deletion follows the approved history-retention policy.
  - **Verify** Duplicate, rename and delete a quiz with a historical attempt fixture, then open the retained review.

- [ ] **P5-T07 · Start a version-bound attempt** (MVP)
  - **Work and purpose** Create an owner-scoped attempt for a playable quiz version. Store its mode, server start time and initial question and option order. Deduplicate retries of a single start action.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `server/src/repositories/quiz-attempt.repository.ts`, `server/src/routes/quiz-attempt.routes.ts` · **Depends on** None
  - **Output** An attempt creation endpoint and persistent initial state.
  - **Accept when** A repeated start request returns one attempt, an explicit new start creates another, and a foreign quiz is inaccessible.
  - **Verify** Submit two concurrent starts with the same request key, then try the same quiz as a second user.

- [ ] **P5-T08 · Read an attempt safely** (MVP)
  - **Work and purpose** Return only the fields permitted by the attempt’s mode, status and recorded answers. Keep the player’s API types and query cache separate from the authoring view.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `client/src/features/quizzes/attemptQueries.ts`, `server/tests/quiz-attempt-read.test.ts` · **Depends on** P5-T07
  - **Output** An owner-scoped player response for start, navigation and resume.
  - **Accept when** An open exam contains no keys, explanations or correctness flags. Practice feedback is limited to previously submitted questions.
  - **Verify** Inspect start and resume payloads for both modes, including after viewing the quiz editor and after switching users.

- [ ] **P5-T09 · Score answers deterministically** (MVP)
  - **Work and purpose** Grade single-choice and true/false by option ID, multiple-select by exact set, and identification against normalized accepted variations. Document whitespace and case handling, unmatched synonyms and the unanswered-question rule.
  - **Files** `server/src/services/quiz-scoring.service.ts`, `docs/QUIZ_SYSTEM.md` · **Depends on** None
  - **Output** A pure scoring function with per-question outcomes.
  - **Accept when** Only a full correct set earns multiple-select credit. An approved textual variation earns credit and an unknown synonym follows the documented rule.
  - **Verify** Run table-driven tests for partial sets, duplicate or foreign option IDs, extra whitespace, mixed case and blank input.

- [ ] **P5-T10 · Record practice answers** (MVP)
  - **Work and purpose** Validate ownership, question membership and payload shape. Write and grade a practice answer atomically, then reveal its outcome and any enabled explanation.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `server/src/utils/input-validators/quiz-attempt.validator.ts` · **Depends on** P5-T07, P5-T08, P5-T09
  - **Output** A practice submission endpoint with question-level feedback.
  - **Accept when** A repeated submission yields its original feedback, and a conflicting second answer cannot replace it.
  - **Verify** Race two different answers for one question and verify one persisted answer and zero disclosures for unanswered questions.

- [ ] **P5-T11 · Save exam answers** (MVP)
  - **Work and purpose** Save or revise draft answers for open exams with a revision check. Load the saved choices across refreshes and return only the recorded choices and progress.
  - **Files** `server/src/repositories/quiz-attempt.repository.ts`, `server/src/services/quiz-attempt.service.ts` · **Depends on** P5-T07, P5-T08
  - **Output** A resumable exam answer endpoint.
  - **Accept when** A late write cannot overwrite a newer edit, and each draft response withholds grading data.
  - **Verify** Change an exam answer in two tabs, submit a stale revision and inspect the response and stored choice.

- [ ] **P5-T12 · Finalize an attempt exactly once** (MVP)
  - **Work and purpose** Score the persisted answers and record terminal state and server finish time in one transaction. Serialize finalization with answer writes, and disclose exam results only after commit.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `server/src/repositories/quiz-attempt.repository.ts` · **Depends on** P5-T09, P5-T10, P5-T11
  - **Output** An idempotent final submission endpoint with immutable results.
  - **Accept when** Repeated finalization returns the recorded result, and subsequent writes leave the score and completion time intact.
  - **Verify** Race a final submission against a draft write, send duplicate submissions and recompute the stored score from the accepted answers.

- [ ] **P5-T13 · Resume or abandon unfinished attempts** (MVP)
  - **Work and purpose** Expose owned in-progress attempts and the persisted question order, answers and location. Make abandonment terminal and distinguish it from a scored completion.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `client/src/features/quizzes/ResumeAttempt.tsx` · **Depends on** P5-T08, P5-T10, P5-T11, P5-T12
  - **Output** A resume entry point and confirmed abandon action.
  - **Accept when** Reload restores progress in the same order. Abandoned attempts cannot reopen for editing or enter completed-score metrics.
  - **Verify** Resume after refresh, abandon an attempt and check subsequent read, write and submit behavior.

- [ ] **P5-T14 · Build the interactive question player** (MVP)
  - **Work and purpose** Show one question at a time with keyboard-operable controls for each type, previous and next navigation, and a labeled progress bar. Use persisted answers as the source of truth.
  - **Files** `client/src/features/quizzes/QuizPlayer.tsx` · **Depends on** P5-T08, P5-T10, P5-T11, P5-T13
  - **Output** A responsive practice and exam player.
  - **Accept when** Practice unlocks feedback after recording the answer. Exam allows review of unanswered questions and shows an explicit final submission action.
  - **Verify** Complete a mixed quiz by keyboard in both modes, navigate back and reload before the last question.

- [ ] **P5-T15 · Display results and answer review** (MVP)
  - **Work and purpose** Show recorded score, percentage, elapsed time, correct, incorrect and unanswered counts, and per-question submitted answers with allowed explanations and source references.
  - **Files** `client/src/features/quizzes/QuizResults.tsx`, `server/src/services/quiz-attempt.service.ts` · **Depends on** P5-T12, P5-T14
  - **Output** A completed-attempt results page with version-specific review.
  - **Accept when** The review reflects the attempted wording, options and key after the quiz is edited.
  - **Verify** Complete a quiz with an unanswered question, edit the quiz, and reopen the original result.

- [ ] **P5-T16 · Retake a saved quiz** (MVP)
  - **Work and purpose** Create a new attempt against the reviewed version with optional question and option shuffling. Persist the chosen order and expose a distinct regenerate-from-sources action.
  - **Files** `server/src/services/quiz-attempt.service.ts`, `client/src/features/quizzes/RetakeQuiz.tsx` · **Depends on** P5-T07, P5-T13, P5-T15
  - **Output** A retake action on completed results.
  - **Accept when** The new attempt has its own ID and answers, the order survives reload, and the AI provider receives zero calls.
  - **Verify** Retake after an author edit, verify the version and persisted order, then compare the old and new attempt rows.

- [ ] **P5-T17 · Query quiz history** (MVP)
  - **Work and purpose** Add an owner-scoped paginated history API with project filters and deterministic ordering. Include quiz version, attempt date, status, mode, difficulty, counts, score and duration when available.
  - **Files** `server/src/repositories/quiz-history.repository.ts`, `server/src/services/quiz-history.service.ts`, `server/src/routes/quiz-history.routes.ts` · **Depends on** P5-T12, P5-T13
  - **Output** A history API with project-filtered pages and authorized attempt detail.
  - **Accept when** Equal timestamps paginate consistently, and another user’s attempt cannot appear in a list or detail response.
  - **Verify** Seed overlapping dates for two users and two projects. Fetch consecutive pages and compare IDs.

- [ ] **P5-T18 · Compare and revisit attempts** (MVP)
  - **Work and purpose** Build global and project history pages with detail, resume and retake actions. Compare the first, selected and latest completed scores and show the best score and attempt count.
  - **Files** `client/src/features/quiz-history/QuizHistory.tsx`, `client/src/features/quiz-history/AttemptComparison.tsx` · **Depends on** P5-T15, P5-T16, P5-T17
  - **Output** A history view with side-by-side comparisons.
  - **Accept when** Comparisons identify each quiz version, and incomplete attempts have a status instead of a final score.
  - **Verify** Compare attempts across a quiz edit, open an unfinished attempt and check empty project history.

- [ ] **P5-T19 · Define metric denominators** (MVP)
  - **Work and purpose** Document counts and time boundaries for global, project and quiz metrics. Use completed attempts for scored aggregates. Define attempt score as correct divided by all assigned questions, accuracy as correct divided by answered questions, and improvement as latest minus first score in percentage points.
  - **Files** `docs/ANALYTICS.md`, `server/tests/fixtures/analytics.ts` · **Depends on** P5-T09, P5-T12
  - **Output** Metric definitions and a hand-calculated fixture with skips, retakes and empty data.
  - **Accept when** Mean attempt score gives each completed attempt equal weight, incorrect counts exclude skipped questions, and a zero denominator displays no value.
  - **Verify** Work through a 2/2 attempt and a 1/4 attempt with one skipped question. Expect a 62.5% mean score and 60% answer accuracy.

- [ ] **P5-T20 · Aggregate global study activity** (MVP)
  - **Work and purpose** Query owned project, note, generated summary and quiz counts, completed attempts, answered/correct/incorrect totals, average and highest score, accuracy, total completion time, recent activity and performance over time.
  - **Files** `server/src/repositories/analytics.repository.ts`, `server/src/services/analytics.service.ts`, `server/src/routes/analytics.routes.ts` · **Depends on** P5-T17, P5-T19
  - **Output** A global analytics API using database aggregates.
  - **Accept when** Counts honor documented retention and date boundaries, and quiz joins do not multiply workspace totals.
  - **Verify** Run the hand-calculated fixture alongside another user's attempts and compare every global total.

- [ ] **P5-T21 · Aggregate project performance** (MVP)
  - **Work and purpose** Filter by the owned project and group completed results by difficulty, question type and date. Include note, summary, quiz and attempt counts, latest, highest and mean score, and answer distribution.
  - **Files** `server/src/repositories/analytics.repository.ts`, `server/src/services/analytics.service.ts` · **Depends on** P5-T19, P5-T20
  - **Output** A project analytics API.
  - **Accept when** Time trends and difficulty and question-type breakdowns use the version attempted, including after a quiz edit.
  - **Verify** Seed two projects and two quiz versions with different difficulty labels, then reconcile each group against fixture rows.

- [ ] **P5-T22 · Aggregate quiz performance** (MVP)
  - **Work and purpose** Calculate total attempts by status, first, latest, highest and average completed score, score improvement, average completion duration and missed questions. Distinguish version-specific questions in comparisons.
  - **Files** `server/src/repositories/analytics.repository.ts`, `server/src/services/analytics.service.ts` · **Depends on** P5-T19, P5-T20
  - **Output** A quiz analytics API with version-aware comparisons.
  - **Accept when** Skipped and incorrectly answered questions follow their documented counting rules, and edits cannot merge unrelated questions.
  - **Verify** Seed a retake, an abandoned attempt and an edited question. Check tie-breaking, duration and most-missed results.

- [ ] **P5-T23 · Display analytics charts** (MVP)
  - **Work and purpose** Render a time-series line chart, comparison bars, an answer-distribution donut, progress indicators and metric cards with text or table equivalents. Use the API’s computed values and link each project’s study view to its summaries, quizzes and analytics.
  - **Files** `client/src/features/analytics/AnalyticsPage.tsx` · **Depends on** P5-T20, P5-T21, P5-T22
  - **Output** Global, project and quiz analytics views.
  - **Accept when** Scope changes fetch the right owner-scoped data, and zero answers or a single attempt produce an intelligible view.
  - **Verify** Compare charts and accessible values against the fixture at mobile and desktop widths.

- [ ] **P5-T24 · Fill the study dashboard** (MVP)
  - **Work and purpose** Show the welcome section, counts, recent notes by last opened time, newest projects, summaries, quizzes and attempts, average score and performance overview. Record note opens independently of edit timestamps. Link to create project, create note, history and analytics.
  - **Files** `server/src/services/dashboard.service.ts`, `client/src/features/dashboard/Dashboard.tsx` · **Depends on** P5-T17, P5-T20, P5-T23
  - **Output** A dashboard backed by bounded recent-activity queries.
  - **Accept when** Opening an old note moves it to the recently opened list, and each shortcut opens the correct workflow.
  - **Verify** Use a new account and a populated account, open an older note and verify the ordering and quick actions.

- [ ] **P5-T25 · Display AI usage** (MVP)
  - **Work and purpose** Show the current user's usage, quota period, allowance remaining and reset information from the backend. Refresh after generation and account changes.
  - **Files** `client/src/features/dashboard/AIUsage.tsx`, `client/src/features/summaries/SummaryGenerator.tsx`, `client/src/features/quizzes/QuizGenerator.tsx` · **Depends on** P5-T02, P5-T04, P5-T24
  - **Output** A dashboard usage indicator and generation-limit feedback.
  - **Accept when** A limited user can still read saved material and retake quizzes, and account switching replaces all user-specific usage data.
  - **Verify** Mock an exhausted quota, change accounts, then reopen a saved quiz and inspect the usage counters.

- [ ] **P5-T26 · Verify navigation, themes and accessibility** (MVP)
  - **Work and purpose** Finish light and dark modes and responsive layouts across study screens. Add visible focus, form labels, text feedback, reduced-motion support, status announcements, and predictable dialog focus.
  - **Files** `client/src/components/ui/`, `client/src/features/quizzes/`, `client/src/features/analytics/`, `client/src/features/dashboard/` · **Depends on** P5-T03, P5-T06, P5-T14, P5-T18, P5-T23, P5-T25
  - **Output** Study flows operable by keyboard and across desktop, tablet and phone sizes.
  - **Accept when** Feedback remains discernible without color, and dialog closure and question transitions place focus appropriately.
  - **Verify** Finish an exam by keyboard, review its result with a screen reader, and check narrow and wide viewports in both themes.

- [ ] **P5-T27 · Verify the full study session** (MVP)
  - **Work and purpose** Cover generation, attempted answers, final submission, retakes, history, analytics and account changes through the normal UI and API using seeded data and a mock AI provider.
  - **Files** `server/tests/integration/`, `client/tests/`, `docs/TESTING.md` · **Depends on** P5-T03, P5-T06, P5-T16, P5-T18, P5-T23, P5-T25, P5-T26
  - **Output** A repeatable full-stack study-session test with recorded expectations.
  - **Accept when** A second user sees only their data, one retake creates one new history entry, and deterministic scores appear consistently across all three analytics scopes.
  - **Verify** Run the session twice from clean fixtures and compare provider calls, final scores, history entries and dashboard totals.

- [ ] **P5-T28 · Explore topic-level performance** (Optional)
  - **Work and purpose** When stable topic annotations exist, group completed outcomes by topic and display sample sizes and untagged coverage so the user can interpret a weak topic.
  - **Files** `server/src/services/analytics.service.ts`, `client/src/features/analytics/TopicPerformance.tsx`, `docs/ANALYTICS.md` · **Depends on** P5-T21, P5-T23
  - **Output** An optional topic breakdown with explicit coverage.
  - **Accept when** Each percentage identifies its denominator, and an untagged question never acquires an inferred topic in the report.
  - **Verify** Seed overlapping and missing tags, then compare per-topic counts against the documented attribution rule.

### Phase verification

- [ ] Submit a practice answer and inspect the immediate response. Start an exam, reload it, and verify that its player responses disclose the key only after final submission.
- [ ] Race duplicate submissions, refresh a shuffled retake, and verify that each completed attempt keeps its recorded answers, order, score and completion time.
- [ ] Edit the original quiz, review an earlier result, and confirm that its questions and grading still match the attempted version.
- [ ] Compare the documented hand-calculated fixture against global, project and quiz reports. Check empty states, zero denominators, and account switching.
- [ ] Complete both modes at phone and desktop widths and verify keyboard focus, labels and feedback in both themes.

**Complete when** All MVP tasks pass their verification steps, the optional topic report has a recorded disposition, and a full study session reproduces the documented results using the mock AI provider.

<a id="phase-6"></a>

## Phase 6 — Testing, optimization, Docker, and production deployment

**Objective** Release a reproducible build and show that a learner can save notes, complete a quiz, and retrieve the correct history on the deployed platform.

**Prerequisites** Phase 5 has passed its verification checklist. Deployment tasks also require authorized access to the target accounts and an approved release.

**Deliverables** Reproducible regression results, measured performance checks, a non-root backend image, deployed web and API services, a tested recovery procedure, and a release record.

### Task checklist

- [ ] **P6-T01 · Make the regression suite reproducible** (MVP)
  - **Work and purpose** Define clean-install commands for backend unit and integration tests and frontend component tests. Isolate a disposable database, Firebase test identities, and a mock AI provider so repeated runs have predictable inputs.
  - **Files** `server/tests/fixtures/`, `server/package.json`, `client/package.json`, `docs/TESTING.md` · **Depends on** None
  - **Output** A repeatable test setup and documented commands.
  - **Accept when** Two clean runs produce the same results and make zero paid AI requests.
  - **Verify** Run both suites twice with production credentials absent and compare results and mock call counts.

- [ ] **P6-T02 · Verify account isolation across API routes** (MVP)
  - **Work and purpose** Exercise authentication and owner scoping with two test accounts. Cover projects, note moves, generated resources, quiz questions, attempts, analytics, and usage.
  - **Files** `server/tests/integration/ownership.test.ts`, `docs/SECURITY.md` · **Depends on** P6-T01
  - **Output** An ownership regression matrix with read, list, and mutation cases.
  - **Accept when** Expired tokens receive the documented unauthenticated response, foreign records stay private, and rejected writes leave both accounts intact.
  - **Verify** Run the matrix against the real API routing stack and compare the fixture records before and after each rejected mutation.

- [ ] **P6-T03 · Prove note autosave survives concurrent edits** (MVP)
  - **Work and purpose** Cover delayed responses, disconnection, rapid edits, and two tabs saving the same revision. Check the editor's unsaved and conflict states.
  - **Files** `client/src/features/notes/`, `server/tests/integration/note-autosave.test.ts`, `tests/e2e/note-autosave.spec.ts` · **Depends on** P6-T01
  - **Output** A repeatable browser and API autosave regression.
  - **Accept when** A stale save cannot overwrite the latest stored revision and the losing editor retains recoverable text.
  - **Verify** Delay the older write, complete the newer save, release the delayed write, and reopen the note in a third session.

- [ ] **P6-T04 · Verify AI source and output boundaries** (MVP)
  - **Work and purpose** Use synthetic notes containing instruction-like text, a mixed-owner selection, and mock outputs with invalid structure or unknown source IDs. Check ownership before provider invocation and validation before persistence.
  - **Files** `server/tests/integration/ai-generation.test.ts`, `server/tests/fixtures/ai/` · **Depends on** P6-T01
  - **Output** Tests for source selection, prompt construction, output validation, and failure cleanup.
  - **Accept when** Foreign input causes zero provider calls, notes stay in the data portion of the request, and invalid output never becomes a saved artifact.
  - **Verify** Inspect mock request envelopes and compare saved artifact and source records for valid and rejected cases.

- [ ] **P6-T05 · Verify AI quotas under concurrent requests** (MVP)
  - **Work and purpose** Exercise simultaneous requests at the remaining quota boundary, duplicate submissions, timeouts, and retryable provider failures. Reconcile usage with the approved charging policy.
  - **Files** `server/tests/integration/ai-usage.test.ts`, `docs/AI_INTEGRATION.md` · **Depends on** P6-T01
  - **Output** Regression tests for quota reservations, concurrency, retries, and accounting.
  - **Accept when** Admitted work stays within quota and concurrency bounds, repeated submissions reuse the same operation, and failed work releases reservations according to policy.
  - **Verify** Submit concurrent fixture requests with a controlled mock clock and inspect provider call counts, usage rows, and final quota.

- [ ] **P6-T06 · Recheck quiz scoring and history integrity** (MVP)
  - **Work and purpose** Run a fixed answer key through practice and exam modes for every question type. Cover duplicate submissions, interrupted attempts, quiz edits, and retakes of a saved version.
  - **Files** `server/tests/unit/quiz-scoring.test.ts`, `server/tests/integration/quiz-history.test.ts` · **Depends on** P6-T01
  - **Output** Scoring, answer disclosure, and version-history regression cases.
  - **Accept when** Scores match the key, response payloads follow mode-specific disclosure rules, and each retake adds exactly one independent attempt without a provider call.
  - **Verify** Submit twice concurrently, edit a correct answer on a newer version, and compare the original attempt's returned answers, score, and version before and after.

- [ ] **P6-T07 · Reconcile analytics with hand-calculated results** (MVP)
  - **Work and purpose** Seed different quiz lengths, difficulties, versions, unfinished attempts, and two accounts. Check groupings, date boundaries, and zero-data results.
  - **Files** `server/tests/integration/analytics.test.ts`, `server/tests/fixtures/analytics/`, `docs/ANALYTICS.md` · **Depends on** P6-T01
  - **Output** Expected global, project, and quiz results for a documented dataset.
  - **Accept when** With completed attempts scoring 1/1 and 1/3 and every question answered, overall accuracy is 50% and mean attempt score rounds to 66.67%.
  - **Verify** Compare endpoint values to the fixture calculations and confirm another user's records do not change counts, scores, or durations.

- [ ] **P6-T08 · Exercise the learner journey in a browser** (MVP)
  - **Work and purpose** Connect authentication, note editing, mocked summary and quiz generation, attempt completion, history, and account switching in one browser scenario.
  - **Files** `tests/e2e/study-workflow.spec.ts`, `docs/TESTING.md` · **Depends on** P6-T01
  - **Output** End-to-end coverage for desktop and narrow-screen use.
  - **Accept when** A learner can finish the flow using the keyboard, reload the results, and sign out without showing the previous learner's data to the next account.
  - **Verify** Run the scenario at both viewport sizes and check visible results, focus after transitions, and the persisted attempt ID.

- [ ] **P6-T09 · Measure and tune database queries** (MVP)
  - **Work and purpose** Measure project lists, note search, history, and analytics using representative row counts. Use database plans and query counts to identify repeated reads or missing indexes.
  - **Files** `server/src/repositories/`, `server/prisma/`, `docs/DATABASE.md` · **Depends on** P6-T07
  - **Output** Recorded baseline, query changes justified by measurement, and repeatable timings.
  - **Accept when** The agreed response-time targets are met and paginated reads and aggregate results remain correct.
  - **Verify** Run the same queries and fixtures before and after tuning, compare query plans and timings, and rerun analytics assertions.

- [ ] **P6-T10 · Measure frontend loading and editor responsiveness** (MVP)
  - **Work and purpose** Profile a production client build on a representative mobile connection. Inspect initial route assets, editor startup, and chart loading before changing bundle boundaries.
  - **Files** `client/src/routes/`, `client/src/features/notes/`, `client/src/features/analytics/`, `docs/TESTING.md` · **Depends on** P6-T08
  - **Output** Baseline and release measurements for the dashboard and note editor.
  - **Accept when** Agreed budgets for loading and editing are met and deferred content has accessible loading and error states.
  - **Verify** Repeat cold-load and typing measurements under the same throttling settings and record asset sizes and interaction timings.

- [ ] **P6-T11 · Measure long-folder generation** (MVP)
  - **Work and purpose** Exercise a fixed synthetic folder near the supported size limit. Measure token estimates, chunk coverage, provider calls, and end-to-end duration under controlled simulated provider delays.
  - **Files** `server/tests/fixtures/ai/`, `server/tests/integration/ai-performance.test.ts`, `docs/AI_INTEGRATION.md` · **Depends on** P6-T04, P6-T05
  - **Output** A repeatable workload and documented generation limits.
  - **Accept when** Every eligible source is accounted for and the user gets a result or a clear recoverable failure within the documented request or job limits.
  - **Verify** Trace the first and last source through chunking, compare counts to the token budget, and repeat with a provider timeout.

- [ ] **P6-T12 · Audit release dependencies** (MVP)
  - **Work and purpose** Audit the locked client and server dependencies, assess reported advisories against actual use, and update affected packages where required.
  - **Files** `client/package-lock.json`, `server/package-lock.json`, `docs/SECURITY.md` · **Depends on** P6-T01
  - **Output** A dated audit with fixes or documented release decisions.
  - **Accept when** Every release-blocking finding has a verified fix or an explicitly approved disposition.
  - **Verify** Repeat the audit against the final lockfiles, then rebuild and rerun tests for any packages changed.

- [ ] **P6-T13 · Build the backend runtime image** (MVP)
  - **Work and purpose** Build TypeScript and generate Prisma in a build stage. Package the compiled entry point, required runtime libraries, and CA certificate in a non-root image. Exclude private environment files and credentials from the context.
  - **Files** `server/Dockerfile`, `server/.dockerignore`, `docs/DEPLOYMENT.md` · **Depends on** P6-T12
  - **Output** A reproducible backend image with a documented start command.
  - **Accept when** The process runs as a non-root user and starts against a disposable HTTPS/TLS-configured test environment using runtime secrets.
  - **Verify** Build from a clean checkout, inspect image contents and user identity, record image size, and exercise an authenticated database read.

- [ ] **P6-T14 · Add a local Compose workflow if needed** (Optional)
  - **Work and purpose** Add Compose when the approved local workflow requires coordinating multiple services. Use disposable test storage and an example configuration developers can populate locally.
  - **Files** `compose.yaml`, `docs/DEPLOYMENT.md` · **Depends on** P6-T13
  - **Output** A documented local startup and shutdown procedure for the selected services.
  - **Accept when** A fresh checkout can start the test stack with isolated data and run the health check.
  - **Verify** Start, stop, and restart the stack with the same configuration and repeat one protected API read.

- [ ] **P6-T15 · Configure production identities, secrets, and origins** (MVP)
  - **Work and purpose** Separate public Vite settings from private backend credentials. Configure Firebase sign-in and password-reset domains, the approved frontend origin, Supabase TLS, the Redis connection, AI credentials, and quota settings.
  - **Files** `client/.env.example`, `server/.env.example`, `docs/DEPLOYMENT.md` · **Depends on** P6-T13
  - **Output** A production configuration inventory and provider-side settings with secret values held in their designated services.
  - **Accept when** All required settings have an owner, Firebase accepts the intended domain, and private values appear only in backend secret storage.
  - **Verify** Validate required names and types using staging equivalents, inspect client build artifacts for test secret markers, and compare configured origins to the deployment inventory.

- [ ] **P6-T16 · Verify health checks and operational signals** (MVP)
  - **Work and purpose** Supply a lightweight health endpoint for Render and a bounded readiness check for required dependencies. Record request errors, latency, and AI quota or provider failures without logging note content or credentials.
  - **Files** `server/src/routes/health.routes.ts`, `server/src/middlewares/`, `docs/DEPLOYMENT.md` · **Depends on** P6-T13
  - **Output** Health and readiness responses, privacy-safe logs, and a documented alert path.
  - **Accept when** The service distinguishes startup and dependency failures and operators can trace one failed request using a correlation ID.
  - **Verify** Interrupt a staging dependency, observe status codes and the alert path, restore it, and inspect the logs for seeded sensitive values.

- [ ] **P6-T17 · Restore a backup into a disposable environment** (MVP)
  - **Work and purpose** Define retention, recovery targets, and responsibilities for PostgreSQL and Firebase identities. Restore a representative backup and check that each fixture owner can still access the correct records.
  - **Files** `docs/DEPLOYMENT.md`, `docs/DATABASE.md` · **Depends on** P6-T01
  - **Output** A recovery runbook and a timed restore record.
  - **Accept when** Record counts, source links, quiz versions, and historical scores reconcile, and required Firebase configuration and access are accounted for.
  - **Verify** Restore to an isolated target, sign in with a mapped test identity, and compare project counts and a known historical attempt against pre-backup values.

- [ ] **P6-T18 · Rehearse schema migration and application rollback** (MVP)
  - **Work and purpose** Apply release migrations to a staging copy using a designated migration runner. Document how to revert an application release with existing data and how to recover if a migration fails.
  - **Files** `server/prisma/migrations/`, `docs/DEPLOYMENT.md` · **Depends on** P6-T13, P6-T17
  - **Output** A tested migration and rollback sequence tied to a specific release.
  - **Accept when** Migrations apply once, rerunning leaves no pending work, and the rehearsed recovery path preserves the seeded data.
  - **Verify** Migrate the staged schema, exercise the candidate API, then rehearse the previous compatible build or the documented recovery procedure.

- [ ] **P6-T19 · Apply production schema migrations** (MVP)
  - **Work and purpose** Confirm the target and available recovery point, then apply the rehearsed migrations through one authorized production release runner.
  - **Files** `server/prisma/migrations/`, `docs/DEPLOYMENT.md` · **Depends on** P6-T15, P6-T18
  - **Output** A release record containing the applied migration identifiers and recovery reference.
  - **Accept when** The target reports the expected migration history and required schema objects are present.
  - **Verify** Check migration status from the release runner and perform a read-only check of a representative relation and index.

- [ ] **P6-T20 · Deploy the API to Render** (MVP)
  - **Work and purpose** Deploy the reviewed image with runtime secrets, the designated listening port, and the health-check path. Tie the deployment to the release revision so rollback is repeatable.
  - **Files** `server/Dockerfile`, `docs/DEPLOYMENT.md` · **Depends on** P6-T09, P6-T11, P6-T16, P6-T19
  - **Output** A healthy HTTPS API deployment and recorded revision.
  - **Accept when** Render reports healthy instances and a verified test identity can read its own workspace over HTTPS.
  - **Verify** Exercise health and readiness, a request without credentials, and an authorized read. Check the API response to allowed and unlisted browser origins.

- [ ] **P6-T21 · Deploy the frontend to Vercel** (MVP)
  - **Work and purpose** Use the approved public Firebase configuration and deployed API origin for a production build. Configure route fallback so direct links and refreshes reach the React app.
  - **Files** `client/vite.config.ts`, `docs/DEPLOYMENT.md` · **Depends on** P6-T10, P6-T15, P6-T20
  - **Output** A production frontend on the approved HTTPS domain.
  - **Accept when** A deep link survives refresh and the deployed browser client completes Firebase sign-in, a protected API request, and logout.
  - **Verify** Open a project deep link in a fresh browser, sign in with a test account, refresh, and inspect the request origin and owner-scoped response.

- [ ] **P6-T22 · Run a production study-session smoke test** (MVP)
  - **Work and purpose** Use a designated test account and synthetic notes to check provider wiring, saved summaries, quizzes, retakes, and analytics on production. Bound live generation to the release's approved usage allowance.
  - **Files** `docs/TESTING.md`, `docs/DEPLOYMENT.md` · **Depends on** P6-T02, P6-T03, P6-T06, P6-T20, P6-T21
  - **Output** A dated smoke-test record with release IDs and observed results.
  - **Accept when** The user can save a note, generate and reopen study materials, complete and retake a quiz, and see both scores. Reopening and retaking add no generation usage.
  - **Verify** Compare the usage and attempt counts before and after each action, check the latest score in history and the mean score on the dashboard, and follow the rehearsed recovery procedure if release-critical checks fail.

- [ ] **P6-T23 · Publish the release handover in the repository** (MVP)
  - **Work and purpose** Update the README, architecture and feature references, test guide, progress tracker, deployment instructions, and recovery record to match the shipped revision.
  - **Files** `README.md`, `docs/PROGRESS.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md` · **Depends on** P6-T22
  - **Output** A release handover covering setup, deployed services, verification, recovery, and outstanding work.
  - **Accept when** A reviewer can find the shipped revision, reproduce the documented setup, and distinguish verified MVP behavior from deferred improvements.
  - **Verify** Follow the README from a fresh checkout and check commands, links, and recorded release IDs against the deployed services.

### Phase verification

- Reproduce the backend, frontend, and browser suites with the mock provider and record the build revision.
- Review account isolation, autosave, AI quotas, exam disclosure, historical scoring, and analytics results against their seeded fixtures.
- Inspect the measured budgets, dependency audit, non-root image, health signals, and successful restore rehearsal.
- Match the migration record, Render deployment, and Vercel deployment to the tested release and its production smoke results.

**Complete when** All MVP tasks have verification evidence, the deployed study session passes, the recovery procedure has been rehearsed, and any optional work has a recorded disposition.

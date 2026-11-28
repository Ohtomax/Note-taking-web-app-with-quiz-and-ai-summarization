# Development progress

On 2026-11-26 the project owner authorized all Phase 1 tasks and a separate GitHub push after each task. This authorizes progression through Phase 1. Later phases await a separate instruction.

Each completion entry records the verification performed. Git history provides the individual task commits and `task.md` records checklist status.

- **P1-T01 completed** Traced the six-step learner journey and mapped all feature groups to tasks. Files docs/ROADMAP.md.

- **P1-T02 completed** Traced the live SmileCheck policy flow across seven source layers. Files docs/ARCHITECTURE.md.

- **P1-T03 completed** Checked official compatibility guides and registry metadata against Node 24. Files docs/ARCHITECTURE.md, docs/TESTING.md.

- **P1-T03 completed** Checked official compatibility guides and registry metadata against Node 24. Files docs/ARCHITECTURE.md, docs/TESTING.md.

- **P1-T04 completed** Traced note and AI requests through system and folder diagrams. Files docs/ARCHITECTURE.md, docs/DEPLOYMENT.md.

- **P1-T05 completed** Reviewed two-account note, attempt, analytics and move authorization. Files docs/SECURITY.md.

- **P1-T06 completed** Reviewed thirteen models and traced two sources and two version-bound attempts. Files docs/DATABASE.md.

- **P1-T07 completed** Traced checklist serialization, stale autosaves and historical deletion behavior. Files docs/ARCHITECTURE.md, docs/DATABASE.md.

- **P1-T08 completed** Mapped all study operations and reviewed conflict and retry payloads. Files docs/API.md.

- **P1-T09 completed** Verified official pricing and recalculated note and folder costs; pilot deferred. Files docs/AI_INTEGRATION.md.

- **P1-T10 completed** Walked passage and three-chunk success, failure and duplicate generation states. Files docs/AI_INTEGRATION.md, docs/API.md.

- **P1-T11 completed** Hand-graded four types and traced version edits, disclosure and retry rules. Files docs/QUIZ_SYSTEM.md.

- **P1-T12 completed** Recalculated weighted accuracy, mean scores, skips and version-based grouping. Files docs/ANALYTICS.md.

- **P1-T13 completed** Reviewed twelve threats with controls, module owners and regression scenarios. Files docs/SECURITY.md, docs/TESTING.md.

- **P1-T14 completed** Mapped critical flows to test layers and reviewed migration/provider recovery. Files docs/TESTING.md, docs/DEPLOYMENT.md.

- **P1-T15 completed** Reconciled all design references and recorded owner approval and deferred setup. Files docs/ROADMAP.md.

- **P1-T16 completed** Verified secret/build ignore paths and preserved tracked project documentation. Files .gitignore.

- **P1-T17 completed** Passed strict typecheck, build, compiled alias HTTP and dev watch startup. Files server, docs/ARCHITECTURE.md, docs/ROADMAP.md.

- **P1-T17 completed** Passed strict typecheck, build, compiled alias HTTP and dev watch startup. Files server, docs/ARCHITECTURE.md, docs/ROADMAP.md.

- **P1-T18 partial** React/Vite/Tailwind/router scaffold passes strict checking and production build. Development and preview servers each return HTTP 200 with the expected HTML entry. The browser connector is unavailable and native Computer Use stopped because it could not establish the current URL confidently. Visual rendering remains unverified, so P1-T18 stays unchecked. Continue independent initialization work under the owner's authorization. Files client/. Browser verification can be completed later when access is available.

- **P1-T19 completed** Checked environment coverage and verified a private marker is absent from build. Files client/.env.example, server/.env.example, docs/DEPLOYMENT.md.

- **P1-T20 completed** Passed both lint/format/type/build suites and unused-variable rejection probes. Files .prettierrc.json, server, client, docs/ARCHITECTURE.md.

- **P1-T20 follow-up** The clean checkout exposed Windows autocrlf overriding the LF formatter policy. Added .gitattributes to enforce LF on checkout. The clean-install rehearsal is being repeated before P1-T21 is completed.


## Phase 1 status

Twenty task acceptance records are complete after the local rehearsal. P1-T18 remains partial because browser rendering could not be inspected. The React implementation, strict build and HTTP startup checks are complete, and its scaffold was pushed separately. The phase completion gate remains open for that verification.

The owner will supply Firebase, Supabase, Redis and AI configuration later. No real credentials were requested or committed. The Groq provider choice is a documented candidate pending a live quality pilot. Phase 2 has not started.

- **P1-T21 completed** Fresh checkout passed install, lint, format, types, builds and both HTTP startups. Files README.md, docs/TESTING.md.

- **P2-T01 completed** Harness passed twice, including unsafe-target rejection and failed-fixture cleanup.

- **P2-T02 completed** Configuration tests passed for absent secrets, invalid URLs and redacted failures.

- **P2-T03 completed** Health tests pass for success, missing dependencies and redacted check failures.

- **P2-T04 completed** Validated strict body/query schemas and clean unexpected-error responses.

- **P2-T05 completed** HTTP policy tests pass for CORS preflight, headers, JSON and byte limits.

- **P2-T06 implemented, live check deferred** Limiter unit checks pass; real shared Redis/window/store-loss verification deferred.

- **P2-T07 completed** Captured logs exclude private markers and use server correlation IDs.

- **P2-T08 implemented, live check deferred** Prisma config and TLS options tested offline; hosted connection/CA check deferred.

- **P2-T09 completed** Validated/generated schema and passed local FK, UID and ownership database tests.

- **P2-T10 completed** Two-source database fixture preserves citations after source edits and deletion.

- **P2-T11 completed** Local fixtures preserve independent version keys and source revisions.

- **P2-T12 completed** Database rejects cross-version/duplicate answers and retains independent retakes.

- **P2-T13 completed** Usage database tests verify per-user keys, duplicate rejection and token totals.

- **P2-T14 implemented, live check deferred** Indexes and tied-timestamp paging validated; production-scale plan review deferred.

- **P2-T15 completed** Initial migration applied to empty local database; repeat and nine constraints pass.

- **P2-T16 implemented, live check deferred** Token middleware tests pass; real Firebase project/token verification deferred.

- **P2-T17 completed** Eight parallel local sign-ins produce one user and preserve edited profile fields.

- **P2-T18 completed** Two-user repository checks reject foreign, missing and mismatched nested IDs.

- **P2-T19 completed** Profile endpoints pass local API checks with strict fields and verified-user IDs.

## Phase 2 review

All Phase 2 implementation tasks were processed under the owner's authorization with individual pushes. Seventeen tasks pass their local acceptance checks. P2-T06 has a tested limiter implementation with actual shared Redis verification deferred. P2-T08 has offline Prisma/TLS configuration checks with hosted Supabase certificate verification deferred. P2-T16 has injected token tests with real Firebase token issuance/verification deferred. No hosted database, provider account or deployment was changed. P2-T14 now has a local index-plan check in addition to stable pagination coverage. Phase 2's live verification gate remains open for the three deferred checks.

- **P2-T20 completed** 17 unit/HTTP and 13 database tests pass; cross-user fixtures and startup verified.

- **P2-T20 clean-checkout follow-up** A fresh clone completed npm ci, generated Prisma Client, passed the 17-test credential-free suite, strict typechecks including tests, lint, format checking and compiled build. The 13-test database suite previously passed on the migrated local fixture. Reviewed error response correlation and added request IDs consistently to parser, not-found and rate-limit responses. Dependency audit remains at four high-severity findings documented in SECURITY.md. The three live infrastructure checks remain deferred.

- **P3-T01 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T02 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T03 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T04 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T05 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T06 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T07 completed and verified 2026-11-27** Rich-text round-trip and hostile-input tests passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T08 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T09 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T10 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T11 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T12 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T13 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T14 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

- **P3-T15 completed and verified 2026-11-27** Real HTTP and disposable PostgreSQL acceptance fixture passed. Isolated task snapshot passed strict typechecking, lint and the task acceptance case before its separate push.

## Phase 3 review and individual pushes on 2026-11-27

P3-T01 through P3-T15 are complete and each has its own tested commit and push to main. Verification used an isolated worktree and a disposable PostgreSQL 18 cluster containing synthetic records. The final server regression run passed 22 unit/HTTP tests and 27 database tests, along with strict typechecking, lint, formatting and compiled builds. The previous 100 ms limiter test used a wall clock that could expire during a slow request. A separate P2-T06 regression commit replaced its wait with the test clock.

At the backend review checkpoint, P3-T16 through P3-T24 were still pending. The frontend implementation and verification below supersede that checkpoint. The library, project detail, note editor, autosave and profile screens now use the routed application and pass strict checks.

The pending frontend changes are preserved in the original folder. No deployment or collection of hosted secrets was performed. The three earlier Phase 2 live-service checks remain deferred.

### Earlier backend draft notes, superseded by the successful verification above

- **P3-T01 implemented, HTTP verification deferred** Added owner-derived project creation with strict metadata validation. Typechecking and validator regression passed. Existing HTTP tests cannot connect to loopback (EACCES) in this runtime; API and database acceptance will remain unclaimed until executable.

- **P3-T02 implemented, database verification deferred** Added bounded owner-scoped project search with deterministic sorting and active-note counts. Runtime blocks loopback database checks. Git metadata is read-only, so per-task commits are blocked.

## Phase 3 frontend task pushes on 2026-11-27

Every frontend task has its own commit and push to main, including implemented tasks whose external or visual acceptance checks remain deferred. Firebase credentials, hosted database/Redis configuration and deployment were skipped as requested. The reviewed frontend replaces the earlier drafts, with their originals backed up outside the repository.

- **P3-T16 implemented, live verification deferred 2026-11-27** Auth screens and SDK-flow tests pass; live Firebase setup remains deferred.

- **P3-T17 completed 2026-11-27** Session tests reject old responses and clear private caches; Axios adds Firebase tokens.

- **P3-T18 implemented, live verification deferred 2026-11-27** Dashboard navigation and keyboard-accessible controls pass component tests; visual QA deferred.

- **P3-T19 completed 2026-11-27** Project library mutations, invalidation and deletion cancellation pass UI tests.

- **P3-T20 completed 2026-11-27** Note workspace actions and source/destination cache invalidation pass UI tests.

- **P3-T21 completed 2026-11-27** Rich-text formatting, safe HTML normalization and explicit note saves pass tests.

- **P3-T22 completed 2026-11-27** Serialized autosave preserves newer edits, retains drafts on offline/conflict errors, compares server versions, and aborts on navigation/account change. Five editor/autosave tests plus typecheck, lint and production build pass.

- **P3-T23 completed 2026-11-27** Profile settings validate display names, submit only permitted fields, refresh cached profiles and isolate account changes. Reload, invalid input and second-account tests pass; typecheck, lint and production build pass.

- **P3-T24 completed 2026-11-27** Real React-to-HTTP-to-Prisma workflow and both-direction foreign-endpoint snapshots pass. Final suite: 22 backend unit, 28 database and 18 frontend tests; strict checks and builds pass. Live Firebase and visual QA remain deferred as documented.

- **P4-T01 completed 2026-11-27** Three adapter/configuration tests, strict types and lint pass. Enabled configuration is redacted on error; provider setup and live keys remain owner work.

- **P4-T02 completed 2026-11-27** Real PostgreSQL fixtures verify code-point offsets, current revisions and rejection of invalid or foreign sources before provider access.

- **P4-T03 completed 2026-11-27** 125-note database fixture verifies stable paging, exclusions, empty projects and mixed-owner rejection. Parent locks keep collection consistent with note writers.

- **P4-T04 completed 2026-11-27** Both prompt types pass all four scope fixtures with instruction-like source text. Trusted instructions and serialized source data remain separate, with explicit citation allowlists.

- **P4-T05 completed 2026-11-27** Boundary and Unicode coverage tests pass for long notes and many small notes. UTF-8 bytes conservatively estimate tokens; prompt/output headroom and bounded stage/retry reserves are explicit.

- **P4-T06 completed 2026-11-27** First/last concept fixture survives bounded reduction. A middle chunk failure or invented source key prevents a completed result; every map prompt is preflighted before billing.

- **P4-T07 completed 2026-11-27** Fake-clock fixtures verify retry-after delays, invalid-input no-retry and timeout uncertainty. Provider calls are individually observable and SDK retries remain disabled.

- **P4-T08 completed 2026-11-27** Disposable-database and authenticated HTTP tests verify attributable calls, versioned cost estimates, null unknown usage and two-account isolation. No source text is logged.

- **P4-T09 completed 2026-11-27** Real PostgreSQL races admit one request, reject over-quota work and release unused expired leases. Unknown running work retains its allowance; per-generation Redis limiter is ready for route wiring.

- **P4-T10 completed 2026-11-27** Concurrent identical requests and dropped-response retries perform one provider call and one usage charge. Changed input conflicts, new keys regenerate, and generation retrieval is owner-scoped.

- **P4-T11 completed 2026-11-27** All twelve length/format combinations pass fixtures. Missing sections, unsupported formats, invented citations and oversized output are rejected.

- **P4-T12 completed 2026-11-27** Authenticated HTTP-to-Prisma tests verify exact excerpt-only prompts, complete note immutability and zero foreign provider calls. Production wiring is fail-closed until owner configuration.

- **P4-T13 completed 2026-11-27** Large multi-note and full-folder fixtures cover map/reduce and source metadata. Interrupted chunks produce no completed draft or saved summary.

- **P4-T14 completed 2026-11-27** HTTP/database fixture verifies idempotent atomic saves, retained source metadata, stale indicators after edits/removal, owner-only history and no provider calls on reread.

- **P4-T15 completed 2026-11-27** HTTP fixtures verify free edits/rename/delete, foreign rejection and unchanged saved originals after failed and successful regeneration previews. Acceptance saves a separate new summary.

- **P4-T16 completed 2026-11-27** All difficulties and both modes pass. Invalid counts, unsupported/duplicate types, forged fields and impossible mixed requests fail before generation.

- **P4-T17 completed 2026-11-27** Valid multiple-choice, true/false and multiple-select fixtures pass. Repeated IDs/text, invented keys and impossible answer sets are rejected.

- **P4-T18 completed 2026-11-27** Fixtures verify NFKC, whitespace and lowercase normalization, duplicate collapse, blank rejection and punctuation-sensitive technical answers without fuzzy synonym matching.

- **P4-T19 completed 2026-11-27** Four authenticated HTTP generation scopes pass using the metered engine. Stale revisions and foreign source selections make zero provider calls.

- **P4-T20 completed 2026-11-27** Mixed valid questions pass; malformed JSON, wrong count, repeated prompts, invented citations and explanation mismatches fail. Four invalid HTTP generations save no versions/questions.

- **P4-T21 completed 2026-11-27** Mixed quiz saves all questions, options, keys and captured sources together. Forced nested-save failure leaves no partial rows; repeated acceptance is stable and foreign authoring is hidden.

- **P4-T22 completed 2026-11-27** An attempt retains version-one TCP key while a free edit publishes UDP in version two. Stale publishing conflicts; metered regeneration requires explicit version-three acceptance and replays safely.

- **P4-T23 completed 2026-11-27** Library HTTP tests verify pagination/history, rename, independent duplicate IDs, every foreign management rejection and retained attempt/version records after confirmed soft deletion.

- **P4-T24 completed 2026-11-27** 100 regression tests pass: 36 backend unit, 46 database and 18 frontend. Both builds and strict checks pass. Full ownership matrices, quota races, expired leases, 50-question and 200-note boundaries are covered; live setup and dependency advisories are documented.

- **P4-T25 deferred 2026-11-27** Maximum local HTTP fixture passes in 353 ms with 14 mock calls; disconnection reuses the original result with no duplicate charge. Live provider/hosting timing remains deferred; bounded synchronous execution retained provisionally.

- **P5-T01 completed 2026-11-27** Unicode code-point passage offsets, stale revision reselection and project-change resets pass component tests. Provider disclosure and saved-only source rules are visible; strict type/lint checks pass.

- **P5-T02 completed 2026-11-27** Component tests cover quota/network errors, retained settings, same-key retry and preview editing. Real HTTP/SQL saves edited text within captured-source bounds without changing notes or adding AI calls.

- **P5-T03 completed 2026-11-27** Library/detail tests verify stored reads, edits and rename, stale-source metadata and confirmed deletion. Paginated project navigation and cache invalidation are wired without AI calls.

- **P5-T04 completed 2026-11-27** Component tests reject invalid type selections before calls, retain every setting after failure, reuse request keys and display validated identification previews. All four question types share backend-equivalent contracts.

- **P5-T05 completed 2026-11-27** Question-specific key errors and edited answer submission pass UI tests. HTTP/SQL tests save edited previews and publish new keys without altering sources, earlier versions or adding AI calls.

- **P5-T06 completed 2026-11-27** Library tests verify independent duplication, rename, deletion confirmation and retained-history feedback. Regeneration displays captured sources, uses a metered request and accepts edited previews into an idempotent successor version.

- **P5-T07 completed 2026-11-27** Concurrent real HTTP starts share one attempt; a new key creates a new attempt, changed settings conflict and foreign versions are hidden. Start responses expose no grading keys.

- **P5-T08 completed 2026-11-27** HTTP fixtures inspect start/resume responses after authoring access: open exams expose no keys, explanations or correctness; practice reveals only committed questions. Player schemas/cache keys are separate and foreign reads are hidden.

- **P5-T09 completed 2026-11-27** Table-driven tests cover exact multiple-select sets, duplicate/foreign IDs, both single-choice types, normalized identification variants, punctuation, unknown synonyms, blanks and zero denominators.

- **P5-T10 completed 2026-11-27** Concurrent different answers yield one committed row and one conflict. Identical retries return original feedback, unanswered questions reveal nothing and foreign attempts/questions remain inaccessible.

- **P5-T11 completed 2026-11-27** Two-tab fixtures reject stale writes, preserve the newer choice across reload and permit explicit clearing. Draft rows remain ungraded and every exam response excludes keys, explanations and correctness.

- **P5-T12 completed 2026-11-27** Real draft/finalization races record one committed score and timestamp. Repeat submission is stable, foreign submit is hidden and later writes cannot change results; player contracts allow grading only after completion.

- **P5-T13 completed 2026-11-27** Database fixtures verify persistent location/order, owner-scoped unfinished lists, seven-day expiry and terminal abandon/write/submit rules. UI confirmation and resume links pass component tests.

- **P5-T14 completed 2026-11-27** Keyboard-driven component flows complete all four question types in both modes. Practice reveals committed feedback; exams retain hidden grading, save drafts, navigate persisted locations and confirm final submission.

- **P5-T15 completed 2026-11-27** UI results show score, elapsed time, correct/incorrect/skipped counts and source-linked review. HTTP fixtures prove a later author edit cannot change the attempted wording, key, score or review; unfinished/foreign results are protected.

- **P5-T16 completed 2026-11-27** Retakes survive author edits, create independent answers and stable shuffled order, deduplicate retries and make zero provider calls. UI uses the reviewed version and separates regeneration as metered source work.

- **P5-T17 completed 2026-11-27** Two-user/two-project fixtures verify deterministic pages under equal timestamps, project filtering, version/status/difficulty metadata, null incomplete scores and hidden foreign list/detail resources.

- **P5-T18 completed 2026-11-27** History UI shows incomplete status and review/resume actions. Database comparisons cover first/selected/latest across versions, best score and completed counts with owner isolation; filtered empty states pass.

- **P5-T19 completed 2026-11-27** The 2/2 and 1/4 fixture verifies 62.5% equal-weight mean score, 60% answer accuracy and separate skipped/wrong counts. UTC windows, retention, completed samples and stable comparison rules are documented.

- **P5-T20 completed 2026-11-27** Real API-scored fixtures reconcile 62.5% mean, 60% accuracy, workspace counts, statuses, UTC trends and duration without foreign rows or join multiplication. Completion stores raw ratio/day/time snapshots atomically.

- **P5-T21 completed 2026-11-27** Project fixtures reconcile per-version difficulty and per-type assigned/answered/correct/skipped snapshots. New author versions and another project's attempts cannot reclassify the recorded results; empty and foreign scopes are covered.

- **P5-T22 completed 2026-11-27** Fixture checks reconcile retakes, completed means/improvement/duration, paginated version comparisons and wrong/answered/skipped question samples. Soft deletion preserves private historical metrics and foreign reports are hidden.

- **P5-T23 completed 2026-11-27** Added lazy global/project/quiz chart routes, cards, daily tables, version comparisons, missed-question samples and date filters. Fixture and scope-switch component checks pass. Charts use responsive containers and static rendering; actual viewport verification is tracked in P5-T26.

- **P5-T24 completed 2026-11-27** Dashboard includes counts, performance, recent notes/projects/summaries/quizzes/attempts and create-note project picker. Note opening preserves edit timestamp and revision in a serializable transaction. Database ownership/order checks and dashboard shortcut checks pass.

- **P5-T25 completed 2026-11-27** Dashboard and generation forms show UTC quotas, remaining allowance, active work and unknown-cost states. Generation admission and terminal polling invalidate usage. Account switch and exhausted-quota retake component check passes; no quota gate is applied to reading or attempts.

- **P5-T26 deferred 2026-11-27** Implementation and automated keyboard/theme/dialog-focus checks pass. Real-browser phone/tablet/desktop and screen-reader acceptance is deferred because Computer Use native pipe is unavailable; the task remains unchecked.

- **P5-T27 completed 2026-11-28** Both clean-fixture React/real HTTP/Prisma study sessions reconcile mock calls, scores, retakes, all analytics scopes, dashboard, usage and account isolation. Final regression: 39 server unit, 63 database/API, 38 frontend tests; type/lint/format/build pass. Four automated phase verification items checked. Browser/screen-reader acceptance remains open in T26; audit findings and bundle/driver warnings are recorded in TESTING.md.

Phase 5 implementation status: 26 of 27 MVP task checkboxes are complete. P5-T26 has shipped code and automated checks but manual browser/screen-reader acceptance is still open. P5-T28 has a documented optional deferral. Each Phase 5 task implementation/disposition has its own commit and push. Owner secrets, hosted migrations and deployment remain untouched.

- **P5-T28 deferred 2026-11-28** No stable topic annotations exist in the schema/validated generation contract, so topic reporting is deferred without inferred tags. ANALYTICS.md records prerequisites and coverage requirements. T26 manual acceptance remains explicitly open.

- **P6-T01 completed 2026-11-28** Two clean npm-ci passes each passed 39 unit, 63 database/API and 38 frontend tests, with no live provider/identity credentials. Type/lint/format/build checks pass twice. Windows native-module locks are avoided through temporary exports, and tracked candidate patches preserve LF. PHASE6_VALIDATION.md documents reproduction.

- **P6-T02 completed 2026-11-28** The expanded real-routing/Prisma matrix passes in both identity directions, snapshots both accounts after every rejected read/write, checks token failures and owner-only history/analytics/usage, and records zero provider calls. Strict test types and lint pass.

- **P6-T03 deferred/partial 2026-11-28** Two editor/real API tests pass for delayed stale writes, recoverable drafts, disconnection, queued rapid edits and third-editor reopening. Browser/two-tab visual acceptance remains deferred; task left unchecked.

- **P6-T04 completed 2026-11-28** Summary and quiz HTTP cases pass for instruction-like source text, mixed-owner rejection before provider calls, exact source-data envelopes, fabricated citations, persistence guards and unchanged notes. Existing malformed and boundary fixtures remain active.

- **P6-T05 completed 2026-11-28** Three API/DB checks pass: one remaining request under concurrency, stable replays, UTC lease recovery, fake-clock retry settlement and conservative timeout accounting. Provider and ledger counts reconcile; strict test types/lint pass.

- **P6-T06 completed 2026-11-28** The all-type practice/exam key, interrupted reload, duplicate-finalization, post-edit historical review and replayed shuffled retake scenario passes with zero AI calls. Existing pure scorer and race/disclosure cases pass.

- **P6-T07 completed 2026-11-28** The 1/1 plus 1/3 fully answered fixture reconciles 66.67% mean versus 50% accuracy in all three scopes, distinct version difficulty, time bounds, empty windows and foreign/unfinished exclusions. API/DB test and strict checks pass.

- **P6-T08 deferred/partial 2026-11-28** Computer Use native pipe is unavailable. Desktop/phone browser, focus, refresh and sign-out acceptance stays unchecked; TESTING.md records the concrete manual scenario and distinguishes passing jsdom/real-HTTP sessions from browser evidence.

- **P6-T09 completed 2026-11-28** 120 projects, 6000 notes and 12000 attempts: all local p95 budgets pass; median/p95/query counts and actual EXPLAIN summaries recorded. Owner totals, pagination and known scores reconcile. Existing plans do not justify an index/query rewrite; hosted/network SLOs remain unmeasured.

- **P6-T10 deferred/partial 2026-11-28** Manifest-based raw/gzip JS and route dependency reporting runs successfully on a production build. Actual mobile cold-load/typing measurements require unavailable browser access and remain unchecked; no speculative chunk rewrite.

- **P6-T11 completed 2026-11-28** 200 notes/100000 bytes, 14 planned and actual calls with controlled 5 ms stage delays: 367 ms local mock completion, all sources and endpoint concepts retained. Uncertain timeout/replay keeps allowance and accepted artifacts stable. Fake-clock deadline checks pass; live provider timing deferred.

- **P6-T12 deferred/partial 2026-11-28** Effect 3.22.5, jsondiffpatch 0.7.7 and client gRPC 1.13.6 overrides reduce high findings from 15 to 7. Exact candidate locks pass clean install, all 150 tests, types/lint/format/build. Zod/SDK-major compatibility work and unapproved release disposition remain open; task unchecked.

- **P6-T13 deferred/partial 2026-11-28** Skipped under the owner rule to defer deployment-associated work. No Dockerfile/image build or TLS runtime deployment validation was performed.

- **P6-T14 deferred/partial 2026-11-28** Optional and deferred. The authorized local test workflow already uses an isolated PostgreSQL runner; Docker/Compose environment coordination is deployment-associated work and was not introduced.

- **P6-T15 deferred/partial 2026-11-28** Skipped under the owner rule. No Firebase, hosted database/CA, Redis, AI-provider secret, origin or production-account configuration was collected or changed.

- **P6-T16 deferred/partial 2026-11-28** Staging/operational verification is deferred with deployment. Existing local health/log-redaction tests pass; production dependency interruption, bounded readiness/latency acceptance and an external alert path remain unverified.

- **P6-T17 deferred/partial 2026-11-28** Local custom dump (209 ms) and restore (627 ms) reconcile 2 users, 3 projects, source links, 3 quiz versions and 5 attempts. Restored UID ownership and known 100%/62.5%/60% results pass with zero AI calls. RECOVERY.md distinguishes proposed policy and deferred live Firebase recovery; task stays open for owner-dependent acceptance.

- **P6-T18 deferred/partial 2026-11-28** Release/staging rollback rehearsal is deferred with deployment. The local harness applies all eight migrations and confirms idempotent replay, but no previous production image or approved staging recovery target was exercised.

- **P6-T19 deferred/partial 2026-11-28** Skipped under the owner rule. No production connection, recovery point or migration runner was configured; migrations were applied only to newly created disposable loopback databases.

- **P6-T20 deferred/partial 2026-11-28** Skipped under the owner rule. No Render service, runtime secret or image deployment was created or modified; no healthy production API is claimed.

- **P6-T21 deferred/partial 2026-11-28** Skipped under the owner rule. No Vercel deployment command, project setting or public Firebase/API-origin configuration was applied. Existing external Git-triggered automations were not inspected.

- **P6-T22 deferred/partial 2026-11-28** Skipped with production deployment and provider credentials. Passing local mock-provider sessions do not establish live Firebase/Groq or hosted release behavior; no paid generation or production test account was used.

Phase 6 local pass: 8 MVP tasks complete (T01, T02, T04, T05, T06, T07, T09, T11). Browser/interaction acceptance, dependency release disposition, live recovery policy and production/deployment work remain explicitly open; T14 has an optional deferral. Final full candidate regression is 150 passing tests plus types/lint/format/build, with separate benchmark and restore evidence. No owner environment or deployment setup was performed.

- **P6-T23 deferred/partial 2026-11-28** README, architecture/testing/deployment references and HANDOVER.md distinguish the 150-test local candidate, benchmarks, audited overrides and restored synthetic history from unverified release work. All 36 relative document links and whitespace checks pass. No shipped production revision exists, so release-handover acceptance remains open.

- **P6-T13 completed 2026-11-28, follow-up authorization** Commit 96aeb4a adds the multi-stage Docker runtime and explicit migration target, verifies non-root execution/TLS/CA rejection/private admission/CORS with synthetic fixtures, and excludes credentials and build tools. Runtime resource defaults are a 256 MiB old-space cap, two database connections and one concurrent generation. Docker probes contain synthetic markers only and are ignored/removed before staging. No account credentials were loaded or hosted service deployed.

- **P6-T16 partial 2026-11-28, Docker health acceptance** Readiness coalesces checks and responds within 3 seconds; Redis command timeout is 2 seconds. All 41 server unit tests, types and lint pass. Paused local PostgreSQL/Redis produce 503 in 3002/2004 ms while liveness stays 200, and recover after resume; Redis admission fails closed. At 0.1 CPU / 512 MiB the final local sample uses 89.62–90.23 MiB and 25 readiness requests have p95 9 ms. Hosted notifications and identity tracing are still open. See evidence/render-free.json.

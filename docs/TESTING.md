# Testing plan

Phase 1 verifies configuration, strict typing, compiled imports, build output and local startup. Feature tests start with Phase 2 fixtures. Use Node test runner with an injectable token verifier and mock AI responses for services, Supertest for HTTP boundaries, Vitest and Testing Library for React interactions, and Playwright for end-to-end workflows. Each dependency is introduced when its test layer is implemented.

## Security scenarios to automate

The security threat table supplies the regression matrix. For each resource create equivalent Alice/Bob records, then exercise owner, foreign, absent, invalid-token and forged-field requests. Capture response and database state before and after. Assert that rejected generation never reaches the provider.

Mock responses cover invalid schema, invented source IDs, duplicate quiz items and instruction-like note content. Submit an attempt twice concurrently, race a draft with finalization and verify immutable scores. On the client resolve a delayed request after switching accounts and verify old data is absent.

## Test layers and fixtures

| Layer | Fixture and checks | Phase |
| --- | --- | --- |
| Unit | Token verifier injection, scoring keys, normalization, chunk coverage, token estimates, redaction | 2–5 |
| API integration | Disposable PostgreSQL and test Redis, two identities, transactions, migrations, revision conflicts, quota races | 2–5 |
| Component | Auth state, source picker, editor conflict recovery, quiz navigation, accessible forms, loading/error states | 3–5 |
| Browser | Register in test Firebase, create two notes, generate with mock AI, complete two attempts and compare analytics | 5–6 |
| Deployment | Clean image, migrations, real authenticated smoke request, health, restore and rollback | 6 |

Use synthetic records and unique test database names. Abort if a production target is detected. External Firebase/AI values are supplied later by the owner. Default automated AI tests use a deterministic mock service with recorded token counts. Set exact expected answers and query aggregates in fixtures.

For a migration failure stop deployment, retain the previous compatible application build and inspect the migration history. Restore a backup into an isolated database before considering data recovery. For provider loss return a safe failed/uncertain generation state, reconcile billed usage, preserve original notes and let saved artifacts remain readable. Simulate both cases before production.

## Phase 1 commands

From each of server/ and client/, run npm ci, npm run lint, npm run format:check, npm run typecheck and npm run build. The lockfile defines the exact installation. Run server npm start and verify a 404 JSON NOT_FOUND response at its root. This confirms the bootstrap listener and emitted imports. Run client npm run dev and npm run preview and inspect their startup/HTTP entry responses.

The scaffold has no feature test script yet. Unit/integration/component/browser suites are introduced with their respective Phase 2–5 fixtures. Type/build and HTTP startup checks verify the scaffold boundary only. Live Firebase, database and AI tests await owner configuration. Browser rendering remains pending because both available browser automation paths failed.


## Clean-checkout rehearsal on 2026-11-26

Node 24.12.0 and npm 11.6.2. A fresh local clone with hardlinks disabled ran npm ci followed by lint, format:check, typecheck and build in both packages. Every command exited 0. Both installs reported zero known vulnerabilities at the check time.

The compiled server was started with PORT=3002 and returned the expected 404 JSON NOT_FOUND. The client production preview at port 4174 returned 200 and its HTML referenced the built entry. Existing working-copy dev servers were checked at ports 3001 and 5173, and preview at 4173. These are HTTP/startup results. Visual browser rendering remains unverified as recorded under P1-T18.

The first fresh checkout revealed CRLF conflicts with Prettier's LF setting. The P1-T20 follow-up added .gitattributes, and the successful rehearsal used that commit. Documentation relative links were also checked against actual files. Per the owner's direction, external account credentials and live-service checks are deferred.

## Phase 2 harness

Run npm test in server/ for credential-free HTTP and service tests. Token verification is injected per application instance. Database integration fixtures require an explicit loopback URL named study_test_<uuid>. The guard rejects remote or ordinary database names. Temporary fixture directories are cleaned in finally blocks, including an intentionally failing callback. Tests and configuration are included in the separate strict test typecheck.

## Local PostgreSQL fixture

Phase 2 schema checks use a newly initialized disposable PostgreSQL 18 cluster bound to 127.0.0.1 on a separate test port. It contains synthetic data only and uses a random study_test_<uuid> database. No hosted URL or owner secret is read. Pass its URL explicitly as STUDY_TEST_DATABASE_URL to npm run test:db. The fixture module validates loopback and database name before constructing a client. Data tests roll back their transactions and disconnect on failure. Runtime connections retain verified TLS, while this isolated loopback-only fixture uses its separate test adapter.

## Phase 2 verification results

The credential-free suite passes 17 tests. The isolated PostgreSQL suite passes 13 tests against the initial migration, including two-account ownership for projects, notes, summaries, quizzes, versions, questions, options, source links, attempts, answers and AI usage. Profile HTTP tests execute the actual limiter, token middleware, user synchronization, role guard, validator, controller, service and Prisma repository with an injected token verifier. Feature routes for projects/notes/quizzes are introduced in later phases and will reuse these fixtures. Hosted Redis sharing, real Firebase token issuance and Supabase CA verification remain deferred.

## Phase 3 completed backend checks

The combined server suite passes 22 credential-free tests and 27 isolated PostgreSQL tests. Per-task HTTP/database cases are in server/tests/database/workspace-phase3.test.ts. Shared fixture setup is in workspace.fixture.ts. Each case is named with its P3 task ID and was run against that task's incremental snapshot before commit. P3-T07 uses note-content.test.ts for round-trip and hostile-content validation. Test fixtures verify ownership, pagination, stale revisions, archive/restore, historical retention, duplication and rejected/accepted moves. Frontend behavior and Firebase console flows remain unverified and their checklist items stay open.

## Phase 3 workspace verification on 2026-11-27

The final suite passes 22 backend unit/HTTP tests, 28 disposable PostgreSQL tests and 18 frontend tests across nine files. Both packages pass strict typechecking, lint, formatting and production builds. The React integration test runs the normal application routes, shared Axios transport, Express middleware/controllers/services/repositories and Prisma against a fresh local database. It creates a project and note, saves and reopens it, changes identities and confirms that foreign requests cannot modify the original note. It injects test identities at the token-verifier boundary; it does not bypass production authentication.

The separate P3-T24 API matrix calls every foreign project and note route in both directions, including forged parent IDs. It compares both accounts' stored project/note records after every rejected operation. Existing tests also exercise create/update, stable lists, deletion impact, archive/restore, duplicate independence, moves, historical retention and concurrent revisions. The client suite covers SDK calls, session cancellation, cache/draft isolation, project/note actions, rich text normalization, serialized autosave, offline recovery, explicit conflict choices and profile editing. Accepting a server conflict version also refreshes the note cache used on reopening.

### Reproduce the credential-free suite

Install both lockfiles with npm ci in server/ and client/. Run npm test in server/ for unit checks and npm test in client/ for component checks. The client HTTP integration test is explicitly skipped unless STUDY_TEST_DATABASE_URL is supplied.

For database and full UI-to-API tests, initialize a disposable local PostgreSQL cluster (never a hosted or ordinary database). These PowerShell commands use synthetic data, a random guarded database name and a separate port. PostgreSQL command-line tools must be on PATH. Run from the repository root:

```powershell
$fixtureRoot = Join-Path $env:TEMP ('study-phase3-' + [guid]::NewGuid().ToString('N'))
$fixtureDb = 'study_test_' + [guid]::NewGuid().ToString('N')
$fixtureUrl = 'postgresql://study_fixture@127.0.0.1:15439/' + $fixtureDb
initdb -D "$fixtureRoot/data" -U study_fixture --auth=trust --no-locale --encoding=UTF8
pg_ctl -D "$fixtureRoot/data" -o '-h 127.0.0.1 -p 15439' -l "$fixtureRoot/server.log" start
try {
  createdb -h 127.0.0.1 -p 15439 -U study_fixture $fixtureDb
  $env:STUDY_TEST_DATABASE_URL = $fixtureUrl
  # prisma.config.ts prefers DIRECT_URL, so override both for this local fixture.
  $env:DATABASE_URL = $fixtureUrl
  $env:DIRECT_URL = $fixtureUrl
  Push-Location server
  try {
    npm run prisma:generate
    npx prisma migrate deploy
    npm run test:db
  } finally { Pop-Location }
  Push-Location client
  try { npm test } finally { Pop-Location }
} finally {
  pg_ctl -D "$fixtureRoot/data" -m fast stop
  Remove-Item Env:STUDY_TEST_DATABASE_URL, Env:DATABASE_URL, Env:DIRECT_URL -ErrorAction SilentlyContinue
}
```

The database guard rejects remote hosts and names outside study_test_<32 hexadecimal characters>. Fixture records are removed in finally blocks. The UI fixture listens on a random loopback port and closes after the test. The PostgreSQL directory remains available for local diagnostics; no hosted credentials are needed.

### Deferred checks and audit

P3-T16 stays unchecked until real Firebase registration, recovery, session reload and sign-out are exercised with owner-provided configuration. P3-T18 stays unchecked until mobile/tablet/desktop visual and keyboard checks are performed. The browser tool failed initialization with a missing kernel-assets path, so jsdom results are not presented as visual browser results. The local Vite server returned HTTP 200; this checks startup only. No deployment was performed.

P3-T24 is complete for the real local API/database and injected-identity acceptance boundary. Firebase token issuance and hosted Redis/Supabase verification remain separate deferred checks. The Vite build reports a roughly 534 kB main chunk warning. npm audit reports five high findings in the frontend tree (Firebase/Firestore/grpc and Zod 3) and four in the backend tree (Prisma configuration/effect and Zod 3), with no critical findings. These counts include transitive packages. Forced major changes or the suggested Firebase downgrade were not applied; Prisma 7 and Zod 3 match the project rules. Resolve or explicitly accept these advisories before production release.

## Phase 4 generation verification on 2026-11-27

The complete regression run passed 36 backend unit/HTTP tests, 46 disposable PostgreSQL tests and 18 frontend tests (100 total). Both packages passed strict typechecking, lint, formatting and production builds. Every required Phase 4 task was tested before its individual commit/push. Fixtures in server/tests/ai-*.test.ts and server/tests/database/ai-*.test.ts cover all four source scopes, twelve summary setting combinations, all quiz types, concurrent idempotency, retry timing, unknown usage, quota/concurrency races, full foreign endpoint matrices, immutable versions and historical retention.

The final two-user API matrix compares stored summaries, sources, quizzes, versions, questions, options, generation rows and call rows after each rejected foreign operation. No rejected source reaches the mock provider. A fifty-question boundary case saves a complete valid quiz. A 200-note/100,000-byte source fixture reaches the final reduction with every allowed source reference and the first/last concepts intact. Merge stages carry grouped citations and source revisions without copying the same section once per cited note. Preflight budgets include the structured-output schema.

Regression checks found and fixed stale-lease recovery rolling back with a later admission rejection, potential late-call resurrection of a terminal state, and confusing encoded JSON bytes with actual output-token counts. Lease recovery commits independently; unknown running work keeps its reserved allowance; completed usage and estimates remain attributable. Byte size remains a conservative input estimate and separate bounded payload check. The usage endpoint exposes only the owner's ledger and quota metadata.

Use the local guarded PostgreSQL instructions above. Apply all repository migrations only to that disposable database, then run npm test and npm run test:db in server/. Run client npm test with STUDY_TEST_DATABASE_URL set for its real HTTP integration fixture. All live provider calls are replaced with explicit deterministic fixtures. No hosted database, Firebase, Redis or provider key is needed for these tests. The migrations have not been applied to an owner/hosted database.

Live Groq quality, pricing/account availability, latency and hosted Redis/Supabase checks remain deferred. Current npm audit reports 10 high backend findings and 5 high frontend findings, with zero critical findings; several are inherited transitively from the explicitly requested AI SDK 4 and Zod 3 majors, in addition to Prisma's existing chain. AI SDK 4 is unsupported according to its official docs. No forced major upgrade or suggested Prisma downgrade was applied. These findings remain a production-release issue, not a passing security audit. The unchanged frontend build retains its approximately 534 kB main-chunk warning. Deployment commands were not run.

P4-T25 additionally passes a real local HTTP/Prisma test with the largest supported folder and deterministic AI: 353 ms, 14 provider-stage calls, 200 notes and 100,000 source bytes. A dropped connection recovers the original persisted result under the same key without extra calls or token settlement. The fixture closes its explicit HTTP server and aborted connections. This adds one passing database test to the Phase 4 regression evidence (47 database tests, 101 checks across the recorded runs). Live provider/hosting timing remains deferred; see AI_INTEGRATION.md for the synchronous execution decision and its limits.

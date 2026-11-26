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

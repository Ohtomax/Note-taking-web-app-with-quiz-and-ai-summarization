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

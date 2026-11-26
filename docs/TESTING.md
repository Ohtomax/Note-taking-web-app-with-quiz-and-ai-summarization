# Testing plan

Phase 1 verifies configuration, strict typing, compiled imports, build output and local startup. Feature tests start with Phase 2 fixtures. Use Node test runner with an injectable token verifier and mock AI responses for services, Supertest for HTTP boundaries, Vitest and Testing Library for React interactions, and Playwright for end-to-end workflows. Each dependency is introduced when its test layer is implemented.

## Security scenarios to automate

The security threat table supplies the regression matrix. For each resource create equivalent Alice/Bob records, then exercise owner, foreign, absent, invalid-token and forged-field requests. Capture response and database state before and after. Assert that rejected generation never reaches the provider.

Mock responses cover invalid schema, invented source IDs, duplicate quiz items and instruction-like note content. Submit an attempt twice concurrently, race a draft with finalization and verify immutable scores. On the client resolve a delayed request after switching accounts and verify old data is absent.

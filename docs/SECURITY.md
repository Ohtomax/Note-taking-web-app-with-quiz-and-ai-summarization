# Identity and ownership

1. Firebase client login obtains an ID token. Firebase owns password storage, reset links and session persistence.
2. The shared Axios client attaches the current bearer token.
3. verifyToken checks signature, issuer, audience and expiry with Firebase Admin.
4. The backend upserts User by unique firebaseUid, allowing only selected provider fields. The unique constraint handles concurrent first requests.
5. The database-backed role guard checks the persisted role. The default study role is USERS.
6. Repositories constrain private lookups to the synchronized user. Identity changes cancel old requests and clear Query caches and temporary Zustand drafts.

| Resource | Owner predicate |
| --- | --- |
| Project | Project.ownerId = verified application user |
| Note | Note.project.ownerId plus supplied parent projectId |
| Summary and source links | Summary.project.ownerId and each selected note's owner |
| Quiz, version, question and option | Version.quiz.project.ownerId through its relation chain |
| Attempt and answer | Attempt.version.quiz.project.ownerId |
| AIUsage | AIUsage.userId |
| Dashboard and analytics | Apply the same predicates before aggregating |

Missing and inaccessible private IDs both return 404 RESOURCE_NOT_FOUND. Invalid credentials return 401, a disallowed database role returns 403, invalid input returns 400 and state conflicts return 409.

Moves validate both source and destination ownership within the transaction. AI generation rejects a whole batch when any source is inaccessible. Supplied ownerId and role fields fail strict input validation.

## Two-account review

Alice owns project A and Bob owns B. Bob reading A's note gets the same 404 as a random ID. Bob cannot create or retrieve an attempt for A's quiz. Bob's analytics count B only. A move from A to B fails before either folder changes. A delayed Alice query cannot populate Bob's cache after sign-out.

## Threat model and verification plan

| Threat and boundary | Control | Verification | Responsible module |
| --- | --- | --- | --- |
| Forged token or owner field at API | Admin verification, strict DTO and scoped repository queries | Two users manipulate every nested ID and send role/owner fields | Auth and repositories |
| Concurrent note writes | Atomic revision predicate and local recovery draft | Race two revision-identical PATCH requests | Notes |
| Rich-text XSS | Allow-listed JSON nodes/attributes, safe links, sanitized export HTML | Stored script/URL/event-attribute fixtures | Editor and validators |
| Prompt injection in notes | Data delimiters, no tools, authorized manifest, bounded schema | Instruction-like notes and foreign citation IDs | AI service |
| Invalid AI question keys | Zod and semantic membership/cardinality checks before transaction | Malformed JSON and out-of-range option fixtures | Quiz generation |
| Early exam answer disclosure | Mode/status projection and separate authoring/player DTOs | Inspect start, resume and answer payloads | Attempts |
| Duplicate billing | Persisted operation identity, reservations and bounded retries | Race duplicates and disconnect after provider call | AI usage |
| Score overwrite or duplicate submit | Transactional terminal transition and immutable versions | Concurrent draft/finalize and repeated submit | Scoring |
| Shared-browser data exposure | Cancel, clear and remount on identity changes | Resolve old delayed request after account switch | Auth UI |
| Credential or content leakage | Structured field allow-list logs and runtime secret storage | Synthetic secret markers absent from logs and bundles | Config and logging |
| Abuse and resource exhaustion | Redis route limits, quotas, body and concurrency caps | Two app instances, quota races and oversized payloads | HTTP and usage |
| SQL injection/mass assignment | Prisma parameters, strict update schemas | Search payloads and extra writable fields | Validators and repositories |

All production errors have safe messages and correlation IDs. Helmet, explicit CORS and request size limits apply before private routes. Test allowed-origin preflight and ensure CORS is supplemented by authentication. Trust proxy is configured for the actual deployment topology.

Use verified database TLS with the Supabase CA. Keep privileged credentials server-side and application DB access least-privileged. If a pg SSL object is supplied, ensure URL options do not replace it. Dependency audits and a non-root runtime image are release requirements. The user-facing generation form identifies external processing.

The design review traced Bob's rejected access, a malicious note, malformed AI keys, duplicate finalization and a delayed old-user response. These are planned test cases. Passing runtime security tests requires Phase 2 and subsequent feature implementation.

## Phase 2 configuration status

Local startup allows missing infrastructure settings so owner account setup can be deferred. Production requires PostgreSQL, the CA path, Redis and Firebase Admin settings. Invalid configuration reports setting names only. Unconfigured dependencies will make readiness fail and private operations return 503. Zod 3 is retained per the project rules. The current registry audit reports GHSA-mrhx-c7xc-m3w5 against that line. Limit request bytes before validation and bound collection sizes. A patched major upgrade needs a recorded compatibility decision before release.

## Rate limiter implementation

Private API groups use distinct RedisStore prefixes with express-rate-limit and ioredis. Profile reads/writes allow 60 requests/minute/IP, auth 10, generation 5 and general reads 120 as initial values. Counter storage failures fail closed. Public health probes remain process/dependency diagnostics without accessing study data. MemoryStore is used only as an injected test store. Hosted Redis configuration and two-instance Redis verification are deferred because no Redis service is configured.

## Firebase integration status

Firebase Admin verifies ID tokens with revocation checking and returns selected identity fields only. The middleware exposes only clean 401 errors for invalid credentials. Missing Admin configuration yields 503 and grants no identity. The test suite injects a verifier to cover missing/expired/wrong-project scenarios. Real Firebase token issuance and provider-console setup are deferred to the owner. Enable email/password and authorized reset domains later. Outside test mode, FIREBASE_AUTH_EMULATOR_HOST is rejected before a configured verifier is created.

## Current dependency audit

The Phase 2 audit reports four high-severity package findings representing two advisory chains. Zod 3 has GHSA-mrhx-c7xc-m3w5. The Prisma configuration dependency chain includes effect with GHSA-7589-6fvf-x4pw, also reported through @prisma/config and prisma. Audit proposes incompatible major changes and no forced downgrade/upgrade was applied. Keep request size limits active and resolve the version-policy decision before a production release. This is an outstanding release risk, not a passing audit.

## Phase 6 study ownership matrix

phase6-ownership.test.ts exercises both identity directions for quiz metadata/versions/keys, summary reads and writes, attempt player/results/comparison/answers/location/finalization/abandonment, generation status, note-open tracking, project/quiz analytics and cross-owner note moves. Each rejected request returns 404 and a before/after snapshot covers both workspaces, sources, quiz versions, questions/options, attempts/answers and AI ledger/calls. Missing, invalid and expired test tokens return 401. History, analytics and usage lists contain only the current owner. The deterministic provider receives zero calls. Existing project/note and generation matrices remain part of the same database regression suite.

The [Phase 6 dependency audit](./DEPENDENCY_AUDIT.md) records targeted patched overrides, the final 6 high server / 1 high client findings, application exposure and the remaining Zod-major release blocker. No security-risk exception is approved.

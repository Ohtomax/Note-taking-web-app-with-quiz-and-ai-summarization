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

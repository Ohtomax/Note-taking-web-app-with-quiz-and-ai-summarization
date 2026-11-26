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

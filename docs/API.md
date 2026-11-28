# REST API contract

Planned base path /api/v1. All study routes require rateLimiter → verifyToken → database role guard → validated params/query/body → controller. Owner identity comes from the verified session. Examples use synthetic IDs.

Success returns { data, message? }, lists add { page, pageSize, total }. Error returns { error: { code, message }, requestId }. Never serialize internal errors. ISO UTC dates, integer page >= 1, pageSize 1–50, stable ordering with id tie-breaker. GET lists accept search and approved sort fields. Reject unknown body fields. Creates return 201, reads/updates 200 and deletion 204. Invalid input 400, credentials 401, role 403, inaccessible IDs 404, revision/idempotency conflicts 409, oversized payload 413, quota 429, provider failure 502 and deadline 504.

| Method | Path | Validated request and output |
| --- | --- | --- |
| GET / PATCH | /me | Read profile / edit displayName only |
| GET / POST | /projects | Paginated search, archived filter / title, description, color, icon |
| GET / PATCH | /projects/:projectId | Detail with counts/dates / editable metadata and expectedRevision |
| POST | /projects/:projectId/archive or /restore | State transition with expectedRevision |
| GET | /projects/:projectId/deletion-preview | Affected counts and impactRevision |
| DELETE | /projects/:projectId | Confirmation with impactRevision, soft deletion |
| GET / POST | /projects/:projectId/notes | Search title/content, sort, pagination / title and document |
| GET / PATCH | /projects/:projectId/notes/:noteId | Document, timestamps, revision / expectedRevision and changed title/content/pinned |
| POST | /projects/:projectId/notes/:noteId/archive or /restore | Revision-protected state transition |
| DELETE | /projects/:projectId/notes/:noteId | Confirmed soft deletion |
| POST | /projects/:projectId/notes/:noteId/duplicate | New independent note in same owned project |
| POST | /projects/:projectId/notes/:noteId/move | destinationProjectId, expectedRevision, verify both owners |
| POST | /projects/:projectId/notes/:noteId/open | Server-maintained lastOpenedAt |
| POST | /projects/:projectId/generations | Idempotency-Key, operation SUMMARY/QUIZ, source, settings |
| GET | /generations/:generationId | Owned status/result or safe error |
| GET | /projects/:projectId/summaries | Paginated saved history, generatedAt and stale-source flags |
| GET / PATCH / DELETE | /summaries/:summaryId | Owned preview / title and editable content / confirmation |
| GET | /projects/:projectId/quizzes | Paginated quiz library |
| GET / PATCH / DELETE | /quizzes/:quizId | Metadata / title / confirmation, preserving attempts |
| GET / POST | /quizzes/:quizId/versions | Version metadata / full validated edited question set producing a new version |
| GET | /quizzes/:quizId/versions/:versionId/authoring | Explicit owner authoring view including answer key |
| POST | /quizzes/:quizId/duplicate | Copy into a new quiz identity with independent version |
| POST | /quizzes/:quizId/attempts | Idempotency-Key, versionId, mode, shuffleQuestions, shuffleOptions, optional missedFromAttemptId |
| GET | /attempts/:attemptId | Player projection withholding keys and feedback until completion |
| GET | /attempts/in-progress | Owned unexpired open attempts, optional quizId and bounded pagination |
| PATCH | /attempts/:attemptId/location | Zero-based questionIndex; preserves answer revision and order |
| GET | /attempts/:attemptId/comparison | First/selected/latest immutable-version results, best score and completed sample count |
| PUT | /attempts/:attemptId/answers/:questionId | expectedAnswerRevision, optionIds or identification text, and optional questionIndex saved atomically |
| POST | /attempts/:attemptId/submit | Idempotent finalization and results |
| POST | /attempts/:attemptId/abandon | In-progress to abandoned only |
| GET | /attempts | Paginated owner history with projectId/quizId/status/date filters |
| GET | /attempts/:attemptId/results | Completed score and immutable question/answer review |
| GET | /analytics | Global metrics, UTC date boundaries and bucket |
| GET | /projects/:projectId/analytics | Project metrics |
| GET | /quizzes/:quizId/analytics | Quiz metrics and version grouping |
| GET | /dashboard | Bounded recent items, counts and performance |
| GET | /ai-usage | Current owner usage, quota and window reset |

Generation source is one of NOTE {noteId,revision}, EXCERPT {noteId,revision,start,end}, NOTES {noteIds}, PROJECT. Ranges use the documented plain-text Unicode code point offsets and are resolved on the server. Quiz requests can also supply SUMMARY {summaryId,updatedAt}, which resolves the current saved summary in the owned project. Selected notes must belong to the route project. Archived and deleted material is excluded. Empty or stale selections fail before provider access.

Summary settings specify length SHORT/MEDIUM/DETAILED and one of QUICK, PARAGRAPHS, STUDY_GUIDE, BULLETS, KEY_CONCEPTS, SIMPLIFIED or EXAM_REVIEWER. PARAGRAPHS is displayed as Detailed summary. Quiz settings specify title, questionCount 1–50, difficulty EASY/MEDIUM/HARD/MIXED, questionTypes, defaultMode and includeExplanations.

## Contract examples reviewed

A PATCH with {expectedRevision:5,title:"OSI"} against revision 6 returns 409 REVISION_CONFLICT without writing, with the current revision available through an authorized reread. A generation batch containing Bob's note under Alice's token returns 404 RESOURCE_NOT_FOUND and performs zero provider calls.

Idempotency keys are scoped to owner plus operation. Persist a hash of settings/source revisions. Same key and same input returns the existing operation. Same key with changed input returns 409 IDEMPOTENCY_CONFLICT. A deliberate regeneration uses a fresh key. Submitting a completed attempt returns its stored result and leaves finish time unchanged.

Player endpoints withhold grades, keys, topic labels and explanations until final submission in both modes. Explicit owner authoring exposes editing data in its own view and cache.

## Generation status

POST generation returns 201 with the completed artifact or a persisted operation status. GET /generations/:generationId returns RESERVED, RUNNING, SUCCEEDED, FAILED or UNCERTAIN with a safe public error and retry guidance. A response timeout does not imply that the provider incurred zero usage. The existing idempotency key retrieves the original status.

## Phase 4 implemented generation contract

All generation paths use the same guarded endpoint and return a persisted operation: {data:{id,status,resultId,errorCode,result}}. result is present only for SUCCEEDED and includes projectId, operation, settings, output and captured source metadata. Raw source text is not included in that response. Validation/admission failures return the normal HTTP error shape before a provider call. Execution failures return the persisted FAILED or UNCERTAIN operation with a safe code. Missing enabled AI setup returns 503. Summary generation and regeneration accept text/event-stream. When streaming is available, summary events carry validated completed sections and the final result event carries the standard stored response. JSON remains supported. Retrieve status after a lost response or uncertain outcome; do not silently submit a new key.

Keys are scoped to the current owner by the existing database unique constraint. The operation, settings and exact captured source revisions are bound into the input hash. Reusing an owner's key for a different operation also returns 409. This is stricter than allowing the same key independently for summary and quiz operations. Same input/key returns the original status/result and creates no new usage or artifact.

| Method | Path | Implemented body/query |
| --- | --- | --- |
| POST | /projects/:projectId/summaries | {generationId}; accept a completed summary draft once |
| POST | /summaries/:summaryId/regenerate | Full SUMMARY generation body and a fresh Idempotency-Key; returns a new preview, keeps the saved original |
| POST | /projects/:projectId/quizzes | {generationId}; accept a completed quiz draft into version one |
| GET | /quizzes/:quizId/versions | page, pageSize; metadata without answer keys |
| POST | /quizzes/:quizId/versions | {expectedVersion,settings,content}, or {expectedVersion,generationId} to accept metered regeneration |
| POST | /quizzes/:quizId/regenerate | Full QUIZ generation body and fresh Idempotency-Key; explicit publishing is required afterward |
| POST | /quizzes/:quizId/duplicate | {expectedVersion}; independent quiz, version, question and option IDs |
| PATCH | /quizzes/:quizId | {title}; no AI call |
| DELETE | /summaries/:summaryId or /quizzes/:quizId | {confirmed:true}; soft deletion preserves historical references |
| GET | /ai-usage | page, pageSize; owner ledger, call counts and UTC-day quota/reset metadata |

Summary output is {title,sections:[{heading:string|null,text,sourceKeys}]}. Section text supports Markdown. Key-concept, study-guide and exam-reviewer sections require headings. PATCH summary accepts title and/or content through the same bounded source-key validation.

Quiz output is {title,questions}. Every question has type, prompt, explanation:string|null, sourceKeys and an optional topic. An incorrect option can include an optional rationale. Choice questions contain options:[{id,text}] and correctOptionIds; identification contains acceptedAnswers. Multiple-select requires at least two correct choices and at least one distractor. Requested types must all appear, question count is exact (1–50), normalized prompts must be distinct, and explanation presence must match settings. The authoring endpoint returns persisted question/option UUIDs and isCorrect keys only to the owner. These are authoring APIs; Phase 5 introduces player projections and scoring.

Generation results are drafts until accepted. Repeated draft acceptance is idempotent. Summary regeneration saves a separate summary when accepted. Quiz regeneration can publish a successor version after an expectedVersion check. Editing a quiz never updates earlier version rows or their attempt-linked answer keys. Authoring fields are returned as text. The summary reader renders Markdown with raw HTML and remote images disabled.

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
| POST | /quizzes/:quizId/attempts | Idempotency-Key, versionId, mode, shuffleQuestions, shuffleOptions |
| GET | /attempts/:attemptId | Player projection with mode-specific answer disclosure |
| PUT | /attempts/:attemptId/answers/:questionId | expectedAnswerRevision and optionIds or identification text |
| POST | /attempts/:attemptId/submit | Idempotent finalization and results |
| POST | /attempts/:attemptId/abandon | In-progress to abandoned only |
| GET | /attempts | Paginated owner history with projectId/quizId/status/date filters |
| GET | /attempts/:attemptId/results | Completed score and immutable question/answer review |
| GET | /analytics | Global metrics, UTC date boundaries and bucket |
| GET | /projects/:projectId/analytics | Project metrics |
| GET | /quizzes/:quizId/analytics | Quiz metrics and version grouping |
| GET | /dashboard | Bounded recent items, counts and performance |
| GET | /ai-usage | Current owner usage, quota and window reset |

Generation source is one of NOTE {noteId,revision}, EXCERPT {noteId,revision,start,end}, NOTES {noteIds}, PROJECT. Ranges use the documented plain-text Unicode code point offsets and are resolved on the server. Selected notes must belong to the route project. Archived and deleted material is excluded. Empty or stale selections fail before provider access.

Summary settings specify length SHORT/MEDIUM/DETAILED and format PARAGRAPHS/BULLETS/KEY_CONCEPTS/STUDY_GUIDE. Quiz settings specify title, questionCount 1–50, difficulty EASY/MEDIUM/HARD, questionTypes, defaultMode and includeExplanations.

## Contract examples reviewed

A PATCH with {expectedRevision:5,title:"OSI"} against revision 6 returns 409 REVISION_CONFLICT without writing, with the current revision available through an authorized reread. A generation batch containing Bob's note under Alice's token returns 404 RESOURCE_NOT_FOUND and performs zero provider calls.

Idempotency keys are scoped to owner plus operation. Persist a hash of settings/source revisions. Same key and same input returns the existing operation. Same key with changed input returns 409 IDEMPOTENCY_CONFLICT. A deliberate regeneration uses a fresh key. Submitting a completed attempt returns its stored result and leaves finish time unchanged.

Player endpoints suppress grading keys throughout an open exam and suppress practice feedback until the matching answer is committed. Authoring endpoints intentionally expose the owner's answer keys, so this is a personal study tool and carries no proctored-exam integrity guarantee. Avoid prefetching authoring data into player state.

# Quiz scoring and history

A Quiz owns immutable numbered QuizVersions. Generation, author edits and regeneration create a fresh version. Each attempt pins one version and stores question and option order by stable IDs. A retake creates a separately numbered attempt from the same saved version without an AI call. A focused retake includes only incorrect answers from the selected completed attempt. Old source revisions, questions, options and grading keys remain fixed.

```mermaid
stateDiagram-v2
  [*] --> IN_PROGRESS
  IN_PROGRESS --> COMPLETED: atomic final submit
  IN_PROGRESS --> ABANDONED: explicit abandon or policy expiry
  COMPLETED --> [*]
  ABANDONED --> [*]
```

Unfinished attempts remain resumable for seven days after start. A later read can atomically abandon an expired attempt. Abandoned attempts keep recorded answers but do not enter scored analytics. Server timestamps measure start-to-finalization wall time including pauses, labeled elapsed time.

| Type | Deterministic scoring rule | Reviewed example |
| --- | --- | --- |
| Multiple choice | Exactly one selected valid option equals the answer key | B versus B earns one |
| True/false | Boolean choice maps to one of two stable option IDs | True versus False earns zero |
| Identification | NFKC normalize, trim, collapse whitespace and Unicode lowercase, compare against explicit accepted variants | ' TCP/IP ' matches 'tcp/ip' |
| Multiple select | Selected distinct ID set exactly equals key set, order ignored | [C,A] matches [A,C], [A] earns zero |

Every question has one point and no partial credit. Unanswered questions earn zero but are tracked separately from incorrect answers. Identification variants are authored or validated at generation time. Exact matching cannot reliably accept semantic paraphrases, spelling errors or ambiguous responses. Display accepted forms during review and allow future quiz versions to add alternatives.

## Disclosure and writes

| View | Open practice | Open exam | Completed |
| --- | --- | --- | --- |
| Player question | Prompt/options | Prompt/options | Immutable prompt/options |
| Submitted question feedback | No key, correctness or explanation | No key, correctness or explanation | Correctness and enabled explanation |
| Results endpoint | Unavailable | Unavailable | Full permitted answer review |
| Explicit owner authoring | Full keys | Full keys | Full keys |

Owners inspect and edit their questions through authoring. Authoring data uses a separate cache from player queries.

Practice and exam drafts use optimistic answer revisions and stay editable until finalization. An answer write can update the current question index in the same transaction. The final submit transaction serializes with writes, scores stored answers, sets completion and timestamps once, then returns results. Repeat finalization returns identical results. Wrong-owner, wrong-version questions/options and post-completion writes fail.

## Reviewed history fixture

Version 1 contains a correct choice A. Attempt 1 chooses A and earns one. Version 2 changes the answer to B. Reviewing attempt 1 still yields A and one point. Retaking version 1 creates attempt 2 with a new ID and independently saved answer order. Repeating its start key returns attempt 2, while an explicit new start key creates attempt 3.

## Implemented scoring boundary

quiz-scoring.service.ts is pure and runs only on trusted immutable version questions. Duplicate or foreign option IDs and type-mismatched payloads are rejected. A partial multiple-select set is a valid submitted answer worth zero, with no partial credit. Clearing an exam choice or submitting blank identification text is unanswered; it is counted as skipped at completion, not incorrect. An unknown synonym is incorrect unless the version explicitly includes it among accepted variants. NFKC/whitespace/lowercase normalization preserves punctuation, so TCP/IP and TCP IP remain different. Server finalization scores every assigned question, including those with no answer row, and zero-question ratios are null.

## Phase 6 history integrity acceptance

The P6-T06 real-routing/database scenario answers the four question types with the fixed key in both modes, including full-width identification normalization. Both modes withhold feedback and answer keys through intermediate reloads. Both scores are 100%. Concurrent duplicate finalizations return identical answers, finish timestamps and scores. A valid post-completion answer write is rejected. Publishing a changed answer key on version 2 leaves both version-1 reviews byte-for-byte equivalent as JSON. A replayed shuffled retake creates one new attempt, pins version 1, preserves order on reload and invokes no AI. The pure scorer and existing incorrect/skip/race fixtures remain active.

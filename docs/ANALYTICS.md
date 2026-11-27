# Analytics definitions

All aggregates are database queries scoped to the verified owner before grouping. Use completed attempts for scores, answers and duration. Use UTC bucket boundaries with inclusive from and exclusive to filters, returning UTC timestamps for local display. Break equal timestamps by attempt ID. Preserve attempted version metadata for difficulty and type grouping.

| Metric | Definition |
| --- | --- |
| Project/note/summary/quiz totals | Current nondeleted owned records, archived included with explicit labels |
| Completed attempts | Count status COMPLETED |
| Questions assigned | Sum totalQuestions in completed attempts |
| Questions answered | Count committed nonempty answers in completed attempts |
| Correct | Answer rows with isCorrect true |
| Incorrect | Answered minus correct |
| Skipped | Assigned minus answered |
| Attempt percentage | 100 × correct / assigned |
| Mean quiz score | Mean percentage across completed attempts, each attempt equally weighted |
| Overall accuracy | 100 × total correct / total answered |
| Highest, first and latest | Maximum percentage and chronological first/latest completed attempt |
| Improvement | Latest minus first percentage in percentage points |
| Total completion time | Sum finishedAt minus startedAt for completed attempts |
| Mean completion time | Total elapsed time / completed count |
| Most missed | Wrong count / answered count grouped by stable version/question ID, include sample count |

Zero denominators return null for ratios and zero for counts. Round at presentation to two decimals. Never average rounded values. Filter project metrics through the quiz's project at generation, retaining history if that project is tombstoned. Note moves do not reassign past quiz performance. Group cross-version metrics by quiz identity and display the selected version range. Do not equate distinct questions across versions without explicit stable metadata.

Global analytics expose every aggregate above, recent activity and time-bucket performance. Project analytics additionally group difficulty and question type. Quiz analytics include first/latest/highest/mean, improvement, average elapsed duration, missed questions and attempt comparison. Reliable topic metadata is conditional optional work.

Use Recharts 3 when charts are implemented, with line charts for score over time, bars for comparisons, donut for correct/incorrect, and a separate skipped count. Provide table/text equivalents, visible sample counts and clear axes.

## Worked fixtures

Two completed attempts score 1/1 and 1/3 with every question answered. Correct = 2, answered = 4, incorrect = 2. Accuracy = 50%, mean score = (100 + 33.3333)/2 = 66.6667%. First = highest = 100%, latest = 33.3333%, improvement = -66.6667 points.

Another fixture scores 2/2 and 1/4 with one skipped. Assigned = 6, answered = 5, correct = 3, incorrect = 2, skipped = 1. Accuracy = 60%, mean score = 62.5%. An in-progress attempt does not affect either scored aggregate.

Dashboard recent notes order by owner-scoped lastOpenedAt, independent of editedAt. Recent projects order by createdAt. Recent summaries use generatedAt, newest quiz identities use createdAt, and recent attempts use startedAt. The dashboard bounds each recent list to six rows; its attempt/performance window defaults to 30 UTC days. Counts and recents use bounded queries and explicitly distinguish archived and deleted history.

## Phase 5 accepted metric boundaries

The hand-calculated fixture in server/tests/fixtures/analytics.ts contains 2/2 and 1/4 completed attempts, with one skipped question in the latter. Completed attempts = 2, assigned = 6, answered = 5, correct = 3, incorrect = 2 and skipped = 1. Equal-weight mean attempt score is 62.5%; answer accuracy is 60%. The highest/first score is 100%, latest is 25%, improvement is -75 percentage points, total elapsed time is 3,000 ms and mean elapsed time is 1,500 ms. In-progress and abandoned records contribute to status counts but not score, answer or duration aggregates.

Workspace counts are current nondeleted owned records across all dates; archived records remain included and archived counts are labeled. Completed metrics use server finishedAt with inclusive from/exclusive to UTC boundaries. Incomplete status counts use startedAt because there is no completion time. History continues to sort by startedAt; first/latest scored comparisons sort by finishedAt, then attempt ID. A quiz/project scope preserves its attempted history after soft deletion while current workspace counts omit tombstones.

Analytics accepts a window of at most 366 days and daily UTC buckets. Defaults are the current UTC day plus the preceding 29 days. Empty counts are zero and undefined ratios are null. The UI formats ratios only at display time; mean scores use each unrounded correct/assigned ratio, not a pooled ratio or an average of displayed percentages. Duration is server start-to-finish wall time, including pauses. Each completed attempt gets one equal weight, regardless of question count.

Version-specific difficulty, question type and question IDs are authoritative. Correct/incorrect outcomes use finalized stored answers; missing or deliberately cleared answers are skipped. The most-missed table ranks by incorrect-answer count with stable question-ID ties, and reports wrong/answered rate, answered sample size, assigned and skipped counts for that version/question. It never treats skipped questions as wrong answers or combines distinct questions across versions. Topic attribution remains optional until stable annotations exist.

Implementation uses database aggregates and bounded group sets. Completion captures an unrounded score ratio, elapsed time and UTC completion day so score means and trends can be grouped without loading an unbounded attempt history. All completed attempts enter status counts; legacy records missing valid score/time snapshots are excluded from the corresponding scored samples, which are reported explicitly. Authorized finalization always records the full snapshot atomically.

## Optional topic report disposition (2026-11-28)

P5-T28 is deferred because the current QuizQuestion schema and validated generation contract have no stable topic annotations. Prompt text, note titles and keyword guesses do not establish a reliable topic identity. No topic percentages are inferred or displayed. Difficulty and question-type breakdowns are available now. Future topic reporting requires explicit version-bound annotations, a policy for overlapping tags and sample/untagged coverage before aggregation and UI acceptance tests can be meaningful.

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

Dashboard recent notes order by owner-scoped lastOpenedAt, independent of editedAt. Recent projects order by createdAt. Recent summaries/quizzes use generatedAt and attempts use startedAt. Counts and recents use bounded queries and explicitly distinguish archived and deleted history.

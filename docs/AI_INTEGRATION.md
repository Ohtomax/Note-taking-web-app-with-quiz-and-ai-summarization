# AI provider decision and usage plan

Reviewed official sources on 2026-11-26. Recommend Groq GPT-OSS 120B as the initial candidate for a source-grounded structured-output pilot. Its published cost and strict JSON mode fit small study generations. Keep the model configurable and a small service boundary so a quality pilot can change this choice. The recommendation is an inference from documented capabilities. Quality, latency, account availability and sustained reliability remain unmeasured until credentials are supplied.

| Candidate | USD per million input / output tokens | Context | Structured output and access |
| --- | --- | --- | --- |
| Gemini 3.5 Flash-Lite | 0.30 / 2.50 | 1,048,576 input | JSON Schema, free tier subject to limits, paid tier for production privacy |
| OpenAI GPT-5 mini | 0.25 / 2.00 | 400,000 | Schema support, deprecated on the reviewed page, compare as a historical baseline and select a supported successor before implementation |
| Groq openai/gpt-oss-120b | 0.15 / 0.60 | 131,072 | Strict JSON Schema, published free/developer rate tiers, evaluate account limits before rollout |

The Gemini model and price pages establish its limits and free/paid distinction. Free-tier content can be used for product improvement, while paid-tier content is excluded under the linked terms. [Gemini model](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [Gemini pricing](https://aistudio.google.com/docs/pricing), [Gemini structured output](https://aistudio.google.com/docs/structured-output).

OpenAI's reviewed model is deprecated. API data is excluded from training by default, with endpoint-specific retention and abuse monitoring. Do not assume a free production API allowance. [GPT-5 mini model](https://developers.openai.com/api/docs/models/gpt-5-mini), [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Groq publishes context/pricing and strict-schema support for the candidate. Abuse/reliability retention can apply for up to 30 days and organization data controls include ZDR. Free tier limits are model and account dependent. No provider availability guarantee is inferred from these pages. [Groq models](https://console.groq.com/docs/models), [Strict output](https://console.groq.com/docs/structured-outputs), [Rate limits](https://console.groq.com/docs/rate-limits), [Data controls](https://console.groq.com/docs/your-data).

## Reproducible cost estimates

Cost = inputTokens × inputRate / 1,000,000 + billedOutputTokens × outputRate / 1,000,000. Include reasoning tokens where billed. Rates here omit cache discounts, tools, tax and retries.

| Fixture | Gemini | OpenAI baseline | Groq candidate |
| --- | --- | --- | --- |
| One note, 3,000 input and 700 billed output | $0.00265 | $0.00215 | $0.00087 |
| Folder, five map calls each 20,000 input/1,000 output, then 6,000 input/1,500 output reduction | $0.04805 | $0.03950 | $0.01980 |

Folder totals are 106,000 input and 6,500 output. If reasoning exceeds the assumed billed output, recalculate from provider usage. At the candidate rate, 1,000 note summaries cost about $0.87 before retries and overhead.

Initial configurable policy proposes 20 logical generations/user/day, one concurrent generation/user and four global concurrent provider calls. Reserve worst-case bounded tokens before admission, cap per-request output, and settle from actual usage. Apply a separate operator budget and request ceiling. Count intermediate and retried calls. Cost estimates are estimates and unknown usage stays unknown.

## Deferred account work

Per the owner's instruction, keys, billing activation and live provider benchmarks are left for the owner. A later pilot should use synthetic Networking notes, at least 20 generations, all question types, and record schema pass rate, source fidelity, duplicate rate, latency and actual usage. Target complete source references and no invalid saved questions. Live output quality has not been claimed.

## Generation lifecycle

1. Strictly validate settings, source mode and idempotency key.
2. Resolve the current user and all notes within the selected owned project. Capture stable source keys, revisions, ranges and content hashes. Reject stale excerpts or mixed ownership.
3. Build a complete ordered manifest of eligible source material. Check revisions again before admitting the request. Archived/deleted notes are excluded explicitly.
4. Estimate tokens with the provider tokenizer or count endpoint when available. Reserve prompt/output space and a safety margin. Start with a conservative 20,000-token chunk input target and a 100,000-token source ceiling. Reject unsupported size clearly before billing.
5. Atomically reserve the quota and claim owner/operation/key/inputHash. A repeated key returns the persisted generation state. Changed inputs with the same key return 409.
6. Treat note text as untrusted data in delimited prompt sections. The model receives no tools, database credentials or unrelated user metadata.
7. For passages and small notes, make one schema-constrained call. For folders, map every chunk, then reduce in bounded batches until the result fits. Carry source keys through every stage. Validate every citation against the manifest.
8. Zod checks structure and semantic invariants. Quiz validation checks answer membership, cardinality, exact question count and duplicates. Summary sections include source references. A partial chunk set cannot become a complete artifact.
9. Atomically save the artifact and source revisions, settle usage and mark success. Source changes after capture mark the saved result stale. Never overwrite notes.
10. Reopening or retaking uses saved data. Intentional regenerate uses a new request key.

Use a 20-second provider-call deadline and a 55-second overall deadline as initial configurable values. Honor Retry-After and retry transient failures at most twice with jitter within the overall budget. Do not retry invalid input. A timed-out request with unknown provider completion stays uncertain and is never silently reissued under the same operation.

Persist generation state in AIUsage as RESERVED/RUNNING/SUCCEEDED/FAILED/UNCERTAIN with a lease and result reference. Recover expired reservations without labeling unknown cost as zero. A terminal retry uses a fresh operation after the UI discloses potential extra usage. In-process synchronous execution is the first implementation. If measured supported folders exceed hosting deadlines, P4-T25 adds resumable background execution before that size is advertised.

## Three-chunk walkthrough

Success covers chunks A, B and C, validates the three results and reduces their source keys into one artifact. Failure after B records A/B usage and the failed/uncertain state, saves no complete artifact and releases only unused reservation capacity. The same request key retrieves that state and starts no new provider calls. A new explicitly authorized generation re-resolves current source revisions.

For an excerpt, offsets resolve against the server-owned plainText at the specified revision. A changed revision fails before provider access. The UI identifies the external provider before sending and shows source coverage and limits.

## Phase 4 implementation settings

The server adapter uses AI SDK 4 and its OpenAI-compatible provider with the Groq endpoint, following the requested SDK major and the project provider decision. AI remains disabled by default. The owner can later supply AI_API_KEY and set AI_ENABLED=true; AI_MODEL defaults to openai/gpt-oss-120b. Missing enabled configuration fails with a redacted message. No live credentials or account settings were changed. Production never selects the deterministic adapter.

SDK 4 is marked unsupported in the official documentation; this implementation retains the requested major. Treat a supported SDK migration and dependency advisories as release follow-up. Contract checks use a synthetic HTTP response, not a live Groq call. See [AI SDK 4 generateObject](https://v4.ai-sdk.dev/docs/reference/ai-sdk-core/generate-object), [compatible provider configuration](https://v4.ai-sdk.dev/providers/ai-sdk-providers/openai), and [Groq structured output](https://console.groq.com/docs/structured-outputs).

## Phase 4 runtime limits and accounting

The shipped policy admits at most 20 logical generations per user per UTC day, one active generation per user and four globally. It reserves up to 10,000,000 token units per user/day and 100,000,000 globally; these are conservative token allowances, not monetary spending guarantees. See server/src/repositories/ai-admission.repository.ts. PostgreSQL serializable admission and bounded retries enforce them across processes. The Redis-backed generation route limiter additionally permits five generation requests per minute per client IP and fails closed if its store is unavailable. Duplicate requests still pass this route limiter but reuse the original logical generation.

The source collector caps active notes at 200, omits empty text from full-folder generation and excludes archived/deleted notes. Token planning treats UTF-8 bytes as a conservative input-token upper bound, with a 100,000-unit source ceiling, 20,000-unit source chunk target, 20,000 units of prompt/schema/reference headroom, an 8,000-token provider output cap and at most 32 logical provider stages. Actual calls including retries are reserved at up to three attempts per stage. Each call has a 20-second timeout and the operation has a 55-second deadline. Large merges carry a compact shared source-version list and grouped citations. Shape/citation checks cannot establish semantic truth or pedagogical quality; those require the deferred live pilot.

RESERVED leases expire as FAILED with unused token allowance released. Expired RUNNING leases become UNCERTAIN and retain their allowance because provider completion is unknown. Successful or failed calls with known token counts settle the allowance to those counts; unknown counts keep the worst-case reservation and null cost. Failed operations still count as logical requests. A fresh key is required for an intentional new generation after a terminal failure. The same key retrieves the original status and never automatically resumes uncertain work.

Pricing can be supplied explicitly through the trusted createStudyServices pricing option as a version plus input/output USD rates per million tokens. With no reviewed schedule supplied, estimatedCost and pricingVersion stay null even when token counts are known. The tests use a fixed synthetic schedule. No current live price or zero-cost inference is made. SDK telemetry is disabled and note text is not written to request logs.

## P4-T25 long-folder execution evaluation

On 2026-11-27 the largest supported local fixture (200 notes, exactly 100,000 UTF-8 source bytes) completed the full authenticated HTTP → source collection → quota reservation → 14 mock provider calls → persisted operation path in 353 ms. The complete test, including a second deliberately disconnected request, finished in about 851 ms. Mock calls add 1 ms latency and use deterministic outputs. This measures application/database overhead only; it does not measure Groq latency, output quality or a hosting proxy timeout.

The disconnect check aborts the HTTP connection after the first provider call begins. The persisted operation remains RUNNING, completes under the bounded in-process execution, and the same key retrieves its original result. Provider calls and accounted tokens do not increase on that retry. Test HTTP servers and connections close explicitly, including the aborted socket. Process termination is different: an expired running lease becomes UNCERTAIN and is not automatically reissued.

Decision: retain bounded synchronous execution with persisted status for now. No background worker was added without evidence from the target provider/hosting path. At 14 stages, a 55-second operation budget leaves approximately 3.9 seconds per stage before application overhead and retries; a real maximum-size pilot may exceed this. Do not advertise the largest folder for production until that pilot passes. If the real target path exceeds the deadline, reduce the supported synchronous ceiling or implement a persistent worker with lease ownership and reconciliation before enabling it.

The optional task remains unchecked for its live target-path timing/hosting acceptance. Provider credentials and deployment details are owner-deferred, so this is an explicit partial evaluation rather than a production capacity claim. Reproduce the local measurement with STUDY_TEST_DATABASE_URL set and node --import tsx --test tests/database/ai-long-generation.test.ts in server/.

### Phase 6 source and output boundary acceptance

P6-T04 uses synthetic source text containing instruction-like JSON delimiters and a private marker. The exact text remains in the untrusted JSON data envelope and never enters trusted system instructions. Both summary and quiz flows reject mixed-owner note sets before a provider call. Valid drafts save normally; fabricated source citations produce FAILED generation status and cannot be saved. The test confirms one valid summary/version, zero extra artifacts from rejected output, unchanged original notes and four deterministic provider calls. Existing malformed-output and complete-folder boundary cases remain in the database/unit suites.

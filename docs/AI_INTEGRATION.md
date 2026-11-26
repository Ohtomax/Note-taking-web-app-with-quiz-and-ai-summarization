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

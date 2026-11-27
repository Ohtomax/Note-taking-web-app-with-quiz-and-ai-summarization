# Dependency audit, 2026-11-28

The initial locked audit reported 10 high server findings and 5 high client findings, with no critical findings. After the focused overrides below, the audit reports 6 high server findings and 1 high client finding, with no critical findings. Counts include transitive parent packages and are not counts of independently exploitable application defects.

## Applied fixes

| Package | Locked override | Reason |
| --- | --- | --- |
| effect under @prisma/config | 3.22.5 | Fixes the TemplateLiteral regular-expression issue; the advisory identifies 3.22.1 as patched. |
| jsondiffpatch under ai | 0.7.7 | Fixes prototype-pollution and formatter issues while preserving the root export map. The application uses nonstreaming structured generation and accepts no patch-delta input. |
| @grpc/grpc-js in client | 1.13.6 | Fixes the reported certificate-authorization and error-message issues in the Firestore dependency tree. The application currently imports Firebase Auth, not Firestore. |

Sources: [Effect advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw), [jsondiffpatch prototype-pollution advisory](https://github.com/advisories/GHSA-j4fx-xxwh-2485), [gRPC certificate advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [gRPC error-message advisory](https://github.com/advisories/GHSA-f596-whhp-79r4). These are targeted transitive overrides, so retain the regression checks when updating their parent libraries. Do not automatically remove the overrides until the parent lock resolves patched dependencies.

Both manifests retain the requested Prisma 7, AI SDK 4 and Zod 3 majors. The client lock was regenerated from its pinned manifest in an empty temporary folder after npm's incremental lock operation omitted an optional WASI dependency and failed clean-install validation. Direct dependency versions stay pinned; compatible transitive patch/minor updates and optional peer placement are reflected in the reviewed lock diff.

## Remaining release blockers

The remaining audit chain is Zod: server zod, ai, @ai-sdk/openai, @ai-sdk/provider-utils, @ai-sdk/react and @ai-sdk/ui-utils; client zod. The [Zod resource-consumption advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) identifies 4.6.6 as patched. The current requested Zod 3 major has no patched release identified by this audit. Migrating Zod and the unsupported AI SDK 4 integration requires a focused compatibility change and regression pass; no forced major migration or Prisma/Firebase downgrade was applied.

Existing controls include a 256 kB Express JSON limit, authentication and rate limits, bounded source/question/option collections, and strict input/output schemas. These reduce exposure but do not patch the dependency or constitute approval to ship it. P6-T12 stays unchecked because no release-risk exception has been approved and the remaining findings have not been eliminated.

## Reproduction and limits

Run npm audit --json separately in server/ and client/ against the checked-in locks. Validate with the clean-checkout runner after dependency changes; the production adapter's schema-constrained mock transport, all API/database tests, both clean study sessions, frontend tests and builds must pass. Live Firebase/Firestore/Groq compatibility is not tested without owner configuration. No production-security approval follows from a passing build or the reduced finding count.

The final candidate clean install passes 39 server unit tests, 71 database/API tests and 40 frontend tests (150 total), with zero skips/failures. Source/test type checks, lint, formatting and both production builds also pass. The exact clean-install-tested client lock is retained because an incremental npm install can omit an optional WASI lock entry on this Windows setup. No live integration or production release is approved by these results.

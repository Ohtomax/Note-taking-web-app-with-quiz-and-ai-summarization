# Deployment design

Host the static React bundle on Vercel, the Docker Node API on Render, PostgreSQL on Supabase and identity in Firebase. Redis backs shared rate counters. Provider keys, Firebase Admin credentials, database and Redis URLs belong in backend secret storage. Firebase browser configuration is public configuration.

The browser calls Firebase for identity and Express for application data. Production network traffic uses HTTPS or verified TLS. The API alone connects to PostgreSQL and the AI provider. Application and migration database privileges should be separated.

## Release and recovery sequence

1. Provision staging targets and inject secrets through hosting settings.
2. Build and test a multi-stage Docker image with Node 24, compiled TypeScript, Prisma generation and the trusted CA. Run as a non-root user.
3. Rehearse migration against a disposable restoration, verify indexes and constraints, and confirm rollback compatibility.
4. Back up the production database using an authorized process and apply migrations through a designated runner.
5. Deploy the API to Render, check liveness/readiness and verify a scoped authenticated request.
6. Build the client with public settings and deploy to Vercel with SPA route fallback.
7. Configure Firebase authorized/reset domains and production CORS. Test login, recovery, generation, retake and analytics with synthetic content.
8. Record release IDs, migration state and smoke results. Monitor request failures, dependency health, generation latency and quota consumption with content-free structured logs.

Use daily database backups retained 7 days as an initial policy, subject to the owner's selected Supabase plan and retention needs. Initial recovery objectives propose RPO 24 hours and RTO 4 hours. Rehearse a timed restore and revise these targets from measurements. Firebase identities/configuration and provider settings are separate from SQL backups and must be inventoried.

A failed schema change stops release promotion. Revert the application only to a schema-compatible build. An incompatible change uses the rehearsed restore or forward-fix procedure. A provider outage disables new generation while saved notes and study records remain available. Redis loss follows the documented fail-closed policy for protected request admission.

## Owner setup deferred

The owner requested that account/credential-dependent steps be skipped. Firebase project registration and keys, Supabase database/CA access, Redis provisioning, provider billing/keys, Render and Vercel project setup remain owner actions for later phases. Local Phase 1 checks require no external secrets.

## Environment reference

| Settings | Purpose | First needed |
| --- | --- | --- |
| PORT | Bootstrap listener, default 3001 | Phase 1 |
| NODE_ENV | Runtime policy | Phase 2 |
| CORS_ORIGINS | Explicit allowed frontend origins | Phase 2 |
| DATABASE_URL, DIRECT_URL | Pooled runtime and migration connection | Phase 2 |
| DATABASE_CA_PATH | Trusted Supabase CA for verified TLS | Phase 2 |
| FIREBASE_SERVICE_ACCOUNT | Admin credential JSON held server-side | Phase 2 |
| REDIS_URL | Shared route counters | Phase 2 |
| VITE_API_BASE_URL | Browser-to-Express URL | Phase 3 |
| VITE_FIREBASE_* | Firebase browser project settings | Phase 3 |
| AI_PROVIDER, AI_MODEL, AI_API_KEY | Provider/model and backend credential | Phase 4 |
| AI_DAILY_GENERATIONS, AI_USER_CONCURRENCY, AI_GLOBAL_CONCURRENCY | Generation admission limits | Phase 4 |
| AI_CALL_TIMEOUT_MS, AI_TOTAL_TIMEOUT_MS, AI_MAX_SOURCE_TOKENS | Cost and deadline bounds | Phase 4 |

Copy each .env.example to a local .env when that phase needs it. Values in examples are placeholders. Render supplies server secrets through its environment settings. Vercel receives only VITE-prefixed public settings. Tests use isolated test values. The Phase 1 bootstrap starts with PORT's default and needs no account setup.

Never prefix privileged keys with VITE_. Phase 2 will implement runtime schema validation, secure connection construction and certificate loading. Example variables beyond PORT are documented future inputs.

## Deferred Phase 2 infrastructure

Per the owner's instruction, collecting URLs/keys, connecting to hosted Supabase/Firebase/Redis and deployment are skipped. prisma.config.ts uses an explicit unconfigured localhost placeholder for offline schema commands only. No automatic migration or schema push runs on app startup. Runtime database construction requires an actual supplied connection string and trusted CA. URL SSL override parameters are removed before pg receives the verified TLS object. The live certificate acceptance/rejection check remains pending.

## Initial migration rehearsal

The initial migration was generated with prisma migrate diff --from-empty --to-schema ./prisma --script. It was applied to a new empty disposable local database using prisma migrate deploy. A second run reported no pending migrations, and the database fixture suite passed against the migrated schema. No hosted or production migration was attempted. Before a later hosted deployment, supply DIRECT_URL locally through the approved secret mechanism, review the migration, back up the target and run the documented Phase 6 release procedure.

## Phase 6 owner exclusion and handover

Deployment-associated tasks remain deferred at the owner request: no container/image deployment, hosted identity/database/Redis setup, production migration, Render/Vercel command or paid smoke generation was performed. The [local handover](./HANDOVER.md), [dependency audit](./DEPENDENCY_AUDIT.md) and [recovery runbook](./RECOVERY.md) distinguish tested local contracts from release work requiring owner settings and later authorization. Local eight-migration replay does not establish a production migration or application rollback rehearsal.

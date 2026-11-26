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

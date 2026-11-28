# Docker and Render Free deployment

The API runs in one Docker container on Render Free (0.1 CPU, 512 MB). The React frontend remains a separate deployment. Supabase stores application data, Firebase provides identity, and a separate free Render Key Value instance stores rate-limit counters. Redis does not run inside the API container.

The owner authorized Docker/Render preparation on 2026-11-28. Repository configuration and local container verification do not establish a live Render deployment. See [task.md](./task.md) for status. The remaining [dependency audit findings](./DEPENDENCY_AUDIT.md) still require resolution before production release.

## Container configuration

| Setting               | Render Free value                 | Purpose                                                    |
| --------------------- | --------------------------------- | ---------------------------------------------------------- |
| Runtime               | One Node 24 process, UID/GID 1000 | Avoid cluster overhead; permit Render secret-file access   |
| PORT                  | 10000, bound to 0.0.0.0           | Render's HTTP listener                                     |
| NODE_OPTIONS          | --max-old-space-size=256          | Leave memory for native libraries, buffers and the process |
| UV_THREADPOOL_SIZE    | 2                                 | Bound native worker overhead                               |
| MALLOC_ARENA_MAX      | 2                                 | Bound Linux allocator arenas                               |
| DB_POOL_MAX           | 2                                 | Limit connections per process                              |
| AI_GLOBAL_CONCURRENCY | 1                                 | Serialize generation admission in the database             |
| AI_ENABLED            | false                             | Use notes and saved study features without a provider key  |

The heap limit is not a total RSS cap. Render enforces the container memory limit. TypeScript/Prisma run in the build stage; the web process executes compiled JavaScript. No watch server, compiler, Prisma CLI, local Redis or migration runs in the runtime image. The migration target retains the CLI for an explicit release operation.

The image uses a digest-pinned Node 24 Debian base, installs system CA certificates, and copies compiled output and production dependencies. Update the base digest with future Node security releases. The Docker context uses an allowlist; environment files, certificates, Firebase JSON and generated/test artifacts are excluded. Credentials are supplied at runtime.

## Build and validate locally

Run from the repository root:

```powershell
docker build --target runtime -t quillquiz-api:render-free ./server
node scripts/test-render-docker.mjs
```

The acceptance script builds both image targets and creates uniquely named disposable Docker volumes, a network and containers. It generates synthetic credentials and TLS certificates, migrates its own PostgreSQL database, and starts the API with --cpus 0.1 --memory 512m. It checks non-root execution, excluded build/secret files, database authentication and CA rejection, readiness, missing-token rejection and CORS. It records sampled memory and readiness latency. It removes only its own Docker resources and retains synthetic fixture files in the printed temporary directory. It never loads the project's .env or contacts hosted Firebase, Supabase or an AI provider.

Temporary context-probe files contain synthetic markers, are Git-ignored, and are removed immediately after image construction. They must not be committed.

## Health and recovery

Render should probe /api/health/ready. Its response deadline is 3 seconds, below Render's 5-second HTTP health-check limit. Overlapping probes share one dependency check instead of adding queries to an unavailable database. Timing out the HTTP response does not cancel that shared query. Redis commands also have a 2-second timeout. /api/health/live stays available while dependencies are stalled; protected request admission stays fail-closed if Redis is unavailable.

The local Docker acceptance script deliberately pauses PostgreSQL and Redis, verifies bounded readiness failure/liveness, resumes each dependency and verifies readiness and token admission recover. See [recorded measurements](./evidence/render-free.json). Hosted Render notification delivery, real identity access and live capacity remain unverified.

## Runtime secret values

Provide these through Render's Environment page, without surrounding .env quotes:

| Variable                 | Value to supply                                              |
| ------------------------ | ------------------------------------------------------------ |
| DATABASE_URL             | Supabase pooled runtime URL with sslmode=verify-full         |
| DATABASE_CA_PATH         | /etc/secrets/supabase-ca.crt                                 |
| FIREBASE_SERVICE_ACCOUNT | Replacement Firebase Admin service-account JSON              |
| REDIS_URL                | Key Value's internal URL, same workspace and region          |
| CORS_ORIGINS             | Exact frontend origin(s), comma separated, no trailing slash |

Under Environment > Secret Files add supabase-ca.crt containing the certificate downloaded from Supabase's Database > Settings > SSL configuration. The application reads it at runtime and verifies the database certificate and hostname. This Linux path replaces the Windows certificate path. Do not put certificate contents in DATABASE_CA_PATH.

Revoke and replace the Firebase private key previously shared in chat. Supply the replacement directly in Render; never commit it or paste it in chat. A Firebase JSON file is unnecessary when FIREBASE_SERVICE_ACCOUNT is set.

AI_API_KEY is optional while AI_ENABLED=false. The implemented provider is Groq. AI_MODEL=gemini-3.5-flash-lite does not switch the adapter to Google; leave AI disabled until Gemini support is implemented. Daily quota, per-user concurrency, source limits and deadlines other than AI_GLOBAL_CONCURRENCY remain code policies. The environment example lists only inputs the runtime reads.

DIRECT_URL belongs only to the migration runner. Keep it out of the web service. Frontend VITE_* settings belong to the separate client deployment; never expose backend credentials with a VITE_ prefix.

## Explicit migrations

The web image never migrates automatically. Back up the intended database and inspect migration status before applying a release. Prefer a distinct database role for migrations and a restricted application role for runtime queries.

Build the separate runner:

```powershell
docker build --target migration -t quillquiz-api:migration ./server
```

Create an ignored server/.env.migration locally containing DIRECT_URL with the Supabase direct/session migration URL, using sslmode=verify-full&sslrootcert=/etc/secrets/supabase-ca.crt. If the direct IPv6 host is unreachable, use Supabase's session pooler for the runner, not the transaction pooler. Keep credentials out of shell arguments and history.

```powershell
$caFile = (Resolve-Path -LiteralPath ./server/certs/supabase-ca.crt).Path
docker run --rm --env-file ./server/.env.migration --mount "type=bind,source=$caFile,target=/etc/secrets/supabase-ca.crt,readonly" quillquiz-api:migration migrate status
docker run --rm --env-file ./server/.env.migration --mount "type=bind,source=$caFile,target=/etc/secrets/supabase-ca.crt,readonly" quillquiz-api:migration migrate deploy
```

These commands operate on the supplied target database. The acceptance script uses its own synthetic target automatically. Do not use migrate dev or db push for hosted releases. A failed schema change stops deployment; revert only to a schema-compatible image or use the rehearsed [recovery procedure](./RECOVERY.md).

## Free-tier behavior

Free web services sleep after 15 minutes without inbound traffic and can take about one minute to wake. Their filesystem is ephemeral. Free Key Value has no persistence, so rate counters can reset on restart; notes, quizzes and AI usage remain in PostgreSQL. Admission stays fail-closed if Redis is unavailable. Key Value is a separate resource and does not consume the API's 512 MB allocation.

Use one API instance and avoid periodic keep-alive traffic. The free plan is suitable for hobby/testing use; the small local readiness sample does not establish concurrent-user capacity or uptime.

## Sources

- [Render compute plans](https://render.com/docs/compute-plans)
- [Docker on Render](https://render.com/docs/docker)
- [Docker secret files and group 1000](https://render.com/docs/docker-secrets)
- [Render Free limits](https://render.com/docs/free)
- [Key Value](https://render.com/docs/key-value)
- [Health checks](https://render.com/docs/health-checks)

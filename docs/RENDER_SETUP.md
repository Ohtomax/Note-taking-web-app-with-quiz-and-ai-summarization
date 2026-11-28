# Render Free setup

Use the repository-root [render.yaml](../render.yaml) for a free Docker web service and a separate free Key Value instance in Singapore. The blueprint has passed Render's official JSON Schema validation. Schema validation does not create resources or prove account access.

Read [DEPLOYMENT.md](./DEPLOYMENT.md) for runtime secret values, CA-file setup, the migration runner, resource limits and local Docker checks. The six high server dependency findings in the existing [audit](./DEPENDENCY_AUDIT.md) remain unresolved; this setup is for hobby/testing, with production acceptance still open.

## New services

1. Connect the repository to Render, then choose **New > Blueprint** in the intended workspace. Select **Ohtomax/QuillQuiz**, branch **main**, blueprint path **render.yaml**.
2. Review the resources: **quillquiz-api**, Docker, Free, 0.1 CPU / 512 MB; **quillquiz-rate-limits**, Key Value, Free. Both use **Singapore**. The blueprint provisions no Render Postgres, paid disk, worker or cron job.
3. Supply **DATABASE_URL**, **FIREBASE_SERVICE_ACCOUNT** and **CORS_ORIGINS** in the initial secret prompts. Use a replacement Firebase key if the old key was exposed. Never paste privileged values into the repository or chat.
4. In **quillquiz-api > Environment > Secret Files**, add **supabase-ca.crt** with the Supabase CA contents. The configured path is **/etc/secrets/supabase-ca.crt**. This is a runtime file; the Docker image excludes it.
5. Apply reviewed migrations through the separate local Docker runner after backup/status checks. Render Free has no shell or pre-deploy command, so migrations are deliberately not configured as a Render command.
6. Once the CA file and migrated schema are ready, use **Manual Deploy > Deploy latest commit**. Docker's CMD starts the API; leave any custom Docker command empty.
7. Verify the public HTTPS URL and save the successful deploy revision. Do not enable automatic deploys until the hosted checks below pass.

Initial Blueprint creation can start a build before the CA file has been added. A failure naming DATABASE_CA_PATH, a missing certificate or failed readiness must be corrected through Environment, then redeployed. Do not switch the health check to liveness to bypass missing infrastructure.

Only one free Key Value instance is allowed per workspace. If one already exists, inspect its region and reuse it: remove the new Key Value resource from the blueprint and change the REDIS_URL reference to its actual service name before syncing. Keep the API in the same region. Do not create a second paid instance to bypass the free limit.

The blueprint uses **autoDeployTrigger: "off"**. Creating/syncing it can still trigger an initial deployment. The setting prevents later source pushes from silently deploying an unverified revision. No application migration runs on startup.

## Existing web service

If an API service already exists, inspect it before creating another or syncing names. In its settings use:

| Field                | Value                         |
| -------------------- | ----------------------------- |
| Runtime              | Docker                        |
| Branch               | main                          |
| Root Directory       | server                        |
| Dockerfile Path      | ./Dockerfile                  |
| Docker Build Context | .                             |
| Docker Command       | Empty; use image CMD          |
| Instance Type        | Free (0.1 CPU / 512 MB)       |
| Health Check Path    | /api/health/ready             |
| Auto Deploy          | Off until release checks pass |

Set the same environment values listed in render.yaml and the secret inputs documented above. Set REDIS_URL to the existing Key Value's **internal** URL. The blueprint assumes one Render reverse-proxy hop (**TRUST_PROXY_HOPS=1**); verify the forwarded client address in the actual deployment before enabling traffic. Never use trust proxy=true. Adding a CDN/proxy requires revisiting this topology.

Keep an existing service in its current region, and put Key Value in that same region. Render does not support changing the region of an existing service. Do not delete/recreate existing services automatically.

## Hosted acceptance

- GET **/api/health/live** returns 200.
- GET **/api/health/ready** returns 200 only with PostgreSQL, Redis and service wiring available.
- GET **/api/v1/me** without a token returns 401 when dependencies are healthy.
- A real Firebase test identity can register/sync and read its own projects. A different identity cannot read them.
- The approved frontend origin receives the expected CORS header; an unlisted origin does not.
- Inspect Render logs/metrics for restarts, out-of-memory events, request latency and redaction. Record the deploy's Git revision and HTTPS URL.
- Interrupt a staging dependency, observe readiness fail, restore it and confirm recovery. Configure Render notification settings for failed deploys/restarts.
- Saved notes/quizzes remain available with **AI_ENABLED=false**. Gemini generation needs a separate backend provider integration.

Local Docker acceptance uses a synthetic Firebase service-account key to initialize the SDK and checks missing-token rejection. It does not establish successful Firebase sign-in or owner access on Render. A small local readiness test does not establish real user capacity on 0.1 CPU.

Render Free sleeps after 15 idle minutes, may take about one minute to wake, and loses local files on restart. Free Key Value loses rate counters on restart. Application data belongs in Supabase. Free service hours, bandwidth and build minutes have workspace limits; the **Hobby** workspace plan alone does not make every resource free.

Sources: [Blueprint reference](https://render.com/docs/blueprint-spec), [environment and secret files](https://render.com/docs/configure-environment-variables), [free-plan limits](https://render.com/docs/free), [health checks](https://render.com/docs/health-checks), [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/).

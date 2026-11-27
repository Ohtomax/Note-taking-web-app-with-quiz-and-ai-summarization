# Phase 6 local validation

Phase 6 is authorized for local verification and focused fixes, with one task-specific commit and push per completed task. Owner credentials, hosted database configuration, production migrations and deployment are deferred. Browser acceptance from Phase 5 remains open and is not a prerequisite for exercising the independent local regression, security and data checks below.

## Reproducible regression

On Windows, install Node 24.12 or newer Node 24, npm, PowerShell 7 and PostgreSQL 18 tools. From the repository root:

```powershell
pwsh -NoProfile -File scripts/test-local.ps1 -Repetitions 2 -CleanCheckout
```

If PostgreSQL tools are absent from PATH, pass `-PostgresBin 'C:\Program Files\PostgreSQL\18\bin'`. The harness exports the committed HEAD into a temporary checkout, installs both exact lockfiles on each pass, initializes a new cluster bound only to 127.0.0.1, creates a random guarded study_test database, and applies migrations to that disposable database. It then runs server unit/database tests, frontend component/HTTP tests, strict source/test types, lint, formatting and both production builds. The frontend full study scenario runs twice from fresh accounts in each pass and asserts exactly two mock AI calls per scenario. No live provider or Firebase authentication request is made.

Private service variables are removed from the child process for the run and restored before exit; the harness refuses private environment files. Mock identities are injected only by test fixture entry points. No existing database URL is accepted by this runner. PostgreSQL stops in finally; logs and the exported checkout remain in the printed temporary directory for inspection. An interrupted process may need its owned cluster stopped manually using that exact data path. No existing developer server is stopped. Clean installation uses the export so native modules loaded by a developer server cannot block npm ci in the working folder.

Without `-CleanCheckout`, the script checks the working files using existing dependencies. Use this for focused source changes. Avoid `-CleanInstall` in a folder with a running development server on Windows; use `-CleanCheckout` for the clean-install rehearsal instead.

To verify tracked candidate edits before committing, add `-IncludeTrackedChanges` with `-CleanCheckout`. It applies the tracked diff to the exported HEAD with LF line endings, independent of a machine's Git autocrlf setting. Untracked files are excluded from that candidate export; use the working-folder mode when adding new tests before their task commit. Real-HTTP React integration checks use a bounded five-second asynchronous UI wait, while component-only cases keep their existing limits.

## Task evidence

The task tracker and PROGRESS.md record task-specific test results and deferrals. Local mock results demonstrate application contracts and persistence; they do not establish live Firebase/Groq/Supabase/Redis availability, browser rendering or a production release.

### P6-T01 record, 2026-11-28

Two clean-install passes of the tracked candidate snapshot completed successfully: 39 server unit tests, 63 database/API tests and 38 frontend tests in each pass, with zero skips/failures. Both passes also passed typecheck, lint, format checks and production builds for both packages. Each pass ran the two fresh full study sessions with exactly two mock provider calls per session. Eight migrations applied to the new local database and the second deploy found no pending work. The owned cluster stopped on completion. Dependency-audit and main-bundle warnings remain separately tracked under P6-T12 and P6-T10.

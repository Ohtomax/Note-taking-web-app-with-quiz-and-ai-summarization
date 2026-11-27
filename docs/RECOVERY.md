# Local recovery rehearsal and owner runbook

The tested rehearsal uses only a guarded disposable PostgreSQL database, synthetic records and injected mapped test identities. It does not modify an owner database, create a production recovery point or recover live Firebase accounts.

## Reproduce the rehearsal

Start the disposable cluster with scripts/local-postgres.ps1, set its generated STUDY_TEST_DATABASE_URL and apply the repository migrations. From server/:

```powershell
node --import tsx tests/recovery/restore.ts 'C:\Program Files\PostgreSQL\18\bin' '<temporary-artifact-directory>'
```

The script requires a loopback study_test database and the synthetic study_fixture role. It seeds two owners and linked study history, creates a custom-format pg_dump without owner/ACL metadata, restores into a different random study_test database, and compares ordered snapshots of all users/projects/notes/summaries/sources/quizzes/versions/questions/options/attempts/answers/type metrics. Restored synthetic Firebase UIDs must still map to their original database owners through the normal API middleware. Cross-owner reads return 404. The known 100% historical result and 62.5% mean / 60% accuracy reconcile without an AI call.

The restored target is dropped in finally after disconnecting. The source fixture removes its synthetic accounts. The dump, SHA-256 and evidence JSON remain in the supplied temporary directory; keep these artifacts only for the local review. They contain synthetic data. Never adapt the test script to bypass the database guard.

## Recorded result, 2026-11-28

Dump: 209 ms. Restore: 627 ms. Two users, three projects, two notes, one summary, two quizzes, three versions and five attempts reconciled, including all related source and question/answer snapshots. Both restored ownership chains and the known historical results passed. Evidence: [restore.json](./evidence/restore.json). These local timings do not establish production recovery time.

## Production responsibilities to approve later

The project owner must designate a backup operator and an incident/recovery operator, approve encrypted backup storage and access, and record the exact database and Firebase project identifiers. Proposed planning targets are a 24-hour recovery-point objective and a one-hour recovery-time objective; approve and measure these before using them as an operational promise. A proposed retention policy is seven daily and four weekly encrypted PostgreSQL recovery points with regular restore exercises. No retention policy or scheduled backup was configured in this task.

PostgreSQL contains Firebase UIDs and profile/role mappings, not Firebase passwords or identity-provider configuration. The owner must separately preserve access to the original Firebase project, authorized domains/provider settings and its supported identity export/recovery mechanism. Recreating accounts with new UIDs requires a reviewed mapping procedure; never silently assign records by email. Privileged Firebase credentials, database URLs and other service secrets stay in the designated secret stores and are not included in Git or this runbook.

For an actual incident, identify the approved recovery point and compatible application revision, pause writes, restore into an isolated target, validate counts/foreign keys/source links/immutable scores and both ownership chains, verify live Firebase sign-in against the intended project, then authorize any connection switch. Keep the previous target and recovery artifacts until acceptance. Production restoration, live identity recovery and connection switching remain deferred under the owner's environment/deployment rule.

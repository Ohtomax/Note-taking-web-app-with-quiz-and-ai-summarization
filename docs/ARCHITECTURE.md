# Architecture decisions

## SmileCheck source review

Reviewed 2026-11-26 in `Z:/Antigravity Repo/SmileCheck-System`.

| Actual source | Observed convention applied here |
| --- | --- |
| `Backend/src/modules/contents/content.routes.ts` | Explicit ordered middleware, named controller namespace and Router per domain |
| `Backend/src/modules/contents/content.controller.ts` | Exported async handlers, explicit `Promise<void>`, response message/data and module error mapping |
| `Backend/src/modules/contents/content.service.ts` | Typed inputs, repository calls and typed ServiceError without Express arguments |
| `Backend/src/modules/contents/content.repository.ts` | Prisma data access isolated from HTTP |
| `Backend/src/utils/validators/content.validator.ts` | Zod schemas and parse/validation helpers |
| `Backend/src/utils/errorHandler/contentErrorHandler.ts` | Module-specific mapping and clean client errors |
| `frontend/src/hooks/usePolicy.ts` | Typed Query/Mutation hooks, meaningful staleTime, abort signals and invalidation after mutations |
| `Backend/tsconfig.json` | Strict TypeScript, ESM NodeNext and `@/*` imports |

Request trace reviewed from `useUpdatePolicy` through PUT `/api/content/policies/:type`, limiter, token and admin middleware, parameter/body validation, `updatePolicy` controller, service sanitization, `editPolicy` repository and Prisma. The query hook validates response data and updates/invalidates policy caches after success.

For this project use domain files in the approved top-level layer folders. A note request will pass through `routes/notes.routes.ts`, `controllers/notes.controller.ts`, `services/notes.service.ts`, `repositories/notes.repository.ts`, with `utils/input-validators/notes.ts` and `utils/error-handler/notes.ts`. A `client/src/features/notes/useNotes.ts` hook calls the shared authenticated Axios client using TanStack Query. Use explicit DTOs, exported readable functions and strict types. Formatting is standardized in P1-T20. The planned layer layout preserves the reviewed call flow.

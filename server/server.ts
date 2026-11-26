import { createApp } from '@/app.js';
import { parseEnvironment } from './config/env.ts';
import { createRuntime } from './config/runtime.ts';

const environment = parseEnvironment(process.env);
const runtime = await createRuntime(environment);

const server = createApp(
  runtime.checkReadiness,
  environment,
  undefined,
  runtime.services,
).listen(environment.PORT, '0.0.0.0');
function shutdown() {
  server.close(() => {
    void runtime.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

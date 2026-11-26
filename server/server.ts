import { createApp } from '@/app.js';
import { parseEnvironment } from './config/env.ts';

const environment = parseEnvironment(process.env);

const server = createApp(undefined, environment).listen(environment.PORT, '0.0.0.0');
function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

import { once } from 'node:events';
import { withWorkspace } from './workspace.fixture.ts';

// Test-only entry point. The database guard and injected token verifier are never used by server.ts.
try {
  await withWorkspace(async ({ app }) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture port');
    process.send?.({ port: address.port });
    try {
      await Promise.race([once(process, 'message'), once(process, 'disconnect')]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  process.disconnect?.();
} catch {
  process.stderr.write(
    'Local workspace fixture failed. Check the isolated database setup.\n',
  );
  process.exitCode = 1;
  process.disconnect?.();
}

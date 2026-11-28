import { Router } from 'express';

export type ReadinessCheck = () => Promise<boolean>;

export const createHealthRouter = (checkReadiness: ReadinessCheck, deadlineMs = 3000) => {
  const router = Router();
  // Coalesce overlapping probes so an unavailable dependency cannot grow a queue.
  let inFlight: Promise<boolean> | undefined;
  const read = () => {
    inFlight ??= Promise.resolve()
      .then(checkReadiness)
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };
  router.get('/live', (_req, res) => {
    res.status(200).json({ data: { status: 'alive' } });
  });
  router.get('/ready', async (_req, res) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const ready = await Promise.race([
        read(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), deadlineMs);
        }),
      ]);
      res
        .status(ready ? 200 : 503)
        .json({ data: { status: ready ? 'ready' : 'unavailable' } });
    } catch {
      res.status(503).json({ data: { status: 'unavailable' } });
    } finally {
      clearTimeout(timeout);
    }
  });
  return router;
};

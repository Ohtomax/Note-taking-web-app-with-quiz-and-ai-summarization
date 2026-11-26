import { Router } from 'express';

export type ReadinessCheck = () => Promise<boolean>;

export const createHealthRouter = (checkReadiness: ReadinessCheck) => {
  const router = Router();
  router.get('/live', (_req, res) => {
    res.status(200).json({ data: { status: 'alive' } });
  });
  router.get('/ready', async (_req, res) => {
    try {
      const ready = await checkReadiness();
      res
        .status(ready ? 200 : 503)
        .json({ data: { status: ready ? 'ready' : 'unavailable' } });
    } catch {
      res.status(503).json({ data: { status: 'unavailable' } });
    }
  });
  return router;
};

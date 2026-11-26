import express from 'express';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
  return app;
}

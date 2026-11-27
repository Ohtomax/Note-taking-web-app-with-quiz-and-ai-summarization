import { vi, beforeEach } from 'vitest';
import { usageApi } from '@/api/usage';
beforeEach(() => {
  vi.spyOn(usageApi, 'read').mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    pageSize: 5,
    quota: {
      requestsUsed: 0,
      requestLimit: 20,
      accountedTokens: 0,
      tokenLimit: 100000,
      active: 0,
      concurrencyLimit: 1,
      resetsAt: '2026-11-29T00:00:00.000Z',
    },
  });
});

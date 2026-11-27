export const normalizeAnswer = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

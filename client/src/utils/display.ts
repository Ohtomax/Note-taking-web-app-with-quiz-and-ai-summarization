export function formatDuration(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined) return 'Unavailable';
  const seconds = Math.max(0, Math.round(milliseconds / 1000)),
    minutes = Math.floor(seconds / 60);
  return minutes ? minutes + 'm ' + (seconds % 60) + 's' : seconds + 's';
}
export const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Unavailable' : value.toFixed(2) + '%';

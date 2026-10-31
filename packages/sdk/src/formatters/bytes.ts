/**
 * Formats a byte count into a human-readable size string (e.g. 1.5 KB, 24.8 MB, 1.2 GB).
 */
export function formatBytes(
  bytes: number | null | undefined,
  decimals: number = 1,
): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const dm = Math.max(0, decimals);
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);

  if (i === 0) {
    return `${Math.round(bytes)} B`;
  }

  const value = (bytes / Math.pow(k, i)).toFixed(dm).replace(/\.0$/, '');
  return `${value} ${units[i]}`;
}

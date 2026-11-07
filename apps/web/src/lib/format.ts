export function formatDistance(m?: number) {
  if (m === undefined) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

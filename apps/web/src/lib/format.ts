export function formatDistance(m?: number) {
  if (m === undefined) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

/** `11.14 15:20` 꼴. 도트 글꼴에 한글이 없어 숫자와 기호만 쓴다. */
export function formatTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}.${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

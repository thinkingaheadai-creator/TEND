export function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 45) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  const tsDate = new Date(ts);
  const nowDate = new Date(now);
  const startOfTsDay = new Date(
    tsDate.getFullYear(),
    tsDate.getMonth(),
    tsDate.getDate()
  );
  const startOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfTsDay.getTime()) / 86400000
  );

  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return `${dayDiff}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(tsDate);
}

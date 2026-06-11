export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}

export function tomorrow(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export function thisWeekend(): number {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSaturday = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

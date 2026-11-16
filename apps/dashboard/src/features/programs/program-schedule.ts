function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function tehranInput(iso: string | null | undefined) { return iso ? localParts(new Date(iso)) : ''; }
export function tehranInstant(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, minute] = match.map(Number);
  const target = Date.UTC(y, m - 1, d, h, minute);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const observed = localParts(new Date(guess));
    const [date, time] = observed.split('T'), [yy, mm, dd] = date.split('-').map(Number), [hh, min] = time.split(':').map(Number);
    guess += target - Date.UTC(yy, mm - 1, dd, hh, min);
  }
  return localParts(new Date(guess)) === value ? new Date(guess).toISOString() : null;
}
export function pricePreview(base: string, percent: number, start?: string | null, end?: string | null, at = new Date()) {
  const active = (!start || new Date(start) <= at) && (!end || at < new Date(end));
  return (BigInt(base) * BigInt(100 - (active ? percent : 0)) / BigInt(100)).toString();
}

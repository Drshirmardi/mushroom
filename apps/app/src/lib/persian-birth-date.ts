const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
export function persianDateParts(date: Date) {
  const parts = formatter.formatToParts(date);
  return { year: Number(parts.find(part => part.type === 'year')?.value), month: Number(parts.find(part => part.type === 'month')?.value), day: Number(parts.find(part => part.type === 'day')?.value) };
}
/** Use the runtime's Persian calendar; validate by matching every part rather than normalizing invalid dates. */
export function persianBirthDate(year: number, month: number, day: number): string | null {
  if (![year, month, day].every(Number.isInteger) || year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const start = Date.UTC(year + 621, 2, 17);
  for (let offset = 0; offset < 372; offset++) {
    const date = new Date(start + offset * 86_400_000); const parts = persianDateParts(date);
    if (parts.year === year && parts.month === month && parts.day === day) return date.toISOString().slice(0, 10);
  }
  return null;
}

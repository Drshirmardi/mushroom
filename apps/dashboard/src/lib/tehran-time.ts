const timeZone = "Asia/Tehran";
const formatter = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
  timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

const parts = (value: Date) => Object.fromEntries(formatter.formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
const offset = (value: Date) => { const local = parts(value); return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - value.getTime(); };

export function toTehranInput(value: string) {
  const local = parts(new Date(value));
  return `${local.year.toString().padStart(4, "0")}-${local.month.toString().padStart(2, "0")}-${local.day.toString().padStart(2, "0")}T${local.hour.toString().padStart(2, "0")}:${local.minute.toString().padStart(2, "0")}`;
}

export function fromTehranInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);
  if (!match) throw new RangeError("Invalid Tehran date and time.");
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(wall - offset(new Date(wall)));
  instant = new Date(wall - offset(instant));
  const actual = parts(instant);
  if (actual.year !== year || actual.month !== month || actual.day !== day || actual.hour !== hour || actual.minute !== minute) throw new RangeError("Invalid Tehran date and time.");
  return instant.toISOString();
}

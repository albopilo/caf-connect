export const HOURS_TEXT = [
  "Sunday – Friday: 08.30 – 19.30",
  "Saturday: 08.30 – 21.30",
  "Monday: Closed",
];

/** Jakarta-local day of week (0 = Sunday). */
export function jakartaDay(now = new Date()): number {
  const jakarta = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  return jakarta.getDay();
}

export function isClosedToday(now = new Date()): boolean {
  return jakartaDay(now) === 1;
}

/*
 * Dates and times as people type them: „21.11.2026“ and „10:30“, read into
 * the values the app stores, `YYYY-MM-DD` and `HH:MM` (`DateField`,
 * `TimeField`). A text that names no real day or time reads as `null`.
 */

/** „21.11.2026“ from `2026-11-21`; anything else as it is. */
export function formatGermanDate(iso) {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}

/** `2026-11-21` from „21.11.2026“, `null` for no real day. */
export function parseGermanDate(text) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec((text || "").trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** `10:30` from „10:30“, `null` for no time of a day. */
export function parseTime(text) {
  const match = /^(\d{2}):(\d{2})$/.exec((text || "").trim());
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  return hours <= 23 && minutes <= 59 ? `${match[1]}:${match[2]}` : null;
}

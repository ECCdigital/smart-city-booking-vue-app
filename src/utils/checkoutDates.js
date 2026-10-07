/**
 * Dates of the old checkout as `YYYY-MM-DD` in local time, the form of its
 * date pickers and fields. A self-booking takes no date before today
 * (ECCdigital/tickets#188); the staff's booking form is not bound by it.
 */

export const DATE_BEFORE_TODAY_MESSAGE =
  "Das Datum darf nicht vor heute liegen";

/** Today in local time, e.g. `2026-10-07`. */
export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whether an ISO date lies before today; no date is not before today. */
export function isBeforeToday(iso, now = new Date()) {
  return !!iso && iso < todayIso(now);
}

export function isTimeDependentBookable(bookable) {
  if (!bookable) {
    return false;
  }

  return (
    bookable.isScheduleRelated === true ||
    bookable.isTimePeriodRelated === true ||
    bookable.isLongRange === true ||
    bookable.isBlockPeriodRelated === true
  );
}

export function isBlockPeriodBookable(bookable) {
  return bookable?.isBlockPeriodRelated === true;
}

/**
 * The Buchungsart of a bookable by its flags: `schedule` (Freie Zeitwahl),
 * `timePeriod` (Feste Zeitfenster), `blockPeriod` (Zeiträume), `week` /
 * `month` (Langzeit: Ganze Wochen, Ganze Monate) or `independent` (ohne
 * Zeit). The one reading of the flags, for every part that asks.
 */
export function bookingModeOf(bookable) {
  if (!bookable) return "independent";
  if (bookable.isScheduleRelated) return "schedule";
  if (bookable.isTimePeriodRelated) return "timePeriod";
  if (bookable.isBlockPeriodRelated) return "blockPeriod";
  if (bookable.isLongRange) {
    const type = bookable.longRangeOptions?.type;
    if (type === "week" || type === "month") return type;
  }
  return "independent";
}

/**
 * The Buchungsart by the names of its questions: Freie Zeitwahl, Feste
 * Zeitfenster, Zeiträume, Ganze Wochen, Ganze Monate or Ohne Zeit.
 */
export function bookingModeNameKey(bookable) {
  const availability = "bookable.flow.availability";
  const mode = bookingModeOf(bookable);
  if (mode === "independent") return `${availability}.timed-no`;
  if (mode === "week" || mode === "month") {
    return `${availability}.long-range-${mode}`;
  }
  return `${availability}.modes.${mode}`;
}

const TIME_WINDOW_MODES = Object.freeze(["schedule", "timePeriod"]);
const LEAD_TIME_MODES = Object.freeze([
  "schedule",
  "timePeriod",
  "blockPeriod",
]);

/**
 * Freie Zeitwahl and Feste Zeitfenster: a time is picked within a day, so
 * Öffnungszeiten and Sonderöffnungszeiten apply.
 */
export function isTimeWindowMode(mode) {
  return TIME_WINDOW_MODES.includes(mode);
}

/**
 * The modes with settings of their own beneath the Buchungsart - Buchungs-
 * dauer, Feste Zeitfenster, Zeiträume - each with a Vorlaufzeit: a booking
 * starts at a time the bookable knows.
 */
export function isLeadTimeMode(mode) {
  return LEAD_TIME_MODES.includes(mode);
}

/** Whether Öffnungszeiten apply to the bookable (`isTimeWindowMode`). */
export function usesOpeningHours(bookable) {
  return isTimeWindowMode(bookingModeOf(bookable));
}

/** Whether a Vorlaufzeit applies to the bookable (`isLeadTimeMode`). */
export function usesLeadTime(bookable) {
  return isLeadTimeMode(bookingModeOf(bookable));
}

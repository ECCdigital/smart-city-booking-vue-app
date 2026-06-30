export function hasLeadTimeConfig(bookable) {
  if (!bookable?.isScheduleRelated) {
    return false;
  }
  const minutes = Number(bookable.preparationLeadTimeMinutes);
  const serviceHours = bookable.serviceHours;
  return (
    minutes > 0 &&
    Array.isArray(serviceHours) &&
    serviceHours.length > 0 &&
    serviceHours.some(
      (entry) =>
        Array.isArray(entry.weekdays) &&
        entry.weekdays.length > 0 &&
        entry.startTime &&
        entry.endTime
    )
  );
}

export function normalizeLeadTimeFields(bookable) {
  if (!bookable) {
    return bookable;
  }

  if (!Array.isArray(bookable.serviceHours)) {
    bookable.serviceHours = [];
  }
  if (bookable.preparationLeadTimeMinutes == null) {
    bookable.preparationLeadTimeMinutes = 0;
  }

  if (!bookable.isScheduleRelated) {
    bookable.isLeadTimeRelated = false;
    return bookable;
  }

  const hasExistingLeadTimeConfig = hasLeadTimeConfig(bookable);
  const hasServiceHours = bookable.serviceHours.length > 0;

  if (hasExistingLeadTimeConfig || hasServiceHours) {
    bookable.isLeadTimeRelated = true;
  } else if (bookable.isLeadTimeRelated == null) {
    bookable.isLeadTimeRelated = false;
  }

  return bookable;
}

export function formatPreparationDuration(minutes) {
  const value = Number(minutes);
  if (!value || value <= 0) {
    return "";
  }
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} Std. ${mins} Min.`;
  }
  if (hours > 0) {
    return `${hours} Std.`;
  }
  return `${mins} Min.`;
}

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

export function isLeadTimeSectionEnabled(bookable) {
  if (!bookable?.isScheduleRelated) {
    return false;
  }
  const hasServiceHours =
    Array.isArray(bookable.serviceHours) && bookable.serviceHours.length > 0;
  return hasServiceHours || Number(bookable.preparationLeadTimeMinutes) > 0;
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

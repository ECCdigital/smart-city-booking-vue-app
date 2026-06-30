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

export function hasBufferConfig(bookable) {
  if (!bookable?.isScheduleRelated) {
    return false;
  }
  const before = Number(bookable.bufferTimeBeforeMinutes);
  const after = Number(bookable.bufferTimeAfterMinutes);
  return (
    (Number.isFinite(before) && before > 0) ||
    (Number.isFinite(after) && after > 0)
  );
}

function normalizeBufferMinutes(value) {
  if (value == null || value === "") {
    return null;
  }
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  return Math.floor(minutes);
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
    bookable.bufferTimeBeforeMinutes = null;
    bookable.bufferTimeAfterMinutes = null;
    return bookable;
  }

  bookable.bufferTimeBeforeMinutes = normalizeBufferMinutes(
    bookable.bufferTimeBeforeMinutes
  );
  bookable.bufferTimeAfterMinutes = normalizeBufferMinutes(
    bookable.bufferTimeAfterMinutes
  );

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

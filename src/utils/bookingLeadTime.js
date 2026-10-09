import { usesLeadTime } from "@/utils/bookableBookingMode";

export function hasLeadTimeConfig(bookable) {
  if (!usesLeadTime(bookable)) {
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
  const leadTimeSupported = usesLeadTime(bookable);
  const bufferSupported = bookable?.isScheduleRelated === true;

  if (!Array.isArray(bookable.serviceHours)) {
    bookable.serviceHours = [];
  }
  if (bookable.preparationLeadTimeMinutes == null) {
    bookable.preparationLeadTimeMinutes = 0;
  }

  if (!leadTimeSupported) {
    bookable.isLeadTimeRelated = false;
  }

  if (!bufferSupported) {
    bookable.isBufferRelated = false;
    bookable.bufferTimeBeforeMinutes = null;
    bookable.bufferTimeAfterMinutes = null;
  }

  if (!leadTimeSupported) {
    return bookable;
  }

  if (bufferSupported) {
    bookable.bufferTimeBeforeMinutes = normalizeBufferMinutes(
      bookable.bufferTimeBeforeMinutes
    );
    bookable.bufferTimeAfterMinutes = normalizeBufferMinutes(
      bookable.bufferTimeAfterMinutes
    );
  }

  const hasExistingLeadTimeConfig = hasLeadTimeConfig(bookable);
  const hasServiceHours = bookable.serviceHours.length > 0;

  if (hasExistingLeadTimeConfig || hasServiceHours) {
    bookable.isLeadTimeRelated = true;
  } else if (bookable.isLeadTimeRelated == null) {
    bookable.isLeadTimeRelated = false;
  }

  if (bufferSupported) {
    if (hasBufferConfig(bookable)) {
      bookable.isBufferRelated = true;
    } else {
      bookable.isBufferRelated = false;
    }
  }

  return bookable;
}

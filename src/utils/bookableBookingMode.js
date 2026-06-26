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

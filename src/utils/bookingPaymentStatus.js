export const PAYMENT_STATUS = {
  FREE: "free",
  PAID: "paid",
  UNPAID: "unpaid",
};

export function isFreeBooking(booking) {
  const price = Number(booking?.priceEur ?? booking?.totalPrice ?? 0);
  return price <= 0;
}

export function getPaymentStatus(booking) {
  if (isFreeBooking(booking)) {
    return PAYMENT_STATUS.FREE;
  }
  if (booking?.isPayed) {
    return PAYMENT_STATUS.PAID;
  }
  return PAYMENT_STATUS.UNPAID;
}

export function getPaymentStatusLabel(booking) {
  switch (getPaymentStatus(booking)) {
    case PAYMENT_STATUS.FREE:
      return "Kostenfrei";
    case PAYMENT_STATUS.PAID:
      return "Bezahlt";
    default:
      return "Offen";
  }
}

export function getPaymentStatusColor(booking) {
  switch (getPaymentStatus(booking)) {
    case PAYMENT_STATUS.FREE:
      return "grey lighten-1";
    case PAYMENT_STATUS.PAID:
      return "success";
    default:
      return "grey";
  }
}

export function getPaymentStatusIcon(booking) {
  switch (getPaymentStatus(booking)) {
    case PAYMENT_STATUS.FREE:
      return "mdi-gift";
    case PAYMENT_STATUS.PAID:
      return "mdi-check-circle";
    default:
      return "mdi-clock-outline";
  }
}

export function getPublicPaymentStatusLabel(status, priceEur) {
  if (Number(priceEur ?? 0) <= 0) {
    return "Kostenfrei";
  }
  if (status?.paymentStatus === "paid") {
    return "Bezahlt";
  }
  return "Zahlung ausstehend";
}

export function isBookingFullyComplete(booking) {
  if (!booking?.isCommitted) {
    return false;
  }
  return getPaymentStatus(booking) !== PAYMENT_STATUS.UNPAID;
}

export function getPaymentStatusExportValue(booking) {
  switch (getPaymentStatus(booking)) {
    case PAYMENT_STATUS.FREE:
      return "Kostenfrei";
    case PAYMENT_STATUS.PAID:
      return "Ja";
    default:
      return "Nein";
  }
}

export function getCombinedStatusText(booking) {
  const commitLabel = booking.isCommitted
    ? "Freigegeben"
    : "Nicht freigegeben";
  const paymentLabel = getPaymentStatusLabel(booking);
  return `${commitLabel} / ${paymentLabel}`;
}

export function isCheckoutStatusComplete(booking) {
  if (!booking?.isCommitted) {
    return false;
  }
  return isFreeBooking(booking) || booking.isPayed;
}

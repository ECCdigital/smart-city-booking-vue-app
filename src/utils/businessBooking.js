import i18n from "@/language/index";

/**
 * Private or business booking (`booking.isBusiness`), as the booker answered
 * it at the checkout or the administration set it. A booking without the
 * answer - one from before - reads off the company, the backend's rule:
 * with a company a business booking, without one a private booking. Only a
 * private booking is offered the withdrawal.
 */
export function isBusinessBooking(booking) {
  return typeof booking?.isBusiness === "boolean"
    ? booking.isBusiness
    : String(booking?.company ?? "").trim() !== "";
}

/** „Privat“ or „Geschäftlich“. */
export function bookingKindLabel(booking) {
  return isBusinessBooking(booking)
    ? i18n.t("booking.kind.business")
    : i18n.t("booking.kind.private");
}

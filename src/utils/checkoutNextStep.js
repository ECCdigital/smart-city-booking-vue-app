import {
  BOOKING_STATUS,
  groupBookingStatus,
  isAwaitingPayment,
} from "@/utils/bookingStatus";

/**
 * Where the public checkout goes next, read off `booking.status` (spec E12):
 * to the payment only while a booking awaits one, to the status page for
 * every other state - a requested booking waits for the tenant's release
 * there, a confirmed one is done. Shared by the single and the series
 * checkout.
 */

/**
 * The members of a series the checkout pays for. A mixed series - one member
 * requested, another awaiting payment - pays the ones that await it; the rest
 * are shown on the status page with them.
 */
export function payableBookings(bookings) {
  return (Array.isArray(bookings) ? bookings : []).filter(isAwaitingPayment);
}

/**
 * Whether the checkout goes on to the payment provider once the payment was
 * created for `bookings`: only while every one of them still awaits payment
 * and there is an amount to pay. Otherwise the status page is next.
 */
export function continuesToProvider(bookings) {
  const members = Array.isArray(bookings) ? bookings : [];
  const totalPrice = members.reduce(
    (sum, booking) => sum + (Number(booking?.priceEur) || 0),
    0
  );
  return (
    totalPrice > 0 && groupBookingStatus(members) === BOOKING_STATUS.PAYMENT_DUE
  );
}

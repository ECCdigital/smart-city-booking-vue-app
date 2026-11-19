import i18n from "@/language/index";
import { isFree } from "@/utils/bookingStatus";

/**
 * Whether the legacy checkout has nothing to pay, so its submit button reads
 * „Verbindlich buchen“ instead of „Zahlungspflichtig buchen“
 * (ECCdigital/tickets#937, ECCdigital/tickets#1303). Shared by the quick
 * summary and the group booking summary.
 *
 * Only a certain 0 EUR is free: every item valid (`allItemsValid === true`),
 * every gross price known and their sum 0 EUR, also after a discount. A
 * missing price, an invalid item or one not checked yet asks for payment,
 * since a paid booking must be completed with „Zahlungspflichtig buchen“
 * (§ 312j Abs. 3 BGB).
 *
 * The threshold is the one of `isFree()` (`<= 0`), which also counts a missing
 * price as not free. The prices are never negative, so their sum is exactly 0
 * only when each is, and needs no rounding margin.
 */
export function isFreeCheckout({ allItemsValid, grossPrices }) {
  if (allItemsValid !== true) {
    return false;
  }
  const prices = Array.isArray(grossPrices) ? grossPrices : [];
  if (prices.length === 0 || prices.some((price) => price == null)) {
    return false;
  }
  const total = prices.reduce((sum, price) => sum + Number(price), 0);
  return isFree({ priceEur: total });
}

/** The text of the submit button for {@link isFreeCheckout}'s arguments. */
export function checkoutSubmitLabel(checkout) {
  return isFreeCheckout(checkout)
    ? i18n.t("checkout.commitBookingFree")
    : i18n.t("checkout.commitBooking");
}

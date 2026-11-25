import i18n from "@/language/index";
import { isFree } from "@/utils/bookingStatus";

/**
 * Whether the legacy checkout has nothing to pay, so its submit button reads
 * „Verbindlich buchen“ instead of „Zahlungspflichtig buchen“
 * (ECCdigital/tickets#937, ECCdigital/tickets#1303). Shared by the quick
 * summary and the group booking summary, which hand in their checked items:
 * the quick summary its lead and added items, the group booking summary the
 * items of every date.
 *
 * Only a certain 0 EUR is free: every item checked and valid
 * (`valid === true`), every gross price known and their sum 0 EUR, also after
 * a discount. A missing price, an invalid item or one not checked yet asks for
 * payment, since a paid booking must be completed with „Zahlungspflichtig
 * buchen“ (§ 312j Abs. 3 BGB). The quick summary's `allItemsValid` lets an
 * added item pass unchecked (`valid === null`); here it does not, as its last
 * price may be stale.
 *
 * Nor is a checkout free while a price check is still running
 * (`validating`): the items still hold the result of the last check, which a
 * changed discount, coupon or amount may have overturned.
 *
 * The threshold is the one of `isFree()` (`<= 0`), which also counts a missing
 * price as not free. The prices are never negative, so their sum is exactly 0
 * only when each is, and needs no rounding margin.
 */
export function isFreeCheckout(items, { validating = false } = {}) {
  if (
    validating ||
    items.length === 0 ||
    !items.every(
      (item) => item.valid === true && item.userGrossPriceEur != null
    )
  ) {
    return false;
  }
  const total = items.reduce(
    (sum, item) => sum + Number(item.userGrossPriceEur),
    0
  );
  return isFree({ priceEur: total });
}

/** The text of the submit button, for the arguments of {@link isFreeCheckout}. */
export function checkoutSubmitLabel(items, options) {
  return isFreeCheckout(items, options)
    ? i18n.t("checkout.commitBookingFree")
    : i18n.t("checkout.commitBooking");
}

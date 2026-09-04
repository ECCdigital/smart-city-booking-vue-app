import { describe, expect, it } from "vitest";
import {
  PAYMENT_STATUS,
  getCombinedStatusText,
  getPaymentStatus,
  getPaymentStatusColor,
  getPaymentStatusExportValue,
  getPaymentStatusIcon,
  getPaymentStatusLabel,
  getPaymentStatusTextColor,
  getPublicPaymentStatusLabel,
  isBookingFullyComplete,
  isCheckoutStatusComplete,
  isFreeBooking,
} from "@/utils/bookingPaymentStatus";

/**
 * Characterisation: the whole module derives its answer from the two booking
 * flags `isPayed` and `isCommitted` plus `priceEur`. `booking.status` is not
 * read anywhere. Pinned here before the booking strand moves to the state
 * machine.
 */
describe("isFreeBooking", () => {
  it("is true for a zero or negative price, in string or number form", () => {
    expect(isFreeBooking({ priceEur: 0 })).toBe(true);
    expect(isFreeBooking({ priceEur: "0" })).toBe(true);
    expect(isFreeBooking({ priceEur: -5 })).toBe(true);
  });

  it("is false for a positive price", () => {
    expect(isFreeBooking({ priceEur: 0.01 })).toBe(false);
    expect(isFreeBooking({ priceEur: "12.50" })).toBe(false);
  });

  it("is false when the price is missing", () => {
    expect(isFreeBooking({})).toBe(false);
    expect(isFreeBooking({ priceEur: null })).toBe(false);
    expect(isFreeBooking(undefined)).toBe(false);
  });

  it("is false for an unparsable price, because NaN <= 0 is false", () => {
    expect(isFreeBooking({ priceEur: "free of charge" })).toBe(false);
  });
});

describe("getPaymentStatus", () => {
  it("reports a zero-price booking as free even when it is marked paid", () => {
    expect(getPaymentStatus({ priceEur: 0, isPayed: true })).toBe(
      PAYMENT_STATUS.FREE
    );
    expect(getPaymentStatus({ priceEur: 0, isPayed: false })).toBe(
      PAYMENT_STATUS.FREE
    );
  });

  it("reads `isPayed` for a priced booking", () => {
    expect(getPaymentStatus({ priceEur: 10, isPayed: true })).toBe(
      PAYMENT_STATUS.PAID
    );
    expect(getPaymentStatus({ priceEur: 10, isPayed: false })).toBe(
      PAYMENT_STATUS.UNPAID
    );
  });

  it("reports a booking without a price as unpaid, not free", () => {
    expect(getPaymentStatus({})).toBe(PAYMENT_STATUS.UNPAID);
    expect(getPaymentStatus(undefined)).toBe(PAYMENT_STATUS.UNPAID);
  });

  it("ignores `status`, which the UI does not read today", () => {
    expect(getPaymentStatus({ priceEur: 10, status: "paid" })).toBe(
      PAYMENT_STATUS.UNPAID
    );
  });
});

describe("presentation of the payment status", () => {
  const free = { priceEur: 0 };
  const paid = { priceEur: 10, isPayed: true };
  const unpaid = { priceEur: 10, isPayed: false };

  it("labels the three states in German", () => {
    expect(getPaymentStatusLabel(free)).toBe("Kostenfrei");
    expect(getPaymentStatusLabel(paid)).toBe("Bezahlt");
    expect(getPaymentStatusLabel(unpaid)).toBe("Offen");
  });

  it("colours the three states", () => {
    expect(getPaymentStatusColor(free)).toBe("grey lighten-1");
    expect(getPaymentStatusColor(paid)).toBe("success");
    expect(getPaymentStatusColor(unpaid)).toBe("grey");
  });

  it("uses dark text only for free bookings", () => {
    expect(getPaymentStatusTextColor(free)).toBe("grey darken-3");
    expect(getPaymentStatusTextColor(paid)).toBe("white");
    expect(getPaymentStatusTextColor(unpaid)).toBe("white");
  });

  it("picks an icon per state", () => {
    expect(getPaymentStatusIcon(free)).toBe("mdi-gift");
    expect(getPaymentStatusIcon(paid)).toBe("mdi-check-circle");
    expect(getPaymentStatusIcon(unpaid)).toBe("mdi-clock-outline");
  });

  it("exports free as its own value, not as Ja/Nein", () => {
    expect(getPaymentStatusExportValue(free)).toBe("Kostenfrei");
    expect(getPaymentStatusExportValue(paid)).toBe("Ja");
    expect(getPaymentStatusExportValue(unpaid)).toBe("Nein");
  });
});

describe("getPublicPaymentStatusLabel", () => {
  it("reads a `paymentStatus` string rather than the booking flags", () => {
    expect(getPublicPaymentStatusLabel({ paymentStatus: "paid" }, 10)).toBe(
      "Bezahlt"
    );
    expect(getPublicPaymentStatusLabel({ paymentStatus: "open" }, 10)).toBe(
      "Zahlung ausstehend"
    );
    expect(getPublicPaymentStatusLabel(undefined, 10)).toBe(
      "Zahlung ausstehend"
    );
  });

  it("lets a zero price win over the payment status", () => {
    expect(getPublicPaymentStatusLabel({ paymentStatus: "open" }, 0)).toBe(
      "Kostenfrei"
    );
  });
});

describe("isBookingFullyComplete", () => {
  it("requires a committed booking", () => {
    expect(isBookingFullyComplete({ isCommitted: false, priceEur: 0 })).toBe(
      false
    );
    expect(isBookingFullyComplete(undefined)).toBe(false);
  });

  it("accepts a committed booking that is paid or free", () => {
    expect(
      isBookingFullyComplete({ isCommitted: true, priceEur: 10, isPayed: true })
    ).toBe(true);
    expect(isBookingFullyComplete({ isCommitted: true, priceEur: 0 })).toBe(
      true
    );
  });

  it("rejects a committed but unpaid booking", () => {
    expect(
      isBookingFullyComplete({
        isCommitted: true,
        priceEur: 10,
        isPayed: false,
      })
    ).toBe(false);
  });

  it("ignores `isRejected` - a cancelled booking still counts as complete", () => {
    expect(
      isBookingFullyComplete({
        isCommitted: true,
        priceEur: 0,
        isRejected: true,
      })
    ).toBe(true);
  });

  it("is what `isCheckoutStatusComplete` delegates to", () => {
    const booking = { isCommitted: true, priceEur: 10, isPayed: true };
    expect(isCheckoutStatusComplete(booking)).toBe(
      isBookingFullyComplete(booking)
    );
  });
});

describe("getCombinedStatusText", () => {
  it("joins the commitment flag and the payment label", () => {
    expect(
      getCombinedStatusText({ isCommitted: true, priceEur: 10, isPayed: true })
    ).toBe("Freigegeben / Bezahlt");
    expect(getCombinedStatusText({ isCommitted: false, priceEur: 10 })).toBe(
      "Nicht freigegeben / Offen"
    );
    expect(getCombinedStatusText({ isCommitted: true, priceEur: 0 })).toBe(
      "Freigegeben / Kostenfrei"
    );
  });
});

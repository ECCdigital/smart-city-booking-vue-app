import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import {
  expertOptionShown,
  expertOptionUsed,
} from "@/utils/bookableExpertMode";

// A new bookable as BookableEdit creates it: the stand every option is
// compared with. Pflichtfelder default as the backend's schema does.
const fresh = (overrides = {}) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  }).toPlain();

const shown = (option, { expertMode = false, stored = fresh(), current }) =>
  expertOptionShown(option, {
    expertMode,
    stored,
    current: current || stored,
  });

describe("expertOptionShown", () => {
  it("shows an unused option in expert mode", () => {
    expect(shown("tags", { expertMode: true })).toBe(true);
  });

  it("hides an unused option without expert mode", () => {
    expect(shown("tags", {})).toBe(false);
  });

  it("knows no option by another name", () => {
    expect(() => shown("expert", { expertMode: true })).toThrow(
      "Unknown expert option: expert"
    );
  });
});

/*
 * „Genutzt“ per option, as the spec's table has it (ECCdigital/tickets#339):
 * a bookable that uses it and one with the stand of a new bookable that
 * comes closest, so each case shows what tips it.
 */
const USED = {
  blockPeriod: { isScheduleRelated: false, isBlockPeriodRelated: true },
  week: {
    isScheduleRelated: false,
    isLongRange: true,
    longRangeOptions: { type: "week" },
  },
  month: {
    isScheduleRelated: false,
    isLongRange: true,
    longRangeOptions: { type: "month" },
  },
  tiers: {
    priceCategories: [
      { priceEur: 10, interval: { start: 1, end: 3 }, weekdays: [] },
    ],
  },
  coupons: { enableCoupons: false },
  externalPrices: {
    externalProviders: [{ provider: "ifbs", active: true, handles: [] }],
  },
  leadTime: { isLeadTimeRelated: true },
  buffer: { isBufferRelated: true },
  specialOpeningHours: {
    specialOpeningHours: [{ date: "2026-12-24", startTime: "08:00" }],
  },
  tags: { tags: ["Saal"] },
  bookingDiscounts: {
    bookingDiscounts: {
      users: [],
      roles: [{ roleId: "r1", discountPercent: 50 }],
    },
  },
  accessLocks: {
    accessPointDetails: { active: true, accessPointIds: ["ap1"] },
  },
  checkoutBookables: { checkoutBookableIds: ["b2"] },
  hierarchy: { relatedBookableIds: ["b3"] },
  cancellation: { cancellationPolicy: { userCancellable: false } },
  requiredFields: { requiredFields: ["address", "zipCode", "city", "phone"] },
  customFieldDefinitions: {
    customFieldDefinitions: [{ id: "f1", label: "Anlass" }],
  },
};

const UNUSED = {
  blockPeriod: {},
  week: {
    isScheduleRelated: false,
    isLongRange: true,
    longRangeOptions: { type: "month" },
  },
  month: {
    isScheduleRelated: false,
    isLongRange: true,
    longRangeOptions: { type: "week" },
  },
  tiers: { priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }] },
  coupons: { enableCoupons: undefined },
  externalPrices: {
    externalProviders: [{ provider: "ifbs", active: false, handles: [] }],
  },
  leadTime: { isLeadTimeRelated: false, serviceHours: [] },
  buffer: { isBufferRelated: false, bufferTimeAfterMinutes: null },
  specialOpeningHours: { specialOpeningHours: [] },
  tags: { tags: [] },
  bookingDiscounts: { bookingDiscounts: { users: [], roles: [] } },
  accessLocks: { accessPointDetails: { active: true, accessPointIds: [] } },
  checkoutBookables: { checkoutBookableIds: [] },
  hierarchy: { relatedBookableIds: [] },
  cancellation: { cancellationPolicy: { userCancellable: true } },
  requiredFields: { requiredFields: ["city", "address", "zipCode"] },
  customFieldDefinitions: { customFieldDefinitions: [] },
};

describe("expertOptionShown - used, per option", () => {
  it.each(Object.keys(USED))(
    "%s shows while the stored bookable uses it",
    (option) => {
      expect(
        shown(option, { stored: fresh(USED[option]), current: fresh() })
      ).toBe(true);
    }
  );

  it.each(Object.keys(USED))(
    "%s shows while the bookable as edited uses it",
    (option) => {
      expect(
        shown(option, { stored: fresh(), current: fresh(USED[option]) })
      ).toBe(true);
    }
  );

  it.each(Object.keys(UNUSED))("%s hides while neither uses it", (option) => {
    expect(shown(option, { stored: fresh(UNUSED[option]) })).toBe(false);
  });
});

describe("expertOptionShown - the unit is the whole option", () => {
  it("shows only the expert booking mode in use, not the others", () => {
    const stored = fresh(USED.week);

    expect(shown("week", { stored })).toBe(true);
    expect(shown("month", { stored })).toBe(false);
    expect(shown("blockPeriod", { stored })).toBe(false);
  });

  it("keeps Sonderöffnungszeiten switched on before the first entry", () => {
    const current = fresh({ isSpecialOpeningHoursRelated: true });

    expect(shown("specialOpeningHours", { current })).toBe(true);
  });

  it("reads missing Pflichtfelder as the backend's default", () => {
    const stored = fresh({ requiredFields: undefined });

    expect(shown("requiredFields", { stored })).toBe(false);
  });

  it("asks the bookable as edited alone before one is stored", () => {
    expect(
      expertOptionShown("tags", {
        expertMode: false,
        stored: null,
        current: fresh(USED.tags),
      })
    ).toBe(true);
  });
});

describe("expertOptionUsed", () => {
  it.each(Object.keys(USED))("%s is used as the table says", (option) => {
    expect(expertOptionUsed(option, fresh(USED[option]))).toBe(true);
    expect(expertOptionUsed(option, fresh(UNUSED[option]))).toBe(false);
  });
});

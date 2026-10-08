import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import {
  accessOf,
  applyAccess,
  applyBookingMode,
  applyPriceBasis,
  applyPriceMode,
  editRouteOf,
  isFlowMode,
  isUnlimitedAmount,
  optionalSections,
  priceBasisOf,
  priceExplanation,
  priceModeOf,
  publishVariant,
  timeModeOf,
  usesOpeningHours,
  warnsAboutAmount,
  withPublication,
} from "@/utils/bookableFlow";

const category = (priceEur, overrides = {}) => ({
  priceEur,
  interval: { start: null, end: null },
  fixedPrice: false,
  holidays: [],
  weekdays: [],
  ...overrides,
});

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", ...overrides }).toPlain();

describe("isFlowMode", () => {
  it("creates every new bookable in the flow", () => {
    expect(isFlowMode({ bookableId: undefined, mode: undefined })).toBe(true);
  });

  it("opens an existing bookable in the editor unless the flow is asked for", () => {
    expect(isFlowMode({ bookableId: "b1", mode: undefined })).toBe(false);
    expect(isFlowMode({ bookableId: "b1", mode: "flow" })).toBe(true);
  });
});

describe("editRouteOf", () => {
  it("names the editor route of each type", () => {
    expect(editRouteOf("room")).toBe("room-edit");
    expect(editRouteOf("event-location")).toBe("location-edit");
    expect(editRouteOf("resource")).toBe("resource-edit");
    expect(editRouteOf("ticket")).toBe("ticket-edit");
  });
});

describe("availability", () => {
  it("reads the long range as one answer and the rest as the editor names it", () => {
    expect(timeModeOf(bookable({ isScheduleRelated: true }))).toBe("schedule");
    expect(
      timeModeOf(
        bookable({
          isScheduleRelated: false,
          isLongRange: true,
          longRangeOptions: { type: "month" },
        })
      )
    ).toBe("longRange");
    expect(timeModeOf(bookable({ isScheduleRelated: false }))).toBe(
      "independent"
    );
  });

  it("sets one booking mode at a time, the long range with its unit", () => {
    const next = applyBookingMode(
      bookable({ isScheduleRelated: true }),
      "week"
    );

    expect(next.isScheduleRelated).toBe(false);
    expect(next.isLongRange).toBe(true);
    expect(next.longRangeOptions).toEqual({ type: "week" });

    applyBookingMode(next, "timePeriod");
    expect(next.isLongRange).toBe(false);
    expect(next.longRangeOptions).toEqual({});
    expect(next.isTimePeriodRelated).toBe(true);
  });

  it("turns off the group booking for time ranges, as the booking type tab does", () => {
    const next = applyBookingMode(
      bookable({ groupBooking: { enabled: true, permittedRoles: [] } }),
      "blockPeriod"
    );

    expect(next.isBlockPeriodRelated).toBe(true);
    expect(next.groupBooking.enabled).toBe(false);
  });

  it("offers opening hours where a time is picked within a day", () => {
    expect(usesOpeningHours(bookable({ isScheduleRelated: true }))).toBe(true);
    expect(
      usesOpeningHours(
        bookable({ isScheduleRelated: false, isTimePeriodRelated: true })
      )
    ).toBe(true);
    expect(
      usesOpeningHours(
        bookable({ isScheduleRelated: false, isBlockPeriodRelated: true })
      )
    ).toBe(false);
  });
});

describe("price", () => {
  it("reads free, simple and tiers from the categories", () => {
    expect(priceModeOf(bookable())).toBe("free");
    expect(priceModeOf(bookable({ priceCategories: [category(12)] }))).toBe(
      "simple"
    );
    expect(
      priceModeOf(bookable({ priceCategories: [category(12), category(8)] }))
    ).toBe("tiers");
    expect(
      priceModeOf(
        bookable({ priceCategories: [category(0, { weekdays: [6, 0] })] })
      )
    ).toBe("tiers");
  });

  it("suggests the unit from the availability when a price is first set", () => {
    const hourly = applyPriceMode(
      bookable({ isScheduleRelated: true, priceType: "per-item" }),
      "simple"
    );
    expect(hourly.priceType).toBe("per-hour");

    const monthly = applyPriceMode(
      bookable({
        isScheduleRelated: false,
        isLongRange: true,
        longRangeOptions: { type: "month" },
      }),
      "simple"
    );
    expect(monthly.priceType).toBe("per-day");

    const untimed = applyPriceMode(
      bookable({ isScheduleRelated: false, priceType: "per-hour" }),
      "simple"
    );
    expect(untimed.priceType).toBe("per-item");
  });

  it("keeps the unit when the price was set before", () => {
    const next = applyPriceMode(
      bookable({ priceType: "per-day", priceCategories: [category(30)] }),
      "simple"
    );
    expect(next.priceType).toBe("per-day");
    expect(next.priceCategories).toEqual([category(30)]);
  });

  it("makes everything free with a single category at 0 €", () => {
    const next = applyPriceMode(
      bookable({ priceCategories: [category(12), category(8)] }),
      "free"
    );
    expect(next.priceCategories).toEqual([category(0)]);
  });

  it("collapses tiers to the first category for a simple price", () => {
    const next = applyPriceMode(
      bookable({
        priceCategories: [
          category(12, { interval: { start: 0, end: 2 } }),
          category(8),
        ],
      }),
      "simple"
    );
    expect(next.priceCategories).toEqual([category(12)]);
  });

  it("counts started days in full for a simple daily price", () => {
    const next = applyPriceBasis(
      bookable({ priceType: "per-hour", priceCategories: [category(30)] }),
      "per-day"
    );
    expect(next.priceType).toBe("per-day");
    expect(next.priceCategories[0].fixedPrice).toBe(true);

    applyPriceBasis(next, "fixed");
    expect(next.priceType).toBe("per-item");
    expect(next.priceCategories[0].fixedPrice).toBe(false);
  });

  it("keeps m² as the fixed price's unit", () => {
    const next = applyPriceBasis(
      bookable({ priceType: "per-square-meter" }),
      "fixed"
    );
    expect(next.priceType).toBe("per-square-meter");
    expect(priceBasisOf(next)).toBe("fixed");
  });

  it("explains a price by an example booking", () => {
    expect(priceExplanation(bookable()).key).toBe("none");
    expect(
      priceExplanation(
        bookable({ priceType: "per-hour", priceCategories: [category(10)] })
      )
    ).toEqual({ key: "per-hour", amounts: { total: 25 } });
    expect(
      priceExplanation(
        bookable({
          priceType: "per-day",
          priceCategories: [category(20, { fixedPrice: true })],
        })
      )
    ).toEqual({ key: "per-day-full", amounts: { total: 60 } });
    expect(
      priceExplanation(
        bookable({
          priceType: "per-day",
          isScheduleRelated: false,
          isLongRange: true,
          longRangeOptions: { type: "month" },
          priceCategories: [category(10)],
        })
      )
    ).toEqual({ key: "month", amounts: { low: 280, high: 310 } });
    expect(
      priceExplanation(
        bookable({
          priceType: "per-item",
          amount: 1,
          priceCategories: [category(5)],
        })
      )
    ).toEqual({ key: "per-item", amounts: { price: 5 } });
    expect(
      priceExplanation(
        bookable({
          priceType: "per-item",
          amount: 10,
          priceCategories: [category(5)],
        })
      )
    ).toEqual({ key: "per-items", amounts: { total: 15 } });
  });
});

describe("amount", () => {
  it("reads an empty or zero amount as unlimited", () => {
    expect(isUnlimitedAmount(bookable({ amount: null }))).toBe(true);
    expect(isUnlimitedAmount(bookable({ amount: 0 }))).toBe(true);
    expect(isUnlimitedAmount(bookable({ amount: 2 }))).toBe(false);
  });

  it("questions more than one unit of a room or venue only", () => {
    expect(warnsAboutAmount(bookable({ type: "room", amount: 2 }))).toBe(true);
    expect(
      warnsAboutAmount(bookable({ type: "event-location", amount: 3 }))
    ).toBe(true);
    expect(warnsAboutAmount(bookable({ type: "room", amount: 1 }))).toBe(false);
    expect(warnsAboutAmount(bookable({ type: "resource", amount: 5 }))).toBe(
      false
    );
  });
});

describe("access", () => {
  it("reads named roles or people before the login requirement", () => {
    expect(accessOf(bookable())).toBe("everyone");
    expect(accessOf(bookable({ requiresLogin: true }))).toBe("signedIn");
    expect(
      accessOf(bookable({ requiresLogin: false, permittedRoles: ["r1"] }))
    ).toBe("selected");
  });

  it("needs an account beyond „Jeder“ and drops the lists outside a selection", () => {
    const everyone = applyAccess(
      bookable({ requiresLogin: true, permittedUsers: ["u1"] }),
      "everyone"
    );
    expect(everyone.requiresLogin).toBe(false);
    expect(everyone.permittedUsers).toEqual([]);

    const selected = applyAccess(
      bookable({ permittedRoles: ["r1"] }),
      "selected"
    );
    expect(selected.requiresLogin).toBe(true);
    expect(selected.permittedRoles).toEqual(["r1"]);
  });
});

describe("closing", () => {
  it("words the action by supervision level and reads an unknown one as free", () => {
    expect(publishVariant("supervised")).toBe("supervised");
    expect(publishVariant("pending")).toBe("pending");
    expect(publishVariant(null)).toBe("free");
    expect(publishVariant("whatever")).toBe("free");
  });

  it("stores the publication wish only when publishing", () => {
    const draft = bookable({ isPublic: false, isBookable: false });

    expect(withPublication(draft, true)).toMatchObject({
      isPublic: true,
      isBookable: true,
    });
    expect(withPublication(draft, false)).toBe(draft);
  });
});

describe("optionalSections", () => {
  it("links every optional section in expert mode", () => {
    expect(
      optionalSections({ bookable: bookable(), expertMode: true }).map(
        (section) => section.key
      )
    ).toEqual([
      "required-fields",
      "attachments",
      "notes",
      "checkout",
      "hierarchy",
      "group-booking",
      "cancellation",
    ]);
  });

  it("links only what the simple editor offers", () => {
    expect(
      optionalSections({ bookable: bookable(), expertMode: false }).map(
        (section) => section.key
      )
    ).toEqual(["attachments", "notes", "group-booking"]);
  });

  it("points each link at its tab and section", () => {
    const [requiredFields, attachments] = optionalSections({
      bookable: bookable(),
      expertMode: true,
    });

    expect(requiredFields).toEqual({
      key: "required-fields",
      tabKey: "additional",
      sectionId: "additional-required-fields",
    });
    expect(attachments).toEqual({
      key: "attachments",
      tabKey: "attachments",
      sectionId: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import i18n from "@/language/index";
import {
  accessOf,
  applyAccess,
  applyBookingMode,
  applyPriceBasis,
  applyPriceMode,
  editRouteOf,
  isFlowMode,
  listRouteOf,
  isUnlimitedAmount,
  optionalSections,
  overviewBlocks,
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

describe("listRouteOf", () => {
  it("names the list route of each type, rooms for an unknown one", () => {
    expect(listRouteOf("room")).toBe("rooms");
    expect(listRouteOf("event-location")).toBe("event-locations");
    expect(listRouteOf("resource")).toBe("resources");
    expect(listRouteOf("ticket")).toBe("tickets");
    expect(listRouteOf("other")).toBe("rooms");
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

  it("sets Freie Zeitwahl first for „Für eine Zeit“", () => {
    const next = applyBookingMode(
      bookable({ isScheduleRelated: false }),
      "timed"
    );

    expect(next.isScheduleRelated).toBe(true);
    expect(next.isLongRange).toBe(false);
  });

  it("sets Ganze Wochen first for „Langzeit“, Ganze Monate where only they are offered", () => {
    expect(
      applyBookingMode(bookable({ isScheduleRelated: true }), "longRange")
        .longRangeOptions
    ).toEqual({ type: "week" });
    expect(
      applyBookingMode(bookable({ isScheduleRelated: true }), "longRange", [
        "month",
      ]).longRangeOptions
    ).toEqual({ type: "month" });
  });

  it("keeps what belongs to the other booking modes", () => {
    const periods = [{ weekdays: [1], startTime: "09:00", endTime: "12:00" }];
    const blocks = [{ id: "b1", label: "Wochenende" }];
    const next = applyBookingMode(
      bookable({
        isTimePeriodRelated: true,
        timePeriods: periods,
        blockPeriods: blocks,
        minBookingDuration: 2,
      }),
      "independent"
    );

    expect(next.timePeriods).toEqual(periods);
    expect(next.blockPeriods).toEqual(blocks);
    expect(next.minBookingDuration).toBe(2);
    expect(next.isTimePeriodRelated).toBe(false);
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
  const keys = (shown) =>
    optionalSections({ bookable: bookable(), shown }).map(
      (section) => section.key
    );

  it("links every optional section while every expert option shows", () => {
    expect(keys(() => true)).toEqual([
      "required-fields",
      "attachments",
      "notes",
      "checkout",
      "hierarchy",
      "group-booking",
      "cancellation",
    ]);
  });

  it("leaves out the expert options that do not show", () => {
    expect(keys(() => false)).toEqual([
      "attachments",
      "notes",
      "group-booking",
    ]);
  });

  it("links an expert option that shows, without the rest of its tab", () => {
    expect(keys((option) => option === "hierarchy")).toEqual([
      "attachments",
      "notes",
      "hierarchy",
      "group-booking",
    ]);
  });

  it("points each link at its tab and section", () => {
    const [requiredFields, attachments] = optionalSections({
      bookable: bookable(),
      shown: () => true,
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

describe("overview", () => {
  // A block as the overview shows it: label and value in German, „–“ empty.
  // The parts of a value read joined by commas.
  const partText = (part) => {
    if (part.type === "text") return part.text;
    if (part.type === "plural") return i18n.tc(part.key, part.count);
    return i18n.t(part.key, part.params);
  };
  const valueText = (parts) =>
    parts.length ? parts.map(partText).join(", ") : "–";
  const shown = ({ rows }) =>
    rows.map(({ label, value }) => [i18n.t(label), valueText(value)]);
  const blockOf = (step, item, options = {}) =>
    overviewBlocks(item, { visited: [step], ...options }).find(
      (block) => block.step === step
    );

  it("gives one block per step, open until the step was visited", () => {
    const blocks = overviewBlocks(bookable({ title: "Saal" }), {
      visited: ["identity"],
    });

    expect(blocks.map(({ step, open }) => [step, open])).toEqual([
      ["identity", false],
      ["availability", true],
      ["price", true],
      ["amount", true],
      ["permission", true],
      ["approval", true],
    ]);
    expect(blocks[1].rows).toEqual([]);
  });

  it("shows a value left empty as „–“", () => {
    expect(shown(blockOf("identity", bookable({ type: "room" })))).toEqual([
      ["Titel", "–"],
      ["Typ", "Raum"],
      ["Bild", "keins"],
      ["Standort", "–"],
      ["Merkmale", "–"],
    ]);
  });

  it("names the identity as the step sets it, the image as present", () => {
    const item = bookable({
      title: " Großer Saal ",
      type: "event-location",
      images: [{ id: "m1" }],
      location: { display_address: "Markt 1, Rostock", lat: 1, lng: 2 },
      flags: ["WLAN", "Beamer", "Bühne", "Küche", "Garderobe", "Parkplatz"],
    });

    expect(shown(blockOf("identity", item))).toEqual([
      ["Titel", "Großer Saal"],
      ["Typ", "Veranstaltungsort"],
      ["Bild", "vorhanden"],
      ["Standort", "Markt 1, Rostock"],
      ["Merkmale", "WLAN, Beamer, Bühne, Küche +2"],
    ]);
    expect(
      shown(blockOf("identity", bookable({ imgUrl: "https://x/y.png" })))
    ).toContainEqual(["Bild", "vorhanden"]);
  });

  it("names the event of a ticket only, by its title or else its id", () => {
    const ticket = bookable({ type: "ticket", eventId: "e1" });

    expect(
      shown(
        blockOf("identity", ticket, { eventTitlesById: { e1: "Sommerfest" } })
      )
    ).toContainEqual(["Veranstaltung", "Sommerfest"]);
    expect(shown(blockOf("identity", ticket))).toContainEqual([
      "Veranstaltung",
      "e1",
    ]);
    expect(
      shown(blockOf("identity", bookable({ type: "ticket" })))
    ).toContainEqual(["Veranstaltung", "–"]);
    expect(
      shown(blockOf("identity", bookable({ type: "room", eventId: "e1" }))).map(
        ([label]) => label
      )
    ).not.toContain("Veranstaltung");
  });

  it("names a free price „Kostenfrei“, without VAT or coupons", () => {
    expect(shown(blockOf("price", bookable()))).toEqual([
      ["Preis", "Kostenfrei"],
    ]);
  });

  it("names a simple price with its unit, the VAT rate and coupons", () => {
    const item = bookable({
      priceCategories: [category(25)],
      priceType: "per-hour",
      priceValueAddedTax: 19,
      enableCoupons: true,
    });

    expect(shown(blockOf("price", item))).toEqual([
      ["Preis", "25,00 €/h"],
      ["Mehrwertsteuer", "19 %"],
      ["Gutscheine", "ja"],
    ]);
  });

  it("names a price without VAT „ohne“ and coupons off „nein“", () => {
    const item = bookable({
      priceCategories: [category("12,5")],
      priceType: "per-item",
      priceValueAddedTax: 0,
      enableCoupons: false,
    });

    expect(shown(blockOf("price", item))).toEqual([
      ["Preis", "12,50 €/Stk."],
      ["Mehrwertsteuer", "ohne"],
      ["Gutscheine", "nein"],
    ]);
  });

  it("names a fixed price that holds once per booking as the step does", () => {
    const item = bookable({
      priceCategories: [category(25, { fixedPrice: true })],
      priceType: "per-item",
      amount: 10,
    });

    expect(shown(blockOf("price", item))[0]).toEqual([
      "Preis",
      "25,00 € für die ganze Buchung",
    ]);
  });

  it("counts the tiers instead of naming an amount", () => {
    const tiers = (categories) =>
      shown(blockOf("price", bookable({ priceCategories: categories })))[0];
    const weekend = category(30, { weekdays: [0, 6] });

    expect(tiers([category(10), category(20), weekend])).toEqual([
      "Preis",
      "3 Tarife",
    ]);
    expect(tiers([weekend])).toEqual(["Preis", "1 Tarif"]);
  });

  it("says „extern gesteuert“ when a provider handles the prices", () => {
    const item = bookable({
      priceCategories: [category(25)],
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["pricing"] },
      ],
    });

    expect(shown(blockOf("price", item))).toEqual([
      ["Preis", "extern gesteuert"],
    ]);
  });

  it("names the amount or „Unbegrenzt“", () => {
    expect(shown(blockOf("amount", bookable({ amount: 3 })))).toEqual([
      ["Anzahl", "3"],
    ]);
    expect(shown(blockOf("amount", bookable({ amount: null })))).toEqual([
      ["Anzahl", "Unbegrenzt"],
    ]);
  });

  it("names who may book as the step does", () => {
    const accessShown = (access) =>
      shown(blockOf("permission", applyAccess(bookable(), access)));

    expect(accessShown("everyone")).toEqual([["Zugang", "Jeder"]]);
    expect(accessShown("signedIn")).toEqual([["Zugang", "Angemeldete Nutzer"]]);
  });

  it("counts the roles and persons chosen", () => {
    const counted = (permittedRoles, permittedUsers) =>
      shown(
        blockOf(
          "permission",
          bookable({ requiresLogin: true, permittedRoles, permittedUsers })
        )
      );

    expect(counted(["r1", "r2"], ["u1"])).toEqual([
      ["Zugang", "2 Rollen, 1 Person"],
    ]);
    expect(counted(["r1"], [])).toEqual([["Zugang", "1 Rolle"]]);
    expect(counted([], ["u1", "u2", "u3"])).toEqual([["Zugang", "3 Personen"]]);
  });

  it("reads selected access with nobody named yet as signed-in users", () => {
    const item = applyAccess(bookable(), "selected");

    expect(shown(blockOf("permission", item))).toEqual([
      ["Zugang", "Angemeldete Nutzer"],
    ]);
  });

  it("says whether bookings are confirmed automatically or reviewed", () => {
    expect(
      shown(blockOf("approval", bookable({ autoCommitBooking: true })))
    ).toEqual([["Buchungen", "automatisch bestätigt"]]);
    expect(
      shown(blockOf("approval", bookable({ autoCommitBooking: false })))
    ).toEqual([["Buchungen", "wird geprüft"]]);
  });

  it("names the Buchungsart with the names of its questions", () => {
    const typeOf = (mode) => {
      const item = applyBookingMode(bookable(), mode);
      return shown(blockOf("availability", item));
    };

    expect(typeOf("schedule")).toEqual([["Buchungsart", "Freie Zeitwahl"]]);
    expect(typeOf("timePeriod")).toEqual([
      ["Buchungsart", "Feste Zeitfenster"],
    ]);
    expect(typeOf("blockPeriod")).toEqual([["Buchungsart", "Zeiträume"]]);
    expect(typeOf("week")).toEqual([["Buchungsart", "Ganze Wochen"]]);
    expect(typeOf("month")).toEqual([["Buchungsart", "Ganze Monate"]]);
    expect(typeOf("independent")).toEqual([["Buchungsart", "Ohne Zeit"]]);
  });

  it("says „extern gesteuert“ when a provider handles the availability", () => {
    const item = bookable({
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["availability"] },
      ],
    });

    expect(shown(blockOf("availability", item))).toEqual([
      ["Buchungsart", "extern gesteuert"],
    ]);
  });
});

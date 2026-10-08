import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import i18n from "@/language/index";
import {
  accessOf,
  applyAccess,
  applyPermitted,
  applyBookingMode,
  applyPriceMode,
  applyPriceType,
  FLOW_STEPS,
  editRouteOf,
  isFlowMode,
  listRouteOf,
  isUnlimitedAmount,
  isUnlimitedMaxAmount,
  overviewBlocks,
  priceExplanation,
  priceModeOf,
  publishVariant,
  showsMaxAmount,
  timeModeOf,
  usesOpeningHours,
  warnsAboutAmount,
} from "@/utils/bookableFlow";
import { expertOptionShown } from "@/utils/bookableExpertMode";

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

  it("sets the fixed price of every category to the new Preisart's default", () => {
    const tiers = [
      category(30, { fixedPrice: true, interval: { start: null, end: 2 } }),
      category(20, { fixedPrice: false, interval: { start: 2, end: null } }),
    ];

    const daily = applyPriceType(
      bookable({ priceType: "per-hour", priceCategories: tiers }),
      "per-day"
    );
    expect(daily.priceType).toBe("per-day");
    expect(daily.priceCategories.map((c) => c.fixedPrice)).toEqual([
      true,
      true,
    ]);

    for (const type of ["per-hour", "per-item", "per-square-meter"]) {
      const next = applyPriceType(
        bookable({ priceType: "per-day", priceCategories: tiers }),
        type
      );
      expect(next.priceType).toBe(type);
      expect(next.priceCategories.map((c) => c.fixedPrice)).toEqual([
        false,
        false,
      ]);
    }
  });

  it("keeps the fixed price while the Preisart stays", () => {
    const next = applyPriceType(
      bookable({
        priceType: "per-hour",
        priceCategories: [category(30, { fixedPrice: true })],
      }),
      "per-hour"
    );
    expect(next.priceCategories[0].fixedPrice).toBe(true);
  });

  it("takes the suggested Preisart's fixed price when leaving free", () => {
    const longRange = applyPriceMode(
      bookable({
        isScheduleRelated: false,
        isLongRange: true,
        longRangeOptions: { type: "week" },
        priceType: "per-day",
      }),
      "simple"
    );
    expect(longRange.priceCategories[0].fixedPrice).toBe(true);

    const hourly = applyPriceMode(
      bookable({
        isScheduleRelated: true,
        priceType: "per-day",
        priceCategories: [category(0, { fixedPrice: true })],
      }),
      "tiers"
    );
    expect(hourly.priceType).toBe("per-hour");
    expect(hourly.priceCategories[0].fixedPrice).toBe(false);
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
    // Tagespauschale: once per touched calendar day, as for a day price.
    expect(
      priceExplanation(
        bookable({
          priceType: "per-hour",
          priceCategories: [category(20, { fixedPrice: true })],
        })
      )
    ).toEqual({ key: "per-hour-daily", amounts: { total: 60 } });
    expect(
      priceExplanation(
        bookable({
          priceType: "per-square-meter",
          priceCategories: [category(4, { fixedPrice: true })],
        })
      )
    ).toEqual({ key: "once", amounts: { price: 4 } });
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

  it("reads only an empty Höchstmenge as unlimited, 0 being a limit the backend refuses", () => {
    expect(isUnlimitedMaxAmount(bookable({ maxAmountPerBooking: null }))).toBe(
      true
    );
    expect(isUnlimitedMaxAmount(bookable({ maxAmountPerBooking: "" }))).toBe(
      true
    );
    expect(isUnlimitedMaxAmount(bookable({ maxAmountPerBooking: 0 }))).toBe(
      false
    );
    expect(isUnlimitedMaxAmount(bookable({ maxAmountPerBooking: 2 }))).toBe(
      false
    );
  });

  it("offers the Höchstmenge unless the Anzahl is 1 and none is set", () => {
    const shows = (amount, maxAmountPerBooking = null) =>
      showsMaxAmount(bookable({ amount, maxAmountPerBooking }));

    expect(shows(1)).toBe(false);
    expect(shows("1")).toBe(false);
    expect(shows(3)).toBe(true);
    expect(shows(null)).toBe(true);
    expect(shows(0)).toBe(true);
    expect(shows(1, 2)).toBe(true);
    expect(shows(1, 0)).toBe(true);
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

  it("keeps the account but drops the lists for „Alle mit Konto“", () => {
    const signedIn = applyAccess(
      bookable({ permittedRoles: ["r1"], permittedUsers: ["u1"] }),
      "signedIn"
    );

    expect(signedIn).toMatchObject({
      requiresLogin: true,
      permittedRoles: [],
      permittedUsers: [],
    });
  });

  it("reads lists without the login requirement as „Nur ausgewählte“", () => {
    expect(
      accessOf(bookable({ requiresLogin: false, permittedUsers: ["u1"] }))
    ).toBe("selected");
  });
});

describe("permitted roles and people", () => {
  it("sets the login requirement with a role or person named", () => {
    const named = applyPermitted(bookable({ requiresLogin: false }), {
      permittedRoles: ["r1"],
    });

    expect(named).toMatchObject({
      requiresLogin: true,
      permittedRoles: ["r1"],
      permittedUsers: [],
    });
  });

  it("leaves the login requirement once nobody is named any more", () => {
    const emptied = applyPermitted(
      bookable({ requiresLogin: true, permittedUsers: ["u1"] }),
      { permittedUsers: [] }
    );

    expect(emptied.requiresLogin).toBe(true);
    expect(emptied.permittedUsers).toEqual([]);
  });
});

describe("closing", () => {
  it("words the confirmation by supervision level and reads an unknown one as free", () => {
    expect(publishVariant("supervised")).toBe("supervised");
    expect(publishVariant("pending")).toBe("pending");
    expect(publishVariant(null)).toBe("free");
    expect(publishVariant("whatever")).toBe("free");
  });
});

describe("FLOW_STEPS", () => {
  // Weitere Einstellungen comes right after Bestätigung (ECCdigital/
  // tickets#363), the publication last (#362).
  it("runs from the identity over „Weitere Einstellungen“ to the publication", () => {
    expect(FLOW_STEPS).toEqual([
      "identity",
      "availability",
      "price",
      "amount",
      "permission",
      "approval",
      "more",
      "publication",
    ]);
  });
});

// A row as the overview shows it: the parts of a value read joined by
// commas, none as „Nicht festgelegt“; a param may be a part itself.
const partText = (part) => {
  if (part.type === "text") return part.text;
  if (part.type === "plural") return i18n.tc(part.key, part.count);
  const params = Object.fromEntries(
    Object.entries(part.params || {}).map(([name, param]) => [
      name,
      param && param.type ? partText(param) : param,
    ])
  );
  return i18n.t(part.key, params);
};
const valueText = (parts) =>
  parts.length ? parts.map(partText).join(", ") : "Nicht festgelegt";

describe("overview", () => {
  const shown = ({ rows }) =>
    rows.map(({ label, value }) => [label && i18n.t(label), valueText(value)]);
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
      ["more", true],
      ["publication", true],
    ]);
    expect(blocks[1].rows).toEqual([]);
  });

  it("shows a value left empty as „Nicht festgelegt“", () => {
    expect(shown(blockOf("identity", bookable({ type: "room" })))).toEqual([
      ["Titel", "Nicht festgelegt"],
      ["Merkmale", "Nicht festgelegt"],
      ["Bilder", "Nicht festgelegt"],
      ["Standort", "Nicht festgelegt"],
      ["Typ", "Raum"],
      ["Interne Tags", "Nicht festgelegt"],
    ]);
  });

  it("names the identity as the step sets it, the images counted", () => {
    const item = bookable({
      title: " Großer Saal ",
      type: "event-location",
      images: [{ id: "m1" }],
      location: { display_address: "Markt 1, Rostock", lat: 1, lng: 2 },
      flags: ["WLAN", "Beamer", "Bühne", "Küche", "Garderobe", "Parkplatz"],
      tags: ["intern"],
    });

    expect(shown(blockOf("identity", item))).toEqual([
      ["Titel", "Großer Saal"],
      ["Merkmale", "WLAN, Beamer, Bühne, Küche +2"],
      ["Bilder", "1 Bild"],
      ["Standort", "Markt 1, Rostock"],
      ["Typ", "Veranstaltungsort"],
      ["Interne Tags", "intern"],
    ]);
    expect(
      shown(blockOf("identity", bookable({ imgUrl: "https://x/y.png" })))
    ).toContainEqual(["Bilder", "1 Bild"]);
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
    ).toContainEqual(["Veranstaltung", "Nicht festgelegt"]);
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
      ["Rabattcodes", "ja"],
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
      ["Rabattcodes", "nein"],
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

  it("names an hour price with fixedPrice as „Tagespauschale“", () => {
    const item = bookable({
      priceCategories: [category(25, { fixedPrice: true })],
      priceType: "per-hour",
    });

    expect(shown(blockOf("price", item))[0]).toEqual([
      "Preis",
      "25,00 € Tagespauschale",
    ]);
  });

  it("names a coupon setting never stored as switched on", () => {
    const item = bookable({ priceCategories: [category(25)] });
    delete item.enableCoupons;

    expect(shown(blockOf("price", item))[2]).toEqual(["Rabattcodes", "ja"]);
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
      ["Anzahl / Kapazität", "3"],
      ["Höchstmenge je Buchung", "Unbegrenzt"],
    ]);
    expect(shown(blockOf("amount", bookable({ amount: null })))).toEqual([
      ["Anzahl / Kapazität", "Unbegrenzt"],
      ["Höchstmenge je Buchung", "Unbegrenzt"],
    ]);
  });

  it("says „extern gesteuert“ when a provider handles the amount", () => {
    const item = bookable({
      amount: 3,
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["maxAmount"] },
      ],
    });

    expect(shown(blockOf("amount", item))[0]).toEqual([
      "Anzahl / Kapazität",
      "extern gesteuert",
    ]);
  });

  it("names the Höchstmenge where the step asks for it", () => {
    const rows = (amount, maxAmountPerBooking) =>
      shown(blockOf("amount", bookable({ amount, maxAmountPerBooking })));

    expect(rows(10, 2)).toEqual([
      ["Anzahl / Kapazität", "10"],
      ["Höchstmenge je Buchung", "2"],
    ]);
    expect(rows(1, null)).toEqual([["Anzahl / Kapazität", "1"]]);
  });

  it("names who may book as the step does", () => {
    const accessShown = (access) =>
      shown(blockOf("permission", applyAccess(bookable(), access)));

    expect(accessShown("everyone")[0]).toEqual(["Wer darf buchen?", "Alle"]);
    expect(accessShown("signedIn")[0]).toEqual([
      "Wer darf buchen?",
      "Alle mit Konto",
    ]);
  });

  it("counts the roles and persons chosen", () => {
    const counted = (permittedRoles, permittedUsers) =>
      shown(
        blockOf(
          "permission",
          bookable({ requiresLogin: true, permittedRoles, permittedUsers })
        )
      )[0];

    expect(counted(["r1", "r2"], ["u1"])).toEqual([
      "Wer darf buchen?",
      "2 Rollen, 1 Person",
    ]);
    expect(counted(["r1"], [])).toEqual(["Wer darf buchen?", "1 Rolle"]);
    expect(counted([], ["u1", "u2", "u3"])).toEqual([
      "Wer darf buchen?",
      "3 Personen",
    ]);
  });

  it("reads selected access with nobody named yet as signed-in users", () => {
    const item = applyAccess(bookable(), "selected");

    expect(shown(blockOf("permission", item))[0]).toEqual([
      "Wer darf buchen?",
      "Alle mit Konto",
    ]);
  });

  it("names the Bestätigung with the words of its tiles", () => {
    expect(
      shown(blockOf("approval", bookable({ autoCommitBooking: true })))
    ).toEqual([["Bestätigung", "Automatisch"]]);
    expect(
      shown(blockOf("approval", bookable({ autoCommitBooking: false })))
    ).toEqual([["Bestätigung", "Manuell bestätigen"]]);
  });

  it("names both switches of the publication with the field's words", () => {
    expect(
      shown(
        blockOf("publication", bookable({ isBookable: true, isPublic: false }))
      )
    ).toEqual([
      ["Buchbar", "ja"],
      ["Im Katalog listen", "nein"],
    ]);
    expect(
      shown(
        blockOf("publication", bookable({ isBookable: false, isPublic: true }))
      )
    ).toEqual([
      ["Buchbar", "nein"],
      ["Im Katalog listen", "ja"],
    ]);
  });

  it("names the Buchungsart with the names of its questions", () => {
    const typeOf = (mode) => {
      const item = applyBookingMode(bookable(), mode);
      return shown(blockOf("availability", item))[0];
    };

    expect(typeOf("schedule")).toEqual(["Buchungsart", "Freie Zeitwahl"]);
    expect(typeOf("timePeriod")).toEqual(["Buchungsart", "Feste Zeitfenster"]);
    expect(typeOf("blockPeriod")).toEqual(["Buchungsart", "Zeiträume"]);
    expect(typeOf("week")).toEqual(["Buchungsart", "Ganze Wochen"]);
    expect(typeOf("month")).toEqual(["Buchungsart", "Ganze Monate"]);
    expect(typeOf("independent")).toEqual(["Buchungsart", "Ohne Zeit"]);
  });

  it("says „extern gesteuert“ when a provider handles the availability", () => {
    const item = bookable({
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["availability"] },
      ],
    });

    const rows = shown(blockOf("availability", item));
    expect(rows[0]).toEqual(["Buchungsart", "extern gesteuert"]);
    // The sections of a mode do not show; the opening hours keep their tab.
    expect(rows.map(([label]) => label)).toEqual([
      "Buchungsart",
      "Öffnungszeiten",
      "Sonderöffnungszeiten",
    ]);
  });

  it("lists the areas in use under „Weitere Einstellungen“, with their summary", () => {
    const item = bookable({
      requiredFields: ["address", "zipCode", "city"],
      checkoutBookableIds: ["b2", "b3"],
      groupBooking: { enabled: true, permittedRoles: [] },
    });

    expect(shown(blockOf("more", item))).toEqual([
      ["Zusatzobjekte", "2 Zusatzobjekte"],
      ["Serienbuchung", "Erlaubt"],
    ]);
  });

  it("says „Nicht festgelegt“ alone while no area is in use", () => {
    const item = bookable({ requiredFields: ["address", "zipCode", "city"] });

    expect(shown(blockOf("more", item))).toEqual([[null, "Nicht festgelegt"]]);
  });
});

describe("overview: the way to each field", () => {
  const rowsOf = (item, options = {}) =>
    overviewBlocks(item, options).flatMap(({ rows }) => rows);
  const rowOf = (item, key, options) =>
    rowsOf(item, options).find((row) => row.key === key);

  it("leads every row to its field: the tab and section, the step", () => {
    const item = bookable({ title: "Saal", type: "room" });

    expect(rowOf(item, "title").target).toEqual({
      step: "identity",
      tab: "general",
      section: "general-catalog",
      field: "title",
      area: null,
    });
    expect(rowOf(item, "price").target).toEqual({
      step: "price",
      tab: "pricing",
      section: "pricing-price",
      field: "price",
      area: null,
    });
    expect(rowOf(item, "confirmation").target).toEqual({
      step: "approval",
      tab: "permissions",
      section: "permissions-confirmation",
      field: "confirmation",
      area: null,
    });
  });

  it("leads a row of the Veröffentlichung to the status band: no tab", () => {
    expect(rowOf(bookable(), "isPublic").target).toEqual({
      step: "publication",
      tab: null,
      section: null,
      field: "isPublic",
      area: null,
    });
  });

  it("leads a heading to the first row of its block, also while open", () => {
    const blocks = overviewBlocks(bookable({ title: "Saal" }), {
      visited: ["identity"],
    });
    const price = blocks.find(({ step }) => step === "price");

    expect(price.open).toBe(true);
    expect(price.target).toEqual({
      step: "price",
      tab: "pricing",
      section: "pricing-price",
      field: "price",
      area: null,
    });
  });

  it("leads an area of Weitere Einstellungen to its card and its row", () => {
    const item = bookable({ checkoutBookableIds: ["b2"] });

    expect(rowOf(item, "checkoutBookables").target).toEqual({
      step: "more",
      tab: "relatedBookables",
      section: "related-checkout",
      field: null,
      area: "checkoutBookables",
    });
  });

  it("leads „Nicht festgelegt“ of Weitere Einstellungen to the first area that shows", () => {
    const item = bookable({ requiredFields: ["address", "zipCode", "city"] });
    const simple = (option) =>
      expertOptionShown(option, { expertMode: false, current: item });

    expect(rowOf(item, "more").target).toEqual({
      step: "more",
      tab: "accessLocks",
      section: null,
      field: null,
      area: null,
    });
    // Without expert mode the expert areas stand aside: Serienbuchung.
    expect(rowOf(item, "more", { shown: simple }).target).toMatchObject({
      step: "more",
      tab: "permissions",
      section: "permissions-group-booking",
    });
  });
});

describe("overview: expert options", () => {
  const labelsOf = (item, expertMode) =>
    overviewBlocks(item, {
      shown: (option) =>
        expertOptionShown(option, { expertMode, stored: item, current: item }),
    }).flatMap(({ rows }) => rows.map(({ label }) => label && i18n.t(label)));
  const paid = (overrides) =>
    bookable({
      priceCategories: [category(25)],
      requiredFields: ["address", "zipCode", "city"],
      ...overrides,
    });

  it("shows an unused expert option only in expert mode", () => {
    const expert = ["Interne Tags", "Rabattcodes", "Vorlaufzeit"];
    const more = ["Puffer zwischen Buchungen", "Sonderöffnungszeiten"];

    expect(labelsOf(paid(), true)).toEqual(
      expect.arrayContaining([...expert, ...more, "Preisnachlass"])
    );
    [...expert, ...more, "Preisnachlass"].forEach((label) =>
      expect(labelsOf(paid(), false)).not.toContain(label)
    );
  });

  it("shows a used expert option without expert mode, as the field does", () => {
    const item = paid({
      tags: ["intern"],
      enableCoupons: false,
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 120,
      bookingDiscounts: {
        roles: [{ roleId: "r1", discountPercent: 10 }],
        users: [],
      },
    });

    expect(labelsOf(item, false)).toEqual(
      expect.arrayContaining([
        "Interne Tags",
        "Rabattcodes",
        "Vorlaufzeit",
        "Preisnachlass",
      ])
    );
  });
});

describe("overview: the settings of the Buchungsart", () => {
  const rows = (overrides) =>
    overviewBlocks(bookable(overrides))
      .find(({ step }) => step === "availability")
      .rows.map(({ label, value }) => [i18n.t(label), valueText(value)]);

  it("names Buchungsdauer, Vorlaufzeit, Puffer and the opening hours", () => {
    expect(
      rows({
        minBookingDuration: 1,
        maxBookingDuration: 4,
        isLeadTimeRelated: true,
        preparationLeadTimeMinutes: 1440,
        isBufferRelated: true,
        bufferTimeBeforeMinutes: 30,
        bufferTimeAfterMinutes: 0,
        isOpeningHoursRelated: true,
        openingHours: [{ weekdays: [1], startTime: "08:00", endTime: "18:00" }],
      })
    ).toEqual([
      ["Buchungsart", "Freie Zeitwahl"],
      ["Buchungsdauer", "1 bis 4 Stunden"],
      ["Vorlaufzeit", "1 Tag"],
      ["Puffer zwischen Buchungen", "30 Min. vor der Buchung"],
      ["Öffnungszeiten", "1 Eintrag"],
      ["Sonderöffnungszeiten", "Nicht festgelegt"],
    ]);
  });

  it("counts the Zeitfenster and the Zeiträume of their mode", () => {
    const timePeriod = { weekdays: [1], startTime: "09:00", endTime: "12:00" };

    expect(
      rows({
        isScheduleRelated: false,
        isTimePeriodRelated: true,
        timePeriods: [timePeriod, timePeriod],
      })
    ).toContainEqual(["Feste Zeitfenster", "2 Zeitfenster"]);
    expect(
      rows({ isScheduleRelated: false, isBlockPeriodRelated: true })
    ).toContainEqual(["Zeiträume", "Nicht festgelegt"]);
  });
});

describe("overview: issues at their row", () => {
  const issuesOf = (item) =>
    Object.fromEntries(
      overviewBlocks(item)
        .flatMap(({ rows }) => rows)
        .filter(({ issues }) => issues.length)
        .map(({ key, issues }) => [key, issues])
    );

  it("puts an issue of the check at the row of its field", () => {
    expect(
      issuesOf(bookable({ title: " ", maxAmountPerBooking: 0, amount: 4 }))
    ).toEqual({
      title: ["bookable.validation.title"],
      maxAmountPerBooking: ["bookable.validation.maxAmountPerBooking"],
    });
  });

  it("puts an issue of a field without a row at the first row of its step", () => {
    const item = bookable({
      title: "Saal",
      requiredFields: ["address", "zipCode", "city"],
      accessPointDetails: {
        active: true,
        accessBuffer: { before: -5, after: 0 },
        accessPointIds: [],
      },
    });

    expect(issuesOf(item)).toEqual({
      more: ["accessPoint.bookable.buffer.invalid"],
    });
  });

  it("shows no issue in a block still open", () => {
    const blocks = overviewBlocks(bookable({ title: "" }), { visited: [] });

    expect(blocks.every(({ rows }) => rows.length === 0)).toBe(true);
  });
});

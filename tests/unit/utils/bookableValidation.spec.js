import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import {
  bookableIssues,
  bookableRules,
  firstIssue,
} from "@/utils/bookableValidation";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

// The first message a field shows for `value`, or `true` while it is fine.
const messageOf = (name, value) => {
  const refusal = bookableRules(name)
    .map((rule) => rule(value))
    .find((answer) => answer !== true);
  return refusal === undefined ? true : refusal;
};

const issuesOf = (overrides, options) =>
  bookableIssues(bookable(overrides), options);

describe("bookableValidation - the rules of the spec", () => {
  it.each([
    ["title", "", "Bitte einen Titel eingeben."],
    ["title", "   ", "Bitte einen Titel eingeben."],
    ["title", undefined, "Bitte einen Titel eingeben."],
    ["price", "", "Bitte einen Preis eingeben."],
    ["price", null, "Bitte einen Preis eingeben."],
    ["price", "zehn", "Bitte einen Preis eingeben."],
    [
      "maxAmountPerBooking",
      "0",
      "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.",
    ],
    [
      "maxAmountPerBooking",
      1.5,
      "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.",
    ],
    ["discountPercent", 101, "Bitte eine ganze Zahl von 0 bis 100 eingeben."],
    ["discountPercent", -1, "Bitte eine ganze Zahl von 0 bis 100 eingeben."],
    ["discountPercent", 12.5, "Bitte eine ganze Zahl von 0 bis 100 eingeben."],
    ["discountPercent", "", "Bitte eine ganze Zahl von 0 bis 100 eingeben."],
  ])("refuses %s %j with its message", (name, value, message) => {
    const translate = (key) =>
      ({
        "bookable.validation.title": "Bitte einen Titel eingeben.",
        "bookable.validation.price": "Bitte einen Preis eingeben.",
        "bookable.validation.maxAmountPerBooking":
          "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.",
        "bookable.validation.discountPercent":
          "Bitte eine ganze Zahl von 0 bis 100 eingeben.",
      }[key]);
    const refusal = bookableRules(name, translate)
      .map((rule) => rule(value))
      .find((answer) => answer !== true);

    expect(refusal).toBe(message);
  });

  it.each([
    ["title", " Saal "],
    ["price", 0],
    ["price", "12.50"],
    ["maxAmountPerBooking", null],
    ["maxAmountPerBooking", ""],
    ["maxAmountPerBooking", "3"],
    ["discountPercent", 0],
    ["discountPercent", "100"],
  ])("takes %s %j", (name, value) => {
    expect(messageOf(name, value)).toBe(true);
  });

  it("knows no rule by another name", () => {
    expect(() => bookableRules("name")).toThrow("Unknown bookable rule: name");
  });

  it("finds nothing wrong with a new bookable that has a title", () => {
    expect(issuesOf({})).toEqual([]);
  });

  it("names the field, the message and where to fix it", () => {
    expect(issuesOf({ title: " " })).toEqual([
      {
        field: "title",
        message: "bookable.validation.title",
        tab: "general",
        section: "general-catalog",
        step: "identity",
      },
    ]);
  });

  it("finds a missing price in any category", () => {
    const priceCategories = [
      { priceEur: 10, interval: { start: 1, end: 2 } },
      { priceEur: "", interval: { start: 3, end: null } },
    ];

    expect(issuesOf({ priceCategories })).toEqual([
      expect.objectContaining({
        field: "priceCategories",
        message: "bookable.validation.price",
        tab: "pricing",
        section: "pricing-price",
        step: "price",
      }),
    ]);
  });

  it("leaves the prices to ParkraumService while it handles them", () => {
    const priceCategories = [{ priceEur: "", interval: {} }];
    const externalProviders = [
      { provider: "ifbs", active: true, handles: ["pricing"] },
    ];

    expect(issuesOf({ priceCategories, externalProviders })).toEqual([]);
  });

  it("finds an invalid Höchstmenge je Buchung", () => {
    expect(issuesOf({ maxAmountPerBooking: 0 })).toEqual([
      expect.objectContaining({
        field: "maxAmountPerBooking",
        section: "pricing-amount",
        step: "amount",
      }),
    ]);
  });

  it("finds a Preisnachlass out of range, for roles and persons", () => {
    const bookingDiscounts = {
      users: [{ userId: "u1", discountPercent: 150 }],
      roles: [{ roleId: "r1", discountPercent: 20 }],
    };

    expect(issuesOf({ bookingDiscounts })).toEqual([
      expect.objectContaining({
        field: "bookingDiscounts",
        message: "bookable.validation.discountPercent",
        step: "permission",
      }),
    ]);
  });
});

describe("bookableValidation - the rules of the shared sections", () => {
  it.each([
    ["weekdays", [], "bookable.validation.weekdays"],
    ["startTime", null, "bookable.validation.startTime"],
    ["endTime", "", "bookable.validation.endTime"],
    ["date", null, "bookable.validation.date"],
    ["label", "  ", "bookable.validation.label"],
    ["startWeekday", null, "bookable.validation.startWeekday"],
    ["endWeekday", undefined, "bookable.validation.endWeekday"],
    ["leadTimeMinutes", "", "bookable.validation.leadTimeMinutes"],
    ["leadTimeMinutes", -1, "bookable.validation.leadTimeMinutes"],
    ["bufferMinutes", -5, "bookable.validation.bufferMinutes"],
    ["accessBuffer", 1441, "accessPoint.bookable.buffer.invalid"],
    ["accessBuffer", 1.5, "accessPoint.bookable.buffer.invalid"],
  ])("refuses %s %j", (name, value, key) => {
    expect(messageOf(name, value)).toBe(key);
  });

  it.each([
    ["weekdays", [1]],
    ["startWeekday", 0],
    ["leadTimeMinutes", 0],
    ["bufferMinutes", null],
    ["bufferMinutes", 2.5],
    ["accessBuffer", ""],
    ["accessBuffer", 1440],
  ])("takes %s %j", (name, value) => {
    expect(messageOf(name, value)).toBe(true);
  });

  it("names the Zeitfenster of a bookable with Feste Zeitfenster", () => {
    const timePeriods = [{ weekdays: [], startTime: "08:00", endTime: null }];

    expect(
      issuesOf({
        isScheduleRelated: false,
        isTimePeriodRelated: true,
        timePeriods,
      })
    ).toEqual([
      expect.objectContaining({
        field: "timePeriods",
        message: "bookable.validation.weekdays",
        section: "bookingType-time-periods",
        step: "availability",
      }),
      expect.objectContaining({ message: "bookable.validation.endTime" }),
    ]);
  });

  it("leaves the stored Zeitfenster of another Buchungsart alone", () => {
    const timePeriods = [{ weekdays: [], startTime: null, endTime: null }];

    expect(issuesOf({ timePeriods })).toEqual([]);
  });

  const blockPeriod = (overrides = {}) => ({
    id: "p1",
    label: "Wochenende",
    startWeekday: 5,
    startTime: "18:00",
    endWeekday: 1,
    endTime: "08:00",
    ...overrides,
  });
  const withBlockPeriods = (blockPeriods) =>
    issuesOf({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
      blockPeriods,
    }).map((issue) => issue.message);

  it("asks Zeiträume for at least one complete entry of some duration", () => {
    expect(withBlockPeriods([blockPeriod()])).toEqual([]);
    expect(withBlockPeriods([])).toEqual(["bookable.validation.blockPeriods"]);
    expect(
      withBlockPeriods([blockPeriod({ label: " ", startWeekday: null })])
    ).toEqual([
      "bookable.validation.label",
      "bookable.validation.startWeekday",
    ]);
    expect(
      withBlockPeriods([
        blockPeriod({ endWeekday: 5, endTime: "18:00" }),
        blockPeriod({ id: "p2", startTime: "18:00", endTime: "17:00" }),
      ])
    ).toEqual(["bookable.validation.blockPeriodDuration"]);
  });

  it("checks Vorlaufzeit only while it is switched on", () => {
    const leadTime = {
      preparationLeadTimeMinutes: "",
      serviceHours: [{ weekdays: [1], startTime: null, endTime: "18:00" }],
    };

    expect(issuesOf(leadTime)).toEqual([]);
    expect(issuesOf({ ...leadTime, isLeadTimeRelated: true })).toEqual([
      expect.objectContaining({
        field: "preparationLeadTimeMinutes",
        message: "bookable.validation.leadTimeMinutes",
        section: "bookingType-lead-time",
      }),
      expect.objectContaining({
        field: "serviceHours",
        message: "bookable.validation.startTime",
      }),
    ]);
  });

  it("checks Puffer while it is switched on for Freie Zeitwahl", () => {
    const buffer = { isBufferRelated: true, bufferTimeAfterMinutes: -10 };

    expect(issuesOf(buffer)).toEqual([
      expect.objectContaining({
        field: "bufferTimeAfterMinutes",
        section: "bookingType-buffer",
      }),
    ]);
    expect(
      issuesOf({
        ...buffer,
        isScheduleRelated: false,
        isTimePeriodRelated: true,
      })
    ).toEqual([]);
  });

  it("checks Öffnungszeiten and Sonderöffnungszeiten while switched on", () => {
    const hours = {
      openingHours: [{ weekdays: [1], startTime: "08:00", endTime: null }],
      specialOpeningHours: [
        { date: null, startTime: "08:00", endTime: "12:00" },
      ],
    };

    expect(issuesOf(hours)).toEqual([]);
    expect(
      issuesOf({
        ...hours,
        isOpeningHoursRelated: true,
        isSpecialOpeningHoursRelated: true,
      })
    ).toEqual([
      expect.objectContaining({
        field: "openingHours",
        message: "bookable.validation.endTime",
        tab: "openingHours",
        section: "openingHours-regular",
        step: "availability",
      }),
      expect.objectContaining({
        field: "specialOpeningHours",
        message: "bookable.validation.date",
        section: "openingHours-special",
      }),
    ]);
  });

  it("checks the buffer of the Schließsysteme while they are switched on", () => {
    const accessPointDetails = {
      active: false,
      accessBuffer: { before: 2000, after: 0 },
      accessPointIds: ["a1"],
    };

    expect(issuesOf({ accessPointDetails })).toEqual([]);
    expect(
      issuesOf({ accessPointDetails: { ...accessPointDetails, active: true } })
    ).toEqual([
      expect.objectContaining({
        field: "accessPointDetails",
        tab: "accessLocks",
        section: null,
        step: null,
      }),
    ]);
  });

  it("checks only the expert options that show", () => {
    const overrides = {
      bookingDiscounts: { users: [{ userId: "u1", discountPercent: 150 }] },
      isSpecialOpeningHoursRelated: true,
      specialOpeningHours: [
        { date: null, startTime: "08:00", endTime: "12:00" },
      ],
    };
    const shown = (option) => option !== "bookingDiscounts";

    expect(issuesOf(overrides, { shown }).map((issue) => issue.field)).toEqual([
      "specialOpeningHours",
    ]);
  });
});

describe("firstIssue", () => {
  const issues = bookableIssues(
    bookable({
      title: "",
      maxAmountPerBooking: 0,
      isScheduleRelated: false,
      isTimePeriodRelated: true,
      timePeriods: [{ weekdays: [1], startTime: null, endTime: "10:00" }],
      accessPointDetails: {
        active: true,
        accessBuffer: { before: -1, after: 0 },
        accessPointIds: [],
      },
    })
  );
  const tabs = ["accessLocks", "bookingType", "pricing", "general"];
  const steps = ["identity", "availability", "price", "amount"];

  it("is the issue of the first tab or step in the given order", () => {
    expect(firstIssue(issues, tabs, "tab").field).toBe("accessPointDetails");
    expect(firstIssue(issues, steps, "step").field).toBe("title");
    expect(firstIssue(issues, ["pricing", "bookingType"], "tab").field).toBe(
      "maxAmountPerBooking"
    );
  });

  it("falls back to an issue without a place in the order", () => {
    const [accessLocks] = issues.filter((issue) => issue.step === null);

    expect(firstIssue([accessLocks], steps, "step")).toBe(accessLocks);
  });

  it("is null without issues", () => {
    expect(firstIssue([], steps, "step")).toBeNull();
  });
});

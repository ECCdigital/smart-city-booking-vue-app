import { describe, expect, it } from "vitest";
import { IFBS_LOCKER, takenOverBy } from "@tests/unit/support/parkraumService";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditBookingMode from "@/components/Bookable/Edit/BookableEditBookingMode.vue";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const LONG_MONTHS = {
  isScheduleRelated: false,
  isLongRange: true,
  longRangeOptions: { type: "month" },
};

// The Buchungsart as BookableEdit hosts it, in either mode: every patch lands
// in the next prop, the bookable handed in is the stored one.
const mountMode = (overrides, { expertMode = true, saved } = {}) =>
  mountEditing(BookableEditBookingMode, {
    bookable: bookable(overrides),
    expertMode,
    saved: saved && bookable(saved),
    accessPoints: [IFBS_LOCKER],
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const segments = (wrapper, test) =>
  find(wrapper, test)
    .findAll("button")
    .wrappers.map((button) => button.text());
const chosen = (wrapper, test) =>
  find(wrapper, test).find("[aria-checked='true']").text();

describe("BookableEditBookingMode", () => {
  it("asks whether a time is booked and says what bookers do without one", () => {
    const { wrapper } = mountMode({ isScheduleRelated: false });

    expect(wrapper.text()).toContain(
      "Wird dieses Objekt für eine Zeit gebucht?"
    );
    expect(segments(wrapper, "booking-mode-timed")).toEqual([
      "Ohne Zeit",
      "Für eine Zeit",
    ]);
    expect(chosen(wrapper, "booking-mode-timed")).toBe("Ohne Zeit");
    expect(find(wrapper, "booking-mode-time").exists()).toBe(false);
    expect(find(wrapper, "booking-mode-explain").text()).toBe(
      "Buchende buchen eine Menge ohne Zeitauswahl."
    );
  });

  it("names the modes and says under the last question what bookers do", () => {
    const { wrapper } = mountMode({
      isScheduleRelated: false,
      isTimePeriodRelated: true,
    });

    expect(wrapper.text()).toContain("Wie wird die Zeit gebucht?");
    expect(segments(wrapper, "booking-mode-time")).toEqual([
      "Freie Zeitwahl",
      "Feste Zeitfenster",
      "Zeiträume",
      "Langzeit",
    ]);
    expect(chosen(wrapper, "booking-mode-time")).toBe("Feste Zeitfenster");
    expect(find(wrapper, "booking-mode-explain").text()).toBe(
      "Sie geben feste Zeitfenster vor, etwa montags 9–12 Uhr; Buchende wählen ein freies davon."
    );
    expect(find(wrapper, "booking-mode-long-range-info").exists()).toBe(false);
  });

  it("asks weeks or months for „Langzeit“ and says that no opening hours are checked", () => {
    const { wrapper } = mountMode(LONG_MONTHS);

    expect(chosen(wrapper, "booking-mode-time")).toBe("Langzeit");
    expect(wrapper.text()).toContain("Wochen oder Monate?");
    expect(segments(wrapper, "booking-mode-long-range")).toEqual([
      "Ganze Wochen",
      "Ganze Monate",
    ]);
    expect(chosen(wrapper, "booking-mode-long-range")).toBe("Ganze Monate");
    expect(find(wrapper, "booking-mode-explain").text()).toBe(
      "Buchende buchen ganze Kalendermonate am Stück."
    );
    expect(find(wrapper, "booking-mode-long-range-info").text()).toBe(
      "Bei ganzen Wochen und Monaten prüft das System keine Öffnungszeiten oder Ausnahmen."
    );
  });

  it("sets Freie Zeitwahl first for „Für eine Zeit“, as one partial patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountMode({
      isScheduleRelated: false,
    });

    await find(wrapper, "booking-mode-timed-yes").trigger("click");

    expect(patches).toEqual([
      { isScheduleRelated: true, longRangeOptions: {} },
    ]);
    expect(chosen(wrapper, "booking-mode-time")).toBe("Freie Zeitwahl");
    expect(handedIn).toEqual(stored);
  });

  it("sets Ganze Wochen first for „Langzeit“, then the unit chosen", async () => {
    const { wrapper, patches } = mountMode({ isScheduleRelated: true });

    await find(wrapper, "booking-mode-time-longRange").trigger("click");
    expect(lastPatch(patches)).toEqual({
      isScheduleRelated: false,
      isLongRange: true,
      longRangeOptions: { type: "week" },
    });

    await find(wrapper, "booking-mode-long-range-month").trigger("click");
    expect(lastPatch(patches)).toEqual({ longRangeOptions: { type: "month" } });
  });

  it("keeps the other modes' data and turns the Serienbuchung off for Zeiträume", async () => {
    const periods = [{ weekdays: [1], startTime: "09:00", endTime: "12:00" }];
    const { wrapper, patches } = mountMode({
      isScheduleRelated: false,
      isTimePeriodRelated: true,
      timePeriods: periods,
      groupBooking: { enabled: true, permittedRoles: ["r1"] },
    });

    await find(wrapper, "booking-mode-time-blockPeriod").trigger("click");

    expect(lastPatch(patches)).toEqual({
      isTimePeriodRelated: false,
      isBlockPeriodRelated: true,
      longRangeOptions: {},
      groupBooking: { enabled: false, permittedRoles: ["r1"] },
    });
    expect(wrapper.props("bookable").timePeriods).toEqual(periods);
  });

  it("changes nothing when it mounts", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountMode(LONG_MONTHS);
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });
});

describe("BookableEditBookingMode without expert mode", () => {
  it("offers two ways of booking a time while no expert mode is used", () => {
    const { wrapper } = mountMode(
      { isScheduleRelated: true },
      { expertMode: false }
    );

    expect(segments(wrapper, "booking-mode-time")).toEqual([
      "Freie Zeitwahl",
      "Feste Zeitfenster",
    ]);
  });

  it("shows an expert mode in use alone, not the others", () => {
    const months = mountMode(LONG_MONTHS, { expertMode: false }).wrapper;
    expect(segments(months, "booking-mode-time")).toEqual([
      "Freie Zeitwahl",
      "Feste Zeitfenster",
      "Langzeit",
    ]);
    expect(segments(months, "booking-mode-long-range")).toEqual([
      "Ganze Monate",
    ]);

    const periods = mountMode(
      { isScheduleRelated: false, isBlockPeriodRelated: true },
      { expertMode: false }
    ).wrapper;
    expect(segments(periods, "booking-mode-time")).toEqual([
      "Freie Zeitwahl",
      "Feste Zeitfenster",
      "Zeiträume",
    ]);
  });

  it("goes back to the stored Ganze Monate for „Langzeit“, not to Ganze Wochen", async () => {
    const { wrapper, patches } = mountMode(
      { isScheduleRelated: true },
      { expertMode: false, saved: LONG_MONTHS }
    );

    await find(wrapper, "booking-mode-time-longRange").trigger("click");

    expect(lastPatch(patches).longRangeOptions).toEqual({ type: "month" });
  });
});

describe("BookableEditBookingMode with an external availability", () => {
  const external = takenOverBy(["availability"]);

  it("shows only the note, without naming a place", () => {
    const { wrapper } = mountMode(external);

    expect(find(wrapper, "booking-mode-external").text()).toContain(
      "Verfügbarkeit kommt von einem externen Anbieter"
    );
    expect(find(wrapper, "booking-mode-timed").exists()).toBe(false);
    expect(find(wrapper, "booking-mode-explain").exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/„/);
  });

  it("jumps to the provider's setting", async () => {
    const { wrapper, patches } = mountMode(external);

    await find(wrapper, "booking-mode-external-link").trigger("click");

    expect(wrapper.emitted("open-section")).toEqual([
      [{ tabKey: "accessLocks", sectionId: "pricing-external" }],
    ]);
    expect(patches).toEqual([]);
  });
});

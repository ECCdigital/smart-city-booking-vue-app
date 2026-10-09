import { describe, expect, it } from "vitest";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";

const OPENING_HOURS = {
  weekdays: [1, 2],
  startTime: "08:00",
  endTime: "16:00",
};
const SPECIAL = { date: "2026-12-24", startTime: "08:00", endTime: "12:00" };

const bookable = (overrides = {}) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    isScheduleRelated: true,
    ...overrides,
  }).toPlain();

const mountHours = (overrides) =>
  mountEditing(BookableEditOpeningHours, {
    bookable: bookable(overrides),
    provide: { bookableExpertMode: { enabled: true } },
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableEditOpeningHours", () => {
  it("changes nothing when it mounts", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountHours({
      isOpeningHoursRelated: true,
      openingHours: [OPENING_HOURS],
      isSpecialOpeningHoursRelated: true,
      specialOpeningHours: [SPECIAL],
    });
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  // The frame titles it: the tab on the editing page, the step in the flow.
  it("draws no heading of its own", () => {
    const { wrapper } = mountHours();

    expect(wrapper.findComponent({ name: "BaseSection" }).exists()).toBe(false);
  });

  it("switches the opening hours on", async () => {
    const { wrapper, patches } = mountHours();

    await find(wrapper, "opening-hours-switch").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({ isOpeningHoursRelated: true });
  });

  it("adds opening hours as a new list", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountHours({
      isOpeningHoursRelated: true,
      openingHours: [OPENING_HOURS],
    });

    await find(wrapper, "opening-hours-add").trigger("click");

    expect(lastPatch(patches)).toEqual({
      openingHours: [
        OPENING_HOURS,
        { weekdays: [], startTime: null, endTime: null },
      ],
    });
    expect(handedIn).toEqual(stored);
  });

  it("removes special opening hours as a new list", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountHours({
      isSpecialOpeningHoursRelated: true,
      specialOpeningHours: [SPECIAL],
    });

    await find(wrapper, "special-opening-hours-remove").trigger("click");

    expect(lastPatch(patches)).toEqual({ specialOpeningHours: [] });
    expect(handedIn).toEqual(stored);
  });
});

describe("BookableEditOpeningHours - Sonderöffnungszeiten", () => {
  const special = {
    isSpecialOpeningHoursRelated: true,
    specialOpeningHours: [SPECIAL],
  };
  const shows = (wrapper) =>
    find(wrapper, "special-opening-hours-switch").exists();

  it("shows them in use without expert mode", () => {
    const { wrapper } = mountEditing(BookableEditOpeningHours, {
      bookable: bookable(special),
      expertMode: false,
    });

    expect(shows(wrapper)).toBe(true);
  });

  it("leaves them out unused without expert mode", () => {
    const { wrapper } = mountEditing(BookableEditOpeningHours, {
      bookable: bookable(),
      expertMode: false,
    });

    expect(shows(wrapper)).toBe(false);
  });

  it("keeps them while the stored bookable still uses them", () => {
    const { wrapper } = mountEditing(BookableEditOpeningHours, {
      bookable: bookable(),
      saved: bookable(special),
      expertMode: false,
    });

    expect(shows(wrapper)).toBe(true);
  });
});

describe("BookableEditOpeningHours - without a time of day", () => {
  it("names the Buchungsart in use as its questions do", () => {
    const { wrapper } = mountHours({
      isScheduleRelated: false,
      isLongRange: true,
      longRangeOptions: { type: "month" },
    });

    expect(wrapper.text()).toContain("Buchungsart: Ganze Monate");
    expect(wrapper.text()).toContain("Freie Zeitwahl und Feste Zeitfenster");
    expect(wrapper.text()).not.toMatch(/Monatsbuchung|Buchungstyp/);
  });
});

import { describe, expect, it } from "vitest";
import { IFBS_LOCKER, takenOverBy } from "@tests/unit/support/parkraumService";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";

// Vorlaufzeit and Puffer are their own section with their own spec.
const STUBS = {
  BookableEditLeadTime: {
    name: "BookableEditLeadTime",
    render(h) {
      return h("div");
    },
  },
};

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const mountType = (overrides, { expertMode = true } = {}) =>
  mountEditing(BookableEditBookingType, {
    bookable: bookable(overrides),
    provide: { bookableExpertMode: { enabled: expertMode } },
    accessPoints: [IFBS_LOCKER],
    stubs: STUBS,
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

const BLOCK_PERIOD = {
  id: "bp-1",
  label: "Wochenende",
  startWeekday: 5,
  startTime: "18:00",
  endWeekday: 1,
  endTime: "08:00",
};

describe("BookableEditBookingType", () => {
  it("changes nothing when it mounts", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
      blockPeriods: [{ label: "Woche" }],
    });
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  // The Buchungsart is BookableEditBookingMode, above it in either frame.
  it("shows the sections of the chosen mode, not the Buchungsart", () => {
    const { wrapper } = mountType({ isScheduleRelated: true });

    expect(find(wrapper, "booking-duration-min").exists()).toBe(true);
    expect(wrapper.find("input[type='radio']").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Buchungstyp");
  });

  it("shows nothing where a provider handles the availability", () => {
    const { wrapper } = mountType({
      isScheduleRelated: true,
      ...takenOverBy(["availability"]),
    });

    expect(find(wrapper, "booking-duration-min").exists()).toBe(false);
  });

  it("hands on the booking duration as typed", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: true,
    });

    await find(wrapper, "booking-duration-min").find("input").setValue("2");

    expect(lastPatch(patches)).toEqual({ minBookingDuration: 2 });
    expect(handedIn).toEqual(stored);
  });

  it("adds a time window as a new list", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: false,
      isTimePeriodRelated: true,
    });

    await find(wrapper, "time-periods-add").trigger("click");

    expect(lastPatch(patches)).toEqual({
      timePeriods: [{ weekdays: [], startTime: null, endTime: null }],
    });
    expect(handedIn).toEqual(stored);
  });

  it("adds a Zeitraum with an id and names it", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
    });

    await find(wrapper, "block-periods-add").trigger("click");
    const [added] = lastPatch(patches).blockPeriods;
    expect(added.id).toEqual(expect.any(String));

    await find(wrapper, "block-period-label").find("input").setValue("Woche");

    expect(lastPatch(patches)).toEqual({
      blockPeriods: [{ ...added, label: "Woche" }],
    });
    expect(handedIn).toEqual(stored);
  });

  it("removes a Zeitraum as a new list", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
      blockPeriods: [BLOCK_PERIOD],
    });

    await find(wrapper, "block-period-remove").trigger("click");

    expect(lastPatch(patches)).toEqual({ blockPeriods: [] });
    expect(handedIn).toEqual(stored);
  });
});

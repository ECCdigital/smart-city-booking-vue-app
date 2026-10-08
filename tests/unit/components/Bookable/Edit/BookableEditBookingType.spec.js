import { describe, expect, it } from "vitest";
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

const mountType = (overrides, { embedded = false, expertMode = true } = {}) =>
  mountEditing(BookableEditBookingType, {
    bookable: bookable(overrides),
    propsData: { embedded },
    provide: { bookableExpertMode: { enabled: expertMode } },
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
  it("changes nothing when it mounts, in either mode", async () => {
    for (const embedded of [false, true]) {
      const {
        wrapper,
        patches,
        bookable: handedIn,
        stored,
      } = mountType(
        {
          isScheduleRelated: false,
          isBlockPeriodRelated: true,
          blockPeriods: [{ label: "Woche" }],
        },
        { embedded }
      );
      await wrapper.vm.$nextTick();

      expect(patches).toEqual([]);
      expect(handedIn).toEqual(stored);
    }
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

  it("hands on a chosen booking type with only the fields it changed", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountType({
      isScheduleRelated: true,
      groupBooking: { enabled: true, permittedRoles: [] },
    });

    await wrapper.find("input[value='blockPeriod']").trigger("click");

    expect(lastPatch(patches)).toEqual({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
      longRangeOptions: {},
      groupBooking: { enabled: false, permittedRoles: [] },
    });
    expect(handedIn).toEqual(stored);
  });
});

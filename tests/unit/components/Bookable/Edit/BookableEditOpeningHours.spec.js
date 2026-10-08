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

const mountHours = (overrides, embedded = false) =>
  mountEditing(BookableEditOpeningHours, {
    bookable: bookable(overrides),
    propsData: { embedded },
    provide: { bookableExpertMode: { enabled: true } },
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableEditOpeningHours", () => {
  it("changes nothing when it mounts, in either mode", async () => {
    for (const embedded of [false, true]) {
      const {
        wrapper,
        patches,
        bookable: handedIn,
        stored,
      } = mountHours(
        {
          isOpeningHoursRelated: true,
          openingHours: [OPENING_HOURS],
          isSpecialOpeningHoursRelated: true,
          specialOpeningHours: [SPECIAL],
        },
        embedded
      );
      await wrapper.vm.$nextTick();

      expect(patches).toEqual([]);
      expect(handedIn).toEqual(stored);
    }
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

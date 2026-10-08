import { describe, expect, it } from "vitest";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditLeadTime from "@/components/Bookable/Edit/BookableEditLeadTime.vue";

const SERVICE_HOURS = {
  weekdays: [1, 2],
  startTime: "08:00",
  endTime: "16:00",
};

const bookable = (overrides = {}) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    isScheduleRelated: true,
    ...overrides,
  }).toPlain();

const mountLeadTime = (overrides) =>
  mountEditing(BookableEditLeadTime, {
    bookable: bookable(overrides),
    propsData: { showBuffer: true },
    provide: { bookableExpertMode: { enabled: true } },
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableEditLeadTime", () => {
  it("changes nothing when it mounts", async () => {
    // Stored service hours without the switch: normalizeBookable's to settle.
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountLeadTime({
      isLeadTimeRelated: false,
      serviceHours: [SERVICE_HOURS],
      bufferTimeAfterMinutes: "15",
    });
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  it("switches the lead time on with two hours and a first service window", async () => {
    const { wrapper, patches, bookable: handedIn, stored } = mountLeadTime();

    await find(wrapper, "lead-time-switch").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 120,
      serviceHours: [
        { weekdays: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00" },
      ],
    });
    expect(handedIn).toEqual(stored);
  });

  it("takes a preset as the preparation time", async () => {
    const { wrapper, patches } = mountLeadTime({
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 120,
      serviceHours: [SERVICE_HOURS],
    });

    await find(wrapper, "lead-time-preset-60").trigger("click");

    expect(lastPatch(patches)).toEqual({ preparationLeadTimeMinutes: 60 });
  });

  it("removes a service window as a new list", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountLeadTime({
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 120,
      serviceHours: [SERVICE_HOURS],
    });

    await find(wrapper, "service-hours-remove").trigger("click");

    expect(lastPatch(patches)).toEqual({ serviceHours: [] });
    expect(handedIn).toEqual(stored);
  });

  it("switches the buffer on with 30 minutes after a booking", async () => {
    const { wrapper, patches } = mountLeadTime();

    await find(wrapper, "buffer-switch").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({
      isBufferRelated: true,
      bufferTimeAfterMinutes: 30,
    });
  });

  it("hands on the buffer before a booking as whole minutes", async () => {
    const { wrapper, patches } = mountLeadTime({
      isBufferRelated: true,
      bufferTimeAfterMinutes: 30,
    });

    await find(wrapper, "buffer-before").find("input").setValue("10");

    expect(lastPatch(patches)).toEqual({ bufferTimeBeforeMinutes: 10 });
  });
});

describe("BookableEditLeadTime - without expert mode", () => {
  const simple = (overrides, saved) =>
    mountEditing(BookableEditLeadTime, {
      bookable: bookable(overrides),
      saved: saved && bookable(saved),
      propsData: { showBuffer: true },
      expertMode: false,
    }).wrapper;

  it("shows Vorlaufzeit while it is active, without Puffer unused", () => {
    const wrapper = simple({
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 60,
      serviceHours: [SERVICE_HOURS],
    });

    expect(find(wrapper, "lead-time-switch").exists()).toBe(true);
    expect(find(wrapper, "buffer-switch").exists()).toBe(false);
  });

  it("shows Puffer while it is set, without Vorlaufzeit unused", () => {
    const wrapper = simple({
      isBufferRelated: true,
      bufferTimeAfterMinutes: 15,
    });

    expect(find(wrapper, "buffer-switch").exists()).toBe(true);
    expect(find(wrapper, "lead-time-switch").exists()).toBe(false);
  });

  it("keeps Vorlaufzeit switched off while the stored bookable has it", () => {
    const wrapper = simple(
      { isLeadTimeRelated: false },
      { isLeadTimeRelated: true, serviceHours: [SERVICE_HOURS] }
    );

    expect(find(wrapper, "lead-time-switch").exists()).toBe(true);
  });
});

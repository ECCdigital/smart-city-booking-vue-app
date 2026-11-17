import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import DateField from "@/components/commons/DateField.vue";
import TimeField from "@/components/commons/TimeField.vue";

// The messages the field shows; Vuetify draws them a tick later.
const fieldMessages = (wrapper) =>
  wrapper.findComponent({ name: "v-text-field" }).props("errorMessages");

describe("DateField", () => {
  it("shows the date the German way", () => {
    const wrapper = mountComponent(DateField, {
      propsData: { value: "2026-11-21", label: "Beginn: Datum" },
    });

    expect(wrapper.find("input").element.value).toBe("21.11.2026");
  });

  it("takes a clicked day at once and closes", async () => {
    const wrapper = mountComponent(DateField, {
      propsData: { value: "2026-11-21" },
    });

    await wrapper.setData({ open: true });
    wrapper.vm.pick("2026-11-22");

    expect(wrapper.emitted("input")).toEqual([["2026-11-22"]]);
    expect(wrapper.vm.open).toBe(false);
  });

  it("hands nothing on for the day already set", async () => {
    const wrapper = mountComponent(DateField, {
      propsData: { value: "2026-11-21" },
    });

    await wrapper.setData({ open: true });
    wrapper.vm.pick("2026-11-21");

    expect(wrapper.emitted("input")).toBeUndefined();
    expect(wrapper.vm.open).toBe(false);
  });
});

describe("DateField: typed", () => {
  const mountField = () =>
    mountComponent(DateField, { propsData: { value: "2026-11-21" } });

  it("hands on a typed day", async () => {
    const wrapper = mountField();

    await wrapper.find("input").setValue("22.11.2026");

    expect(wrapper.emitted("input")).toEqual([["2026-11-22"]]);
  });

  it("waits while the day is not complete, and says so when left", async () => {
    const wrapper = mountField();
    const input = wrapper.find("input");

    await input.setValue("22.11.");
    expect(wrapper.emitted("input")).toBeUndefined();

    await input.trigger("blur");
    expect(fieldMessages(wrapper).join()).toContain("TT.MM.JJJJ");
  });

  it("refuses a day that does not exist", async () => {
    const wrapper = mountField();

    await wrapper.find("input").setValue("31.11.2026");

    expect(wrapper.emitted("input")).toBeUndefined();
  });

  it("hands on an emptied field as no date", async () => {
    const wrapper = mountField();

    await wrapper.find("input").setValue("");

    expect(wrapper.emitted("input")).toEqual([[null]]);
  });
});

describe("TimeField: typed", () => {
  const mountField = () =>
    mountComponent(TimeField, { propsData: { value: "10:00" } });

  it("hands on a typed time", async () => {
    const wrapper = mountField();

    await wrapper.find("input").setValue("14:30");

    expect(wrapper.emitted("input")).toEqual([["14:30"]]);
  });

  it("refuses a time that does not exist, and says so when left", async () => {
    const wrapper = mountField();
    const input = wrapper.find("input");

    await input.setValue("25:00");
    expect(wrapper.emitted("input")).toBeUndefined();

    await input.trigger("blur");
    expect(fieldMessages(wrapper).join()).toContain("HH:MM");
  });
});

describe("TimeField", () => {
  it("shows the time with „Uhr“", () => {
    const wrapper = mountComponent(TimeField, {
      propsData: { value: "10:30", label: "Beginn: Uhrzeit" },
    });

    expect(wrapper.find("input").element.value).toBe("10:30");
    expect(wrapper.text()).toContain("Uhr");
  });

  it("leaves the suffix out while no time is set", () => {
    const wrapper = mountComponent(TimeField, { propsData: { value: null } });

    expect(wrapper.text()).not.toContain("Uhr");
  });
});

import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import SaveBar from "@/components/commons/SaveBar.vue";

const mountBar = (propsData) =>
  mountComponent(SaveBar, {
    propsData: { inProgress: false, showRestore: true, ...propsData },
  });

const buttonOf = (wrapper, label) =>
  wrapper.findAll("button").wrappers.find((button) => button.text() === label);

describe("SaveBar", () => {
  it("offers „Speichern“ while it is active", () => {
    const wrapper = mountBar({ active: true });

    expect(buttonOf(wrapper, "Speichern").attributes("disabled")).toBe(
      undefined
    );
    expect(
      buttonOf(wrapper, "Änderungen zurücksetzen").attributes("disabled")
    ).toBe(undefined);
  });

  it("holds its buttons while it is not active", () => {
    const wrapper = mountBar({ active: false });

    expect(buttonOf(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
    expect(
      buttonOf(wrapper, "Änderungen zurücksetzen").attributes("disabled")
    ).toBe("disabled");
  });

  it("holds „Speichern“ while a save is in progress", () => {
    const wrapper = mountBar({ active: true, inProgress: true });

    expect(buttonOf(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });
});

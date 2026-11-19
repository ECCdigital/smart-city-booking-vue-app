import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import CustomFieldInput from "@/components/Booking/CustomFieldInput.vue";

function mountInput(inputType, required) {
  return mountComponent(CustomFieldInput, {
    propsData: {
      field: {
        id: "f1",
        caption: "Bewerten Sie uns",
        inputType,
        options: [{ caption: "Gut", value: "good" }],
      },
      required,
      inline: true,
    },
  });
}

/** A required custom field is marked with a red asterisk, as E-Mail is. */
describe("CustomFieldInput", () => {
  it.each(["string", "text", "numeric", "select", "multiselect"])(
    "marks a required %s field with a red asterisk",
    (inputType) => {
      const label = mountInput(inputType, true).find("label");

      expect(label.text()).toMatch(/^Bewerten Sie uns\s*\*$/);
      expect(label.find(".error--text").text()).toBe("*");
    }
  );

  it("marks an optional field with nothing", () => {
    const label = mountInput("select", false).find("label");

    expect(label.text()).toBe("Bewerten Sie uns");
    expect(label.find(".error--text").exists()).toBe(false);
  });
});

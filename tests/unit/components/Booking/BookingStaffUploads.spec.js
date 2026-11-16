import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingStaffUploads from "@/components/Booking/BookingStaffUploads.vue";

const field = (overrides = {}) => ({
  id: "f1",
  label: "Vereinsausweis",
  hint: "",
  required: true,
  timing: "beforeRelease",
  formats: ["pdf"],
  maxFiles: 1,
  maxFileSizeMb: 5,
  ...overrides,
});

const pdf = new File(["%PDF"], "ausweis.pdf", { type: "application/pdf" });

function mountRows(props = {}) {
  return mountComponent(BookingStaffUploads, {
    propsData: {
      fields: [field()],
      files: {},
      ...props,
    },
  });
}

function pick(wrapper, file) {
  const input = wrapper.find("[data-test='booking-staff-upload-input-f1']");
  Object.defineProperty(input.element, "files", {
    value: [file],
    configurable: true,
  });
  return input.trigger("change");
}

describe("BookingStaffUploads - the proofs of a manual booking", () => {
  it("shows a row per field with „Datei wählen“", () => {
    const wrapper = mountRows();

    const row = wrapper.find("[data-test='booking-staff-upload']");
    expect(row.text()).toContain("Vereinsausweis");
    expect(row.text()).toContain("Pflicht");
    expect(row.find("[data-test='booking-staff-upload-choose']").exists()).toBe(
      true
    );
    expect(
      row.find("[data-test='booking-staff-upload-request']").exists()
    ).toBe(false);
  });

  it("takes a chosen file and lets it go again", async () => {
    const wrapper = mountRows();

    await pick(wrapper, pdf);
    expect(wrapper.emitted("update:files")[0][0]).toEqual({ f1: [pdf] });

    await wrapper.setProps({ files: { f1: [pdf] } });
    await wrapper
      .find("[data-test='booking-staff-upload-remove']")
      .trigger("click");
    expect(wrapper.emitted("update:files")[1][0]).toEqual({});
  });

  it("refuses a file of another format before it is taken", async () => {
    const wrapper = mountRows();

    await pick(wrapper, new File(["x"], "bild.png", { type: "image/png" }));

    expect(wrapper.emitted("update:files")).toBeUndefined();
    expect(
      wrapper.find("[data-test='booking-staff-upload-error']").text()
    ).toContain("PDF");
  });
});

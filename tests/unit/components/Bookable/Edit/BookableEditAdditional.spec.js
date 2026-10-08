import { describe, expect, it } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditAdditional from "@/components/Bookable/Edit/BookableEditAdditional.vue";

const DEFAULT_FIELDS = ["address", "zipCode", "city"];

const bookable = (requiredFields) =>
  new Bookable({ tenantId: "t1", title: "Saal", requiredFields }).toPlain();

const requiredFieldsShown = (requiredFields, saved) =>
  mountEditing(BookableEditAdditional, {
    bookable: bookable(requiredFields),
    saved: saved && bookable(saved),
    expertMode: false,
    stubs: { Tiptap: { render: (h) => h("div") } },
  })
    .wrapper.find("#be-section-additional-required-fields")
    .exists();

describe("BookableEditAdditional - Pflichtfelder without expert mode", () => {
  it("shows them while they differ from a new bookable's", () => {
    expect(requiredFieldsShown([...DEFAULT_FIELDS, "phone"])).toBe(true);
  });

  it("leaves them out as a new bookable has them", () => {
    expect(requiredFieldsShown(DEFAULT_FIELDS)).toBe(false);
  });

  it("keeps them while the stored bookable differs", () => {
    expect(requiredFieldsShown(DEFAULT_FIELDS, ["phone"])).toBe(true);
  });
});

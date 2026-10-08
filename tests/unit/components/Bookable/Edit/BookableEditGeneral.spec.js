import { describe, expect, it, vi } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditGeneral from "@/components/Bookable/Edit/BookableEditGeneral.vue";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn().mockResolvedValue({ data: [] }) },
}));

const stub = (name) => ({
  name,
  render(h) {
    return h("div");
  },
});

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const tagsShown = (overrides, saved) =>
  mountEditing(BookableEditGeneral, {
    bookable: bookable(overrides),
    saved: saved && bookable(saved),
    expertMode: false,
    stubs: {
      MediaReferenceList: stub("MediaReferenceList"),
      AddressLookup: stub("AddressLookup"),
      Tiptap: stub("Tiptap"),
    },
  })
    .wrapper.find("#be-section-general-tags")
    .exists();

describe("BookableEditGeneral - Interne Tags without expert mode", () => {
  it("shows them while the bookable has tags", () => {
    expect(tagsShown({ tags: ["Saal"] })).toBe(true);
  });

  it("leaves them out without tags", () => {
    expect(tagsShown({ tags: [] })).toBe(false);
  });

  it("keeps them while the stored bookable has tags", () => {
    expect(tagsShown({ tags: [] }, { tags: ["Saal"] })).toBe(true);
  });
});

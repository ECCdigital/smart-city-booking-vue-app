import { beforeAll, describe, expect, it } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { stubProseMirrorLayout } from "@tests/unit/support/prosemirror";
import Bookable from "@/entities/bookable";
import BookableEditBookingNotes from "@/components/Bookable/Edit/BookableEditBookingNotes.vue";
import Tiptap from "@/components/Tiptap.vue";

const mountArea = (bookingNotes) =>
  mountEditing(BookableEditBookingNotes, {
    bookable: new Bookable({
      tenantId: "t1",
      title: "Saal",
      bookingNotes,
    }).toPlain(),
  });

const editor = (wrapper) => wrapper.findComponent(Tiptap).vm.editor;

describe("BookableEditBookingNotes (Buchungshinweise)", () => {
  beforeAll(stubProseMirrorLayout);

  it("changes nothing when it mounts", () => {
    const { patches, bookable, stored } = mountArea("<p>Schlüssel holen</p>");

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("shows the notes in the editor", () => {
    const { wrapper } = mountArea("<p>Schlüssel holen</p>");

    expect(editor(wrapper).getHTML()).toBe("<p>Schlüssel holen</p>");
  });

  it("hands on what is written with only the notes as the patch", async () => {
    const { wrapper, patches, bookable, stored } = mountArea("");

    editor(wrapper).commands.setContent("<p>Bitte pünktlich</p>", true);
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([{ bookingNotes: "<p>Bitte pünktlich</p>" }]);
    expect(bookable).toEqual(stored);
  });
});

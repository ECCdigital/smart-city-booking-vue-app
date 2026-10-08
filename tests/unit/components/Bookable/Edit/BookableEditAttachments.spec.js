import { describe, expect, it } from "vitest";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { button, toggleSwitch } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";
import BookableEditAttachments from "@/components/Bookable/Edit/BookableEditAttachments.vue";

const AGB = {
  id: "a1",
  title: "AGB",
  caption: "",
  type: "agreement",
  reference: null,
  url: "",
  show: false,
  required: false,
  mailAttach: false,
};

const mountArea = (attachments = []) =>
  mountEditing(BookableEditAttachments, {
    bookable: new Bookable({
      tenantId: "t1",
      title: "Saal",
      attachments,
    }).toPlain(),
    stubs: { MediaReferenceField: { render: (h) => h("div") } },
  });

/** Opens the attachment's form, as a click on its row does. */
async function open(wrapper) {
  await wrapper.find(".attachment-item").trigger("click");
}

describe("BookableEditAttachments (Anhänge)", () => {
  it("changes nothing when it mounts", () => {
    const { patches, bookable, stored } = mountArea([AGB]);

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("adds an empty attachment with only the list as the patch", async () => {
    const { wrapper, patches } = mountArea();

    await button(wrapper, "Hinzufügen").trigger("click");

    expect(patches).toHaveLength(1);
    expect(Object.keys(patches[0])).toEqual(["attachments"]);
    expect(patches[0].attachments).toEqual([
      expect.objectContaining({ id: expect.any(String), title: "" }),
    ]);
  });

  it("renames an attachment without changing the bookable it got", async () => {
    const { wrapper, patches, bookable, stored } = mountArea([AGB]);

    await open(wrapper);
    await wrapper.find("input[type='text']").setValue("Nutzungsbedingungen");

    expect(lastPatch(patches)).toEqual({
      attachments: [{ ...AGB, title: "Nutzungsbedingungen" }],
    });
    expect(bookable).toEqual(stored);
  });

  it("makes an attachment one to accept", async () => {
    const { wrapper, patches } = mountArea([AGB]);

    await open(wrapper);
    await toggleSwitch(wrapper, "Muss akzeptiert werden");

    expect(lastPatch(patches)).toEqual({
      attachments: [{ ...AGB, required: true }],
    });
  });

  it("removes an attachment", async () => {
    const { wrapper, patches } = mountArea([AGB]);

    await wrapper.find(".attachment-item button").trigger("click");

    expect(lastPatch(patches)).toEqual({ attachments: [] });
  });
});

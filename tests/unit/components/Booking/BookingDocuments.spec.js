import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingDocuments from "@/components/Booking/BookingDocuments.vue";

const RECEIPT = { type: "receipt", title: "BELEG-1.pdf", timeCreated: 1 };
const RECEIPT_2 = { type: "receipt", title: "BELEG-2.pdf", timeCreated: 2 };
const INVOICE = { type: "invoice", name: "RE-1.pdf", timeCreated: 3 };
const CANCELLATION = { type: "cancellation", title: "STORNO-1.pdf" };
const AGB = { type: "terms", title: "AGB.pdf", url: "https://x/agb.pdf" };

function groups(wrapper) {
  return wrapper.findAll(".booking-documents__group");
}

/**
 * The Dokumente block of CONTEXT.md: the four groups as dense lists with a
 * counter in the heading, "keine" for an empty group and a download icon per
 * row. The producing actions beside a group are the next ticket's; the block
 * only lists.
 */
describe("BookingDocuments", () => {
  it("lists all four groups with their counters, in the glossary's order", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: {
        attachments: [AGB, RECEIPT, INVOICE, RECEIPT_2, CANCELLATION],
      },
    });

    const headings = groups(wrapper).wrappers.map((group) =>
      group.find(".booking-documents__heading").text()
    );
    expect(headings).toEqual([
      "Belege (2)",
      "Rechnungen (1)",
      "Stornobelege (1)",
      "Anhänge (1)",
    ]);
  });

  it("reads „keine“ for an empty group and shows every group without attachments", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: { attachments: [] },
    });

    expect(groups(wrapper)).toHaveLength(4);
    groups(wrapper).wrappers.forEach((group) => {
      expect(group.find(".booking-documents__heading").text()).toMatch(
        /\(0\)$/
      );
      expect(group.find(".booking-documents__empty").text()).toBe("keine");
    });
  });

  it("lists only the groups named in `groups`, in the glossary's order", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: {
        attachments: [AGB, RECEIPT, INVOICE, CANCELLATION],
        groups: ["cancellations", "invoices"],
      },
    });

    const headings = groups(wrapper).wrappers.map((group) =>
      group.find(".booking-documents__heading").text()
    );
    expect(headings).toEqual(["Rechnungen (1)", "Stornobelege (1)"]);
  });

  it("names each document and emits `download` with its group and the item", async () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: { attachments: [RECEIPT, INVOICE] },
    });

    const rows = wrapper.findAll(".booking-documents__row");
    expect(rows.wrappers.map((row) => row.text())).toEqual(
      expect.arrayContaining([
        expect.stringContaining("BELEG-1.pdf"),
        expect.stringContaining("RE-1.pdf"),
      ])
    );

    await rows
      .filter((row) => row.text().includes("RE-1.pdf"))
      .at(0)
      .find(".booking-documents__download")
      .trigger("click");

    expect(wrapper.emitted("download")).toEqual([
      [{ group: "invoices", item: INVOICE }],
    ]);
  });
});

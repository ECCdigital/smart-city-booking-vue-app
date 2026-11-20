import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingDocuments from "@/components/Booking/BookingDocuments.vue";

const RECEIPT = { type: "receipt", title: "BELEG-1.pdf", timeCreated: 1 };
const RECEIPT_2 = { type: "receipt", title: "BELEG-2.pdf", timeCreated: 2 };
const INVOICE = { type: "invoice", name: "RE-1.pdf", timeCreated: 3 };
const CANCELLATION = { type: "cancellation", title: "STORNO-1.pdf" };
const AGB = { type: "terms", title: "AGB.pdf", url: "https://x/agb.pdf" };

function sections(wrapper) {
  return wrapper.findAll(".booking-documents__section");
}

function headings(wrapper) {
  return sections(wrapper).wrappers.map((section) =>
    section.find(".booking-documents__heading").text()
  );
}

/**
 * The Dokumente block of CONTEXT.md: Belege - every issued document, its
 * kind on each row - and Anhänge as dense lists with a counter in the
 * heading, "keine" for an empty section and a download icon per row. The
 * producing actions are BookingDocumentActions'; the block only lists.
 */
describe("BookingDocuments", () => {
  it("gathers receipts, invoices and cancellation receipts under Belege, above Anhänge", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: {
        attachments: [AGB, RECEIPT, INVOICE, RECEIPT_2, CANCELLATION],
      },
    });

    expect(headings(wrapper)).toEqual(["Belege (4)", "Anhänge (1)"]);
    const rows = wrapper
      .find(".booking-documents__section--receipts")
      .findAll(".booking-documents__row");
    expect(rows.wrappers.map((row) => row.text())).toEqual([
      expect.stringMatching(/BELEG-1\.pdf\s+Beleg · Ausgestellt am/),
      expect.stringMatching(/BELEG-2\.pdf\s+Beleg · Ausgestellt am/),
      expect.stringMatching(/RE-1\.pdf\s+Rechnung · Ausgestellt am/),
      expect.stringMatching(/STORNO-1\.pdf\s+Stornobeleg$/),
    ]);
  });

  it("reads „keine“ for an empty section and shows both without attachments", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: { attachments: [] },
    });

    expect(headings(wrapper)).toEqual(["Belege (0)", "Anhänge (0)"]);
    sections(wrapper).wrappers.forEach((section) => {
      expect(section.find(".booking-documents__empty").text()).toBe("keine");
    });
  });

  it("lists only the kinds named in `groups`, and no Anhänge unless named", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: {
        attachments: [AGB, RECEIPT, INVOICE, CANCELLATION],
        groups: ["cancellations", "invoices"],
      },
    });

    expect(headings(wrapper)).toEqual(["Belege (2)"]);
    expect(wrapper.text()).not.toContain("BELEG-1.pdf");
  });

  it("lists Widerrufbelege under Belege where asked for", () => {
    const wrapper = mountComponent(BookingDocuments, {
      propsData: {
        attachments: [
          { type: "withdrawal", title: "WIDERRUF-1.pdf" },
          CANCELLATION,
        ],
        groups: ["cancellations", "withdrawals", "attachments"],
      },
    });

    expect(headings(wrapper)).toEqual(["Belege (2)", "Anhänge (0)"]);
    expect(wrapper.find(".booking-documents__row--withdrawals").text()).toMatch(
      /WIDERRUF-1\.pdf\s+Widerrufbeleg/
    );
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

import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import Vuex from "vuex";
import { saveAs } from "file-saver";
import BookingExportButton from "@/components/Booking/BookingExportButton.vue";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

function booking(overrides = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    priceEur: 25,
    status: "requested",
    ...overrides,
  };
}

function store() {
  return new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: vi.fn() } } },
  });
}

/**
 * Picks "Als Excel exportieren" from the export menu and reads the sheet
 * handed to `saveAs` back as { header: value } rows.
 */
async function exportRows(bookings) {
  saveAs.mockClear();
  const wrapper = mountComponent(BookingExportButton, {
    propsData: { bookings, tenant: "t1" },
    store: store(),
  });
  await wrapper.find("button").trigger("click");
  await wrapper.vm.$nextTick();
  const excelEntry = [...document.querySelectorAll(".v-list-item")].find((el) =>
    el.textContent.includes("Als Excel exportieren")
  );
  excelEntry.click();
  await vi.waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));

  const blob = saveAs.mock.calls[0][0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  const sheet = workbook.getWorksheet("Buchungen");
  const headers = sheet.getRow(1).values.slice(1);
  const rows = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values = row.values.slice(1);
    rows.push(Object.fromEntries(headers.map((h, i) => [h, values[i]])));
  });
  return { headers, rows, autoFilter: sheet.autoFilter };
}

/**
 * The export carries the state as one column "Status" and the payment as
 * "Bezahlt" (Kostenfrei / Ja / Nein), both read off `booking.status`. The
 * old "Bestätigt" and "Abgelehnt" Ja/Nein columns are gone - a deliberate
 * format change (spec E6).
 */
describe("BookingExportButton", () => {
  it("writes the state's German label into a Status column", async () => {
    const { headers, rows } = await exportRows([
      booking({ id: "a", status: "payment_due" }),
      booking({ id: "b", status: "cancelled" }),
    ]);

    expect(headers).toContain("Status");
    expect(headers).not.toContain("Bestätigt");
    expect(headers).not.toContain("Abgelehnt");
    expect(rows.map((row) => row.Status)).toEqual([
      "Zahlung offen",
      "Storniert",
    ]);
  });

  it("answers Bezahlt with Kostenfrei, Ja or Nein off the state", async () => {
    const { rows } = await exportRows([
      booking({ id: "free", status: "requested", priceEur: 0 }),
      booking({ id: "confirmed", status: "confirmed" }),
      booking({ id: "due", status: "payment_due" }),
      booking({
        id: "cancelled-paid",
        status: "cancelled",
        cancellationRefund: { cancelledFrom: "confirmed" },
      }),
      booking({
        id: "cancelled-unpaid",
        status: "cancelled",
        cancellationRefund: { cancelledFrom: "payment_due" },
      }),
    ]);

    expect(rows.map((row) => [row["ID der Buchung"], row.Bezahlt])).toEqual([
      ["free", "Kostenfrei"],
      ["confirmed", "Ja"],
      ["due", "Nein"],
      ["cancelled-paid", "Ja"],
      ["cancelled-unpaid", "Nein"],
    ]);
  });

  it("spans the filter over every column", async () => {
    const { headers, autoFilter } = await exportRows([booking()]);

    expect(headers).toHaveLength(27);
    expect(autoFilter).toBe("A1:AA1");
  });

  it("keeps the rejection reason column", async () => {
    const { rows } = await exportRows([
      booking({ status: "rejected", rejectionReason: "Doppelt gebucht" }),
    ]);

    expect(rows[0].Ablehnungsgrund).toBe("Doppelt gebucht");
  });
});

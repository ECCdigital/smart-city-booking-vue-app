import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    generateReceipt: vi.fn(),
    generateInvoice: vi.fn(),
    reprintCancellationReceipt: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    generateGroupReceipt: vi.fn(),
    generateGroupInvoice: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowReprint: vi.fn(() => true) },
}));

import BookingDocumentActions from "@/components/Booking/BookingDocumentActions.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const CREATE_RECEIPT = "Beleg erstellen";
const REPRINT = "Neu ausstellen";
const INVOICE_MENU = "Rechnung";
const INVOICE = { type: "invoice", name: "RE-1.pdf", timeCreated: 1 };
const CANCELLATION = {
  type: "cancellation",
  title: "storno-1.pdf",
  timeCreated: 1_700_000_000_000,
};

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    status: "confirmed",
    paymentProvider: "manual",
    attachments: [],
    ...overrides,
  };
}

function mountActions(propsData = {}) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(BookingDocumentActions, {
    store,
    propsData: { booking: booking(), groupBooking: null, ...propsData },
  });
  return { wrapper, store };
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text() === label);
}

function toastMessages(store) {
  return store.getters["toasts/all"].map((toast) => toast.message);
}

/** The group `key` of the Dokumente block (receipts, invoices, cancellations, attachments). */
function group(wrapper, key) {
  return wrapper.find(`.booking-documents__group--${key}`);
}

/** The entries of the last opened menu, read off the document. */
async function openMenu(wrapper, selector) {
  await wrapper.find(selector).trigger("click");
  await wrapper.vm.$nextTick();
  const contents = document.querySelectorAll(".v-menu__content");
  return Array.from(
    contents[contents.length - 1].querySelectorAll(".v-list-item")
  );
}

async function clickEntry(wrapper, selector, label) {
  const entry = (await openMenu(wrapper, selector)).find((candidate) =>
    candidate.textContent.includes(label)
  );
  entry.click();
  await wrapper.vm.$nextTick();
}

/** Whether an aggregated-choice dialog asking `question` is open on the document. */
function dialogAsks(question) {
  return Array.from(document.querySelectorAll(".v-dialog--active")).some(
    (dialog) => dialog.textContent.includes(question)
  );
}

/**
 * The producing actions beside the Dokumente groups (spec E8): "Beleg
 * erstellen" at Bestätigt, the "Rechnung" menu over the invoice provider,
 * "Neu ausstellen" of the cancellation receipt at Abgelehnt / Storniert for
 * `booking.reprint`. Each shows `loading` while it runs, keeps its error as
 * an alert inside its group, toasts on success and asks the page to reload.
 */
describe("BookingDocumentActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowReprint.mockReturnValue(true);
  });

  describe("Belege", () => {
    it.each([
      ["requested", false],
      ["payment_due", false],
      ["confirmed", true],
      ["rejected", false],
      ["cancelled", false],
    ])("offers Beleg erstellen at %s: %s", (status, offered) => {
      const { wrapper } = mountActions({ booking: booking({ status }) });
      expect(!!button(wrapper, CREATE_RECEIPT)).toBe(offered);
    });

    it("creates the receipt over the route, toasts and asks for a reload", async () => {
      ApiBookingService.generateReceipt.mockResolvedValue({ success: true });
      const { wrapper, store } = mountActions();

      await button(wrapper, CREATE_RECEIPT).trigger("click");
      await flushPromises();

      expect(ApiBookingService.generateReceipt).toHaveBeenCalledWith("bk-1");
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(toastMessages(store)).toContain(
        "Der Buchungsbeleg wurde erfolgreich erstellt."
      );
    });

    it("keeps a refused receipt's reason as an alert inside Belege until a retry succeeds", async () => {
      ApiBookingService.generateReceipt.mockResolvedValue({
        success: false,
        errors: [{ code: "PAYED_STATUS" }],
      });
      const { wrapper, store } = mountActions();

      await button(wrapper, CREATE_RECEIPT).trigger("click");
      await flushPromises();

      expect(group(wrapper, "receipts").find(".v-alert").text()).toBe(
        "Die Buchung ist noch nicht bezahlt."
      );
      expect(toastMessages(store)).toContain(
        "Der Buchungsbeleg konnte nicht erstellt werden."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();

      ApiBookingService.generateReceipt.mockResolvedValue({ success: true });
      await button(wrapper, CREATE_RECEIPT).trigger("click");
      await flushPromises();

      expect(group(wrapper, "receipts").find(".v-alert").exists()).toBe(false);
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });

    it("shows loading on the button while the receipt is created", async () => {
      let resolve;
      ApiBookingService.generateReceipt.mockReturnValue(
        new Promise((r) => (resolve = r))
      );
      const { wrapper } = mountActions();

      await button(wrapper, CREATE_RECEIPT).trigger("click");
      expect(
        wrapper.find(".booking-document-actions__receipt").classes()
      ).toContain("v-btn--loading");

      resolve({ success: true });
      await flushPromises();
      expect(
        wrapper.find(".booking-document-actions__receipt").classes()
      ).not.toContain("v-btn--loading");
    });

    describe("for a member of a series", () => {
      const confirmed = booking({ status: "confirmed" });
      const series = (other) => ({
        id: "grp-1",
        bookingIds: ["bk-1", "bk-2"],
        bookings: [confirmed, booking({ id: "bk-2", status: other })],
      });
      const QUESTION =
        "Möchten Sie für die gesamte Serie einen Buchungsbeleg erstellen?";

      it.each([
        ["confirmed", true],
        ["payment_due", false],
        ["cancelled", false],
      ])(
        "offers Beleg erstellen to a confirmed member beside a %s one: %s",
        (other, offered) => {
          const { wrapper } = mountActions({
            booking: confirmed,
            groupBooking: series(other),
          });
          expect(!!button(wrapper, CREATE_RECEIPT)).toBe(offered);
        }
      );

      it("asks single or series once every member is confirmed", async () => {
        const { wrapper } = mountActions({
          booking: confirmed,
          groupBooking: series("confirmed"),
        });

        await button(wrapper, CREATE_RECEIPT).trigger("click");
        await wrapper.vm.$nextTick();

        expect(dialogAsks(QUESTION)).toBe(true);
        expect(ApiBookingService.generateReceipt).not.toHaveBeenCalled();
      });

      it("creates the series' aggregated receipt on „Sammelbeleg“", async () => {
        ApiGroupBookingService.generateGroupReceipt.mockResolvedValue({
          success: true,
        });
        const { wrapper, store } = mountActions({
          booking: confirmed,
          groupBooking: series("confirmed"),
        });

        await button(wrapper, CREATE_RECEIPT).trigger("click");
        await wrapper.vm.$nextTick();
        wrapper
          .findComponent({ name: "GroupBookingCreateReceipt" })
          .vm.$emit("create-group-booking-receipt");
        await flushPromises();

        expect(
          ApiGroupBookingService.generateGroupReceipt
        ).toHaveBeenCalledWith(undefined, "grp-1");
        expect(wrapper.emitted("reload")).toHaveLength(1);
        expect(toastMessages(store)).toContain(
          "Der Buchungsbeleg wurde erfolgreich erstellt."
        );
        await wrapper.vm.$nextTick();
        expect(dialogAsks(QUESTION)).toBe(false);
      });
    });
  });

  describe("Rechnungen", () => {
    it("offers the Rechnung menu over the invoice provider only", () => {
      const manual = mountActions();
      expect(button(manual.wrapper, INVOICE_MENU)).toBeUndefined();

      const invoice = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
      });
      expect(button(invoice.wrapper, INVOICE_MENU)).toBeDefined();
    });

    it("reads „erneut …“ once an invoice exists", async () => {
      const first = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
      });
      const before = await openMenu(
        first.wrapper,
        ".booking-document-actions__invoice"
      );
      expect(before.map((entry) => entry.textContent.trim())).toEqual([
        "Erstellen & versenden",
        "Nur erstellen",
      ]);

      const again = mountActions({
        booking: booking({
          paymentProvider: "invoice",
          attachments: [INVOICE],
        }),
      });
      const after = await openMenu(
        again.wrapper,
        ".booking-document-actions__invoice"
      );
      expect(after.map((entry) => entry.textContent.trim())).toEqual([
        "Erneut erstellen & versenden",
        "Erneut nur erstellen",
      ]);
    });

    it("creates and sends the invoice, toasts and asks for a reload", async () => {
      ApiBookingService.generateInvoice.mockResolvedValue({ success: true });
      const { wrapper, store } = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
      });

      await clickEntry(
        wrapper,
        ".booking-document-actions__invoice",
        "versenden"
      );
      await flushPromises();

      expect(ApiBookingService.generateInvoice).toHaveBeenCalledWith(
        "bk-1",
        true
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(toastMessages(store)).toContain(
        "Die Rechnung wurde erfolgreich erstellt."
      );
    });

    it("creates the invoice without sending on „Nur erstellen“, and keeps a failure inside Rechnungen", async () => {
      ApiBookingService.generateInvoice.mockRejectedValue(serverError());
      const { wrapper, store } = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
      });

      await clickEntry(
        wrapper,
        ".booking-document-actions__invoice",
        "Nur erstellen"
      );
      await flushPromises();

      expect(ApiBookingService.generateInvoice).toHaveBeenCalledWith(
        "bk-1",
        false
      );
      expect(group(wrapper, "invoices").find(".v-alert").text()).toBe(
        "Die Rechnung konnte nicht erstellt werden."
      );
      expect(toastMessages(store)).toContain(
        "Die Rechnung konnte nicht erstellt werden."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });

    it("closes the aggregated choice as the call starts and keeps a refusal inside the group", async () => {
      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: false,
        errors: [{ code: "STATUS_MISMATCH" }],
      });
      const { wrapper } = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
        groupBooking: { id: "grp-1", bookingIds: ["bk-1", "bk-2"] },
      });
      const QUESTION =
        "Möchten Sie eine Sammel- oder Einzelrechnung erstellen?";

      await clickEntry(
        wrapper,
        ".booking-document-actions__invoice",
        "versenden"
      );
      await wrapper.vm.$nextTick();
      wrapper
        .findComponent({ name: "GroupBookingCreateInvoice" })
        .vm.$emit("create-group-invoice");
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(dialogAsks(QUESTION)).toBe(false);
      expect(group(wrapper, "invoices").find(".v-alert").text()).toBe(
        "Die Buchungen haben unterschiedliche Status."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });

    it("asks a series member for a single or aggregated invoice, and creates the Sammelrechnung", async () => {
      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: true,
      });
      const { wrapper, store } = mountActions({
        booking: booking({ paymentProvider: "invoice" }),
        groupBooking: { id: "grp-1", bookingIds: ["bk-1", "bk-2"] },
      });

      await clickEntry(
        wrapper,
        ".booking-document-actions__invoice",
        "versenden"
      );
      await wrapper.vm.$nextTick();
      expect(
        dialogAsks("Möchten Sie eine Sammel- oder Einzelrechnung erstellen?")
      ).toBe(true);
      expect(ApiBookingService.generateInvoice).not.toHaveBeenCalled();

      wrapper
        .findComponent({ name: "GroupBookingCreateInvoice" })
        .vm.$emit("create-group-invoice");
      await flushPromises();

      expect(ApiGroupBookingService.generateGroupInvoice).toHaveBeenCalledWith(
        undefined,
        "grp-1",
        true
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(toastMessages(store)).toContain(
        "Die Sammelrechnung wurde erfolgreich erstellt."
      );
    });
  });

  describe("Stornobelege", () => {
    it.each([
      ["requested", false],
      ["payment_due", false],
      ["confirmed", false],
      ["rejected", true],
      ["cancelled", true],
    ])("offers Neu ausstellen at %s: %s", (status, offered) => {
      const { wrapper } = mountActions({ booking: booking({ status }) });
      expect(!!button(wrapper, REPRINT)).toBe(offered);
    });

    it("keeps the reprint from a reader without the reprint right", () => {
      BookingPermissionService.allowReprint.mockReturnValue(false);
      const { wrapper } = mountActions({
        booking: booking({ status: "cancelled" }),
      });
      expect(button(wrapper, REPRINT)).toBeUndefined();
    });

    it("lists the receipts already issued beside the reprint", () => {
      const { wrapper } = mountActions({
        booking: booking({ status: "cancelled", attachments: [CANCELLATION] }),
      });
      expect(group(wrapper, "cancellations").text()).toContain("storno-1.pdf");
      expect(button(wrapper, REPRINT)).toBeDefined();
    });

    it("reprints over the route, toasts and asks for a reload", async () => {
      ApiBookingService.reprintCancellationReceipt.mockResolvedValue({
        success: true,
        data: booking({ status: "cancelled", attachments: [CANCELLATION] }),
        errors: [],
      });
      const { wrapper, store } = mountActions({
        booking: booking({ status: "cancelled" }),
      });

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(ApiBookingService.reprintCancellationReceipt).toHaveBeenCalledWith(
        "bk-1"
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(toastMessages(store)).toContain(
        "Der Stornobeleg wurde erneut ausgestellt."
      );
    });

    it("shows the reader's message on a 409 inside Stornobelege and asks for a reload", async () => {
      ApiBookingService.reprintCancellationReceipt.mockRejectedValue(
        lifecycleError(409, "not_cancelled", { bookingId: "bk-1" })
      );
      const { wrapper, store } = mountActions({
        booking: booking({ status: "cancelled" }),
      });

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(toastMessages(store)).toContain(
        "Die Buchung ist nicht storniert."
      );
      expect(group(wrapper, "cancellations").find(".v-alert").text()).toBe(
        "Die Buchung ist nicht storniert."
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });
  });
});

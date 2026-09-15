import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    generateGroupInvoice: vi.fn(),
    reprintGroupCancellationReceipt: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowReprint: vi.fn(() => true) },
}));

import GroupBookingDocumentActions from "@/components/Booking/GroupBookingDocumentActions.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const REPRINT = "Neu ausstellen";
const INVOICE_MENU = "Sammelrechnung";
const INVOICE = { type: "invoice", name: "RE-1.pdf", timeCreated: 1 };

function member(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    status: "confirmed",
    paymentProvider: "invoice",
    attachments: [],
    ...overrides,
  };
}

/** A series of members at `statuses`; a member given as an object carries its own fields. */
function series(statuses) {
  const bookings = statuses.map((status, index) =>
    member({
      id: `bk-${index + 1}`,
      ...(typeof status === "string" ? { status } : status),
    })
  );
  return {
    id: "grp-1",
    tenantId: "tenant-1",
    bookingIds: bookings.map((b) => b.id),
    bookings,
  };
}

function mountActions(groupBooking) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(GroupBookingDocumentActions, {
    store,
    propsData: { groupBooking },
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

function group(wrapper, key) {
  return wrapper.find(`.booking-documents__group--${key}`);
}

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

/**
 * The Dokumente of a Serienbuchungsseite with the series' producing actions
 * beside the groups: the "Sammelrechnung" menu over the invoice provider and
 * "Neu ausstellen" of the aggregated cancellation receipt once every member
 * is cancelled (spec E8). Same feedback as the single booking's: `loading`
 * on the button, an alert inside the group until a retry succeeds, a toast
 * and `reload` on success.
 */
describe("GroupBookingDocumentActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowReprint.mockReturnValue(true);
  });

  describe("the Sammelrechnung", () => {
    it("offers the menu only where every member pays by invoice", () => {
      const invoice = mountActions(series(["confirmed", "confirmed"]));
      expect(button(invoice.wrapper, INVOICE_MENU)).toBeDefined();

      const mixed = mountActions(
        series([
          "confirmed",
          { status: "confirmed", paymentProvider: "manual" },
        ])
      );
      expect(button(mixed.wrapper, INVOICE_MENU)).toBeUndefined();
    });

    it("creates and sends the aggregated invoice, toasts and asks the page to reload", async () => {
      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: true,
      });
      const { wrapper, store } = mountActions(series(["confirmed"]));

      await clickEntry(
        wrapper,
        ".group-booking-document-actions__invoice",
        "Erstellen & versenden"
      );
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

    it("reads „erneut“ once an invoice exists and creates without sending", async () => {
      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: true,
      });
      const { wrapper } = mountActions(
        series([{ status: "confirmed", attachments: [INVOICE] }])
      );

      const entries = (
        await openMenu(wrapper, ".group-booking-document-actions__invoice")
      ).map((entry) => entry.textContent.trim());
      expect(entries).toEqual([
        "Erneut erstellen & versenden",
        "Erneut nur erstellen",
      ]);

      await clickEntry(
        wrapper,
        ".group-booking-document-actions__invoice",
        "Erneut nur erstellen"
      );
      await flushPromises();
      expect(ApiGroupBookingService.generateGroupInvoice).toHaveBeenCalledWith(
        undefined,
        "grp-1",
        false
      );
    });

    it("keeps a refusal as an alert inside Rechnungen until a retry succeeds", async () => {
      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: false,
        errors: [{ code: "GROUP_BOOKING_NOT_FOUND" }],
      });
      const { wrapper } = mountActions(series(["confirmed"]));

      await clickEntry(
        wrapper,
        ".group-booking-document-actions__invoice",
        "Nur erstellen"
      );
      await flushPromises();

      expect(group(wrapper, "invoices").find(".v-alert").exists()).toBe(true);
      expect(wrapper.emitted("reload")).toBeUndefined();

      ApiGroupBookingService.generateGroupInvoice.mockResolvedValue({
        success: true,
      });
      await clickEntry(
        wrapper,
        ".group-booking-document-actions__invoice",
        "Nur erstellen"
      );
      await flushPromises();
      expect(group(wrapper, "invoices").find(".v-alert").exists()).toBe(false);
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });
  });

  describe("the cancellation receipt", () => {
    it("offers the reprint once every member is cancelled or rejected", () => {
      expect(
        button(mountActions(series(["cancelled", "rejected"])).wrapper, REPRINT)
      ).toBeDefined();
      expect(
        button(
          mountActions(series(["cancelled", "confirmed"])).wrapper,
          REPRINT
        )
      ).toBeUndefined();
    });

    it("keeps the reprint from a reader without the reprint right", () => {
      BookingPermissionService.allowReprint.mockReturnValue(false);
      const { wrapper } = mountActions(series(["cancelled", "cancelled"]));
      expect(button(wrapper, REPRINT)).toBeUndefined();
    });

    it("reprints over the series' route and asks the page to reload", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockResolvedValue({
        success: true,
        errors: [],
      });
      const { wrapper, store } = mountActions(
        series(["cancelled", "cancelled"])
      );

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(
        ApiGroupBookingService.reprintGroupCancellationReceipt
      ).toHaveBeenCalledWith(undefined, "grp-1");
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(toastMessages(store)).toContain(
        "Der Stornobeleg der Serie wurde erneut ausgestellt."
      );
    });

    it("shows the reader's message on a 409 inside Stornobelege and reloads", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockRejectedValue(
        lifecycleError(409, "not_cancelled", {
          groupBookingId: "grp-1",
          bookingId: "bk-2",
        })
      );
      const { wrapper } = mountActions(series(["cancelled", "cancelled"]));

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(group(wrapper, "cancellations").text()).toContain(
        "Die Buchung ist nicht storniert."
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });
  });
});

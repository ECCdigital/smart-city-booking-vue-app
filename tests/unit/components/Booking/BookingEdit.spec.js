import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBooking: vi.fn(),
    storeBooking: vi.fn(),
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    updateGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantActivePaymentApps: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookable: vi.fn(), getBookablePrices: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { validateCheckoutItem: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true) },
}));
vi.mock("@/components/Checkout/CheckoutCalendar.vue", () => ({
  default: {
    name: "CheckoutCalendar",
    render(h) {
      return h("div");
    },
  },
}));

import BookingEdit from "@/components/Booking/BookingEdit.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";

const CONFLICT_IN_CANCELLED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Storniert).";
const GONE = "Die Buchung existiert nicht mehr.";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    name: "Erika Muster",
    mail: "erika@example.org",
    timeBegin: 1_700_000_000_000,
    timeEnd: 1_700_003_600_000,
    priceEur: 25,
    status: "requested",
    bookableItems: [
      {
        bookableId: "room-1",
        amount: 1,
        _bookableUsed: {
          id: "room-1",
          title: "Raum 1",
          type: "room",
          priceType: "per-hour",
          priceCategories: [{ priceEur: 25, fixedPrice: false }],
        },
      },
    ],
    ...overrides,
  };
}

async function mountEdit(propsData = {}) {
  ApiTenantService.getTenantActivePaymentApps.mockResolvedValue({ data: [] });
  const store = new Vuex.Store({
    modules: {
      toasts,
      tenants: {
        namespaced: true,
        getters: {
          tenants: () => [{ id: "tenant-1", name: "Stadt" }],
          currentTenantId: () => "tenant-1",
        },
      },
    },
  });
  const wrapper = mountComponent(BookingEdit, {
    store,
    propsData: {
      booking: booking(),
      bookables: [],
      workflow: {},
      groupBooking: null,
      ...propsData,
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return { wrapper, store };
}

function inlineError(wrapper) {
  return wrapper.find(".booking-transition-error");
}

function actionButton(wrapper, label) {
  return wrapper
    .findAll("button.booking-action")
    .wrappers.find((button) => button.text() === label);
}

function menuButton(wrapper) {
  return wrapper.find("button.booking-action-menu");
}

/** Opens the headline's side-way menu and clicks the entry with `label`; the menu detaches into `data-app`. */
async function clickMenuEntry(wrapper, label) {
  await menuButton(wrapper).trigger("click");
  await wrapper.vm.$nextTick();
  const entry = Array.from(
    document.querySelectorAll(".v-menu__content .booking-action-secondary")
  ).find((candidate) => candidate.textContent.trim() === label);
  entry.click();
  await wrapper.vm.$nextTick();
}

function reasonInput(wrapper) {
  return wrapper.find(".booking-status-reason textarea");
}

function nameInput(wrapper) {
  return wrapper
    .findAllComponents({ name: "v-text-field" })
    .wrappers.find((field) => field.props("label") === "Name *")
    .find("input");
}

/** Clicks the button with `label` inside the open dialog of the transition module. */
async function clickDialogButton(wrapper, label) {
  const button = Array.from(
    document.querySelectorAll(".v-dialog--active button")
  ).find((el) => el.textContent.trim() === label);
  button.click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

async function submit(wrapper) {
  wrapper.findComponent({ name: "SaveBar" }).vm.$emit("submit");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function putBody() {
  return ApiBookingService.storeBooking.mock.calls[0][0];
}

/**
 * The form hosts the transition module through its status section (spec E2,
 * E3): a button runs a transition, the form reloads the booking afterwards,
 * and a refused one is shown inline (spec E5) with a reload after a 409 or
 * 404. The save PUT carries content only (spec E1.1); a create carries the
 * chosen initial state as `status` (spec E10). Nothing here sends a flag.
 */
describe("BookingEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 25,
    });
  });

  describe("Ablehnen", () => {
    async function reject(wrapper, refundPercentage) {
      await clickMenuEntry(wrapper, "Ablehnen");
      await flushPromises();
      await wrapper.vm.$nextTick();
      const dialog = wrapper.findComponent({
        name: "BookingRejectConformationDialog",
      });
      dialog.vm.$emit(
        "reject-booking",
        "bk-1",
        "Grund",
        false,
        undefined,
        refundPercentage
      );
      await flushPromises();
      await wrapper.vm.$nextTick();
      return dialog;
    }

    it("shows the conflict inline and asks for a reload on a 409", async () => {
      const { wrapper } = await mountEdit();
      ApiBookingService.rejectBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      const dialog = await reject(wrapper, 100);

      expect(inlineError(wrapper).text()).toBe(CONFLICT_IN_CANCELLED);
      expect(dialog.props("error")).toBe(CONFLICT_IN_CANCELLED);
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("still reads the naked `invalid_refund_percentage` string of a 400", async () => {
      const { wrapper } = await mountEdit();
      const error = new Error("Request failed with status code 400");
      error.response = { status: 400, data: "invalid_refund_percentage" };
      ApiBookingService.rejectBooking.mockRejectedValue(error);

      await reject(wrapper, 150);

      expect(inlineError(wrapper).text()).toBe(
        "Der Wert muss zwischen 0 und 100 liegen"
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });
  });

  describe("Wiederherstellen", () => {
    async function reinstate(wrapper) {
      await actionButton(wrapper, "Wiederherstellen").trigger("click");
      await flushPromises();
      await wrapper.vm.$nextTick();
      await clickDialogButton(wrapper, "Wiederherstellen");
    }

    it("posts to the reinstate route and reloads the booking", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({ status: "rejected" }),
      });
      ApiBookingService.reinstateBooking.mockResolvedValue({
        success: true,
        data: null,
        errors: [],
      });

      await reinstate(wrapper);

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1");
      expect(ApiBookingService.storeBooking).not.toHaveBeenCalled();
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
      expect(inlineError(wrapper).exists()).toBe(false);
    });

    it("says the booking is gone and asks for a reload on a 404", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({ status: "rejected" }),
      });
      ApiBookingService.reinstateBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found", { bookingId: "bk-1" })
      );

      await reinstate(wrapper);

      expect(inlineError(wrapper).text()).toBe(GONE);
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });
  });

  describe("the paid date", () => {
    function paymentDateField(wrapper) {
      return wrapper
        .findAllComponents({ name: "v-text-field" })
        .wrappers.find((field) => field.props("label") === "Bezahldatum");
    }

    it("is editable at Bestätigt only, not on a booking cancelled out of it", async () => {
      const confirmed = await mountEdit({
        booking: booking({ status: "confirmed", timePaid: 1_700_000_000_000 }),
      });
      expect(paymentDateField(confirmed.wrapper).props("disabled")).toBe(false);

      const cancelled = await mountEdit({
        booking: booking({
          status: "cancelled",
          timePaid: 1_700_000_000_000,
          cancellationRefund: { cancelledFrom: "confirmed" },
        }),
      });
      expect(paymentDateField(cancelled.wrapper).props("disabled")).toBe(true);
    });
  });

  describe("the actions while the form is dirty", () => {
    it("are locked once a field is edited, with the hint to save first", async () => {
      const { wrapper } = await mountEdit();
      expect(actionButton(wrapper, "Freigeben").element.disabled).toBe(false);

      await nameInput(wrapper).setValue("Max Muster");
      await wrapper.vm.$nextTick();

      expect(actionButton(wrapper, "Freigeben").element.disabled).toBe(true);
      expect(menuButton(wrapper).element.disabled).toBe(true);
      expect(wrapper.find(".booking-status-hint").text()).toContain(
        "Erst speichern"
      );
    });
  });

  describe("Speichern", () => {
    it("sends content only on an update - no flag, no status", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({
          _id: "mongo-1",
          status: "confirmed",
          isCommitted: true,
          isPayed: true,
          isRejected: false,
        }),
      });
      ApiBookingService.storeBooking.mockResolvedValue({ data: {} });
      await nameInput(wrapper).setValue("Max Muster");

      await submit(wrapper);

      expect(putBody()).toMatchObject({ id: "bk-1", name: "Max Muster" });
      ["_id", "status", "isCommitted", "isPayed", "isRejected"].forEach((key) =>
        expect(putBody()).not.toHaveProperty(key)
      );
      expect(wrapper.emitted("saved")).toHaveLength(1);
    });

    it("sends the reason typed under the path with a cancelled booking", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({ status: "cancelled", rejectionReason: "Alt" }),
      });
      ApiBookingService.storeBooking.mockResolvedValue({ data: {} });

      await reasonInput(wrapper).setValue("Zu spät");
      await wrapper.vm.$nextTick();
      expect(actionButton(wrapper, "Wiederherstellen").element.disabled).toBe(
        true
      );

      await submit(wrapper);

      expect(putBody()).toMatchObject({
        id: "bk-1",
        rejectionReason: "Zu spät",
      });
    });

    it("sends the chosen initial state and no flag on a create", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({
          id: null,
          status: undefined,
          paymentProvider: "invoice",
        }),
      });
      ApiBookingService.storeBooking.mockResolvedValue({ data: {} });
      wrapper
        .findComponent({ name: "BookingEditStatus" })
        .vm.$emit("update:initial-state", {
          selection: "paid",
          paymentMethod: "CASH",
          timePaid: 1_700_000_000_000,
        });

      await submit(wrapper);

      expect(putBody()).toMatchObject({
        status: "confirmed",
        paymentMethod: "CASH",
        timePaid: 1_700_000_000_000,
      });
      ["isCommitted", "isPayed", "isRejected"].forEach((key) =>
        expect(putBody()).not.toHaveProperty(key)
      );
      expect(wrapper.emitted("saved")).toHaveLength(1);
    });

    it("creates as Angefragt when nothing else was chosen", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({
          id: null,
          status: undefined,
          paymentProvider: "invoice",
        }),
      });
      ApiBookingService.storeBooking.mockResolvedValue({ data: {} });

      await submit(wrapper);

      expect(putBody().status).toBe("requested");
    });

    it("names the missing payment inline when the create is refused with a 400", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({
          id: null,
          status: undefined,
          paymentProvider: "invoice",
        }),
      });
      ApiBookingService.storeBooking.mockRejectedValue(
        lifecycleError(400, "missing_payment_details", {
          status: "confirmed",
          missing: ["paymentMethod"],
        })
      );

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(
        "Eine als bezahlt angelegte Buchung braucht Zahlungsart und Zahldatum."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("shows the conflict inline and asks for a reload on a 409", async () => {
      const { wrapper } = await mountEdit();
      ApiBookingService.storeBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(CONFLICT_IN_CANCELLED);
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("names a refused status change inline without a reload on a 400", async () => {
      const { wrapper } = await mountEdit();
      ApiBookingService.storeBooking.mockRejectedValue(
        lifecycleError(400, "invalid_status_change", {
          status: "confirmed",
          requested: "requested",
        })
      );

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(
        "Dieser Statuswechsel ist nicht möglich."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });
  });
});

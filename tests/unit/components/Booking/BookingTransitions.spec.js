import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import i18n from "@/language/index";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
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
    getCancellationRefundPreview: vi.fn(),
  },
}));

import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";

const OK = { success: true, data: null, errors: [] };
const CONFLICT_IN_CONFIRMED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Bestätigt).";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    priceEur: 25,
    paymentProvider: "invoice",
    status: "requested",
    ...overrides,
  };
}

function series(memberOverrides = [{}, { id: "bk-2" }]) {
  const bookings = memberOverrides.map((overrides) => booking(overrides));
  return {
    booking: bookings[0],
    groupBooking: { id: "grp-1", bookingIds: bookings.map((b) => b.id) },
    bookings,
  };
}

function mountTransitions() {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(BookingTransitions, { store });
  return { wrapper, store };
}

async function start(wrapper, action, target) {
  wrapper.vm.start(action, target);
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function toastMessages(store) {
  return store.getters["toasts/all"].map((toast) => toast.message);
}

function dialog(wrapper, name) {
  return wrapper.findComponent({ name });
}

/** Clicks the button with `label` inside any open dialog. */
async function clickDialogButton(wrapper, label) {
  const button = Array.from(
    document.querySelectorAll(".v-dialog--active button")
  ).find((el) => el.textContent.trim() === label);
  button.click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The one module that owns the four transitions (spec E2, E3): a host hands
 * it `start(action, target)`, it opens the dialog the action needs, calls the
 * route, and reports `transitioned` or `failed`. Errors follow spec E5 - read
 * centrally, toasted, kept inline in the open dialog, and `refetch` set after
 * a 409 or 404 so the host reloads.
 */
describe("BookingTransitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 25,
    });
    ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 50,
    });
  });

  describe("confirm", () => {
    it("calls the commit route straight away and reports the transition", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.commitBooking.mockResolvedValue(OK);

      await start(wrapper, "confirm", { booking: booking() });

      expect(ApiBookingService.commitBooking).toHaveBeenCalledWith("bk-1");
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "confirm", bookingId: "bk-1" }],
      ]);
      expect(toastMessages(store)).toContain(
        "Die Buchung wurde erfolgreich freigegeben."
      );
    });

    it("names the state the booking moved to and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "confirm",
        })
      );

      await start(wrapper, "confirm", { booking: booking() });

      expect(wrapper.emitted("transitioned")).toBeUndefined();
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: CONFLICT_IN_CONFIRMED,
        refetch: true,
      });
      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
    });

    it("says the booking is gone and asks for a reload on a 404", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found", { bookingId: "bk-1" })
      );

      await start(wrapper, "confirm", { booking: booking() });

      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        message: "Die Buchung existiert nicht mehr.",
        refetch: true,
      });
    });

    it("keeps the consistency check's own message on a 200 with success false", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.commitBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [{ code: "PAYMENT_PROVIDER_REQUIRED" }],
      });

      await start(wrapper, "confirm", { booking: booking() });

      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message:
          "Die Buchung hat keinen Zahlungsanbieter hinterlegt. Bitte wähle einen aus.",
        refetch: false,
      });
      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
    });

    it("falls back to the generic message and asks for no reload on a 500", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.commitBooking.mockRejectedValue(serverError());

      await start(wrapper, "confirm", { booking: booking() });

      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        message: "Die Buchung konnte nicht freigegeben werden.",
        refetch: false,
      });
      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
    });

    it("refuses a priced booking without a payment provider before calling", async () => {
      const { wrapper, store } = mountTransitions();

      await start(wrapper, "confirm", {
        booking: booking({ paymentProvider: null }),
      });

      expect(ApiBookingService.commitBooking).not.toHaveBeenCalled();
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        refetch: false,
      });
      expect(toastMessages(store)).toContain(
        i18n.t("booking.commit.no-payment-method.message")
      );
    });
  });

  describe("confirm of a series member", () => {
    it("asks whether to confirm the whole series and confirms it", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.commitGroupBooking.mockResolvedValue(OK);

      await start(wrapper, "confirm", series());
      expect(ApiBookingService.commitBooking).not.toHaveBeenCalled();
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("open")).toBe(
        true
      );

      await clickDialogButton(wrapper, "Serie freigeben");

      expect(ApiGroupBookingService.commitGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1"
      );
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "confirm", groupBookingId: "grp-1" }],
      ]);
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("open")).toBe(
        false
      );
    });

    it("confirms only the one booking when asked to", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.commitBooking.mockResolvedValue(OK);

      await start(wrapper, "confirm", series());
      await clickDialogButton(wrapper, "Nur diese Buchung freigeben");

      expect(ApiBookingService.commitBooking).toHaveBeenCalledWith("bk-1");
      expect(ApiGroupBookingService.commitGroupBooking).not.toHaveBeenCalled();
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "confirm", bookingId: "bk-1" }],
      ]);
    });

    it("lists the diverging members in the dialog and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiGroupBookingService.commitGroupBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { bookingIds: ["bk-2"] })
      );

      await start(wrapper, "confirm", series());
      await clickDialogButton(wrapper, "Serie freigeben");

      const expected =
        "Die Buchung ist inzwischen in einem anderen Zustand. Betroffene Buchungen: bk-2";
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: expected,
        refetch: true,
      });
      expect(toastMessages(store)).toContain(expected);
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("error")).toBe(
        expected
      );
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("open")).toBe(
        true
      );
    });

    it("refuses the series-wide confirm while the members are in mixed states", async () => {
      const { wrapper, store } = mountTransitions();

      await start(
        wrapper,
        "confirm",
        series([{}, { id: "bk-2", status: "confirmed" }])
      );
      await clickDialogButton(wrapper, "Serie freigeben");

      expect(ApiGroupBookingService.commitGroupBooking).not.toHaveBeenCalled();
      const expected = i18n.t("group-booking.transition.mixed.message");
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: expected,
        refetch: false,
      });
      expect(toastMessages(store)).toContain(expected);
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("error")).toBe(
        expected
      );
    });
  });

  describe("pay", () => {
    const due = () => booking({ status: "payment_due" });

    async function payWith(wrapper, payload) {
      dialog(wrapper, "BookingPayDialog").vm.$emit("pay-single-booking", {
        id: "bk-1",
        paymentMethod: "CASH",
        timePaid: 1_700_000_000_000,
        ...payload,
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
    }

    it("asks for payment method and date, then posts them to the pay route", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.payBooking.mockResolvedValue(OK);

      await start(wrapper, "pay", { booking: due() });
      const payDialog = dialog(wrapper, "BookingPayDialog");
      expect(payDialog.props("open")).toBe(true);
      expect(payDialog.props("hasGroupBooking")).toBe(false);
      expect(ApiBookingService.payBooking).not.toHaveBeenCalled();

      await payWith(wrapper, {});

      expect(ApiBookingService.payBooking).toHaveBeenCalledWith(
        "bk-1",
        "CASH",
        1_700_000_000_000
      );
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "pay", bookingId: "bk-1" }],
      ]);
      expect(payDialog.props("open")).toBe(false);
    });

    it("keeps the dialog open with the conflict and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.payBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "pay",
        })
      );

      await start(wrapper, "pay", { booking: due() });
      await payWith(wrapper, {});

      const payDialog = dialog(wrapper, "BookingPayDialog");
      expect(payDialog.props("open")).toBe(true);
      expect(payDialog.props("error")).toBe(CONFLICT_IN_CONFIRMED);
      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "pay",
        refetch: true,
      });
    });

    it("offers the whole series and pays it through the group route", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.payGroupBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "pay",
        series([
          { status: "payment_due" },
          { id: "bk-2", status: "payment_due" },
        ])
      );
      const payDialog = dialog(wrapper, "BookingPayDialog");
      expect(payDialog.props("hasGroupBooking")).toBe(true);
      payDialog.vm.$emit("pay-group-booking", {
        paymentMethod: "TRANSFER",
        timePaid: null,
      });
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(ApiGroupBookingService.payGroupBooking).toHaveBeenCalledWith({
        id: "grp-1",
        paymentMethod: "TRANSFER",
        timePaid: null,
      });
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "pay", groupBookingId: "grp-1" }],
      ]);
    });
  });

  describe("cancel", () => {
    async function rejectWith(wrapper) {
      dialog(wrapper, "BookingRejectConformationDialog").vm.$emit(
        "reject-booking",
        "bk-1",
        "Grund",
        false,
        undefined,
        50
      );
      await flushPromises();
      await wrapper.vm.$nextTick();
    }

    it("asks for the reason and posts the cancellation to the reject route", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.rejectBooking.mockResolvedValue({ data: "" });

      await start(wrapper, "cancel", { booking: booking() });
      const rejectDialog = dialog(wrapper, "BookingRejectConformationDialog");
      expect(rejectDialog.props("open")).toBe(true);
      expect(rejectDialog.props("toReject")).toMatchObject({ id: "bk-1" });

      await rejectWith(wrapper);

      expect(ApiBookingService.rejectBooking).toHaveBeenCalledWith(
        "bk-1",
        null,
        "Grund",
        false,
        undefined,
        50
      );
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "cancel", bookingId: "bk-1" }],
      ]);
      expect(rejectDialog.props("open")).toBe(false);
      expect(toastMessages(store)).toContain(
        "Die Buchung wurde erfolgreich storniert."
      );
    });

    it("names the conflict in the dialog and asks for a reload on a 409", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.rejectBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      await start(wrapper, "cancel", { booking: booking() });
      await rejectWith(wrapper);

      const expected =
        "Die Buchung ist inzwischen in einem anderen Zustand (Storniert).";
      expect(
        dialog(wrapper, "BookingRejectConformationDialog").props("error")
      ).toBe(expected);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "cancel",
        message: expected,
        refetch: true,
      });
    });

    it("still reads the naked `invalid_refund_percentage` string of a 400", async () => {
      const { wrapper, store } = mountTransitions();
      const error = new Error("Request failed with status code 400");
      error.response = { status: 400, data: "invalid_refund_percentage" };
      ApiBookingService.rejectBooking.mockRejectedValue(error);

      await start(wrapper, "cancel", { booking: booking() });
      await rejectWith(wrapper);

      const expected = i18n.t("booking.cancellationRefund.percentageRange");
      expect(toastMessages(store)).toContain(expected);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        message: expected,
        refetch: false,
      });
    });

    it("offers the whole series and cancels it through the group route", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.rejectGroupBooking.mockResolvedValue(OK);

      await start(wrapper, "cancel", series());
      const groupDialog = dialog(
        wrapper,
        "GroupBookingRejectConformationDialog"
      );
      expect(groupDialog.props("open")).toBe(true);
      expect(groupDialog.props("groupBookingId")).toBe("grp-1");
      expect(groupDialog.props("groupBookings")).toHaveLength(2);
      groupDialog.vm.$emit(
        "reject-group-booking",
        "bk-1",
        "Grund",
        true,
        undefined,
        undefined
      );
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(ApiGroupBookingService.rejectGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1",
        "Grund",
        true,
        undefined,
        undefined
      );
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "cancel", groupBookingId: "grp-1" }],
      ]);
    });

    it("cancels only the one member when asked to", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.rejectBooking.mockResolvedValue({ data: "" });

      await start(wrapper, "cancel", series());
      dialog(wrapper, "GroupBookingRejectConformationDialog").vm.$emit(
        "reject-single-booking",
        "bk-1",
        "Grund",
        true,
        undefined,
        undefined
      );
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(ApiBookingService.rejectBooking).toHaveBeenCalledWith(
        "bk-1",
        null,
        "Grund",
        true,
        undefined,
        undefined
      );
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "cancel", bookingId: "bk-1" }],
      ]);
    });
  });

  describe("reinstate", () => {
    it("asks once, then posts to the reinstate route", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.reinstateBooking.mockResolvedValue(OK);

      await start(wrapper, "reinstate", {
        booking: booking({ status: "rejected" }),
      });
      expect(ApiBookingService.reinstateBooking).not.toHaveBeenCalled();
      expect(document.querySelector(".v-dialog--active").textContent).toContain(
        "Buchung wiederherstellen"
      );

      await clickDialogButton(wrapper, "Wiederherstellen");

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1");
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "reinstate", bookingId: "bk-1" }],
      ]);
      expect(toastMessages(store)).toContain(
        "Die Buchung wurde wiederhergestellt."
      );
      expect(document.querySelector(".v-dialog--active")).toBeNull();
    });

    it("says where a cancelled booking goes back to", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "reinstate", {
        booking: booking({ status: "cancelled" }),
      });

      expect(document.querySelector(".v-dialog--active").textContent).toContain(
        "Stornobelege bleiben"
      );
    });

    it("reinstates only the one booking - a series has no reinstate", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.reinstateBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "reinstate",
        series([{ status: "cancelled" }, { id: "bk-2", status: "cancelled" }])
      );
      await clickDialogButton(wrapper, "Wiederherstellen");

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1");
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "reinstate", bookingId: "bk-1" }],
      ]);
    });

    it("keeps the dialog open with the conflict and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.reinstateBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "reinstate",
        })
      );

      await start(wrapper, "reinstate", {
        booking: booking({ status: "cancelled" }),
      });
      await clickDialogButton(wrapper, "Wiederherstellen");

      expect(document.querySelector(".v-dialog--active").textContent).toContain(
        CONFLICT_IN_CONFIRMED
      );
      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "reinstate",
        message: CONFLICT_IN_CONFIRMED,
        refetch: true,
      });
    });
  });

  describe("an action the state does not allow", () => {
    it("is refused before anything is called", async () => {
      const { wrapper, store } = mountTransitions();

      await start(wrapper, "pay", {
        booking: booking({ status: "requested" }),
      });

      expect(ApiBookingService.payBooking).not.toHaveBeenCalled();
      expect(document.querySelector(".v-dialog--active")).toBeNull();
      const expected = i18n.t("booking.transition.not-allowed.message");
      expect(toastMessages(store)).toContain(expected);
      expect(wrapper.emitted("failed")).toEqual([
        [{ action: "pay", error: null, message: expected, refetch: false }],
      ]);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
  validationError,
} from "@tests/unit/support/api";
import { dialogButton } from "@tests/unit/support/dialog";
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
    acceptWithdrawal: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    reinstateGroupBooking: vi.fn(),
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

async function clickDialogButton(wrapper, label) {
  dialogButton(label).click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

const DIVERGING_BK2 =
  "Die Buchung ist inzwischen in einem anderen Zustand. Betroffene Buchungen: bk-2";

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

    it("falls back to the generic message on a 200 with success false and no errors", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.commitBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [],
      });

      await start(wrapper, "confirm", { booking: booking() });

      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
      expect(wrapper.emitted("transitioned")).toBeUndefined();
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: "Die Buchung konnte nicht freigegeben werden.",
        refetch: false,
      });
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

      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: DIVERGING_BK2,
        refetch: true,
      });
      expect(toastMessages(store)).toContain(DIVERGING_BK2);
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("error")).toBe(
        DIVERGING_BK2
      );
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("open")).toBe(
        true
      );
    });

    it("keeps the consistency check's message when the members' states do not match", async () => {
      const { wrapper, store } = mountTransitions();
      ApiGroupBookingService.commitGroupBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [{ code: "STATUS_MISMATCH" }],
      });

      await start(wrapper, "confirm", series());
      await clickDialogButton(wrapper, "Serie freigeben");

      const expected = "Die Buchungen haben unterschiedliche Status.";
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: expected,
        refetch: false,
      });
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("error")).toBe(
        expected
      );
      expect(toastMessages(store)).toContain(
        "Die Buchungen konnten nicht freigegeben werden."
      );
    });

    it("names the deviating members of a state mismatch as the 409 does", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.commitGroupBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [
          {
            code: "STATUS_MISMATCH",
            meta: { status: "requested", bookingIds: ["bk-2", "bk-3"] },
          },
        ],
      });

      await start(wrapper, "confirm", series());
      await clickDialogButton(wrapper, "Serie freigeben");

      const expected =
        "Die Buchungen haben unterschiedliche Status. Betroffene Buchungen: bk-2, bk-3";
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        message: expected,
      });
      expect(dialog(wrapper, "GroupBookingCommitDialog").props("error")).toBe(
        expected
      );
    });

    describe("while the members are in mixed states", () => {
      const mixed = () => series([{}, { id: "bk-2", status: "confirmed" }]);

      it("shows the series as mixed and offers only the one booking", async () => {
        const { wrapper } = mountTransitions();
        ApiBookingService.commitBooking.mockResolvedValue(OK);

        await start(wrapper, "confirm", mixed());

        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain("Gemischt");
        expect(text).toContain(
          i18n.t("group-booking.transition.mixed.message")
        );
        expect(dialogButton("Serie freigeben")).toBeUndefined();

        await clickDialogButton(wrapper, "Nur diese Buchung freigeben");

        expect(ApiBookingService.commitBooking).toHaveBeenCalledWith("bk-1");
        expect(wrapper.emitted("transitioned")).toEqual([
          [{ action: "confirm", bookingId: "bk-1" }],
        ]);
      });

      it("still refuses a series-wide confirm that reaches it", async () => {
        const { wrapper, store } = mountTransitions();

        await start(wrapper, "confirm", mixed());
        dialog(wrapper, "GroupBookingCommitDialog").vm.$emit(
          "commit-group-booking"
        );
        await flushPromises();
        await wrapper.vm.$nextTick();

        expect(
          ApiGroupBookingService.commitGroupBooking
        ).not.toHaveBeenCalled();
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

    it("names the reason when the stored booking does not pass its schema", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.payBooking.mockRejectedValue(
        validationError([{ field: "mail", code: "required", params: {} }])
      );
      const reason =
        "Die Buchung konnte nicht als bezahlt markiert werden. Grund: E-Mail fehlt.";

      await start(wrapper, "pay", { booking: due() });
      await payWith(wrapper, {});

      const payDialog = dialog(wrapper, "BookingPayDialog");
      expect(payDialog.props("open")).toBe(true);
      expect(payDialog.props("error")).toBe(reason);
      expect(toastMessages(store)).toContain(reason);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "pay",
        message: reason,
        refetch: false,
      });
    });

    it("names every reason, and a field without its own text by its name", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.payBooking.mockRejectedValue(
        validationError([
          { field: "timeEnd", code: "greater_equal_than", params: {} },
          { field: "zipCode", code: "invalid_format", params: {} },
        ])
      );

      await start(wrapper, "pay", { booking: due() });
      await payWith(wrapper, {});

      expect(dialog(wrapper, "BookingPayDialog").props("error")).toBe(
        "Die Buchung konnte nicht als bezahlt markiert werden. Gründe: Ungültige Endzeit, Angabe „zipCode“ ungültig."
      );
    });

    it("keeps the generic message on a 500 that names no reason", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.payBooking.mockRejectedValue(serverError(500));

      await start(wrapper, "pay", { booking: due() });
      await payWith(wrapper, {});

      expect(dialog(wrapper, "BookingPayDialog").props("error")).toBe(
        "Die Buchung konnte nicht als bezahlt markiert werden."
      );
    });

    it("names the reason for a series too", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.payGroupBooking.mockRejectedValue(
        validationError([{ field: "mail", code: "required", params: {} }])
      );

      await start(
        wrapper,
        "pay",
        series([
          { status: "payment_due" },
          { id: "bk-2", status: "payment_due" },
        ])
      );
      await clickDialogButton(wrapper, "Serie als bezahlt markieren");

      expect(dialog(wrapper, "BookingPayDialog").props("error")).toBe(
        "Die Buchungen konnten nicht als bezahlt markiert werden. Grund: E-Mail fehlt."
      );
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

    it("lists the diverging members in the dialog and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiGroupBookingService.payGroupBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { bookingIds: ["bk-2"] })
      );

      await start(
        wrapper,
        "pay",
        series([
          { status: "payment_due" },
          { id: "bk-2", status: "payment_due" },
        ])
      );
      await clickDialogButton(wrapper, "Serie als bezahlt markieren");

      expect(ApiGroupBookingService.payGroupBooking).toHaveBeenCalledWith(
        expect.objectContaining({ id: "grp-1" })
      );
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "pay",
        message: DIVERGING_BK2,
        refetch: true,
      });
      expect(toastMessages(store)).toContain(DIVERGING_BK2);
      expect(dialog(wrapper, "BookingPayDialog").props("error")).toBe(
        DIVERGING_BK2
      );
      expect(dialog(wrapper, "BookingPayDialog").props("open")).toBe(true);
    });

    it("offers a mixed series only member by member", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.payBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "pay",
        series([{ status: "payment_due" }, { id: "bk-2", status: "confirmed" }])
      );
      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain("Gemischt");
      expect(dialogButton("Serie als bezahlt markieren")).toBeUndefined();

      await payWith(wrapper, {});

      expect(ApiBookingService.payBooking).toHaveBeenCalledWith(
        "bk-1",
        "CASH",
        1_700_000_000_000
      );
      expect(ApiGroupBookingService.payGroupBooking).not.toHaveBeenCalled();
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

    it("loads the refund preview when the dialog opens for the first time", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "cancel", { booking: booking() });

      // The dialog mounts with the target; it must still see `open` turn
      // true, or its preview never loads and its confirm stays disabled.
      expect(
        ApiBookingService.getCancellationRefundPreview
      ).toHaveBeenCalledWith("bk-1");
      expect(
        dialog(wrapper, "BookingRejectConformationDialog").props("open")
      ).toBe(true);
    });

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

    it("lists the diverging members in the dialog and asks for a reload on a 409", async () => {
      const { wrapper, store } = mountTransitions();
      ApiGroupBookingService.rejectGroupBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { bookingIds: ["bk-2"] })
      );

      await start(wrapper, "cancel", series());
      const groupDialog = dialog(
        wrapper,
        "GroupBookingRejectConformationDialog"
      );
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

      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "cancel",
        message: DIVERGING_BK2,
        refetch: true,
      });
      expect(toastMessages(store)).toContain(DIVERGING_BK2);
      expect(groupDialog.props("error")).toBe(DIVERGING_BK2);
      expect(groupDialog.props("open")).toBe(true);
    });

    it("offers a mixed series only member by member", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.rejectBooking.mockResolvedValue({ data: "" });

      await start(
        wrapper,
        "cancel",
        series([{}, { id: "bk-2", status: "confirmed" }])
      );
      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain("Gemischt");
      expect(
        Array.from(
          document.querySelectorAll(".v-dialog--active .v-radio")
        ).find((el) => el.textContent.includes("Gesamte Serie stornieren"))
          .className
      ).toContain("v-radio--is-disabled");

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
      expect(ApiGroupBookingService.rejectGroupBooking).not.toHaveBeenCalled();
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

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1", {
        ignoreConflicts: false,
      });
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

    it("asks at a member of a series for all cancelled members or this one, with the members and their state", async () => {
      const { wrapper } = mountTransitions();

      await start(
        wrapper,
        "reinstate",
        series([{ status: "cancelled" }, { id: "bk-2", status: "confirmed" }])
      );

      const reinstateDialog = dialog(wrapper, "GroupBookingReinstateDialog");
      expect(reinstateDialog.props("open")).toBe(true);
      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain(
        "Alle stornierten Buchungen der Serie wiederherstellen"
      );
      expect(text).toContain("Nur diese Buchung wiederherstellen");
      expect(text).toContain("Gemischt");
      expect(text).toContain("bk-2");
      expect(
        ApiGroupBookingService.reinstateGroupBooking
      ).not.toHaveBeenCalled();
    });

    it("reinstates the series' cancelled members over the group route", async () => {
      const { wrapper, store } = mountTransitions();
      ApiGroupBookingService.reinstateGroupBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "reinstate",
        series([{ status: "cancelled" }, { id: "bk-2", status: "rejected" }])
      );
      await clickDialogButton(
        wrapper,
        "Alle stornierten Buchungen der Serie wiederherstellen"
      );

      expect(ApiGroupBookingService.reinstateGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1",
        { ignoreConflicts: false, skipConflicts: false }
      );
      expect(ApiBookingService.reinstateBooking).not.toHaveBeenCalled();
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "reinstate", groupBookingId: "grp-1" }],
      ]);
      expect(toastMessages(store)).toContain(
        "Die Buchungen der Serie wurden wiederhergestellt."
      );
    });

    it("reinstates only the one member where asked", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.reinstateBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "reinstate",
        series([{ status: "cancelled" }, { id: "bk-2", status: "cancelled" }])
      );
      dialog(wrapper, "GroupBookingReinstateDialog").vm.$emit(
        "reinstate-single-booking"
      );
      await flushPromises();

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1", {
        ignoreConflicts: false,
      });
      expect(
        ApiGroupBookingService.reinstateGroupBooking
      ).not.toHaveBeenCalled();
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "reinstate", bookingId: "bk-1" }],
      ]);
    });

    describe("where periods of the series were taken meanwhile", () => {
      const CONFLICT = lifecycleError(
        409,
        "group_booking_reinstatement_conflict",
        {
          groupBookingId: "grp-1",
          conflicts: [
            {
              bookingId: "bk-2",
              conflicts: [
                {
                  bookableId: "room-a",
                  title: "Raum A",
                  bookings: [
                    {
                      id: "bk-9",
                      timeBegin: 1_700_000_000_000,
                      timeEnd: 1_700_003_600_000,
                    },
                  ],
                },
              ],
            },
          ],
        }
      );

      async function askWithConflict() {
        const mounted = mountTransitions();
        ApiGroupBookingService.reinstateGroupBooking.mockRejectedValueOnce(
          CONFLICT
        );
        await start(
          mounted.wrapper,
          "reinstate",
          series([{ status: "cancelled" }, { id: "bk-2", status: "cancelled" }])
        );
        await clickDialogButton(
          mounted.wrapper,
          "Alle stornierten Buchungen der Serie wiederherstellen"
        );
        return mounted;
      }

      it("names the member, the object and the booking in the way, without a toast", async () => {
        const { wrapper, store } = await askWithConflict();

        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain("Buchung bk-2");
        expect(text).toContain("bk-9");
        expect(text).toContain("Raum A");
        expect(toastMessages(store)).not.toContain(
          i18n.t("group-booking.reinstate.error.message")
        );
        expect(wrapper.emitted("transitioned")).toBeUndefined();
        expect(
          dialogButton("Nur konfliktfreie wiederherstellen")
        ).toBeDefined();
        expect(dialogButton("Alle trotzdem wiederherstellen")).toBeDefined();
      });

      it("reinstates only the conflict-free members on the next click", async () => {
        const { wrapper } = await askWithConflict();
        ApiGroupBookingService.reinstateGroupBooking.mockResolvedValue(OK);

        await clickDialogButton(wrapper, "Nur konfliktfreie wiederherstellen");

        expect(
          ApiGroupBookingService.reinstateGroupBooking
        ).toHaveBeenLastCalledWith(null, "grp-1", {
          ignoreConflicts: false,
          skipConflicts: true,
        });
        expect(wrapper.emitted("transitioned")).toEqual([
          [{ action: "reinstate", groupBookingId: "grp-1" }],
        ]);
      });

      it("reinstates every member anyway on the next click", async () => {
        const { wrapper } = await askWithConflict();
        ApiGroupBookingService.reinstateGroupBooking.mockResolvedValue(OK);

        await clickDialogButton(wrapper, "Alle trotzdem wiederherstellen");

        expect(
          ApiGroupBookingService.reinstateGroupBooking
        ).toHaveBeenLastCalledWith(null, "grp-1", {
          ignoreConflicts: true,
          skipConflicts: false,
        });
      });

      it("offers no conflict-free choice where every member is in conflict", async () => {
        const mounted = mountTransitions();
        ApiGroupBookingService.reinstateGroupBooking.mockRejectedValueOnce(
          CONFLICT
        );
        await start(mounted.wrapper, "reinstate", {
          ...series([
            { status: "confirmed" },
            { id: "bk-2", status: "cancelled" },
          ]),
          seriesOnly: true,
        });
        dialog(mounted.wrapper, "GroupBookingReinstateDialog").vm.$emit(
          "reinstate-group-booking",
          {}
        );
        await flushPromises();
        await mounted.wrapper.vm.$nextTick();

        expect(
          dialogButton("Nur konfliktfreie wiederherstellen")
        ).toBeUndefined();
        expect(dialogButton("Alle trotzdem wiederherstellen")).toBeDefined();
      });
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
    describe("when other bookings took the period meanwhile", () => {
      const TAKEN = lifecycleError(409, "booking_reinstatement_conflict", {
        bookingId: "bk-1",
        conflicts: [
          {
            bookableId: "room-a",
            title: "Raum A",
            bookings: [
              {
                id: "bk-new",
                timeBegin: Date.UTC(2026, 10, 2, 9),
                timeEnd: Date.UTC(2026, 10, 2, 11),
              },
            ],
          },
        ],
      });

      function mountWithRouter() {
        const store = new Vuex.Store({ modules: { toasts } });
        const resolve = vi.fn((route) => ({
          href: `/bookings/${route.params.bookingId}?tenant=${route.query.tenant}`,
        }));
        const wrapper = mountComponent(BookingTransitions, {
          store,
          mocks: { $router: { resolve } },
        });
        return { wrapper, store };
      }

      async function reinstateIntoConflict() {
        const mounted = mountWithRouter();
        ApiBookingService.reinstateBooking.mockRejectedValueOnce(TAKEN);
        await start(mounted.wrapper, "reinstate", {
          booking: booking({ status: "cancelled", tenantId: "tenant-1" }),
        });
        // The toasts module keeps its state across mounts.
        const toastsBefore = toastMessages(mounted.store).length;
        await clickDialogButton(mounted.wrapper, "Wiederherstellen");
        return { ...mounted, toastsBefore };
      }

      it("names the object and links the booking in the way, without a toast or reload", async () => {
        const { wrapper, store, toastsBefore } = await reinstateIntoConflict();

        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain(
          "In diesem Zeitraum gibt es inzwischen bereits eine andere Buchung:"
        );
        expect(text).toContain("Raum A");
        const link = document.querySelector(
          ".v-dialog--active .reinstate-conflicts a"
        );
        expect(link.textContent).toBe("bk-new");
        expect(link.closest("li").textContent).toMatch(
          /bk-new\s+für „Raum A“ \(.+\)/
        );
        expect(link.getAttribute("href")).toBe(
          "/bookings/bk-new?tenant=tenant-1"
        );
        expect(link.getAttribute("target")).toBe("_blank");
        expect(toastMessages(store)).toHaveLength(toastsBefore);
        expect(wrapper.emitted("failed")).toBeUndefined();
        expect(wrapper.emitted("transitioned")).toBeUndefined();
      });

      it("names the parent a booking takes", async () => {
        const { wrapper } = mountWithRouter();
        ApiBookingService.reinstateBooking.mockRejectedValueOnce(
          lifecycleError(409, "booking_reinstatement_conflict", {
            bookingId: "bk-1",
            conflicts: [
              {
                bookableId: "forum-quarter",
                title: "Forum 1/4 Tag",
                bookings: [
                  {
                    id: "bk-day",
                    timeBegin: Date.UTC(2026, 10, 2, 9),
                    timeEnd: Date.UTC(2026, 10, 2, 11),
                    parent: { bookableId: "forum", title: "Forum " },
                  },
                ],
              },
            ],
          })
        );
        await start(wrapper, "reinstate", {
          booking: booking({ status: "cancelled", tenantId: "tenant-1" }),
        });
        await clickDialogButton(wrapper, "Wiederherstellen");

        const row = document.querySelector(
          ".v-dialog--active .reinstate-conflicts li"
        );
        expect(
          row.querySelector(".reinstate-conflicts__taken").textContent
        ).toBe("Forum");
        expect(row.textContent.replace(/\s+/g, " ")).toMatch(
          /bk-day für „Forum 1\/4 Tag“ mit dem übergeordneten Objekt „Forum“ \(.+\)/
        );
      });

      it("names the dependent a booking takes", async () => {
        const { wrapper } = mountWithRouter();
        ApiBookingService.reinstateBooking.mockRejectedValueOnce(
          lifecycleError(409, "booking_reinstatement_conflict", {
            bookingId: "bk-1",
            conflicts: [
              {
                bookableId: "workshop",
                title: "Werkstatt",
                bookings: [
                  {
                    id: "bk-table",
                    timeBegin: Date.UTC(2026, 10, 2, 9),
                    timeEnd: Date.UTC(2026, 10, 2, 11),
                    child: { bookableId: "table", title: "Tisch" },
                  },
                ],
              },
            ],
          })
        );
        await start(wrapper, "reinstate", {
          booking: booking({ status: "cancelled", tenantId: "tenant-1" }),
        });
        await clickDialogButton(wrapper, "Wiederherstellen");

        const row = document.querySelector(
          ".v-dialog--active .reinstate-conflicts li"
        );
        expect(row.textContent.replace(/\s+/g, " ")).toMatch(
          /bk-table für „Werkstatt“ über das untergeordnete Objekt „Tisch“ \(.+\)/
        );
      });

      it("speaks of several bookings when more than one is in the way", async () => {
        const { wrapper } = mountWithRouter();
        const other = (id) => ({
          id,
          timeBegin: Date.UTC(2026, 10, 2, 9),
          timeEnd: Date.UTC(2026, 10, 2, 11),
        });
        ApiBookingService.reinstateBooking.mockRejectedValueOnce(
          lifecycleError(409, "booking_reinstatement_conflict", {
            bookingId: "bk-1",
            conflicts: [
              {
                bookableId: "room-a",
                title: "Raum A",
                bookings: [other("bk-new"), other("bk-newer")],
              },
            ],
          })
        );
        await start(wrapper, "reinstate", {
          booking: booking({ status: "cancelled", tenantId: "tenant-1" }),
        });
        await clickDialogButton(wrapper, "Wiederherstellen");

        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain(
          "In diesem Zeitraum gibt es inzwischen bereits andere Buchungen:"
        );
        expect(text).not.toContain("eine andere Buchung");
        expect(
          document.querySelectorAll(".v-dialog--active .reinstate-conflicts li")
        ).toHaveLength(2);
      });

      it("reinstates anyway on „Trotzdem wiederherstellen“", async () => {
        const { wrapper } = await reinstateIntoConflict();
        ApiBookingService.reinstateBooking.mockResolvedValue(OK);

        await clickDialogButton(wrapper, "Trotzdem wiederherstellen");

        expect(ApiBookingService.reinstateBooking).toHaveBeenLastCalledWith(
          "bk-1",
          { ignoreConflicts: true }
        );
        expect(wrapper.emitted("transitioned")).toEqual([
          [{ action: "reinstate", bookingId: "bk-1" }],
        ]);
        expect(document.querySelector(".v-dialog--active")).toBeNull();
      });

      it("leaves the booking as it is on „Abbrechen“", async () => {
        const { wrapper } = await reinstateIntoConflict();

        await clickDialogButton(wrapper, "Abbrechen");

        expect(ApiBookingService.reinstateBooking).toHaveBeenCalledTimes(1);
        expect(wrapper.emitted("transitioned")).toBeUndefined();
        expect(document.querySelector(".v-dialog--active")).toBeNull();
      });

      it("shows the conflicts of a member reinstated alone in the single dialog", async () => {
        const { wrapper } = mountWithRouter();
        ApiBookingService.reinstateBooking.mockRejectedValueOnce(TAKEN);
        await start(
          wrapper,
          "reinstate",
          series([{ status: "cancelled" }, { id: "bk-2", status: "cancelled" }])
        );
        dialog(wrapper, "GroupBookingReinstateDialog").vm.$emit(
          "reinstate-single-booking"
        );
        await flushPromises();

        expect(
          dialog(wrapper, "GroupBookingReinstateDialog").props("open")
        ).toBe(false);
        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain("Raum A");
        ApiBookingService.reinstateBooking.mockResolvedValue(OK);

        await clickDialogButton(wrapper, "Trotzdem wiederherstellen");

        expect(ApiBookingService.reinstateBooking).toHaveBeenLastCalledWith(
          "bk-1",
          { ignoreConflicts: true }
        );
        expect(
          ApiGroupBookingService.reinstateGroupBooking
        ).not.toHaveBeenCalled();
        expect(wrapper.emitted("transitioned")).toEqual([
          [{ action: "reinstate", bookingId: "bk-1" }],
        ]);
      });
    });
  });

  /**
   * Widerruf akzeptieren: a confirmation that says
   * the step is final and what happens to the money, then the route; a
   * member of a series is withdrawn alone.
   */
  describe("acceptWithdrawal", () => {
    it("asks once, then posts to the accept-withdrawal route", async () => {
      const { wrapper, store } = mountTransitions();
      ApiBookingService.acceptWithdrawal.mockResolvedValue(OK);

      await start(wrapper, "acceptWithdrawal", {
        booking: booking({ status: "confirmed" }),
      });
      expect(ApiBookingService.acceptWithdrawal).not.toHaveBeenCalled();
      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain("lässt sich nicht rückgängig machen");
      expect(text).toContain("vollständig erstattet");

      await clickDialogButton(wrapper, "Widerruf akzeptieren");

      expect(ApiBookingService.acceptWithdrawal).toHaveBeenCalledWith("bk-1");
      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "acceptWithdrawal", bookingId: "bk-1" }],
      ]);
      expect(toastMessages(store)).toContain(
        i18n.t("booking.acceptWithdrawal.success.message")
      );
      expect(document.querySelector(".v-dialog--active")).toBeNull();
    });

    it.each([
      ["unpaid", { status: "payment_due" }],
      ["not yet confirmed", { status: "requested" }],
    ])(
      "says that it costs nothing and the invoiced amount lapses for a booking %s",
      async (_name, overrides) => {
        const { wrapper } = mountTransitions();

        await start(wrapper, "acceptWithdrawal", {
          booking: booking(overrides),
        });

        const text = document.querySelector(".v-dialog--active").textContent;
        expect(text).toContain(
          "Durch den Widerruf entstehen keine Kosten. Der eingetragene Rechnungsbetrag entfällt."
        );
        expect(text).not.toContain("vollständig erstattet");
      }
    );

    it("says only that it costs nothing for a free booking", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "acceptWithdrawal", {
        booking: booking({ status: "requested", priceEur: 0 }),
      });

      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain("Durch den Widerruf entstehen keine Kosten.");
      expect(text).not.toContain("Rechnungsbetrag");
    });

    it("names the booking in bold italics", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "acceptWithdrawal", {
        booking: booking({ status: "confirmed" }),
      });

      expect(
        document.querySelector(".v-dialog--active strong > em").textContent
      ).toBe("bk-1");
    });

    it("withdraws only the one member of a series", async () => {
      const { wrapper } = mountTransitions();
      ApiBookingService.acceptWithdrawal.mockResolvedValue(OK);

      await start(wrapper, "acceptWithdrawal", series());
      await clickDialogButton(wrapper, "Widerruf akzeptieren");

      expect(ApiBookingService.acceptWithdrawal).toHaveBeenCalledWith("bk-1");
      expect(ApiGroupBookingService.rejectGroupBooking).not.toHaveBeenCalled();
    });

    it("is refused for a business booking: it has no withdrawal", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "acceptWithdrawal", {
        booking: booking({ status: "confirmed", isBusiness: true }),
      });

      expect(document.querySelector(".v-dialog--active")).toBeNull();
      expect(ApiBookingService.acceptWithdrawal).not.toHaveBeenCalled();
    });

    it("is refused for a withdrawn booking: Widerrufen is final", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "acceptWithdrawal", {
        booking: booking({ status: "withdrawn" }),
      });

      expect(document.querySelector(".v-dialog--active")).toBeNull();
      expect(ApiBookingService.acceptWithdrawal).not.toHaveBeenCalled();
    });
  });

  /**
   * A series drawer acts on the whole series (`seriesOnly`): the dialogs
   * offer no "Nur diese Buchung", and the action is gated on the members'
   * shared state - a mixed series is refused before any dialog opens.
   */
  describe("a series-only target", () => {
    const seriesOnly = (target) => ({ ...target, seriesOnly: true });

    it("offers the series without the single-member option, and confirms it", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.commitGroupBooking.mockResolvedValue(OK);

      await start(wrapper, "confirm", seriesOnly(series()));

      expect(dialogButton("Nur diese Buchung freigeben")).toBeUndefined();
      await clickDialogButton(wrapper, "Serie freigeben");

      expect(ApiGroupBookingService.commitGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1"
      );
      expect(ApiBookingService.commitBooking).not.toHaveBeenCalled();
    });

    it("leaves the cancel dialog only the series scope", async () => {
      const { wrapper } = mountTransitions();

      await start(wrapper, "cancel", seriesOnly(series()));

      const text = document.querySelector(".v-dialog--active").textContent;
      expect(text).toContain(i18n.t("booking.cancellationRefund.cancelGroup"));
      expect(text).not.toContain(
        i18n.t("booking.cancellationRefund.cancelSingle")
      );
    });

    it("refuses a mixed series before any dialog opens", async () => {
      const { wrapper, store } = mountTransitions();

      await start(
        wrapper,
        "confirm",
        seriesOnly(series([{}, { id: "bk-2", status: "confirmed" }]))
      );

      expect(document.querySelector(".v-dialog--active")).toBeNull();
      expect(ApiGroupBookingService.commitGroupBooking).not.toHaveBeenCalled();
      const expected = i18n.t("group-booking.transition.mixed.message");
      expect(toastMessages(store)).toContain(expected);
      expect(wrapper.emitted("failed")[0][0]).toMatchObject({
        action: "confirm",
        message: expected,
        refetch: false,
      });
    });

    it("knows no series-wide withdrawal", async () => {
      const { wrapper, store } = mountTransitions();

      await start(wrapper, "acceptWithdrawal", seriesOnly(series()));

      expect(document.querySelector(".v-dialog--active")).toBeNull();
      expect(toastMessages(store)).toContain(
        i18n.t("group-booking.transition.not-allowed.message")
      );
    });

    it("reinstates the series without the single-member option, a mixed one too", async () => {
      const { wrapper } = mountTransitions();
      ApiGroupBookingService.reinstateGroupBooking.mockResolvedValue(OK);

      await start(
        wrapper,
        "reinstate",
        seriesOnly(
          series([{ status: "confirmed" }, { id: "bk-2", status: "rejected" }])
        )
      );

      expect(
        document.querySelector(".v-dialog--active").textContent
      ).not.toContain("Nur diese Buchung wiederherstellen");
      await clickDialogButton(
        wrapper,
        "Alle stornierten Buchungen der Serie wiederherstellen"
      );

      expect(ApiGroupBookingService.reinstateGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1",
        { ignoreConflicts: false, skipConflicts: false }
      );
    });

    it("refuses to reinstate a series without a cancelled or rejected member", async () => {
      const { wrapper, store } = mountTransitions();

      await start(wrapper, "reinstate", seriesOnly(series()));

      expect(document.querySelector(".v-dialog--active")).toBeNull();
      expect(toastMessages(store)).toContain(
        i18n.t("group-booking.transition.not-allowed.message")
      );
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

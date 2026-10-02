import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  forbiddenError,
  lifecycleError,
} from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: { setRefundState: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true) },
}));

import CancellationRefundState from "@/components/Booking/CancellationRefundState.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const COMPLETED_AT = Date.UTC(2026, 9, 2, 7, 30);

function booking(refund = {}) {
  return {
    id: "bk-1",
    status: "cancelled",
    cancellationRefund: {
      cancelledFrom: "confirmed",
      refundAmountEur: 20,
      refundState: "open",
      ...refund,
    },
  };
}

function mountState(propsBooking = booking()) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(CancellationRefundState, {
    store,
    propsData: { booking: propsBooking },
  });
  return { wrapper, store };
}

function checkbox(wrapper) {
  return wrapper.find(".cancellation-refund-state__mark input");
}

async function tick(wrapper) {
  await checkbox(wrapper).trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/** The toast the last action raised; the toasts module outlives a store. */
function lastToast(store) {
  return store.getters["toasts/all"].slice(-1)[0];
}

/**
 * The refund state on the Buchungsseite (glossary „Erstattungsstand“):
 * offen or erfolgt, ticked off by whoever may edit the booking, over its own
 * route; the page reloads after it.
 */
describe("CancellationRefundState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    ApiBookingService.setRefundState.mockResolvedValue({ data: {} });
  });

  it("shows nothing for a booking without a refund state", () => {
    const { wrapper } = mountState({
      id: "bk-1",
      status: "cancelled",
      cancellationRefund: { cancelledFrom: "payment_due" },
    });

    expect(wrapper.find(".cancellation-refund-state").exists()).toBe(false);
  });

  it("reads offen with the box unticked while the refund is open", () => {
    const { wrapper } = mountState();

    expect(wrapper.text()).toContain("Rückerstattung");
    expect(wrapper.find(".cancellation-refund-state__value").text()).toBe(
      "offen"
    );
    expect(checkbox(wrapper).element.checked).toBe(false);
    expect(wrapper.find(".cancellation-refund-state__note").exists()).toBe(
      false
    );
  });

  it("reads erfolgt with the box ticked, when and by whom", () => {
    const { wrapper } = mountState(
      booking({
        refundState: "completed",
        refundCompletedAt: COMPLETED_AT,
        refundCompletedByUserId: "kasse@example.org",
      })
    );

    expect(wrapper.find(".cancellation-refund-state__value").text()).toBe(
      "erfolgt"
    );
    expect(checkbox(wrapper).element.checked).toBe(true);
    const note = wrapper.find(".cancellation-refund-state__note").text();
    expect(note).toMatch(/^Abgehakt am 02\.10\.26, \d{2}:30 von /);
    expect(note).toContain("kasse@example.org");
  });

  it("offers no box to a reader without the update right", () => {
    BookingPermissionService.allowUpdate.mockReturnValue(false);
    const { wrapper } = mountState();

    expect(wrapper.find(".cancellation-refund-state__value").text()).toBe(
      "offen"
    );
    expect(wrapper.find(".cancellation-refund-state__mark").exists()).toBe(
      false
    );
  });

  it("ticks the refund off as completed and asks the page to reload", async () => {
    const { wrapper } = mountState();

    await tick(wrapper);

    expect(ApiBookingService.setRefundState).toHaveBeenCalledWith(
      "bk-1",
      "completed"
    );
    expect(wrapper.emitted("reload")).toHaveLength(1);
  });

  it("takes the tick back to open", async () => {
    const { wrapper } = mountState(
      booking({ refundState: "completed", refundCompletedAt: COMPLETED_AT })
    );

    await tick(wrapper);

    expect(ApiBookingService.setRefundState).toHaveBeenCalledWith(
      "bk-1",
      "open"
    );
    expect(wrapper.emitted("reload")).toHaveLength(1);
  });

  it("toasts a refusal, shows the server's state again and leaves the page alone on a 403", async () => {
    ApiBookingService.setRefundState.mockRejectedValue(forbiddenError());
    const { wrapper, store } = mountState();

    await tick(wrapper);

    expect(lastToast(store).title).toBe("Rückerstattung nicht gespeichert");
    expect(checkbox(wrapper).element.checked).toBe(false);
    expect(wrapper.emitted("reload")).toBeUndefined();
  });

  it("names a booking without a refund due and reloads on a 409", async () => {
    ApiBookingService.setRefundState.mockRejectedValue(
      lifecycleError(409, "refund_state_not_applicable", { bookingId: "bk-1" })
    );
    const { wrapper, store } = mountState();

    await tick(wrapper);

    expect(lastToast(store).message).toBe(
      "Für diese Buchung ist keine Rückerstattung fällig."
    );
    expect(wrapper.emitted("reload")).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getHookCancellationRefundPreview: vi.fn(),
    releaseBookingHook: vi.fn(),
  },
}));

import VerifyRejectBooking from "@/views/VerifyRejectBooking.vue";
import ApiBookingService from "@/services/api/ApiBookingService";

const ALREADY_CANCELLED = "Diese Buchung wurde bereits storniert.";
const GENERIC = "Die Stornierung konnte nicht durchgeführt werden.";

async function confirmWith(error) {
  ApiBookingService.getHookCancellationRefundPreview.mockResolvedValue({});
  ApiBookingService.releaseBookingHook.mockRejectedValue(error);
  const wrapper = mountComponent(VerifyRejectBooking, {
    propsData: { tenantId: "tenant-1" },
    mocks: { $route: { query: { id: "bk-1", hookId: "hook-1" } } },
  });
  await flushPromises();

  await wrapper
    .findAll("button")
    .wrappers.find((button) => button.text() === "Stornierung bestätigen")
    .trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * `GET …/hooks/:hookId/release` answers 409 on a booking that is already
 * cancelled (spec §1.2) - the page used to show its generic alert with a retry
 * that cannot succeed.
 */
describe("VerifyRejectBooking", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("says the booking is already cancelled on a 409, without a retry", async () => {
    const wrapper = await confirmWith(serverError(409));

    expect(wrapper.text()).toContain(ALREADY_CANCELLED);
    expect(wrapper.text()).not.toContain(GENERIC);
    expect(wrapper.text()).not.toContain("Erneut versuchen");
  });

  it("keeps the generic alert with a retry on any other failure", async () => {
    const wrapper = await confirmWith(serverError());

    expect(wrapper.text()).toContain(GENERIC);
    expect(wrapper.text()).toContain("Erneut versuchen");
  });
});

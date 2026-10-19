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

  describe("refund policy line", () => {
    async function mountWithPreview(preview) {
      ApiBookingService.getHookCancellationRefundPreview.mockResolvedValue({
        originalAmountEur: 20,
        refundAmountEur: 10,
        cancellationFeeEur: 10,
        suggestedRefundPercentage: 50,
        ...preview,
      });
      const wrapper = mountComponent(VerifyRejectBooking, {
        propsData: { tenantId: "tenant-1" },
        mocks: { $route: { query: { id: "bk-1", hookId: "hook-1" } } },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
      return wrapper;
    }

    it("names the calendar days before the start", async () => {
      const wrapper = await mountWithPreview({ daysBeforeStart: 12 });

      expect(wrapper.text()).toContain(
        "Bei 12 Kalendertagen bis zum Beginn beträgt die Erstattung 50 %."
      );
    });

    // ECCdigital/tickets#306: a booking without a time span showed „Bei –
    // Kalendertagen …“.
    it("says the booking has no time span where there are no days", async () => {
      const wrapper = await mountWithPreview({ daysBeforeStart: null });

      expect(wrapper.text()).toContain(
        "Die Buchung hat keinen Zeitraum. Die Erstattung beträgt 50 %."
      );
      expect(wrapper.text()).not.toContain("Kalendertagen");
    });
  });
});

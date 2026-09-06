import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBookingStatus: vi.fn(),
    verifyBookingOwnership: vi.fn(),
    getPublicCancellationRefundPreview: vi.fn(),
    requestRejectBooking: vi.fn(),
  },
}));

import RequestRejectBooking from "@/views/RequestRejectBooking.vue";
import ApiBookingService from "@/services/api/ApiBookingService";

const NAME_MISMATCH = "Die eingegebene Name entspricht nicht der Buchung.";
const USER_CANCELLATION_DISABLED =
  "Diese Buchung kann nicht vom Buchenden storniert werden.";
const ALREADY_CANCELLED = "Diese Buchung wurde bereits storniert.";

/** The customer route's error body: `{ code, message }`, no `statusCode`. */
function customerError(status, code) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: { code, message: code } };
  return error;
}

async function mountPage() {
  ApiBookingService.getBookingStatus.mockResolvedValue({
    data: [
      {
        bookingId: "bk-1",
        priceEur: 0,
        cancellationPolicy: { userCancellable: true },
      },
    ],
  });
  ApiBookingService.verifyBookingOwnership.mockResolvedValue({ status: 200 });
  ApiBookingService.getPublicCancellationRefundPreview.mockResolvedValue({
    originalAmountEur: 0,
  });

  const wrapper = mountComponent(RequestRejectBooking, {
    propsData: { tenantId: "tenant-1" },
    mocks: { $route: { query: { id: "bk-1" } } },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

async function submitWith(wrapper, error) {
  ApiBookingService.requestRejectBooking.mockRejectedValue(error);
  await wrapper.find("input[type='text']").setValue("Erika Muster");
  await wrapper.find("textarea").setValue("Verhindert");
  await wrapper.vm.$nextTick();
  await wrapper.find("form").trigger("submit");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * `POST …/request-reject` answers in the `{ code, message }` form (spec §1.2).
 * A 403 `booking_user_cancellation_disabled` is the tenant's policy, not a
 * wrong name - the page used to read every 403 as a failed verification. A
 * 409 says the booking is already cancelled.
 */
describe("RequestRejectBooking", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("names a disabled user cancellation instead of a failed verification", async () => {
    const wrapper = await mountPage();

    await submitWith(
      wrapper,
      customerError(403, "booking_user_cancellation_disabled")
    );

    expect(wrapper.text()).toContain(USER_CANCELLATION_DISABLED);
    expect(wrapper.text()).not.toContain(NAME_MISMATCH);
  });

  it("says the booking is already cancelled on a 409", async () => {
    const wrapper = await mountPage();

    await submitWith(wrapper, customerError(409, "invalid_transition"));

    expect(wrapper.text()).toContain(ALREADY_CANCELLED);
  });

  it("still reads a 403 without a code as a failed verification", async () => {
    const wrapper = await mountPage();
    const error = new Error("Request failed with status code 403");
    error.response = { status: 403, data: "Forbidden" };

    await submitWith(wrapper, error);

    expect(wrapper.text()).toContain(NAME_MISMATCH);
  });
});

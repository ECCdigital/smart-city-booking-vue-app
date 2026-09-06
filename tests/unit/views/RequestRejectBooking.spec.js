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
const DISABLED_BY_POLICY =
  "Diese Buchung kann nicht vom Buchenden storniert werden. Bitte wenden Sie sich an den Anbieter, falls Sie eine Stornierung wünschen.";
const CANCEL_QUESTION = "wirklich stornieren?";
const BANK_DETAILS = "Bankverbindung für die Rückzahlung";

/** The customer route's error body: `{ code, message }`, no `statusCode`. */
function customerError(status, code) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: { code, message: code } };
  return error;
}

/** One entry of the bare array `GET /:tenant/bookings/:ids/status` answers with. */
function statusEntry(overrides = {}) {
  return {
    bookingId: "bk-1",
    priceEur: 0,
    status: "requested",
    cancellationPolicy: { userCancellable: true, contactHint: "" },
    ...overrides,
  };
}

async function mountPage(entry = statusEntry()) {
  ApiBookingService.getBookingStatus.mockResolvedValue({ data: [entry] });
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

  /**
   * Whether the form is offered at all is read off the poll (spec E12): the
   * state says whether there is anything left to cancel, the tenant's policy
   * whether the customer may do it. The 403 on submit stays the net behind it.
   */
  describe("before the form", () => {
    it.each(["requested", "payment_due", "confirmed"])(
      "offers the form at %s",
      async (status) => {
        const wrapper = await mountPage(statusEntry({ status, priceEur: 50 }));

        expect(wrapper.find("form").exists()).toBe(true);
        expect(wrapper.text()).toContain(CANCEL_QUESTION);
      }
    );

    it.each(["rejected", "cancelled"])(
      "says a %s booking is already cancelled instead of the form",
      async (status) => {
        const wrapper = await mountPage(statusEntry({ status }));

        expect(wrapper.find("form").exists()).toBe(false);
        expect(wrapper.text()).toContain(ALREADY_CANCELLED);
      }
    );

    it("hides the form when the tenant's policy forbids cancelling by the customer", async () => {
      const wrapper = await mountPage(
        statusEntry({
          status: "confirmed",
          cancellationPolicy: { userCancellable: false, contactHint: "" },
        })
      );

      expect(wrapper.find("form").exists()).toBe(false);
      expect(wrapper.text()).toContain(DISABLED_BY_POLICY);
    });

    it("passes the policy's contact hint on with the explanation", async () => {
      const wrapper = await mountPage(
        statusEntry({
          cancellationPolicy: {
            userCancellable: false,
            contactHint: "Telefonisch unter 0123 456.",
          },
        })
      );

      expect(wrapper.text()).toContain(DISABLED_BY_POLICY);
      expect(wrapper.text()).toContain("Telefonisch unter 0123 456.");
    });

    it("hides the form when the poll carries no policy answer, as the backend refuses then", async () => {
      const wrapper = await mountPage(
        statusEntry({ cancellationPolicy: { contactHint: "" } })
      );

      expect(wrapper.find("form").exists()).toBe(false);
      expect(wrapper.text()).toContain(DISABLED_BY_POLICY);
    });
  });

  describe("bank details", () => {
    it("asks for them at confirmed with a price", async () => {
      const wrapper = await mountPage(
        statusEntry({ status: "confirmed", priceEur: 50 })
      );

      expect(wrapper.text()).toContain(BANK_DETAILS);
    });

    it("does not ask for them while the payment is still due", async () => {
      const wrapper = await mountPage(
        statusEntry({ status: "payment_due", priceEur: 50 })
      );

      expect(wrapper.text()).not.toContain(BANK_DETAILS);
    });

    it("does not ask for them for a free confirmed booking", async () => {
      const wrapper = await mountPage(
        statusEntry({ status: "confirmed", priceEur: 0 })
      );

      expect(wrapper.text()).not.toContain(BANK_DETAILS);
    });
  });
});

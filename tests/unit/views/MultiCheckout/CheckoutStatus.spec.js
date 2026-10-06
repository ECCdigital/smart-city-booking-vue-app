import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getBookingStatus: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getPublicInstance: vi.fn() },
}));

import CheckoutStatus from "@/views/MultiCheckout/CheckoutStatus.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";

const POLL_INTERVAL_MS = 15 * 1000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

const WAITING = "Bitte warten...";
const AWAIT_APPROVAL = "Vielen Dank für Ihre Anfrage";
const AWAIT_PAYMENT = "entgegengenommen und freigegeben";
const NO_PAYMENT = "Die Zahlung konnte nicht abgeschlossen werden";
const SUCCESS = "Ihre Buchung wurde erfolgreich abgeschlossen.";
const REJECTED = "Ihre Buchung wurde abgelehnt";
const CANCELLED = "Ihre Buchung wurde storniert";

/** One entry of the bare array `GET /:tenant/bookings/:ids/status` answers with. */
function statusEntry(bookingId, status, priceEur = 25) {
  return {
    bookingId,
    priceEur,
    timeBegin: 1729144800000,
    timeEnd: 1729177200000,
    status,
    cancellationPolicy: { userCancellable: true, contactHint: "" },
  };
}

/** Lets the mounted view's awaited API calls settle under fake timers. */
function settle() {
  return vi.advanceTimersByTimeAsync(0);
}

async function mountStatusPage(entries, query = {}) {
  ApiBookingService.getBookingStatus.mockResolvedValue({ data: entries });
  const wrapper = mountComponent(CheckoutStatus, {
    mocks: {
      $route: {
        query: {
          tenant: "tenant-1",
          ids: entries.map((entry) => entry.bookingId).join(","),
          ...query,
        },
      },
    },
  });
  await settle();
  return wrapper;
}

/**
 * The customer lands here after the checkout or the payment provider. The
 * page reads `status` off the poll (spec E12): only a booking awaiting
 * payment is worth polling for - the provider's webhook moves it to
 * `confirmed` - every other state is final for this page.
 */
describe("CheckoutStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    ApiTenantService.getTenant.mockResolvedValue({ data: { website: "" } });
    ApiInstanceService.getPublicInstance.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("polling", () => {
    it("keeps polling while a booking awaits payment", async () => {
      const wrapper = await mountStatusPage([
        statusEntry("bk-1", "payment_due"),
      ]);

      expect(wrapper.text()).toContain(WAITING);
      expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

      expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(2);
      expect(wrapper.text()).toContain(WAITING);
    });

    it("stops polling once the poll answers confirmed", async () => {
      const wrapper = await mountStatusPage([
        statusEntry("bk-1", "payment_due"),
      ]);
      ApiBookingService.getBookingStatus.mockResolvedValue({
        data: [statusEntry("bk-1", "confirmed")],
      });

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);

      expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(2);
      expect(wrapper.text()).toContain(SUCCESS);
    });

    it("does not poll a requested booking", async () => {
      const wrapper = await mountStatusPage([statusEntry("bk-1", "requested")]);

      expect(wrapper.text()).toContain(AWAIT_APPROVAL);

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

      expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(1);
    });

    it.each(["confirmed", "rejected", "cancelled"])(
      "does not poll a %s booking",
      async (status) => {
        const wrapper = await mountStatusPage([statusEntry("bk-1", status)]);

        expect(wrapper.text()).not.toContain(WAITING);

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

        expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe("a single booking", () => {
    it.each([
      ["requested", AWAIT_APPROVAL],
      ["confirmed", SUCCESS],
      ["rejected", REJECTED],
      ["cancelled", CANCELLED],
    ])("at %s shows: %s", async (status, text) => {
      const wrapper = await mountStatusPage([statusEntry("bk-1", status)]);

      expect(wrapper.text()).toContain(text);
    });

    it("reports an error for an entry without a state", async () => {
      const wrapper = await mountStatusPage([
        { ...statusEntry("bk-1", "confirmed"), status: undefined },
      ]);

      expect(wrapper.text()).toContain("Es ist ein Fehler aufgetreten.");
    });

    it("at payment_due by invoice says the invoice follows", async () => {
      const wrapper = await mountStatusPage(
        [statusEntry("bk-1", "payment_due")],
        { paymentProvider: "invoice" }
      );

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

      expect(wrapper.text()).toContain(AWAIT_PAYMENT);
    });

    it("at payment_due that never pays says the payment failed", async () => {
      const wrapper = await mountStatusPage([
        statusEntry("bk-1", "payment_due"),
      ]);

      await vi.advanceTimersByTimeAsync(POLL_TIMEOUT_MS);

      expect(wrapper.text()).toContain(NO_PAYMENT);
    });
  });

  describe("several bookings", () => {
    it("names each member's state in the table", async () => {
      const wrapper = await mountStatusPage([
        statusEntry("bk-1", "requested"),
        statusEntry("bk-2", "confirmed"),
        statusEntry("bk-3", "confirmed", 0),
        statusEntry("bk-4", "rejected"),
        statusEntry("bk-5", "cancelled"),
      ]);

      const chips = wrapper
        .findAll(".v-chip")
        .wrappers.map((chip) => chip.text().trim());
      expect(chips).toEqual([
        "In Prüfung",
        "Abgeschlossen",
        "Abgeschlossen (kostenfrei)",
        "Abgelehnt",
        "Storniert",
      ]);
    });

    it("shows the table once the last member awaiting payment is confirmed", async () => {
      const wrapper = await mountStatusPage([
        statusEntry("bk-1", "requested"),
        statusEntry("bk-2", "payment_due"),
      ]);
      expect(wrapper.text()).toContain(WAITING);
      ApiBookingService.getBookingStatus.mockResolvedValue({
        data: [statusEntry("bk-2", "confirmed")],
      });

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);

      expect(ApiBookingService.getBookingStatus).toHaveBeenCalledTimes(2);
      expect(ApiBookingService.getBookingStatus).toHaveBeenLastCalledWith(
        ["bk-2"],
        "tenant-1"
      );
      const chips = wrapper
        .findAll(".v-chip")
        .wrappers.map((chip) => chip.text().trim());
      expect(chips).toEqual(["In Prüfung", "Abgeschlossen"]);
    });
  });
});

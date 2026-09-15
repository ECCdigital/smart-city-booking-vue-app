import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import toasts from "@/store/modules/toasts";
import BookingPaymentLink from "@/components/Booking/BookingPaymentLink.vue";

const ROW = "Zahlungslink";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    status: "payment_due",
    paymentProvider: "giroCockpit",
    ...overrides,
  };
}

const SERIES = { id: "grp-1", bookingIds: ["bk-1", "bk-2"] };

function singleUrl() {
  return `${window.location.origin}/payment/redirection?ids=bk-1&tenant=tenant-1&aggregated=false`;
}

function seriesUrl() {
  return `${window.location.origin}/payment/redirection?ids=bk-1,bk-2&tenant=tenant-1&aggregated=true`;
}

function mountRow(propsData = {}) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(BookingPaymentLink, {
    store,
    propsData: { booking: booking(), groupBooking: null, ...propsData },
  });
  return Object.assign(wrapper, { store });
}

function toastMessages(store) {
  return store.getters["toasts/all"].map((toast) => toast.message);
}

/** The entries of the last opened menu, read off the document. */
function menuEntries() {
  const contents = document.querySelectorAll(".v-menu__content");
  const last = contents[contents.length - 1];
  return Array.from(last.querySelectorAll(".v-list-item"));
}

async function openMenu(wrapper, selector) {
  await wrapper.find(selector).trigger("click");
  await wrapper.vm.$nextTick();
  return menuEntries();
}

async function clickEntry(wrapper, selector, label) {
  const entry = (await openMenu(wrapper, selector)).find((candidate) =>
    candidate.textContent.includes(label)
  );
  entry.click();
  await wrapper.vm.$nextTick();
}

/**
 * The row "Zahlungslink" of the Zahlung block: the customer's payment URL
 * (CONTEXT.md: not the Buchungslink) to copy or open while the payment is
 * pending over an online provider; a series member chooses between its own
 * link and the series' aggregated one.
 */
describe("BookingPaymentLink", () => {
  let writeText;
  let open;

  beforeEach(() => {
    process.env.BASE_URL = "/";
    writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    open = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    delete process.env.BASE_URL;
  });

  it.each([
    ["payment_due", "giroCockpit", true],
    ["payment_due", "pmPayment", true],
    ["payment_due", "manual", true],
    ["payment_due", "invoice", false],
    ["payment_due", null, false],
    ["requested", "giroCockpit", false],
    ["confirmed", "giroCockpit", false],
    ["cancelled", "giroCockpit", false],
  ])("shows the row at %s over %s: %s", (status, paymentProvider, shown) => {
    const wrapper = mountRow({ booking: booking({ status, paymentProvider }) });
    expect(wrapper.text().includes(ROW)).toBe(shown);
  });

  it("copies the booking's payment link and reads „Kopiert“ for two seconds", async () => {
    const wrapper = mountRow();
    vi.useFakeTimers();
    try {
      await wrapper.find(".booking-payment-link__copy").trigger("click");
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(writeText).toHaveBeenCalledWith(singleUrl());
      expect(
        wrapper.find(".booking-payment-link__copy").attributes("title")
      ).toBe("Kopiert");

      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();
      expect(
        wrapper.find(".booking-payment-link__copy").attributes("title")
      ).toBe("Link kopieren");
    } finally {
      vi.useRealTimers();
    }
  });

  it("toasts and stays „Link kopieren“ when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const wrapper = mountRow();

    await wrapper.find(".booking-payment-link__copy").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(
      wrapper.find(".booking-payment-link__copy").attributes("title")
    ).toBe("Link kopieren");
    expect(toastMessages(wrapper.store)).toContain(
      "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
    );
  });

  it("opens the booking's payment link in a new tab", async () => {
    const wrapper = mountRow();

    await wrapper.find(".booking-payment-link__open").trigger("click");

    expect(open).toHaveBeenCalledWith(
      singleUrl(),
      "_blank",
      "noopener,noreferrer"
    );
  });

  describe("for a member of a series", () => {
    it("offers „Nur diese Buchung“ and „Gesamte Serie“ to copy", async () => {
      const wrapper = mountRow({ groupBooking: SERIES });

      const entries = await openMenu(wrapper, ".booking-payment-link__copy");
      expect(entries.map((entry) => entry.textContent.trim())).toEqual([
        "Nur diese Buchung",
        "Gesamte Serie (2 Buchungen)",
      ]);

      await clickEntry(wrapper, ".booking-payment-link__copy", "Gesamte Serie");
      expect(writeText).toHaveBeenCalledWith(seriesUrl());

      await clickEntry(wrapper, ".booking-payment-link__copy", "Nur diese");
      expect(writeText).toHaveBeenCalledWith(singleUrl());
    });

    it("offers the same choice to open", async () => {
      const wrapper = mountRow({ groupBooking: SERIES });

      await clickEntry(wrapper, ".booking-payment-link__open", "Gesamte Serie");
      expect(open).toHaveBeenCalledWith(
        seriesUrl(),
        "_blank",
        "noopener,noreferrer"
      );

      await clickEntry(wrapper, ".booking-payment-link__open", "Nur diese");
      expect(open).toHaveBeenCalledWith(
        singleUrl(),
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});

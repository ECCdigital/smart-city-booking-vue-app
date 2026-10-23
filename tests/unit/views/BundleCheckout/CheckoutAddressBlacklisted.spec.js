import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import CheckoutGroupBookingSummary from "@/views/BundleCheckout/CheckoutGroupBookingSummary.vue";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { checkout: vi.fn() },
}));
vi.mock("@/services/api/ApiPaymentService", () => ({
  default: { payments: vi.fn() },
}));

/**
 * An address on the blacklist: the legacy checkout
 * answers `409` with `{ error, params: { mailAddress } }`. Single and series
 * checkout keep the refusal on the page instead of a toast that is gone
 * before anyone can use the address: the instance's mail address opens a
 * mail or is copied, without one the notice names the operator.
 */

const REASON = "checkout.address_blacklisted";
const OPERATOR = "betrieb@example.test";

function blacklisted(mailAddress = OPERATOR) {
  const error = new Error("Request failed with status code 409");
  error.response = {
    status: 409,
    data: { error: REASON, params: { mailAddress } },
  };
  return error;
}

const leadItem = {
  bookableId: "room",
  amount: 1,
  valid: true,
  userPriceEur: 0,
  regularPriceEur: 0,
  bookable: {
    id: "room",
    title: "Werkstatt",
    priceType: "per-item",
    amount: null,
    maxAmountPerBooking: null,
    checkoutBookableIds: [],
    attachments: [],
    autoCommitBooking: true,
  },
};

function storeWithToasts() {
  const addToast = vi.fn();
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  return { store, addToast };
}

async function mountFinalCheck() {
  const { store, addToast } = storeWithToasts();
  const wrapper = mountComponent(CheckoutQuickSummary, {
    store,
    propsData: {
      leadItem,
      subsequentItems: [],
      finalCheck: true,
      tenant: "t1",
      contactDetails: { name: "Max Muster", mail: "max@firma.test" },
    },
    mocks: { $router: { push: vi.fn() } },
  });
  await flushPromises();
  return { wrapper, addToast };
}

async function submit(wrapper) {
  const button = wrapper
    .findAll("button")
    .filter((b) => b.text() === "Zahlungspflichtig buchen")
    .at(0);
  await button.trigger("click");
  await flushPromises();
}

const notice = (wrapper) => wrapper.find("[data-test=address-blacklisted]");
const text = (element) => element.text().replace(/\s+/g, " ").trim();

describe("the legacy checkout refuses an address on the blacklist", () => {
  let writeText;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    delete navigator.clipboard;
  });

  it("keeps the refusal on the page with the instance's mail address as a link", async () => {
    ApiCheckoutService.checkout.mockRejectedValue(blacklisted());
    const { wrapper, addToast } = await mountFinalCheck();

    await submit(wrapper);

    expect(addToast).not.toHaveBeenCalled();
    expect(text(notice(wrapper))).toBe(
      `Buchung nicht möglich Mit dieser E-Mail-Adresse ist keine Buchung möglich. Bei Fragen wende dich per Mail an ${OPERATOR}.`
    );
    const link = notice(wrapper).find("a");
    expect(link.attributes("href")).toBe(`mailto:${OPERATOR}`);
    expect(link.text()).toBe(OPERATOR);
  });

  it("copies the mail address from a button of its own", async () => {
    ApiCheckoutService.checkout.mockRejectedValue(blacklisted());
    const { wrapper, addToast } = await mountFinalCheck();
    await submit(wrapper);

    const copy = notice(wrapper).find(
      "button[aria-label='Mailadresse kopieren']"
    );
    await copy.trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(OPERATOR);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      message: "Mailadresse kopiert",
      type: "success",
    });
  });

  it("names the operator of the offer, without link or button, where the instance has no mail address", async () => {
    ApiCheckoutService.checkout.mockRejectedValue(blacklisted(""));
    const { wrapper } = await mountFinalCheck();

    await submit(wrapper);

    expect(notice(wrapper).find("a").exists()).toBe(false);
    expect(notice(wrapper).find("button").exists()).toBe(false);
    expect(text(notice(wrapper))).toBe(
      "Buchung nicht möglich Mit dieser E-Mail-Adresse ist keine Buchung möglich. Bei Fragen wende dich per Mail an den Betreiber dieses Angebots."
    );
  });

  it("takes the notice away when the booking is sent again", async () => {
    ApiCheckoutService.checkout.mockRejectedValueOnce(blacklisted());
    const { wrapper } = await mountFinalCheck();
    await submit(wrapper);
    expect(notice(wrapper).exists()).toBe(true);

    ApiCheckoutService.checkout.mockReturnValueOnce(new Promise(() => {}));
    await submit(wrapper);

    expect(notice(wrapper).exists()).toBe(false);
  });

  it("the summary of the series shows the refusal it is handed", async () => {
    const { store } = storeWithToasts();
    const wrapper = mountComponent(CheckoutGroupBookingSummary, {
      store,
      propsData: {
        bookingAttempts: [],
        contactDetails: {},
        activePaymentApps: [],
        blacklistRefusal: OPERATOR,
      },
    });
    await flushPromises();

    expect(notice(wrapper).find("a").attributes("href")).toBe(
      `mailto:${OPERATOR}`
    );
  });
});

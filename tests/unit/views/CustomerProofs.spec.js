import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    readCustomerUploadsByLink: vi.fn(),
    uploadCustomerUploadByLink: vi.fn(),
    replaceCustomerUploadByLink: vi.fn(),
    removeCustomerUploadByLink: vi.fn(),
  },
}));

import CustomerProofs from "@/views/CustomerProofs.vue";
import ApiBookingService from "@/services/api/ApiBookingService";

const LINK = `${Buffer.from(JSON.stringify({ t: "tn", b: "BK-1" })).toString(
  "base64url"
)}.c2ln`;
const TARGET = { tenantId: "tn", bookingId: "BK-1" };

const field = (overrides = {}) => ({
  fieldId: "f1",
  label: "Vereinsausweis",
  hint: "Vorder- und Rückseite",
  required: true,
  category: "normal",
  formats: ["pdf"],
  maxFiles: 3,
  maxFileSizeMb: 10,
  timing: "afterConfirmation",
  deadline: null,
  pastDeadline: false,
  state: "open",
  reopen: null,
  remainingFiles: 3,
  uploads: [],
  ...overrides,
});

const answerWith = (fields) => ({
  data: {
    tenant: { id: "tn", name: "Amt Süderbrarup" },
    booking: {
      id: "BK-1",
      tenantId: "tn",
      timeBegin: Date.UTC(2026, 11, 1, 9),
      timeEnd: Date.UTC(2026, 11, 1, 12),
      bookableItems: [{ bookableId: "b1", _bookableUsed: { title: "Saal" } }],
      customerUploadState: { fields },
    },
  },
});

function refusal(status, code) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: { code } };
  return error;
}

async function mountPage({ link = LINK, answer, error } = {}) {
  if (error)
    ApiBookingService.readCustomerUploadsByLink.mockRejectedValue(error);
  else
    ApiBookingService.readCustomerUploadsByLink.mockResolvedValue(
      answer ?? answerWith([field()])
    );
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CustomerProofs, {
    store,
    mocks: { $route: { query: { link } } },
  });
  await flushPromises();
  return wrapper;
}

const pick = (wrapper, file) => {
  const input = wrapper.find("[data-test='customer-proof-input']");
  Object.defineProperty(input.element, "files", {
    value: [file],
    configurable: true,
  });
  return input.trigger("change");
};

const pdf = new File(["%PDF"], "ausweis.pdf", { type: "application/pdf" });

describe("CustomerProofs - „Nachweise einreichen“ without a storefront", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the booking of the link and shows its fields", async () => {
    const wrapper = await mountPage();

    expect(ApiBookingService.readCustomerUploadsByLink).toHaveBeenCalledWith(
      TARGET,
      LINK
    );
    expect(wrapper.text()).toContain("Amt Süderbrarup");
    expect(wrapper.text()).toContain("Buchung #BK-1");
    expect(wrapper.text()).toContain("Saal");
    expect(wrapper.text()).toContain("Vereinsausweis");
    expect(wrapper.text()).toContain("Vorder- und Rückseite");
    expect(wrapper.find("[data-test='customer-proof-state']").text()).toBe(
      "Offen"
    );
  });

  it("asks nothing for a link it cannot read", async () => {
    const wrapper = await mountPage({ link: "kaputt" });

    expect(ApiBookingService.readCustomerUploadsByLink).not.toHaveBeenCalled();
    expect(
      wrapper.find("[data-test='customer-proofs-refusal']").text()
    ).toContain("Link ungültig");
  });

  it("says when the booking of the link has ended", async () => {
    const wrapper = await mountPage({
      error: refusal(403, "customer_upload_link_expired"),
    });

    expect(
      wrapper.find("[data-test='customer-proofs-refusal']").text()
    ).toContain("Link abgelaufen");
  });

  it("hands a chosen file in at once and shows the new state", async () => {
    ApiBookingService.uploadCustomerUploadByLink.mockResolvedValue({
      data: {
        customerUploadState: {
          fields: [
            field({
              state: "submitted",
              remainingFiles: 2,
              uploads: [
                {
                  mediaId: "m1",
                  originalFileName: "ausweis.pdf",
                  size: 2048,
                  review: { status: "submitted" },
                },
              ],
            }),
          ],
        },
      },
    });
    const wrapper = await mountPage();

    await pick(wrapper, pdf);
    await flushPromises();

    expect(ApiBookingService.uploadCustomerUploadByLink).toHaveBeenCalledWith(
      TARGET,
      LINK,
      "f1",
      pdf
    );
    expect(wrapper.find("[data-test='customer-proof-state']").text()).toBe(
      "Eingereicht · wird geprüft"
    );
    expect(wrapper.find("[data-test='customer-proof-file']").text()).toContain(
      "ausweis.pdf"
    );
  });

  it("refuses a file of another format before it goes", async () => {
    const wrapper = await mountPage();

    await pick(wrapper, new File(["x"], "bild.png", { type: "image/png" }));

    expect(ApiBookingService.uploadCustomerUploadByLink).not.toHaveBeenCalled();
    expect(wrapper.find("[data-test='customer-proof-error']").text()).toContain(
      "Erlaubt: PDF"
    );
  });

  it("names the refusal of the backend", async () => {
    ApiBookingService.uploadCustomerUploadByLink.mockRejectedValue(
      refusal(422, "customer_upload_virus_found")
    );
    const wrapper = await mountPage();

    await pick(wrapper, pdf);
    await flushPromises();

    expect(wrapper.find("[data-test='customer-proof-error']").text()).toContain(
      "Schadsoftware"
    );
  });

  it("replaces and deletes a file not checked yet", async () => {
    const waiting = field({
      state: "submitted",
      remainingFiles: 2,
      uploads: [
        {
          mediaId: "m1",
          originalFileName: "alt.pdf",
          size: 1024,
          review: { status: "submitted" },
        },
      ],
    });
    const state = { data: { customerUploadState: { fields: [waiting] } } };
    ApiBookingService.replaceCustomerUploadByLink.mockResolvedValue(state);
    ApiBookingService.removeCustomerUploadByLink.mockResolvedValue(state);
    const wrapper = await mountPage({ answer: answerWith([waiting]) });

    await wrapper.find("[data-test='customer-proof-replace']").trigger("click");
    await pick(wrapper, pdf);
    await flushPromises();
    await wrapper.find("[data-test='customer-proof-delete']").trigger("click");
    await flushPromises();

    expect(ApiBookingService.replaceCustomerUploadByLink).toHaveBeenCalledWith(
      TARGET,
      LINK,
      "f1",
      "m1",
      pdf
    );
    expect(ApiBookingService.removeCustomerUploadByLink).toHaveBeenCalledWith(
      TARGET,
      LINK,
      "f1",
      "m1"
    );
  });

  it("takes no new file once the field is checked", async () => {
    const wrapper = await mountPage({
      answer: answerWith([
        field({
          state: "fulfilled",
          uploads: [
            {
              mediaId: "m1",
              review: { status: "accepted", reviewedAt: Date.UTC(2026, 10, 1) },
            },
          ],
        }),
      ]),
    });

    expect(wrapper.find("[data-test='customer-proof-choose']").exists()).toBe(
      false
    );
    expect(wrapper.find("[data-test='customer-proof-state']").text()).toContain(
      "Geprüft am"
    );
  });
});

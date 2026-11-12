import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getCompartmentQrCode: vi.fn() },
}));

import AccessPointCompartmentQrDialog from "@/components/AccessPoint/AccessPointCompartmentQrDialog.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const LABOR = { id: "bank-labor", name: "Labor Fachbank 1" };
const HAFEN = { id: "bank-hafen", name: "Quartiersschrank Hafen" };

const FACH_HAFEN_1 = "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const FACH_LABOR_2 = "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d";
const FACH_LABOR_10 = "1d2e3f4a-5b6c-4d7e-9f8a-0b1c2d3e4f5a";

// An Open Locker Anlage as the list answers it: its Fächer without codes.
const ANLAGE = {
  id: "ap-anlage",
  type: "locker",
  mode: "remote",
  provider: "open-locker",
  label: "Fahrradgarage Süd",
  validationRules: [],
  config: {
    compartments: [
      { id: FACH_HAFEN_1, number: 1, lockerBank: HAFEN, outOfService: false },
      { id: FACH_LABOR_10, number: 10, lockerBank: LABOR, outOfService: true },
      { id: FACH_LABOR_2, number: 2, lockerBank: LABOR, outOfService: false },
    ],
  },
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

function blobError(status, body) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = {
    status,
    data: new Blob([JSON.stringify(body)], { type: "application/json" }),
  };
  return error;
}

/** `v-dialog` detaches its content, so the card is read through the tree. */
function card(wrapper) {
  return wrapper.findComponent({ name: "v-card" });
}

async function mountDialog(accessPoint = ANLAGE) {
  const wrapper = mountComponent(AccessPointCompartmentQrDialog, {
    store: store(),
    propsData: { open: false, accessPoint },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

/** The Schränke as the dialog lists them: heading, then each Fach row. */
function groups(wrapper) {
  return card(wrapper)
    .findAll("[data-test='compartment-qr-group']")
    .wrappers.map((group) => ({
      title: group.find("[data-test='compartment-qr-group-title']").text(),
      rows: group
        .findAll("[data-test='list-row']")
        .wrappers.map((row) => row.text().replace(/\s+/g, " ").trim()),
    }));
}

function rowOf(wrapper, compartmentId) {
  return card(wrapper).find(`[data-compartment-id='${compartmentId}']`);
}

async function download(wrapper, compartmentId, format) {
  await rowOf(wrapper, compartmentId)
    .find(`.download-compartment-qr-${format}`)
    .trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The dialog „QR-Codes der Fächer“ of an Open Locker Anlage
 * (ECCdigital/tickets#1056): the Fächer by Schrank, each with its QR code as
 * PDF, SVG and PNG. The client never sees a scan code, only the file the
 * server rendered.
 */
describe("AccessPointCompartmentQrDialog", () => {
  let saved;
  let click;

  beforeEach(() => {
    vi.clearAllMocks();
    saved = [];
    click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        saved.push(this.getAttribute("download"));
      });
    window.URL.createObjectURL = vi.fn(() => "blob:qr");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    click.mockRestore();
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
  });

  it("names the Anlage and how many Fächer it has", async () => {
    const wrapper = await mountDialog();

    const title = card(wrapper).find(".v-card__title").text();
    expect(title).toContain("QR-Codes der Fächer");
    expect(title).toContain("Fahrradgarage Süd · 3 Fächer");
  });

  it("says „1 Fach“ for an Anlage with one", async () => {
    const wrapper = await mountDialog({
      ...ANLAGE,
      config: { compartments: [ANLAGE.config.compartments[0]] },
    });

    expect(card(wrapper).find(".v-card__title").text()).toContain(
      "Fahrradgarage Süd · 1 Fach"
    );
  });

  it("lists the Fächer by Schrank, with number and state, as the Zuteilung orders them", async () => {
    const wrapper = await mountDialog();

    const listed = groups(wrapper);
    expect(listed.map((group) => group.title)).toEqual([
      "Schrank Labor Fachbank 1",
      "Schrank Quartiersschrank Hafen",
    ]);
    expect(listed[0].rows[0]).toContain("Fach 2");
    expect(listed[0].rows[0]).toContain("in Betrieb");
    expect(listed[0].rows[1]).toContain("Fach 10");
    expect(listed[0].rows[1]).toContain("außer Betrieb");
    expect(listed[1].rows).toHaveLength(1);
    expect(listed[1].rows[0]).toContain("Fach 1");
  });

  it("offers PDF, SVG and PNG for every Fach, out of service too", async () => {
    const wrapper = await mountDialog();

    [FACH_HAFEN_1, FACH_LABOR_2, FACH_LABOR_10].forEach((id) => {
      const row = rowOf(wrapper, id);
      expect(row.find(".download-compartment-qr-pdf").text()).toBe("PDF");
      expect(row.find(".download-compartment-qr-svg").text()).toBe("SVG");
      expect(row.find(".download-compartment-qr-png").text()).toBe("PNG");
    });
  });

  it("chooses no subset: no checkbox, no switch", async () => {
    const wrapper = await mountDialog();

    expect(card(wrapper).find("input[type='checkbox']").exists()).toBe(false);
  });

  it("downloads the QR code of one Fach under the name the server gives", async () => {
    ApiAccessPointService.getCompartmentQrCode.mockResolvedValue({
      data: "%PDF",
      headers: {
        "content-disposition":
          'inline; filename="qr-fahrradgarage-sued-schrank-labor-fachbank-1-fach-10.pdf"',
      },
    });
    const wrapper = await mountDialog();

    await download(wrapper, FACH_LABOR_10, "pdf");

    expect(ApiAccessPointService.getCompartmentQrCode).toHaveBeenCalledWith(
      "ap-anlage",
      FACH_LABOR_10,
      "pdf",
      "t1"
    );
    expect(saved).toEqual([
      "qr-fahrradgarage-sued-schrank-labor-fachbank-1-fach-10.pdf",
    ]);
  });

  it("names the missing store-front address when the download fails for it", async () => {
    ApiAccessPointService.getCompartmentQrCode.mockRejectedValue(
      blobError(503, {
        error: "BaseError",
        code: "store_front_url_missing",
        statusCode: 503,
        params: {},
      })
    );
    const wrapper = await mountDialog();

    await download(wrapper, FACH_LABOR_2, "svg");

    expect(saved).toEqual([]);
    expect(card(wrapper).text()).toContain(
      "Für diese Instanz ist keine Adresse der Storefront eingerichtet (STORE_FRONT_URL), der QR-Code lässt sich deshalb nicht erzeugen. Bitte wenden Sie sich an den Betrieb."
    );
  });

  it("keeps the general failure for any other error", async () => {
    ApiAccessPointService.getCompartmentQrCode.mockRejectedValue(
      blobError(500, {
        error: "InternalError",
        code: "internal_error",
        statusCode: 500,
      })
    );
    const wrapper = await mountDialog();

    await download(wrapper, FACH_LABOR_2, "png");

    expect(card(wrapper).text()).toContain(
      "Der QR-Code konnte nicht erzeugt werden."
    );
  });

  it("closes from the footer", async () => {
    const wrapper = await mountDialog();

    const button = card(wrapper)
      .findAll(".v-card__actions button")
      .wrappers.find((candidate) => candidate.text() === "Schließen");
    await button.trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: {
    rotateCompartmentScanCode: vi.fn(),
    getCompartmentQrCode: vi.fn(),
  },
}));

import AccessPointCompartmentRotateDialog from "@/components/AccessPoint/AccessPointCompartmentRotateDialog.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const FACH_ID = "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d";
const FACH = {
  id: FACH_ID,
  number: 2,
  lockerBank: { id: "bank-labor", name: "Labor Fachbank 1" },
  outOfService: false,
};

// An Open Locker Anlage as the list answers it: its Fächer without codes.
const ANLAGE = {
  id: "ap-anlage",
  type: "locker",
  mode: "remote",
  provider: "open-locker",
  label: "Fahrradgarage Süd",
  validationRules: [],
  config: { compartments: [FACH] },
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

function apiError(status, body) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: body };
  return error;
}

/** `v-dialog` detaches its content, so the card is read through the tree. */
function card(wrapper) {
  return wrapper.findComponent({ name: "v-card" });
}

function button(wrapper, text) {
  return card(wrapper)
    .findAll("button")
    .wrappers.find((candidate) => candidate.text() === text);
}

async function clickButton(wrapper, text) {
  await button(wrapper, text).trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

async function mountDialog() {
  const wrapper = mountComponent(AccessPointCompartmentRotateDialog, {
    store: store(),
    propsData: { open: false, accessPoint: ANLAGE, compartment: FACH },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

/**
 * „Rotieren“ for one Fach of an Open Locker Anlage (ECCdigital/tickets#1061),
 * like the door's `AccessPointRotateDialog`: a question with a warning, then
 * the downloads of the new code. The client never sees a scan code.
 */
describe("AccessPointCompartmentRotateDialog", () => {
  let saved;
  let click;

  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.rotateCompartmentScanCode.mockResolvedValue({
      data: ANLAGE,
    });
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

  it("asks for the Fach of the Anlage and warns that its sticker is void at once", async () => {
    const wrapper = await mountDialog();

    const text = card(wrapper).text();
    expect(text).toContain("Scan-Code rotieren");
    expect(text).toContain(
      "Soll der Scan-Code von „Schrank Labor Fachbank 1, Fach 2“ der Anlage „Fahrradgarage Süd“ ersetzt werden?"
    );
    expect(text).toContain(
      "Der angebrachte QR-Code dieses Fachs wird damit sofort ungültig. Drucken Sie den neuen QR-Code aus und bringen Sie ihn am Fach an."
    );
    expect(
      ApiAccessPointService.rotateCompartmentScanCode
    ).not.toHaveBeenCalled();
  });

  it("rotates the Fach's code on „Rotieren“ and offers the new code as PDF, SVG and PNG", async () => {
    const wrapper = await mountDialog();

    await clickButton(wrapper, "Rotieren");

    expect(
      ApiAccessPointService.rotateCompartmentScanCode
    ).toHaveBeenCalledWith("ap-anlage", FACH_ID, "t1");
    expect(wrapper.emitted("rotated")).toEqual([[ANLAGE, FACH]]);
    const text = card(wrapper).text();
    expect(text).toContain(
      "Der Scan-Code wurde ersetzt. Der alte QR-Code dieses Fachs ist ab sofort ungültig."
    );
    expect(button(wrapper, "QR-Code drucken (PDF, A4)")).toBeTruthy();
    expect(button(wrapper, "QR-Code als SVG")).toBeTruthy();
    expect(button(wrapper, "QR-Code als PNG")).toBeTruthy();
    expect(button(wrapper, "Rotieren")).toBeUndefined();
    expect(button(wrapper, "Schließen")).toBeTruthy();
  });

  it("downloads the new code of the Fach under the name the server gives", async () => {
    ApiAccessPointService.getCompartmentQrCode.mockResolvedValue({
      data: "<svg/>",
      headers: {
        "content-disposition":
          'inline; filename="qr-fahrradgarage-sued-schrank-labor-fachbank-1-fach-02.svg"',
      },
    });
    const wrapper = await mountDialog();
    await clickButton(wrapper, "Rotieren");

    await clickButton(wrapper, "QR-Code als SVG");

    expect(ApiAccessPointService.getCompartmentQrCode).toHaveBeenCalledWith(
      "ap-anlage",
      FACH_ID,
      "svg",
      "t1"
    );
    expect(saved).toEqual([
      "qr-fahrradgarage-sued-schrank-labor-fachbank-1-fach-02.svg",
    ]);
  });

  it("stays at the question and says so when the rotation fails", async () => {
    ApiAccessPointService.rotateCompartmentScanCode.mockRejectedValue(
      apiError(500, {
        error: "InternalError",
        code: "internal_error",
        statusCode: 500,
      })
    );
    const wrapper = await mountDialog();

    await clickButton(wrapper, "Rotieren");

    expect(wrapper.emitted("rotated")).toBeUndefined();
    expect(card(wrapper).text()).toContain(
      "Der Scan-Code konnte nicht rotiert werden."
    );
    expect(button(wrapper, "Rotieren")).toBeTruthy();
  });

  it("closes on „Abbrechen“ without rotating", async () => {
    const wrapper = await mountDialog();

    await clickButton(wrapper, "Abbrechen");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(
      ApiAccessPointService.rotateCompartmentScanCode
    ).not.toHaveBeenCalled();
  });

  it("asks again when opened anew after a rotation", async () => {
    const wrapper = await mountDialog();
    await clickButton(wrapper, "Rotieren");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect(button(wrapper, "Rotieren")).toBeTruthy();
  });
});

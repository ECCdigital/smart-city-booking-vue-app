import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: {
    rotateAllCompartmentScanCodes: vi.fn(),
    getCompartmentQrSheet: vi.fn(),
  },
}));

import AccessPointCompartmentRotateAllDialog from "@/components/AccessPoint/AccessPointCompartmentRotateAllDialog.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const LABOR = { id: "bank-labor", name: "Labor Fachbank 1" };
const HAFEN = { id: "bank-hafen", name: "Quartiersschrank Hafen" };

// An Open Locker Anlage as the list answers it: its Fächer without codes,
// one of them out of service.
const ANLAGE = {
  id: "ap-anlage",
  type: "locker",
  mode: "remote",
  provider: "open-locker",
  label: "Fahrradgarage Süd",
  validationRules: [],
  config: {
    compartments: [
      { id: "fach-hafen-1", number: 1, lockerBank: HAFEN, outOfService: false },
      {
        id: "fach-labor-10",
        number: 10,
        lockerBank: LABOR,
        outOfService: true,
      },
      { id: "fach-labor-2", number: 2, lockerBank: LABOR, outOfService: false },
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

async function mountDialog(accessPoint = ANLAGE) {
  const wrapper = mountComponent(AccessPointCompartmentRotateAllDialog, {
    store: store(),
    propsData: { open: false, accessPoint },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

/**
 * „Alle rotieren …“ for an Open Locker Anlage (ECCdigital/tickets#1063): the
 * question names the number of Fächer and warns that every sticker is void
 * at once, rotating waits for the tick that all stickers get printed anew,
 * and afterwards the dialog leads to the Sammel-PDF.
 */
describe("AccessPointCompartmentRotateAllDialog", () => {
  let saved;
  let click;

  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.rotateAllCompartmentScanCodes.mockResolvedValue({
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

  it("names the number of Fächer and warns that all stickers are void at once", async () => {
    const wrapper = await mountDialog();

    const text = card(wrapper).text();
    expect(text).toContain("Alle Scan-Codes rotieren");
    expect(text).toContain(
      "Soll der Scan-Code aller Fächer der Anlage „Fahrradgarage Süd“ ersetzt werden? Das betrifft 3 Fächer."
    );
    expect(text).toContain(
      "Alle 3 gedruckten und angebrachten QR-Codes werden sofort ungültig. Drucken Sie das Sammel-PDF und bringen Sie jeden Aufkleber an seinem Fach an."
    );
    expect(
      ApiAccessPointService.rotateAllCompartmentScanCodes
    ).not.toHaveBeenCalled();
  });

  it("says „1 Fach“ for an Anlage with one", async () => {
    const wrapper = await mountDialog({
      ...ANLAGE,
      config: { compartments: [ANLAGE.config.compartments[0]] },
    });

    expect(card(wrapper).text()).toContain("Das betrifft 1 Fach.");
  });

  it("makes the button to rotate active only with the tick „Ich drucke alle Aufkleber neu und bringe sie an.“", async () => {
    const wrapper = await mountDialog();

    const confirm = () => card(wrapper).find(".rotate-all-confirm");
    expect(confirm().text()).toBe("3 rotieren");
    expect(confirm().attributes("disabled")).toBeDefined();
    await confirm().trigger("click");
    await flushPromises();
    expect(
      ApiAccessPointService.rotateAllCompartmentScanCodes
    ).not.toHaveBeenCalled();

    const acknowledge = card(wrapper).find(
      ".rotate-all-acknowledge input[type='checkbox']"
    );
    expect(card(wrapper).find(".rotate-all-acknowledge").text()).toBe(
      "Ich drucke alle Aufkleber neu und bringe sie an."
    );
    await acknowledge.trigger("click");
    await wrapper.vm.$nextTick();

    expect(confirm().attributes("disabled")).toBeUndefined();
  });

  it("says, without a scan duty, that bookers keep opening through the app", async () => {
    const wrapper = await mountDialog();

    expect(card(wrapper).find(".rotate-all-scan-hint").text()).toBe(
      "Die Anlage verlangt keinen QR-Scan. Buchende öffnen weiter über die App, nur die alten Aufkleber führen ins Leere."
    );
  });

  it("says, with a scan duty, that no Fach opens for bookers until the stickers hang", async () => {
    const wrapper = await mountDialog({
      ...ANLAGE,
      validationRules: [{ type: "qrScan" }],
    });

    expect(card(wrapper).find(".rotate-all-scan-hint").text()).toBe(
      "Die Anlage verlangt den QR-Scan. Bis die neuen Aufkleber hängen, öffnet keines dieser Fächer für Buchende."
    );
  });

  it("rotates all codes after the tick and leads straight to the Sammel-PDF", async () => {
    ApiAccessPointService.getCompartmentQrSheet.mockResolvedValue({
      data: "%PDF",
      headers: {
        "content-disposition":
          'inline; filename="qr-fahrradgarage-sued-alle-faecher.pdf"',
      },
    });
    const wrapper = await mountDialog();
    await card(wrapper)
      .find(".rotate-all-acknowledge input[type='checkbox']")
      .trigger("click");

    await clickButton(wrapper, "3 rotieren");

    expect(
      ApiAccessPointService.rotateAllCompartmentScanCodes
    ).toHaveBeenCalledWith("ap-anlage", "t1");
    expect(wrapper.emitted("rotated")).toEqual([[ANLAGE]]);
    expect(card(wrapper).text()).toContain(
      "3 Scan-Codes ersetzt. Die alten QR-Codes sind ab sofort ungültig."
    );
    expect(button(wrapper, "3 rotieren")).toBeUndefined();
    expect(button(wrapper, "Schließen")).toBeTruthy();

    await clickButton(wrapper, "Alle drucken (Sammel-PDF)");

    expect(ApiAccessPointService.getCompartmentQrSheet).toHaveBeenCalledWith(
      "ap-anlage",
      "t1"
    );
    expect(saved).toEqual(["qr-fahrradgarage-sued-alle-faecher.pdf"]);
  });

  it("stays at the question and says so when the rotation fails", async () => {
    ApiAccessPointService.rotateAllCompartmentScanCodes.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 500"), {
        response: {
          status: 500,
          data: {
            error: "InternalError",
            code: "internal_error",
            statusCode: 500,
          },
        },
      })
    );
    const wrapper = await mountDialog();
    await card(wrapper)
      .find(".rotate-all-acknowledge input[type='checkbox']")
      .trigger("click");

    await clickButton(wrapper, "3 rotieren");

    expect(wrapper.emitted("rotated")).toBeUndefined();
    expect(card(wrapper).text()).toContain(
      "Die Scan-Codes konnten nicht rotiert werden."
    );
    expect(button(wrapper, "3 rotieren")).toBeTruthy();
  });

  it("closes on „Abbrechen“ without rotating", async () => {
    const wrapper = await mountDialog();

    await clickButton(wrapper, "Abbrechen");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(
      ApiAccessPointService.rotateAllCompartmentScanCodes
    ).not.toHaveBeenCalled();
  });

  it("asks again, without the tick, when opened anew after a rotation", async () => {
    const wrapper = await mountDialog();
    await card(wrapper)
      .find(".rotate-all-acknowledge input[type='checkbox']")
      .trigger("click");
    await clickButton(wrapper, "3 rotieren");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const confirm = card(wrapper).find(".rotate-all-confirm");
    expect(confirm.exists()).toBe(true);
    expect(confirm.attributes("disabled")).toBeDefined();
  });
});

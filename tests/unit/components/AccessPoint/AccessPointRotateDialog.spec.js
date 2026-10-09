import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { rotateScanCode: vi.fn(), getQrCode: vi.fn() },
}));

import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
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

async function clickButton(wrapper, text) {
  const button = card(wrapper)
    .findAll("button")
    .wrappers.find((candidate) => candidate.text().includes(text));
  await button.trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * After a rotation the dialog offers the reprint. The QR code encodes the
 * store-front address of the instance; without `STORE_FRONT_URL` the backend
 * answers `503 store_front_url_missing` (tickets#272) in the blob body the
 * download asked for, and the dialog names the missing configuration.
 */
describe("AccessPointRotateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.rotateScanCode.mockResolvedValue({ data: DOOR });
  });

  it("names the missing store-front address when the reprint fails for it", async () => {
    ApiAccessPointService.getQrCode.mockRejectedValue(
      blobError(503, {
        error: "BaseError",
        code: "store_front_url_missing",
        statusCode: 503,
        params: {},
      })
    );
    const wrapper = mountComponent(AccessPointRotateDialog, {
      store: store(),
      propsData: { open: false, accessPoint: DOOR },
    });
    await wrapper.setProps({ open: true });

    await clickButton(wrapper, "Rotieren");
    await clickButton(wrapper, "PDF");

    expect(ApiAccessPointService.getQrCode).toHaveBeenCalledWith(
      "ap-door",
      "pdf",
      "t1"
    );
    expect(card(wrapper).text()).toContain(
      "Für diese Instanz ist keine Adresse der Storefront eingerichtet (STORE_FRONT_URL), der QR-Code lässt sich deshalb nicht erzeugen. Bitte wenden Sie sich an den Betrieb."
    );
  });
});

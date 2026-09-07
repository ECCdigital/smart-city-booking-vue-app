import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { getAccessPoints: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { storeAccessPoint: vi.fn(), getLocationPrefill: vi.fn() },
}));

import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const PROVIDERS = [
  { id: "nuki", title: "Nuki" },
  { id: "ifbs", title: "Parkraumservice" },
];

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  externalId: "lock-1",
  mode: "remote",
  validationRules: [{ type: "qrScan" }],
};

const LOCKER = {
  id: "ap-locker",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  externalId: "loc-42",
  mode: "remote",
  validationRules: [],
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

/**
 * The dialog fills itself when it is opened, so a spec opens it the way the
 * management screen does instead of mounting it open.
 */
async function mountDialog(propsData = {}) {
  const wrapper = mountComponent(AccessPointEditDialog, {
    store: store(),
    propsData: {
      open: false,
      accessPoint: null,
      accessPoints: [],
      providers: PROVIDERS,
      ...propsData,
    },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * `v-dialog` detaches its content into the `data-app` container, so the
 * wrapper's own element stays empty - the card is read through the component
 * tree.
 */
function dialogText(wrapper) {
  return wrapper.findComponent({ name: "v-card" }).text();
}

function labels(wrapper) {
  return wrapper.findAll("label").wrappers.map((label) => label.text());
}

/**
 * One dialog carries doors and locker systems. The type follows the provider -
 * Nuki and Salto KS list doors, iFBS and Pareva list locker systems
 * (`listAccessPoints` in the four providers) - so it is shown, not asked: a
 * select whose answer is already settled is a question without a choice.
 */
describe("AccessPointEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessAppsService.getAccessPoints.mockResolvedValue({ data: [] });
  });

  it("shows the type of a locker system instead of offering a choice", async () => {
    const wrapper = await mountDialog({ accessPoint: LOCKER });

    expect(wrapper.find(".access-point-type").text()).toContain("Anlage");
    expect(labels(wrapper)).not.toContain("Typ");
  });

  it("shows the type of a door the same way", async () => {
    const wrapper = await mountDialog({ accessPoint: DOOR });

    expect(wrapper.find(".access-point-type").text()).toContain("Tür");
    expect(labels(wrapper)).not.toContain("Typ");
  });

  /**
   * Mode, QR rules and address describe a door. A locker system has none of
   * them - the migration creates it with `validationRules: []`, and the
   * compartment is opened through the provider, not at an address.
   */
  it("hides the door fields for a locker system", async () => {
    const wrapper = await mountDialog({ accessPoint: LOCKER });

    expect(labels(wrapper)).not.toContain("Modus");
    expect(labels(wrapper)).not.toContain("Adresse");
    expect(dialogText(wrapper)).not.toContain("QR-Scan erforderlich");
  });

  it("keeps the door fields for a door", async () => {
    const wrapper = await mountDialog({ accessPoint: DOOR });

    expect(labels(wrapper)).toContain("Modus");
    expect(labels(wrapper)).toContain("Adresse");
    expect(dialogText(wrapper)).toContain("QR-Scan erforderlich");
  });

  it("lets the type follow the provider that is typed in", async () => {
    const wrapper = await mountDialog({ providers: [] });

    expect(wrapper.find(".access-point-type").text()).toContain("Tür");

    const providerInput = wrapper.find(".provider-field input");
    providerInput.setValue("ifbs");
    await providerInput.trigger("keydown.enter");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".access-point-type").text()).toContain("Anlage");
  });

  /**
   * One button opens this dialog, and the way in is chosen at its top: taken
   * over from the provider's listing, or entered by hand. The switch is only
   * there while a provider is active - without one, the dialog is the door
   * form and nothing else, no hint included.
   */
  describe("the way in: from the provider or by hand", () => {
    it("offers the switch with a provider active, preset to the provider", async () => {
      const wrapper = await mountDialog();

      expect(dialogText(wrapper)).toContain("Zugangspunkt anlegen");
      expect(wrapper.find(".create-mode-toggle").exists()).toBe(true);
      expect(wrapper.find(".create-mode-provider").classes()).toContain(
        "v-item--active"
      );
      expect(wrapper.find(".create-mode-manual").classes()).not.toContain(
        "v-item--active"
      );
      expect(dialogText(wrapper)).toContain("Vom Anbieter übernehmen");
      expect(dialogText(wrapper)).toContain("Manuell anlegen");
      expect(dialogText(wrapper)).toContain(
        "Der Anbieter listet seine Türen und Anlagen"
      );
      expect(wrapper.find(".provider-picker").exists()).toBe(true);
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
        "t1",
        "nuki"
      );
    });

    it("is the door form without a switch or a hint when no provider is active", async () => {
      const wrapper = await mountDialog({ providers: [] });

      expect(dialogText(wrapper)).toContain("Zugangspunkt anlegen");
      expect(wrapper.find(".create-mode-toggle").exists()).toBe(false);
      expect(wrapper.find(".provider-picker").exists()).toBe(false);
      expect(dialogText(wrapper)).not.toContain("kein Anbieter aktiv");
      expect(labels(wrapper)).toContain("Modus");
      expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();
    });

    it("hides only the picker row on 'Manuell' and keeps what was entered", async () => {
      ApiAccessAppsService.getAccessPoints.mockResolvedValue({
        data: [{ id: "lock-9", externalId: "lock-9", label: "Seitentür" }],
      });
      const wrapper = await mountDialog();
      wrapper.findComponent({ ref: "lockSelect" }).vm.$emit("input", "lock-9");
      await wrapper.find(".label-field input").setValue("Hintereingang");

      await wrapper.find(".create-mode-manual").trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".create-mode-manual").classes()).toContain(
        "v-item--active"
      );
      expect(wrapper.find(".provider-picker").exists()).toBe(false);
      expect(dialogText(wrapper)).toContain("Eine Tür von Hand eintragen");
      expect(wrapper.find(".label-field input").element.value).toBe(
        "Hintereingang"
      );

      await wrapper.find(".create-mode-provider").trigger("click");
      expect(wrapper.find(".provider-picker").exists()).toBe(true);
      expect(wrapper.find(".label-field input").element.value).toBe(
        "Hintereingang"
      );
      // The provider and the lock picked before stay picked - the list is
      // not fetched anew.
      expect(wrapper.findComponent({ ref: "lockSelect" }).props("value")).toBe(
        "lock-9"
      );
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledTimes(1);
    });

    /**
     * The provider list may still be loading while the dialog opens: it then
     * turns to the provider once the list arrives, as long as nothing has
     * been typed yet.
     */
    it("turns to the provider once the list arrives on an empty form", async () => {
      const wrapper = await mountDialog({ providers: [] });
      expect(wrapper.find(".create-mode-toggle").exists()).toBe(false);

      await wrapper.setProps({ providers: PROVIDERS });
      await flushPromises();

      expect(wrapper.find(".create-mode-toggle").exists()).toBe(true);
      expect(wrapper.find(".provider-picker").exists()).toBe(true);
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
        "t1",
        "nuki"
      );
    });

    it("stays on the hand-entered door when the list arrives after typing", async () => {
      const wrapper = await mountDialog({ providers: [] });
      await wrapper.find(".label-field input").setValue("Hintereingang");

      await wrapper.setProps({ providers: PROVIDERS });
      await flushPromises();

      expect(wrapper.find(".create-mode-toggle").exists()).toBe(true);
      expect(wrapper.find(".provider-picker").exists()).toBe(false);
      expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();
    });

    it("shows no switch when editing", async () => {
      const wrapper = await mountDialog({ accessPoint: DOOR });

      expect(dialogText(wrapper)).toContain("Zugangspunkt bearbeiten");
      expect(wrapper.find(".create-mode-toggle").exists()).toBe(false);
      expect(wrapper.find(".provider-picker").exists()).toBe(false);
    });
  });

  /**
   * A stored locker system opens with the provider it has, and the provider
   * defaults must not run over the mode it was saved with - the mode field is
   * hidden for a locker system, so nobody could notice the downgrade before
   * saving it.
   */
  it("keeps the stored mode of a locker system that is opened for editing", async () => {
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });

    const wrapper = await mountDialog({
      accessPoint: { ...LOCKER, mode: "both" },
    });

    await wrapper.find(".save-access-point").trigger("click");
    await flushPromises();

    const payload = ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
    expect(payload).toMatchObject({ id: "ap-locker", mode: "both" });
  });

  it("saves a taken-over locker system with its type and mode", async () => {
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
    ApiAccessAppsService.getAccessPoints.mockResolvedValue({
      data: [
        {
          id: "loc-42",
          type: "locker",
          provider: "ifbs",
          externalId: "loc-42",
          locationId: "loc-42",
          label: "Fahrradboxen Bahnhof",
          supportedModes: ["remote"],
        },
      ],
    });

    const wrapper = await mountDialog({
      providers: [{ id: "ifbs", title: "Parkraumservice" }],
    });

    wrapper.findComponent({ ref: "lockSelect" }).vm.$emit("input", "loc-42");
    await wrapper.vm.$nextTick();
    await wrapper.find(".apply-lock").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".access-point-type").text()).toContain("Anlage");

    await wrapper.find(".save-access-point").trigger("click");
    await flushPromises();

    const payload = ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: "locker",
      provider: "ifbs",
      externalId: "loc-42",
      mode: "remote",
      validationRules: [],
    });
  });
});

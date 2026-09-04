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
    const wrapper = await mountDialog({ source: "manual" });

    expect(wrapper.find(".access-point-type").text()).toContain("Tür");

    const providerInput = wrapper.find(".provider-field input");
    providerInput.setValue("ifbs");
    await providerInput.trigger("keydown.enter");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".access-point-type").text()).toContain("Anlage");
  });

  /**
   * Two buttons over the table open this one dialog in two states: a door is
   * entered by hand, a locker system is taken over from the provider - which
   * is the same picker mechanism the door creation already had.
   */
  it("opens without the provider picker when a door is entered by hand", async () => {
    const wrapper = await mountDialog({ source: "manual" });

    expect(wrapper.find(".provider-picker").exists()).toBe(false);
    expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();
  });

  it("opens with the provider picker when taking one over", async () => {
    const wrapper = await mountDialog({ source: "provider" });

    expect(wrapper.find(".provider-picker").exists()).toBe(true);
    expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
      "t1",
      "nuki"
    );
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
      source: "provider",
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

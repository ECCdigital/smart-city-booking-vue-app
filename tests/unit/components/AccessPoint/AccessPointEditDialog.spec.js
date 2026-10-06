import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  validationError,
} from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { getAccessPoints: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { storeAccessPoint: vi.fn(), getLocationPrefill: vi.fn() },
}));

import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

const LISTS = ["listAccessPoints"];

const PROVIDERS = [
  { id: "nuki", title: "Nuki", providerCapabilities: LISTS },
  { id: "ifbs", title: "Parkraumservice", providerCapabilities: LISTS },
];

// Pareva lists size codes, not products, so the backend reports it without
// `listAccessPoints`: a Pareva Anlage is entered by hand.
const PAREVA = { id: "pareva", title: "Pareva", providerCapabilities: [] };

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
 * Nuki and Salto KS hand out doors, iFBS and Pareva locker systems - so it is
 * shown, not asked: a select whose answer is already settled is a question
 * without a choice.
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
    expect(labels(wrapper)).toContain("Standort-ID");
    expect(labels(wrapper)).not.toContain("Standort-ID beim Anbieter");
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
      expect(dialogText(wrapper)).toContain(
        "Eine Tür oder eine Pareva-Anlage von Hand eintragen"
      );
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

    /**
     * The listing is a way in only where the provider lists what it hands
     * out. Pareva lists size codes, not products, so it comes without
     * `listAccessPoints`: alone, it leaves the dialog on the form with the
     * provider preset; beside Nuki, the switch stands and the picker's
     * provider select names Nuki only.
     */
    it("offers the picker only for providers that list access points", async () => {
      const alone = await mountDialog({ providers: [PAREVA] });

      expect(alone.find(".create-mode-toggle").exists()).toBe(false);
      expect(alone.find(".provider-picker").exists()).toBe(false);
      expect(alone.find(".provider-field input").element.value).toBe("pareva");
      expect(alone.find(".access-point-type").text()).toContain("Anlage");
      expect(labels(alone)).toContain("Produkt-ID");
      expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();

      const beside = await mountDialog({ providers: [PROVIDERS[0], PAREVA] });

      expect(beside.find(".create-mode-toggle").exists()).toBe(true);
      expect(beside.find(".provider-picker").exists()).toBe(true);
      expect(
        beside
          .findComponent({ ref: "pickerProviderSelect" })
          .props("items")
          .map((item) => item.value)
      ).toEqual(["nuki"]);
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledTimes(1);
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
        "t1",
        "nuki"
      );
      // The form's own provider field still knows every active provider.
      expect(
        beside.findComponent({ name: "v-combobox" }).props("items")
      ).toEqual(["nuki", "pareva"]);
    });

    it("presets the one hand-entered provider once the list arrives", async () => {
      const wrapper = await mountDialog({ providers: [] });
      expect(wrapper.find(".provider-field input").element.value).toBe("");

      await wrapper.setProps({ providers: [PAREVA] });
      await flushPromises();

      expect(wrapper.find(".create-mode-toggle").exists()).toBe(false);
      expect(wrapper.find(".provider-field input").element.value).toBe(
        "pareva"
      );
      expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();
    });

    /**
     * A preset is the dialog's doing, not the admin's: when a listing
     * provider arrives after it, the preset goes with the bare form and the
     * listing takes over - nothing typed is lost, because nothing was.
     */
    it("lets a listing provider that arrives later replace the preset", async () => {
      const wrapper = await mountDialog({ providers: [PAREVA] });
      expect(wrapper.find(".provider-field input").element.value).toBe(
        "pareva"
      );

      await wrapper.setProps({ providers: [PAREVA, PROVIDERS[0]] });
      await flushPromises();

      expect(wrapper.find(".create-mode-toggle").exists()).toBe(true);
      expect(wrapper.find(".provider-picker").exists()).toBe(true);
      expect(wrapper.find(".provider-field input").element.value).toBe("");
      expect(wrapper.find(".access-point-type").text()).toContain("Tür");
      expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
        "t1",
        "nuki"
      );
    });

    it("shows no switch when editing", async () => {
      const wrapper = await mountDialog({ accessPoint: DOOR });

      expect(dialogText(wrapper)).toContain("Zugangspunkt bearbeiten");
      expect(wrapper.find(".create-mode-toggle").exists()).toBe(false);
      expect(wrapper.find(".provider-picker").exists()).toBe(false);
    });
  });

  /**
   * A Nuki door carries an Öffnungsart: which action Nuki performs when the
   * door is opened. It is a Nuki matter - no other provider is asked what to
   * send - and a door matter: a compartment of a locker system has no latch
   * to pull.
   */
  describe("the Öffnungsart of a Nuki door", () => {
    function openActionSelect(wrapper) {
      return wrapper.findComponent({ ref: "openActionSelect" });
    }

    it("offers the five Öffnungsarten with their explanations", async () => {
      const wrapper = await mountDialog({ accessPoint: DOOR });

      expect(labels(wrapper)).toContain("Öffnungsart");
      const items = openActionSelect(wrapper).props("items");
      expect(items.map((item) => item.value)).toEqual([
        "auto",
        "unlock",
        "unlatch",
        "lock_n_go",
        "lock_n_go_unlatch",
      ]);
      expect(items.map((item) => item.text)).toEqual([
        "Automatisch",
        "Aufschließen",
        "Falle ziehen",
        "Lock'n'Go",
        "Lock'n'Go mit Falle ziehen",
      ]);
      expect(items[3].description).toBe(
        "Aufschließen, kurz warten, wieder abschließen. Für Türen, die von sich aus zufallen."
      );
      expect(dialogText(wrapper)).toContain(
        "Welche Aktion Nuki beim Öffnen ausführt. Die Wartezeit von Lock'n'Go wird in der Nuki-App eingestellt."
      );
    });

    it("says at the JSON field that the Öffnungsart is set above", async () => {
      const wrapper = await mountDialog({ accessPoint: DOOR });
      await wrapper.find(".v-expansion-panel-header").trigger("click");
      await flushPromises();

      expect(dialogText(wrapper)).toContain(
        "Die Öffnungsart wird oben eingestellt."
      );
    });

    it("carries no Öffnungsart for a door of another provider", async () => {
      const wrapper = await mountDialog({
        accessPoint: { ...DOOR, provider: "salto-ks" },
      });

      expect(labels(wrapper)).not.toContain("Öffnungsart");

      await wrapper.find(".v-expansion-panel-header").trigger("click");
      await flushPromises();
      expect(dialogText(wrapper)).not.toContain(
        "Die Öffnungsart wird oben eingestellt."
      );
    });

    it("carries no Öffnungsart for a locker system", async () => {
      const wrapper = await mountDialog({ accessPoint: LOCKER });

      expect(labels(wrapper)).not.toContain("Öffnungsart");
    });

    /**
     * The field owns `config.openAction`: it is taken out of the JSON text on
     * load, so the same key is not edited in two places, and merged back on
     * save with the field's answer winning.
     */
    describe("owns the key in the advanced configuration", () => {
      async function saveDoor(wrapper) {
        await wrapper.find(".save-access-point").trigger("click");
        await flushPromises();
        return ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
      }

      async function configField(wrapper) {
        await wrapper.find(".v-expansion-panel-header").trigger("click");
        await flushPromises();
        return wrapper.find(".config-field textarea");
      }

      beforeEach(() => {
        ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
      });

      it("takes the stored Öffnungsart out of the JSON text", async () => {
        const wrapper = await mountDialog({
          accessPoint: {
            ...DOOR,
            config: { openAction: "unlatch", tolerance: 5 },
          },
        });

        expect(openActionSelect(wrapper).props("value")).toBe("unlatch");
        const text = (await configField(wrapper)).element.value;
        expect(text).toContain("tolerance");
        expect(text).not.toContain("openAction");
      });

      it("shows Automatisch for a door without the key", async () => {
        const wrapper = await mountDialog({ accessPoint: DOOR });

        expect(openActionSelect(wrapper).props("value")).toBe("auto");
      });

      it("merges the chosen Öffnungsart back into the configuration", async () => {
        const wrapper = await mountDialog({
          accessPoint: { ...DOOR, config: { tolerance: 5 } },
        });
        openActionSelect(wrapper).vm.$emit("input", "lock_n_go");
        await wrapper.vm.$nextTick();

        expect((await saveDoor(wrapper)).config).toEqual({
          tolerance: 5,
          openAction: "lock_n_go",
        });
      });

      it("wins over an openAction typed into the JSON text", async () => {
        const wrapper = await mountDialog({ accessPoint: DOOR });
        const field = await configField(wrapper);
        await field.setValue(JSON.stringify({ openAction: "unlatch" }));
        openActionSelect(wrapper).vm.$emit("input", "unlock");
        await wrapper.vm.$nextTick();

        expect((await saveDoor(wrapper)).config).toEqual({
          openAction: "unlock",
        });
      });

      /**
       * "Automatisch" is the missing key, not a value: an untouched existing
       * door must not gain one, so that saving it produces no diff in
       * `config` - and a door that had one loses it when it is set back.
       */
      it("writes no key for Automatisch", async () => {
        const wrapper = await mountDialog({ accessPoint: DOOR });

        expect((await saveDoor(wrapper)).config).toEqual({});
      });

      it("leaves the stored Öffnungsart alone when nothing is touched", async () => {
        const wrapper = await mountDialog({
          accessPoint: { ...DOOR, config: { openAction: "unlatch" } },
        });

        expect((await saveDoor(wrapper)).config).toEqual({
          openAction: "unlatch",
        });
      });

      it("drops the key when Automatisch is chosen again", async () => {
        const wrapper = await mountDialog({
          accessPoint: { ...DOOR, config: { openAction: "unlatch" } },
        });
        openActionSelect(wrapper).vm.$emit("input", "auto");
        await wrapper.vm.$nextTick();

        expect((await saveDoor(wrapper)).config).toEqual({});
      });

      /**
       * The Öffnungsart belongs to a Nuki door; a door moved to another
       * provider carries none, so the key goes with the provider.
       */
      it("drops the key when the provider is moved away from nuki", async () => {
        const wrapper = await mountDialog({
          accessPoint: { ...DOOR, config: { openAction: "unlatch" } },
        });
        const providerInput = wrapper.find(".provider-field input");
        providerInput.setValue("salto-ks");
        await providerInput.trigger("keydown.enter");
        await wrapper.vm.$nextTick();

        expect(labels(wrapper)).not.toContain("Öffnungsart");
        expect((await saveDoor(wrapper)).config).toEqual({});
      });
    });

    /**
     * Which Öffnungsarten a lock can carry out is the backend's word: the
     * listing carries `supportedOpenActions` per lock, and the dialog greys
     * out what is not in it. Only the backend decides - a listing without the
     * field greys out nothing, and the save is refused there, not here.
     */
    describe("greys out what the device cannot do", () => {
      const SMART_LOCK = {
        id: "lock-1",
        externalId: "lock-1",
        label: "Haupteingang",
        provider: "nuki",
        supportedOpenActions: [
          "auto",
          "unlock",
          "unlatch",
          "lock_n_go",
          "lock_n_go_unlatch",
        ],
      };
      const BOX = {
        id: "box-2",
        externalId: "box-2",
        label: "Nuki Box",
        provider: "nuki",
        supportedOpenActions: ["auto", "unlock"],
      };

      async function takeOver(wrapper, externalId) {
        wrapper
          .findComponent({ ref: "lockSelect" })
          .vm.$emit("input", externalId);
        await wrapper.vm.$nextTick();
        await wrapper.find(".apply-lock").trigger("click");
        await wrapper.vm.$nextTick();
      }

      function disabledOptions(wrapper) {
        return openActionSelect(wrapper)
          .props("items")
          .filter((item) => item.disabled)
          .map((item) => item.value);
      }

      it("greys out the Öffnungsarten the picked lock does not list", async () => {
        ApiAccessAppsService.getAccessPoints.mockResolvedValue({ data: [BOX] });
        const wrapper = await mountDialog();
        await takeOver(wrapper, "box-2");

        expect(disabledOptions(wrapper)).toEqual([
          "unlatch",
          "lock_n_go",
          "lock_n_go_unlatch",
        ]);
        const items = openActionSelect(wrapper).props("items");
        expect(items[2].description).toBe(
          "Für diesen Gerätetyp nicht verfügbar"
        );
        expect(items[1].description).toBe(
          "Riegel zurück, Tür bleibt zu. Zum Öffnen muss die Klinke gedrückt werden."
        );
      });

      /**
       * An older backend lists its locks without the field. The dialog then
       * greys out nothing and lets the backend refuse what it must.
       */
      it("greys out nothing when the listing carries no Öffnungsarten", async () => {
        ApiAccessAppsService.getAccessPoints.mockResolvedValue({
          data: [{ ...SMART_LOCK, supportedOpenActions: undefined }],
        });
        const wrapper = await mountDialog();
        await takeOver(wrapper, "lock-1");

        expect(disabledOptions(wrapper)).toEqual([]);
        expect(dialogText(wrapper)).not.toContain(
          "Dieses Schloss unterstützt die gewählte Öffnungsart nicht."
        );
      });

      /**
       * Swapping the device behind a door keeps the Öffnungsart it was set
       * to. It stays chosen and visible - greyed out, with a word under the
       * field - rather than being silently reset to something else.
       */
      it("keeps a chosen Öffnungsart the new lock cannot do", async () => {
        ApiAccessAppsService.getAccessPoints.mockResolvedValue({
          data: [SMART_LOCK, BOX],
        });
        const wrapper = await mountDialog();
        await takeOver(wrapper, "lock-1");
        openActionSelect(wrapper).vm.$emit("input", "unlatch");
        await wrapper.vm.$nextTick();
        expect(dialogText(wrapper)).not.toContain(
          "Dieses Schloss unterstützt die gewählte Öffnungsart nicht."
        );

        await takeOver(wrapper, "box-2");

        expect(openActionSelect(wrapper).props("value")).toBe("unlatch");
        expect(disabledOptions(wrapper)).toContain("unlatch");
        expect(dialogText(wrapper)).toContain(
          "Dieses Schloss unterstützt die gewählte Öffnungsart nicht."
        );
      });
    });

    /**
     * The backend has the last word on the Öffnungsart, and it says which
     * field it refused: a fault of `config.openAction` belongs at the select,
     * not in the alert under the form, so the admin sees where to fix it.
     */
    describe("when the backend refuses the Öffnungsart", () => {
      async function saveAndFail(details) {
        ApiAccessPointService.storeAccessPoint.mockRejectedValue(
          validationError(details)
        );
        const wrapper = await mountDialog({ accessPoint: DOOR });
        await wrapper.find(".save-access-point").trigger("click");
        await flushPromises();
        await wrapper.vm.$nextTick();
        return wrapper;
      }

      it("puts an Öffnungsart the lock cannot do at the field", async () => {
        const wrapper = await saveAndFail([
          {
            field: "config.openAction",
            code: "unsupported_open_action",
            params: {
              openAction: "lock_n_go",
              deviceType: 1,
              supportedOpenActions: ["auto", "unlock"],
            },
          },
        ]);

        expect(openActionSelect(wrapper).props("errorMessages")).toBe(
          "Die Öffnungsart „Lock'n'Go“ unterstützt dieses Schloss nicht. Möglich sind: Automatisch, Aufschließen."
        );
        expect(dialogText(wrapper)).toContain(
          "Die Öffnungsart „Lock'n'Go“ unterstützt dieses Schloss nicht."
        );
        expect(wrapper.findAll(".v-alert").length).toBe(0);
        expect(wrapper.emitted("saved")).toBeUndefined();
      });

      it("puts an Öffnungsart outside the vocabulary at the field", async () => {
        const wrapper = await saveAndFail([
          { field: "config.openAction", code: "unknown_open_action" },
        ]);

        expect(openActionSelect(wrapper).props("errorMessages")).toBe(
          "Öffnungsart: Unzulässiger Wert"
        );
      });

      it("leaves the faults of other fields in the alert", async () => {
        const wrapper = await saveAndFail([
          { field: "mode", code: "unsupported_mode" },
        ]);

        expect(openActionSelect(wrapper).props("errorMessages")).toBe("");
        expect(wrapper.find(".v-alert").text()).toContain(
          "Modus: Dieses Schloss unterstützt den gewählten Modus nicht."
        );
      });

      it("clears the field error once another Öffnungsart is chosen", async () => {
        const wrapper = await saveAndFail([
          { field: "config.openAction", code: "unknown_open_action" },
        ]);

        openActionSelect(wrapper).vm.$emit("change", "unlock");
        await wrapper.vm.$nextTick();

        expect(openActionSelect(wrapper).props("errorMessages")).toBe("");
      });
    });

    /**
     * While creating, the field appears as soon as the provider is nuki -
     * taken over from the listing or typed in by hand.
     */
    it("appears while creating as soon as the provider is nuki", async () => {
      const wrapper = await mountDialog({ providers: [] });
      expect(labels(wrapper)).not.toContain("Öffnungsart");

      const providerInput = wrapper.find(".provider-field input");
      providerInput.setValue("nuki");
      await providerInput.trigger("keydown.enter");
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(labels(wrapper)).toContain("Öffnungsart");
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

    const wrapper = await mountDialog({ providers: [PROVIDERS[1]] });

    wrapper.findComponent({ ref: "lockSelect" }).vm.$emit("input", "loc-42");
    await wrapper.vm.$nextTick();
    await wrapper.find(".apply-lock").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".access-point-type").text()).toContain("Anlage");
    expect(labels(wrapper)).toContain("Standort-ID");
    expect(labels(wrapper)).not.toContain("Standort-ID beim Anbieter");
    expect(dialogText(wrapper)).toContain(
      "Ändern Sie die Standort-ID, um die Anlage bei iFBS auszutauschen."
    );

    await wrapper.find(".save-access-point").trigger("click");
    await flushPromises();

    const payload = ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: "locker",
      provider: "ifbs",
      externalId: "loc-42",
      providerLocationId: null,
      mode: "remote",
      validationRules: [],
    });
  });

  /**
   * Saving makes the backend ask the provider. When the provider does not
   * answer (503) or refuses the tenant's token (502), the dialog stays open
   * and its alert names the provider instead of the generic save failure.
   */
  describe("when the provider fails while saving", () => {
    async function saveDoor(error) {
      ApiAccessPointService.storeAccessPoint.mockRejectedValue(error);
      ApiAccessAppsService.getAccessPoints.mockResolvedValue({ data: [] });
      const wrapper = await mountDialog({ accessPoint: DOOR });
      await wrapper.find(".save-access-point").trigger("click");
      await flushPromises();
      await wrapper.vm.$nextTick();
      return wrapper;
    }

    it("shows the unreachable provider in the save alert", async () => {
      const wrapper = await saveDoor(
        lifecycleError(503, "access_provider_unreachable", {
          provider: "nuki",
        })
      );
      expect(dialogText(wrapper)).toContain(
        "nuki ist gerade nicht erreichbar. Die Einstellung wurde nicht gespeichert. Bitte später erneut versuchen."
      );
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("shows the rejecting provider in the save alert", async () => {
      const wrapper = await saveDoor(
        lifecycleError(502, "access_provider_rejected", { provider: "nuki" })
      );
      expect(dialogText(wrapper)).toContain(
        "nuki hat den Zugriff abgelehnt. Bitte die Anwendung des Mandanten prüfen."
      );
    });
  });

  /**
   * An Anlage shows the one id field its provider reads - iFBS a location,
   * Pareva a product - and no "Standort-ID beim Anbieter", which no provider
   * reads. Created, it goes out without one, whatever the listing offered
   * there (iFBS lists its LocationID a second time); edited, a stored one
   * passes through unseen. A door keeps both fields as they were.
   */
  describe("the id fields of an Anlage", () => {
    /**
     * A Pareva Anlage is a Pareva product, and its id is the product's
     * 24-hex id from Pareva's administration - typed in, since the listing
     * has no products to offer.
     */
    it("saves a hand-entered Pareva Anlage by its Produkt-ID alone", async () => {
      ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });

      const wrapper = await mountDialog({ providers: [PAREVA] });

      expect(labels(wrapper)).toContain("Produkt-ID");
      expect(labels(wrapper)).not.toContain("ID beim Anbieter");
      expect(labels(wrapper)).not.toContain("Standort-ID beim Anbieter");
      expect(dialogText(wrapper)).toContain(
        "Ändern Sie die Produkt-ID, um die Anlage bei Pareva auszutauschen."
      );
      const productIdInput = wrapper.find(".external-id-field input");
      expect(productIdInput.attributes("placeholder")).toBe(
        "z. B. 66570d1a1f9b6357ed971746"
      );

      await productIdInput.setValue("66570d1a1f9b6357ed971746");
      await wrapper.find(".save-access-point").trigger("click");
      await flushPromises();

      const payload = ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
      expect(payload).toMatchObject({
        type: "locker",
        provider: "pareva",
        externalId: "66570d1a1f9b6357ed971746",
        providerLocationId: null,
        mode: "authorization",
        validationRules: [],
      });
    });

    it("shows a stored Pareva Anlage the same field", async () => {
      const wrapper = await mountDialog({
        providers: [PAREVA],
        accessPoint: {
          id: "ap-pareva",
          type: "locker",
          provider: "pareva",
          label: "Schließfächer Rathaus",
          externalId: "66570d1a1f9b6357ed971746",
          mode: "authorization",
          validationRules: [],
        },
      });

      expect(labels(wrapper)).toContain("Produkt-ID");
      expect(labels(wrapper)).not.toContain("Standort-ID beim Anbieter");
      expect(dialogText(wrapper)).toContain(
        "Ändern Sie die Produkt-ID, um die Anlage bei Pareva auszutauschen."
      );
    });

    it("passes a stored location id through unseen when editing", async () => {
      ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });

      const wrapper = await mountDialog({
        accessPoint: { ...LOCKER, providerLocationId: "x" },
      });

      expect(labels(wrapper)).toContain("Standort-ID");
      expect(labels(wrapper)).not.toContain("Standort-ID beim Anbieter");

      await wrapper.find(".save-access-point").trigger("click");
      await flushPromises();

      const payload = ApiAccessPointService.storeAccessPoint.mock.calls[0][0];
      expect(payload).toMatchObject({
        id: "ap-locker",
        externalId: "loc-42",
        providerLocationId: "x",
      });
    });

    it("keeps both fields for a door", async () => {
      const wrapper = await mountDialog({ accessPoint: DOOR });

      expect(labels(wrapper)).toContain("ID beim Anbieter");
      expect(labels(wrapper)).toContain("Standort-ID beim Anbieter");
      expect(dialogText(wrapper)).toContain("ohne den QR-Code neu zu drucken");
    });
  });
});

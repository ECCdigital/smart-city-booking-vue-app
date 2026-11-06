import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { activeDialog, activeDialogText } from "@tests/unit/support/dialog";
import Bookable from "@/entities/bookable";
import BookableEditUploadFields from "@/components/Bookable/Edit/BookableEditUploadFields.vue";

const store = ({ formats = ["pdf", "jpeg"], limits } = {}) =>
  new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: {
          currentTenant: () => ({
            id: "t1",
            customerUploads: { enabled: true, formats },
          }),
        },
      },
      instance: {
        namespaced: true,
        getters: {
          instance: () => (limits ? { customerUploadLimits: limits } : {}),
        },
      },
    },
  });

const FIELD = {
  id: "field-1",
  label: "Vereinsausweis",
  hint: "",
  consentText: "",
  required: false,
  maxFiles: 1,
  formats: ["pdf"],
  maxFileSizeMb: null,
  category: "normal",
  timing: "checkout",
  deadlineDaysBeforeStart: null,
};

const mountArea = (uploadFieldDefinitions = [], storeOptions) =>
  mountEditing(BookableEditUploadFields, {
    bookable: new Bookable({
      tenantId: "t1",
      title: "Saal",
      uploadFieldDefinitions,
    }).toPlain(),
    store: store(storeOptions),
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

/** An element of the open dialog, by its `data-test`. */
const inDialog = (test) =>
  activeDialog()?.querySelector(`[data-test='${test}']`);

const settle = (wrapper) => wrapper.vm.$nextTick();

async function type(wrapper, test, value) {
  const input = inDialog(test);
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await settle(wrapper);
}

async function click(wrapper, test) {
  inDialog(test).click();
  await settle(wrapper);
}

describe("BookableEditUploadFields (Upload-Felder)", () => {
  it("changes nothing when it mounts", () => {
    const { patches, bookable, stored } = mountArea([FIELD]);

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("shows the limits of the instance", () => {
    const { wrapper } = mountArea([], {
      limits: {
        maxFileSizeMb: 8,
        maxFilesPerBooking: 12,
        maxTotalSizeMbPerBooking: 60,
      },
    });

    expect(find(wrapper, "upload-fields-limits").text()).toBe(
      "Grenzen der Instanz: höchstens 8 MB je Datei, 12 Dateien und 60 MB je Buchung."
    );
  });

  it("creates a field in a dialog, with a stable id and every format of the tenant", async () => {
    const { wrapper, patches, bookable, stored } = mountArea();

    await find(wrapper, "upload-field-add").trigger("click");
    expect(activeDialogText()).toContain("Neues Upload-Feld anlegen");
    expect(patches).toEqual([]);

    await type(wrapper, "upload-field-label", "Sozialpass");
    await click(wrapper, "upload-field-save");

    const [added] = lastPatch(patches).uploadFieldDefinitions;
    expect(added.id).toEqual(expect.any(String));
    expect(added.id).not.toBe("");
    expect(added).toMatchObject({
      label: "Sozialpass",
      maxFiles: 1,
      maxFileSizeMb: 10,
      formats: ["pdf", "jpeg"],
      category: "normal",
      timing: "checkout",
      required: false,
    });
    expect(bookable).toEqual(stored);
  });

  it("fills in the size limit of the instance for a new field", async () => {
    const { wrapper } = mountArea([], {
      limits: {
        maxFileSizeMb: 8,
        maxFilesPerBooking: 20,
        maxTotalSizeMbPerBooking: 100,
      },
    });

    await find(wrapper, "upload-field-add").trigger("click");

    expect(inDialog("upload-field-max-size").value).toBe("8");
  });

  it("names what a required upload means right under the label of its switch", async () => {
    const { wrapper } = mountArea();

    await find(wrapper, "upload-field-add").trigger("click");

    expect(
      activeDialog()
        .querySelector(".upload-field-required label")
        .textContent.replace(/\s+/g, " ")
        .trim()
    ).toBe(
      "Pflicht-Nachweis Ein Pflicht-Nachweis gilt als Voraussetzung für die Buchung. Nur in dem Fall werden Nachweise als „fehlend“ oder „überfällig“ markiert."
    );
  });

  it("asks label and description, but no consent text", async () => {
    const { wrapper } = mountArea();

    await find(wrapper, "upload-field-add").trigger("click");

    expect(activeDialogText()).toContain("Beschreibung");
    expect(activeDialogText()).not.toContain("Hinweistext");
    expect(activeDialogText()).not.toContain("Einwilligungstext");
    expect(inDialog("upload-field-consent")).toBeNull();
  });

  it("creates nothing without a label", async () => {
    const { wrapper, patches } = mountArea();

    await find(wrapper, "upload-field-add").trigger("click");

    expect(inDialog("upload-field-save").disabled).toBe(true);
    expect(patches).toEqual([]);
  });

  it("renames a field in the dialog and keeps its id", async () => {
    const { wrapper, patches } = mountArea([FIELD]);

    await find(wrapper, "upload-field-edit").trigger("click");
    await type(wrapper, "upload-field-label", "Sozialpass");
    await click(wrapper, "upload-field-save");

    expect(lastPatch(patches).uploadFieldDefinitions).toEqual([
      { ...FIELD, label: "Sozialpass" },
    ]);
  });

  it("deletes a field after asking", async () => {
    const second = { ...FIELD, id: "field-2", label: "Sozialpass" };
    const { wrapper, patches } = mountArea([FIELD, second]);

    await find(wrapper, "upload-field-remove").trigger("click");
    expect(patches).toEqual([]);
    expect(activeDialogText()).toContain("„Vereinsausweis“");
    await click(wrapper, "upload-field-remove-confirm");

    expect(lastPatch(patches).uploadFieldDefinitions).toEqual([second]);
  });

  it("offers only the formats of the tenant", async () => {
    const { wrapper } = mountArea([FIELD], { formats: ["pdf"] });

    await find(wrapper, "upload-field-edit").trigger("click");

    expect(inDialog("upload-field-format-pdf")).not.toBeNull();
    expect(inDialog("upload-field-format-jpeg")).toBeNull();
    expect(inDialog("upload-field-format-png")).toBeNull();
  });

  it("opens the hint on „besonders schutzwürdig“ by its info icon", async () => {
    const { wrapper } = mountArea([FIELD]);
    await find(wrapper, "upload-field-edit").trigger("click");
    expect(inDialog("upload-field-sensitive-warning")).toBeNull();

    await click(wrapper, "upload-field-sensitive-info");

    expect(inDialog("upload-field-sensitive-warning").textContent).toContain(
      "Wägen Sie ab, ob eine Sichtprüfung vor Ort"
    );
  });

  it("warns when „besonders schutzwürdig“ is chosen", async () => {
    const { wrapper, patches } = mountArea([FIELD]);
    await find(wrapper, "upload-field-edit").trigger("click");

    await click(wrapper, "upload-field-category-sensitive");

    expect(inDialog("upload-field-sensitive-warning")).not.toBeNull();
    await click(wrapper, "upload-field-save");
    expect(lastPatch(patches).uploadFieldDefinitions[0].category).toBe(
      "sensitive"
    );
  });

  it("asks a deadline only after the approval", async () => {
    const { wrapper, patches } = mountArea([FIELD]);
    await find(wrapper, "upload-field-edit").trigger("click");
    expect(inDialog("upload-field-deadline")).toBeNull();

    await click(wrapper, "upload-field-timing-afterConfirmation");
    await type(wrapper, "upload-field-deadline", "7");
    await click(wrapper, "upload-field-save");

    expect(lastPatch(patches).uploadFieldDefinitions[0]).toMatchObject({
      timing: "afterConfirmation",
      deadlineDaysBeforeStart: 7,
    });
  });

  it("drops the deadline when the field moves back to the checkout", async () => {
    const { wrapper, patches } = mountArea([
      { ...FIELD, timing: "afterConfirmation", deadlineDaysBeforeStart: 7 },
    ]);
    await find(wrapper, "upload-field-edit").trigger("click");

    await click(wrapper, "upload-field-timing-checkout");
    await click(wrapper, "upload-field-save");

    expect(lastPatch(patches).uploadFieldDefinitions[0]).toMatchObject({
      timing: "checkout",
      deadlineDaysBeforeStart: null,
    });
  });
});

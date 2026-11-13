<script>
import { mapGetters } from "vuex";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import LocationInput from "@/components/commons/Location/LocationInput.vue";
import AccessPointCompartmentPicker from "@/components/AccessPoint/AccessPointCompartmentPicker.vue";
import {
  formatAccessPointErrorMessage,
  splitAccessPointFieldError,
  splitCompartmentErrors,
} from "@/utilities/access-point-errors";
import {
  carriesOwnCompartments,
  leavingCompartmentIds,
  takenProviderIds,
} from "@/utilities/locker-system-compartments";
import {
  createLockAndAccessAppDefaults,
  SALTO_PROVIDER,
} from "@/utilities/access-apps";
import {
  canListAccessPoints,
  hasProviderCapability,
  providerAccessPointDefaults,
  requiresQrScan,
  DOOR_TYPE,
  LOCKER_TYPE,
  QR_SCAN_RULE,
} from "@/utilities/access-points";
import {
  accessPointFields,
  accessPointTypes,
  settingsSummary,
} from "@/utilities/access-point-fields";
import { iqNotActivated, printsQr } from "@/utilities/access-point-rows";
import { locationRefusal, pointOf } from "@/utils/locationLogic";

const GET_LOCATION_CAPABILITY = "getLocation";
// The origin of a point taken over with „Vorbelegen“: it counts as one set
// by hand, so a changed address asks before the point follows.
const PREFILL_ORIGIN = "nuki";

// A Salto door opens remotely or not at all: the backend refuses the PIN
// modes at every Salto lock (tickets#499).
const REMOTE_MODE = "remote";

/**
 * The Öffnungsart of a Nuki door: which action Nuki performs when the door is
 * opened. `auto` is the missing key - the per-device choice the provider has
 * always made. Which of them a lock can carry out is the backend's word
 * (`supportedOpenActions` of the listing).
 */
const AUTO_OPEN_ACTION = "auto";
const OPEN_ACTIONS = [
  AUTO_OPEN_ACTION,
  "unlock",
  "unlatch",
  "lock_n_go",
  "lock_n_go_unlatch",
];
const OPEN_ACTION_FIELD = "config.openAction";

// The index of „Weitere Einstellungen“ in its panels, open or not.
const MORE_OPEN = 0;

function emptyForm() {
  return {
    id: null,
    label: "",
    type: DOOR_TYPE,
    provider: "",
    externalId: "",
    providerLocationId: "",
    mode: REMOTE_MODE,
    location: null,
  };
}

/**
 * The dialog Zugangspunkt (ECCdigital/tickets#1109): one dialog to create
 * and edit an access point, its provider and type settled by the section it
 * opens from. Creating shows two things - what the provider lists, as a list
 * to click with „by hand“ as its last line, and the Bezeichnung; Open Locker
 * asks first for its Schließfachanlage or a fixed Fach. Everything with a
 * default waits folded under „Weitere Einstellungen“, its state in one line.
 * Editing shows the chosen lock as one line with „Tauschen“ and the settings
 * unfolded. Which fields an access point has is `accessPointFields`.
 */
export default {
  name: "AccessPointEditDialog",
  components: {
    AccessPointCompartmentPicker,
    LocationInput,
  },
  props: {
    open: { type: Boolean, default: false },
    // The access point to edit; `null` opens the dialog in create mode.
    accessPoint: { type: Object, default: null },
    // All access points of the tenant, to mark what is created already.
    accessPoints: { type: Array, default: () => [] },
    // Active providers incl. their `providerCapabilities`.
    providers: { type: Array, default: () => [] },
    // The provider a new access point is created for, settled by the
    // section the creation started in.
    provider: { type: String, default: "" },
    // The bookings at the Fächer of the Anlage, as `compartmentBookings`
    // reads them; `bookingsUnreadable` where they could not be read.
    compartmentBookings: { type: Array, default: () => [] },
    bookingsUnreadable: { type: Boolean, default: false },
  },
  data() {
    return {
      form: emptyForm(),
      // The Öffnungsart owns `config.openAction`, so it lives beside the
      // JSON text rather than in it: taken out of the text on load, merged
      // back in on save.
      openAction: AUTO_OPEN_ACTION,
      openActionError: "",
      // The Fächer of a Schließfachanlage that carries its own: like the
      // Öffnungsart, chosen beside the JSON text, never in it.
      compartments: [],
      // Why the backend refused a Fach, by its UUID.
      compartmentErrors: {},
      configText: "{}",
      configError: "",
      // The switch as the admin set it, or as a stored access point has it.
      // A new one shows the default until touched, see `qrScanShown`.
      qrScanRequired: true,
      // Only a switch the admin actually touched is sent on create - an
      // untouched switch leaves the field out so the server default applies.
      validationRulesTouched: false,
      // „Weitere Einstellungen“: folded on create, open on edit.
      more: undefined,
      saving: false,
      saveError: "",
      listing: [],
      loadingListing: false,
      listingError: "",
      // The last line of the listing was chosen: the id is typed in.
      manual: false,
      // Editing: the lock is swapped, so the listing or the id field shows.
      swapping: false,
      // The Bezeichnung the last pick filled in: a label typed by hand stays.
      pickedLabel: "",
      // The mode a Salto door was stored on that Salto KS does not support;
      // the form proposes `remote` instead.
      unsupportedStoredMode: "",
      prefilling: false,
      prefillHint: "",
      // Counts the openings: the location input starts afresh on each.
      opening: 0,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    isEdit() {
      return !!this.form.id;
    },
    fields() {
      return accessPointFields(this.form.provider, this.form.type);
    },
    kindKey() {
      return `accessPoint.management.dialog.kinds.${this.fields.kind}`;
    },
    title() {
      return this.$t(`${this.kindKey}.${this.isEdit ? "edit" : "create"}`);
    },
    noun() {
      return this.$t(`${this.kindKey}.noun`);
    },
    typeIcon() {
      return this.form.type === LOCKER_TYPE
        ? "mdi-locker-multiple"
        : "mdi-door-closed-lock";
    },
    activeProvider() {
      return this.providers.find((p) => p.id === this.form.provider) || null;
    },
    providerTitle() {
      const provider = this.form.provider;
      return (
        this.activeProvider?.title ||
        createLockAndAccessAppDefaults()[provider]?.title ||
        provider
      );
    },
    // Asked only of Open Locker, and only for a new access point: a stored
    // one keeps the type its bookings were made with.
    typeOptions() {
      if (this.isEdit) return [];
      const types = accessPointTypes(this.form.provider);
      return types.length < 2 ? [] : types;
    },
    // The listing is there where the provider has one and lists it - an
    // active provider with `listAccessPoints`. Without it the id is typed in.
    canList() {
      return this.fields.listing && canListAccessPoints(this.activeProvider);
    },
    // The listing or the id field are asked for: on create, and on edit once
    // „Tauschen“ is clicked. The Fächer of an Anlage are always at hand.
    choosing() {
      return !this.fields.compartments && (!this.isEdit || this.swapping);
    },
    showLockLine() {
      return this.isEdit && !this.fields.compartments && !this.swapping;
    },
    showList() {
      return this.choosing && this.canList;
    },
    showIdField() {
      return this.choosing && (!this.canList || this.manual);
    },
    // A Fach of an Anlage that carries its own is taken as well: it is no
    // fixed Fach once it stands in an Anlage.
    taken() {
      return takenProviderIds(this.accessPoints, {
        provider: this.form.provider,
        exceptId: this.form.id,
      });
    },
    entries() {
      return this.listing.map((lock) => {
        const externalId = String(lock.externalId || lock.id);
        return {
          ...lock,
          externalId,
          taken: this.taken.has(externalId),
          iqOff: this.fields.iq && iqNotActivated(lock),
          group: lock.metadata?.lockerBank?.name || "",
        };
      });
    },
    // The listing by Schließfachschrank where the provider names one (Open
    // Locker's Fächer), else as one group.
    entryGroups() {
      const groups = new Map();
      this.entries.forEach((entry) => {
        if (!groups.has(entry.group)) {
          groups.set(entry.group, { name: entry.group, entries: [] });
        }
        groups.get(entry.group).entries.push(entry);
      });
      return [...groups.values()];
    },
    // The lock behind the access point, as the listing names it.
    entry() {
      return this.entries.find(
        (entry) => entry.externalId === String(this.form.externalId)
      );
    },
    // „Von Hand eingetragen“ only where the provider's listing was asked: a
    // provider switched off lists nothing, so the access point names itself
    // without saying where its lock came from.
    lockName() {
      if (this.entry) return this.entry.label || this.entry.externalId;
      if (this.loadingListing) return "";
      if (this.fields.listing && !this.activeProvider) {
        return this.accessPoint?.label || this.form.externalId;
      }
      return this.$t("accessPoint.management.dialog.byHand");
    },
    idLabel() {
      return this.fields.idLabel
        ? this.$t(`accessPoint.management.fields.${this.fields.idLabel}`)
        : "";
    },
    // The hint is about swapping the lock, so it is shown where it is
    // swapped, not where it is created.
    idHint() {
      return this.isEdit && this.fields.idHint
        ? this.$t(`accessPoint.management.fields.${this.fields.idHint}`)
        : "";
    },
    idPlaceholder() {
      return this.fields.idPlaceholder
        ? this.$t(`accessPoint.management.fields.${this.fields.idPlaceholder}`)
        : "";
    },
    iqWarning() {
      return !!this.entry?.iqOff;
    },
    typeHint() {
      if (!this.typeOptions.length) return "";
      return this.$t(
        `accessPoint.management.dialog.typeHints.${this.fields.kind}`
      );
    },
    // A new access point starts with the rule the server would default to
    // for it, so what the switch shows is what an untouched create
    // produces. Once touched, and for a stored access point, it shows what
    // is set.
    qrScanShown() {
      if (this.isEdit || this.validationRulesTouched) {
        return this.qrScanRequired;
      }
      return this.fields.qrScanDefault;
    },
    qrScanHint() {
      const value = this.$t(
        `accessPoint.management.dialog.qrScan.${
          this.fields.qrScanDefault ? "on" : "off"
        }`
      );
      return this.$t(
        `accessPoint.management.dialog.qrScan.${
          this.fields.compartments ? "defaultAnlage" : "default"
        }`,
        { provider: this.providerTitle, value }
      );
    },
    summary() {
      return settingsSummary(this.fields, {
        mode: this.form.mode,
        openAction: this.openAction,
        qrScan: this.qrScanShown,
        location: this.form.location,
      });
    },
    modeText() {
      const key = `accessPoint.management.modes.${this.form.mode}`;
      return this.$te(key) ? this.$t(key) : this.form.mode;
    },
    storedModeHint() {
      if (!this.unsupportedStoredMode) return "";
      return this.$t("accessPoint.management.storedModeUnsupported", {
        stored: this.$t(
          `accessPoint.management.modes.${this.unsupportedStoredMode}`
        ),
        proposed: this.$t(`accessPoint.management.modes.${REMOTE_MODE}`),
      });
    },
    // What the chosen lock can carry out, as the listing reports it. A
    // listing without the field says nothing, and nothing is greyed out.
    supportedOpenActions() {
      const supported = this.entry?.supportedOpenActions;
      return Array.isArray(supported) && supported.length > 0
        ? supported
        : null;
    },
    openActionOptions() {
      return OPEN_ACTIONS.map((value) => {
        const unsupported = this.isUnsupportedOpenAction(value);
        return {
          value,
          text: this.$t(`accessPoint.management.openActions.${value}`),
          description: unsupported
            ? this.$t("accessPoint.management.openActionUnsupported")
            : this.$t(`accessPoint.management.openActionHints.${value}`),
          disabled: unsupported,
        };
      });
    },
    // Swapping the device keeps the Öffnungsart it was set to, so the field
    // says what the listing thinks of it - the mismatch is the news here.
    openActionHint() {
      return this.isUnsupportedOpenAction(this.openAction)
        ? this.$t("accessPoint.management.openActionMismatch")
        : this.$t("accessPoint.management.openActionHint");
    },
    // Only a door is located by its provider (NUKI).
    canPrefillLocation() {
      return (
        this.form.type === DOOR_TYPE &&
        hasProviderCapability(this.activeProvider, GET_LOCATION_CAPABILITY)
      );
    },
    // The location as stored, against which the input measures "unchanged":
    // none for a new access point.
    storedLocation() {
      return this.accessPoint?.location ?? null;
    },
    // Why the location may not be saved, or "": the backend's rule, measured
    // against the stored location the same way the bookable's is.
    saveRefusal() {
      const key = locationRefusal(this.form.location, this.storedLocation);
      return key ? this.$t(key) : "";
    },
    // The rule of the row the new access point gets (`printsQr`).
    nextStep() {
      const printing = printsQr({
        provider: this.form.provider,
        type: this.form.type,
        validationRules: this.qrScanShown ? [{ type: QR_SCAN_RULE }] : [],
      });
      return this.$t(
        `accessPoint.management.dialog.${
          printing ? "nextStep" : "nextStepNoQr"
        }`
      );
    },
    requiredRule() {
      return [
        (v) =>
          !!String(v || "").trim() ||
          this.$t("accessPoint.management.required"),
      ];
    },
    // The Fächer the save takes out of the stored Anlage or out of service.
    leavingIds() {
      if (!this.isEdit || !this.fields.compartments) return [];
      return leavingCompartmentIds(this.accessPoint, this.compartments);
    },
    // Required are the choice or the id, and the Bezeichnung.
    canSave() {
      if (!this.form.label.trim()) return false;
      if (this.fields.compartments) return this.compartments.length > 0;
      return !!String(this.form.externalId || "").trim();
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.reset();
    },
  },
  methods: {
    reset() {
      const source = this.accessPoint;
      const provider = source?.provider || this.provider;
      this.form = {
        ...emptyForm(),
        ...source,
        provider,
        type: source?.type || accessPointTypes(provider)[0],
      };
      this.form.label = this.form.label || "";
      this.form.externalId = this.form.externalId || "";
      this.form.providerLocationId = this.form.providerLocationId || "";
      if (!source) {
        this.form.mode =
          providerAccessPointDefaults(provider)?.mode || REMOTE_MODE;
      }
      this.unsupportedStoredMode = "";
      if (
        provider === SALTO_PROVIDER &&
        this.form.type === DOOR_TYPE &&
        this.form.mode !== REMOTE_MODE
      ) {
        this.unsupportedStoredMode = this.form.mode;
        this.form.mode = REMOTE_MODE;
      }
      const { openAction, ...config } = source?.config || {};
      // The Fächer of an Anlage that carries its own are chosen in a list of
      // their own, so the JSON text leaves them out.
      this.compartments = [];
      if (carriesOwnCompartments(source)) {
        this.compartments = config.compartments.map((c) => ({ ...c }));
        delete config.compartments;
      }
      this.compartmentErrors = {};
      // A stored value outside the five is kept and saved back unchanged,
      // rather than being read as "Automatisch".
      this.openAction =
        typeof openAction === "string" && openAction
          ? openAction
          : AUTO_OPEN_ACTION;
      this.openActionError = "";
      this.configText = JSON.stringify(config, null, 2);
      this.configError = "";
      this.saveError = "";
      this.prefillHint = "";
      this.manual = false;
      this.swapping = false;
      this.pickedLabel = "";
      this.validationRulesTouched = false;
      this.qrScanRequired = source ? requiresQrScan(source) : true;
      this.more = source ? MORE_OPEN : undefined;
      this.opening += 1;
      this.listing = [];
      this.listingError = "";
      if (this.canList) this.fetchListing(provider);
      this.$nextTick(() => this.$refs.form?.resetValidation());
    },
    async fetchListing(provider) {
      this.loadingListing = true;
      try {
        const response = await ApiAccessAppsService.getAccessPoints(
          this.tenantId,
          provider
        );
        this.listing = response.data || [];
      } catch (error) {
        this.listing = [];
        this.listingError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.load.error.message",
        });
      } finally {
        this.loadingListing = false;
      }
    },
    // A pick fills the id and, where the admin typed none, the Bezeichnung.
    // Editing keeps the Bezeichnung: it was given before.
    choose(entry) {
      if (entry.taken) return;
      this.manual = false;
      this.swapping = false;
      this.form.externalId = entry.externalId;
      if (this.fields.providerLocationId) {
        this.form.providerLocationId = entry.locationId || "";
      }
      const label = entry.label || "";
      if (
        !this.isEdit &&
        (!this.form.label || this.form.label === this.pickedLabel)
      ) {
        this.form.label = label;
      }
      this.pickedLabel = label;
    },
    chooseManual() {
      this.manual = true;
      if (!this.isEdit) this.form.externalId = "";
    },
    swap() {
      this.swapping = true;
      this.manual = false;
    },
    // What Open Locker's choice of type is called, by the kind it makes.
    typeChoiceLabel(type) {
      const { kind } = accessPointFields(this.form.provider, type);
      return this.$t(`accessPoint.management.dialog.kinds.${kind}.choice`);
    },
    // Open Locker's choice starts the lock afresh: an Anlage has Fächer, a
    // fixed Fach one id.
    chooseType(type) {
      this.form.type = type;
      this.form.externalId = "";
      this.compartments = [];
      this.compartmentErrors = {};
      this.manual = false;
    },
    isSelected(entry) {
      return !this.manual && entry.externalId === String(this.form.externalId);
    },
    // True where the lock lists its Öffnungsarten and this one is not among
    // them - a listing that says nothing leaves every option alone.
    isUnsupportedOpenAction(openAction) {
      const supported = this.supportedOpenActions;
      return !!supported && !supported.includes(openAction);
    },
    async prefillLocation() {
      this.prefilling = true;
      this.prefillHint = "";
      try {
        const response = await ApiAccessPointService.getLocationPrefill(
          this.form.id,
          this.tenantId
        );
        const point = pointOf(response.data);

        if (!point) {
          this.prefillHint = this.$t(
            "accessPoint.management.location.prefillEmpty"
          );
          return;
        }

        // The input sets the point and asks the reverse search for an
        // address, which it only suggests. It hands the location out
        // through `input`, which clears the hint - so the hint comes after.
        this.$refs.location.setPoint(point, PREFILL_ORIGIN);
        this.prefillHint = this.$t(
          "accessPoint.management.location.prefillApplied"
        );
      } catch (error) {
        this.prefillHint = formatAccessPointErrorMessage(error);
      } finally {
        this.prefilling = false;
      }
    },
    onLocationChange(location) {
      this.form.location = location;
      this.prefillHint = "";
    },
    onValidationRuleChange(value) {
      this.qrScanRequired = value;
      this.validationRulesTouched = true;
    },
    /**
     * The field's answer, merged into what the JSON text holds: an
     * `openAction` typed there is overwritten, and "Automatisch" writes no key
     * at all - a missing key is what the provider reads as "decide by device".
     * An access point without Öffnungsart loses the key with it.
     */
    withOpenAction(config) {
      const merged = { ...config };
      delete merged.openAction;
      if (this.fields.compartments) {
        merged.compartments = this.compartments.map(
          ({ id, number, lockerBank, outOfService }) => ({
            id,
            number,
            lockerBank,
            outOfService: outOfService === true,
          })
        );
      }
      if (!this.fields.openAction || this.openAction === AUTO_OPEN_ACTION) {
        return merged;
      }
      return { ...merged, openAction: this.openAction };
    },
    onCompartmentsChange(compartments) {
      this.compartments = compartments;
      this.compartmentErrors = {};
    },
    parseConfig() {
      const text = (this.configText || "").trim();
      if (!text) {
        this.form.config = this.withOpenAction({});
        return true;
      }
      try {
        const parsed = JSON.parse(text);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          this.configError = this.$t("accessPoint.management.config.notObject");
          return false;
        }
        this.form.config = this.withOpenAction(parsed);
        this.configError = "";
        return true;
      } catch (e) {
        this.configError = this.$t("accessPoint.management.config.invalid");
        return false;
      }
    },
    buildPayload() {
      const payload = {
        label: this.form.label.trim(),
        type: this.form.type,
        provider: this.form.provider,
        // An Anlage that carries its own Fächer has no id of its own.
        externalId: this.fields.compartments ? "" : this.form.externalId,
        // Created without the field, the access point is created without a
        // location id. Edited, the stored one passes through unseen.
        providerLocationId:
          this.isEdit || this.fields.providerLocationId
            ? this.form.providerLocationId || null
            : null,
        mode: this.form.mode,
        config: this.form.config,
        location: this.form.location || null,
      };

      if (this.isEdit) payload.id = this.form.id;

      if (this.form.type === LOCKER_TYPE && !this.fields.compartments) {
        // An iFBS or Pareva Anlage has no rules to validate - the Fach is
        // opened through the provider, not at a QR code.
        payload.validationRules = [];
      } else if (this.isEdit || this.validationRulesTouched) {
        // Explicitly empty means "no scan needed"; leaving the field out on
        // create is what makes the server apply its default.
        payload.validationRules = this.buildValidationRules();
      }

      return payload;
    },
    /**
     * The switch owns the `qrScan` rule and nothing else - rules of other
     * types stay as they are instead of being dropped on every save.
     */
    buildValidationRules() {
      const others = (this.accessPoint?.validationRules || []).filter(
        (rule) => rule.type !== QR_SCAN_RULE
      );
      return this.qrScanRequired ? [...others, { type: QR_SCAN_RULE }] : others;
    },
    async submit() {
      if (!this.canSave || this.saveRefusal) return;
      if (!this.$refs.form.validate()) return;
      if (!this.parseConfig()) {
        this.more = MORE_OPEN;
        return;
      }

      this.saveError = "";
      this.openActionError = "";
      this.compartmentErrors = {};
      await this.store();
    },
    // The Fächer show what the save does to their bookings, so it asks
    // nothing (ECCdigital/tickets#1113). A future booking no Fach was free
    // for shows at the row of the Anlage.
    async store() {
      this.saving = true;
      try {
        const response = await ApiAccessPointService.storeAccessPoint(
          this.buildPayload(),
          this.tenantId
        );
        this.$emit("saved", response.data);
      } catch (error) {
        this.applySaveError(error);
      } finally {
        this.saving = false;
      }
    },
    // The Öffnungsart's own faults belong at the select, a Fach's at the
    // Fach; everything else in the alert below, which names the refused
    // Fächer as well, since the list may be scrolled away.
    applySaveError(error) {
      const { byIndex, rest } = splitCompartmentErrors(error);
      const atCompartments = Object.keys(byIndex).length > 0;
      this.compartmentErrors = Object.fromEntries(
        Object.entries(byIndex)
          .filter(([index]) => this.compartments[index])
          .map(([index, text]) => [this.compartments[index].id, text])
      );
      if (atCompartments && !rest) {
        this.openActionError = "";
        this.saveError = this.$t(
          "accessPoint.management.compartments.saveRefused"
        );
        return;
      }
      const { fieldMessage, message } = splitAccessPointFieldError(
        rest || error,
        OPEN_ACTION_FIELD,
        { fallbackKey: "accessPoint.management.errors.saveFailed" }
      );
      this.openActionError = fieldMessage;
      if (fieldMessage) this.more = MORE_OPEN;
      this.saveError = atCompartments
        ? `${this.$t(
            "accessPoint.management.compartments.saveRefused"
          )} ${message}`
        : message;
    },
    close() {
      this.$emit("close");
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="640"
    scrollable
    persistent
    @input="!$event && close()"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>{{ typeIcon }}</v-icon>
        <span class="text-h5" data-test="point-dialog-title">{{ title }}</span>
        <span class="text-body-2 text--secondary ml-3">
          {{ providerTitle }}
        </span>
        <v-spacer />
        <v-btn icon :disabled="saving" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" @submit.prevent>
          <!-- Open Locker: the one real choice of type -->
          <template v-if="typeOptions.length">
            <v-btn-toggle
              :value="form.type"
              mandatory
              dense
              color="primary"
              class="d-flex mb-1"
              data-test="type-choice"
              @change="chooseType"
            >
              <v-btn
                v-for="type in typeOptions"
                :key="type"
                :value="type"
                :data-test="`type-choice-${type}`"
                class="flex-grow-1"
                text
                small
              >
                {{ typeChoiceLabel(type) }}
              </v-btn>
            </v-btn-toggle>
            <div
              class="text-caption text--secondary mb-4"
              data-test="type-hint"
            >
              {{ typeHint }}
            </div>
          </template>

          <!-- Editing: the lock as one line, swapped on demand -->
          <div v-if="showLockLine" class="lock-line mb-4" data-test="lock-line">
            <v-icon small class="mr-3">mdi-link-variant</v-icon>
            <div class="flex-grow-1">
              <div class="font-weight-medium">{{ lockName }}</div>
              <div class="text-caption text--secondary">
                {{ idLabel }} {{ form.externalId }}
              </div>
            </div>
            <v-btn small text color="primary" data-test="swap" @click="swap">
              {{ $t("accessPoint.management.dialog.swap") }}
            </v-btn>
          </div>

          <!-- Which lock: the listing as rows, by hand as the last one -->
          <div v-if="showList" class="mb-4">
            <div class="field-title">
              {{
                $t("accessPoint.management.dialog.pickTitle", {
                  noun,
                  provider: providerTitle,
                })
              }}
            </div>
            <div
              v-if="isEdit && idHint"
              class="text-caption text--secondary mb-2"
              data-test="swap-hint"
            >
              {{ idHint }}
            </div>
            <div class="pick-list" data-test="pick-list">
              <v-progress-linear v-if="loadingListing" indeterminate />
              <div
                v-if="listingError"
                class="pick-row error--text text-body-2"
                data-test="listing-error"
              >
                {{ listingError }}
              </div>
              <template v-for="group in entryGroups">
                <div
                  v-if="group.name"
                  :key="`group-${group.name}`"
                  class="pick-group text-caption font-weight-medium"
                  data-test="pick-group"
                >
                  {{
                    $t("accessPoint.management.compartments.lockerBank", {
                      name: group.name,
                    })
                  }}
                </div>
                <div
                  v-for="item in group.entries"
                  :key="item.externalId"
                  class="pick-row"
                  :class="{
                    'pick-row--on': isSelected(item),
                    'pick-row--taken': item.taken,
                  }"
                  data-test="pick-entry"
                  :aria-disabled="item.taken ? 'true' : 'false'"
                  @click="choose(item)"
                >
                  <v-icon small class="mr-3">
                    {{
                      isSelected(item)
                        ? "mdi-radiobox-marked"
                        : "mdi-radiobox-blank"
                    }}
                  </v-icon>
                  <div class="flex-grow-1">
                    <div>{{ item.label || item.externalId }}</div>
                    <div class="text-caption text--secondary">
                      {{ item.externalId }}
                    </div>
                  </div>
                  <v-chip
                    v-if="item.taken"
                    x-small
                    label
                    data-test="pick-taken"
                  >
                    {{ $t("accessPoint.management.dialog.taken") }}
                  </v-chip>
                  <v-chip
                    v-else-if="item.iqOff"
                    x-small
                    label
                    color="warning"
                    text-color="white"
                    data-test="pick-iq-off"
                  >
                    {{ $t("accessPoint.management.dialog.iqOff") }}
                  </v-chip>
                </div>
              </template>
              <div
                v-if="fields.manual"
                class="pick-row pick-row--manual"
                :class="{ 'pick-row--on': manual }"
                data-test="pick-manual"
                @click="chooseManual"
              >
                <v-icon small class="mr-3">mdi-pencil-outline</v-icon>
                <div>
                  {{ $t("accessPoint.management.dialog.byHandRow", { noun }) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Open Locker's Schließfachanlage: its Fächer are the lock -->
          <div v-if="fields.compartments" class="mb-4">
            <div class="field-title">
              {{ $t("accessPoint.management.compartments.title") }}
            </div>
            <AccessPointCompartmentPicker
              :value="compartments"
              :listing="listing"
              :taken="taken"
              :errors="compartmentErrors"
              :loading="loadingListing"
              :provider-title="providerTitle"
              :bookings="compartmentBookings"
              :leaving="leavingIds"
              :bookings-unreadable="bookingsUnreadable"
              @input="onCompartmentsChange"
            />
          </div>

          <v-text-field
            v-if="showIdField"
            v-model="form.externalId"
            class="external-id-field mb-2"
            :label="idLabel"
            :hint="idHint"
            :placeholder="idPlaceholder"
            :persistent-placeholder="!!idPlaceholder"
            persistent-hint
            :rules="requiredRule"
            background-color="accent"
            filled
            dense
          />

          <v-alert
            v-if="iqWarning"
            type="warning"
            text
            dense
            class="mb-3"
            data-test="iq-warning"
          >
            {{ $t("accessPoint.management.dialog.iqWarning") }}
          </v-alert>

          <v-text-field
            v-model="form.label"
            class="label-field"
            :label="$t('accessPoint.management.fields.label')"
            :rules="requiredRule"
            background-color="accent"
            filled
            dense
          />

          <!-- Everything with a default -->
          <v-expansion-panels
            v-model="more"
            flat
            class="more mt-2"
            data-test="more-settings"
          >
            <v-expansion-panel>
              <v-expansion-panel-header class="px-4">
                <div>
                  <div class="font-weight-medium">
                    {{ $t("accessPoint.management.dialog.more") }}
                  </div>
                  <div
                    class="text-caption text--secondary mt-1"
                    data-test="settings-summary"
                  >
                    {{ summary }}
                  </div>
                </div>
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                <div v-if="fields.mode" class="mb-4" data-test="mode-line">
                  <div class="text-caption text--secondary">
                    {{ $t("accessPoint.management.fields.mode") }}
                    <v-chip
                      x-small
                      label
                      color="warning"
                      text-color="white"
                      class="ml-1"
                    >
                      {{ $t("accessPoint.comingSoon.badge") }}
                    </v-chip>
                  </div>
                  <div>{{ modeText }}</div>
                  <div class="text-caption text--secondary">
                    {{ $t("accessPoint.management.dialog.modeHint") }}
                  </div>
                  <div
                    v-if="storedModeHint"
                    class="text-caption warning--text"
                    data-test="stored-mode-hint"
                  >
                    {{ storedModeHint }}
                  </div>
                </div>

                <v-select
                  v-if="fields.openAction"
                  ref="openActionSelect"
                  v-model="openAction"
                  :items="openActionOptions"
                  :label="$t('accessPoint.management.fields.config.openAction')"
                  background-color="accent"
                  filled
                  dense
                  :hint="openActionHint"
                  persistent-hint
                  :error-messages="openActionError"
                  class="mb-3"
                  @change="openActionError = ''"
                >
                  <template v-slot:item="{ item }">
                    <v-list-item-content>
                      <v-list-item-title>{{ item.text }}</v-list-item-title>
                      <v-list-item-subtitle
                        class="text-wrap"
                        style="white-space: normal"
                      >
                        {{ item.description }}
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </template>
                </v-select>

                <template v-if="fields.qrScan">
                  <v-switch
                    :input-value="qrScanShown"
                    :label="$t('accessPoint.management.rules.qrScan')"
                    color="primary"
                    hide-details
                    class="mt-0"
                    data-test="qr-scan"
                    @change="onValidationRuleChange($event)"
                  />
                  <div
                    class="text-caption text--secondary mb-4"
                    data-test="qr-scan-hint"
                  >
                    {{ qrScanHint }}
                  </div>
                </template>

                <!-- Location: a door's, or the whole Anlage's -->
                <div class="field-title mt-2">
                  {{ $t("accessPoint.management.location.title") }}
                </div>
                <LocationInput
                  ref="location"
                  :key="opening"
                  :value="form.location"
                  :stored="storedLocation"
                  narrow
                  class="mb-2"
                  @input="onLocationChange"
                />
                <div
                  v-if="canPrefillLocation && !isEdit"
                  class="text-caption text--secondary mb-2"
                >
                  {{ $t("accessPoint.management.location.prefillAfterSave") }}
                </div>
                <div v-if="canPrefillLocation && isEdit" class="mb-2">
                  <v-btn
                    small
                    outlined
                    color="primary"
                    :loading="prefilling"
                    :disabled="prefilling"
                    data-test="prefill-location"
                    @click="prefillLocation"
                  >
                    <v-icon left small>mdi-crosshairs-gps</v-icon>
                    {{ $t("accessPoint.management.location.prefill") }}
                  </v-btn>
                </div>
                <div
                  v-if="prefillHint"
                  class="text-caption text--secondary mb-2"
                >
                  {{ prefillHint }}
                </div>

                <div class="field-title mt-4">
                  {{ $t("accessPoint.management.dialog.technical") }}
                </div>
                <v-text-field
                  v-if="fields.providerLocationId"
                  v-model="form.providerLocationId"
                  class="provider-location-id-field"
                  :label="
                    $t('accessPoint.management.fields.providerLocationId')
                  "
                  background-color="accent"
                  filled
                  dense
                />
                <v-textarea
                  v-model="configText"
                  class="config-field"
                  :label="$t('accessPoint.management.config.label')"
                  :hint="$t('accessPoint.management.config.hint')"
                  persistent-hint
                  background-color="accent"
                  filled
                  dense
                  rows="3"
                  :error-messages="configError"
                  @input="configError = ''"
                />
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert v-if="saveError" color="error" text dense class="mt-4 mb-0">
            <v-icon left>mdi-alert-circle</v-icon>
            {{ saveError }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <span
          v-if="!isEdit"
          class="text-caption text--secondary px-2"
          data-test="next-step"
        >
          {{ nextStep }}
        </span>
        <v-spacer />
        <span
          v-if="saveRefusal"
          class="save-refusal text-caption error--text px-2"
        >
          {{ saveRefusal }}
        </span>
        <v-btn outlined :disabled="saving" @click="close">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <v-btn
          class="save-access-point"
          color="primary"
          :loading="saving"
          :disabled="!canSave || !!saveRefusal"
          @click="submit"
        >
          <v-icon left small>mdi-content-save</v-icon>
          {{ isEdit ? $t("accessPoint.management.save") : title }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.field-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  margin-bottom: 6px;
}
.pick-list {
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
  max-height: 280px;
  overflow-y: auto;
}
.pick-group {
  padding: 6px 12px 2px;
  color: var(--scb-text-caption);
}
.pick-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--scb-rule);
}
.pick-row:last-child {
  border-bottom: 0;
}
.pick-row:hover {
  background: var(--scb-hover-tint);
}
.pick-row--on,
.pick-row--on:hover {
  background: var(--scb-selected-tint);
}
.pick-row--taken {
  color: var(--scb-text-muted);
  cursor: not-allowed;
}
.pick-row--manual {
  color: var(--scb-text-link);
}
.lock-line {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
}
.more {
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
}
</style>

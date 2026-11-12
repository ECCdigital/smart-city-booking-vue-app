<script>
import { mapGetters } from "vuex";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import LocationInput from "@/components/commons/Location/LocationInput.vue";
import AccessPointCompartmentPicker from "@/components/AccessPoint/AccessPointCompartmentPicker.vue";
import AccessPointCompartmentBookingsDialog from "@/components/AccessPoint/AccessPointCompartmentBookingsDialog.vue";
import {
  formatAccessPointErrorMessage,
  isProviderNotActiveError,
  splitAccessPointFieldError,
  splitCompartmentErrors,
} from "@/utilities/access-point-errors";
import {
  carriesOwnCompartments,
  leavingCompartmentIds,
  lockerCarriesCompartments,
  takenProviderIds,
} from "@/utilities/locker-system-compartments";
import {
  createLockAndAccessAppDefaults,
  SALTO_PROVIDER,
} from "@/utilities/access-apps";
import {
  accessPointLabel,
  accessPointTypeLabel,
  canListAccessPoints,
  hasProviderCapability,
  isLockerAccessPoint,
  providerAccessPointDefaults,
  providerIdFields,
  providerModes,
  providerRequiresScanByDefault,
  providerTypes,
  requiresQrScan,
  DOOR_TYPE,
  QR_SCAN_RULE,
} from "@/utilities/access-points";
import { isComingSoonAccessPointMode } from "@/utilities/coming-soon";
import { locationRefusal, pointOf } from "@/utils/locationLogic";

const GET_LOCATION_CAPABILITY = "getLocation";
// The origin of a point taken over with „Vorbelegen“: it counts as one set
// by hand, so a changed address asks before the point follows.
const PREFILL_ORIGIN = "nuki";

/**
 * The Öffnungsart of a Nuki access point: which action Nuki performs when the
 * door is opened. `auto` is the missing key - the per-device choice the
 * provider has always made - and the vocabulary is the provider's, which is
 * why only nuki is asked for one. Which of them a given lock can carry out is
 * the backend's word (`supportedOpenActions` of the listing); this dialog
 * keeps no device table of its own.
 */
const NUKI_PROVIDER = "nuki";
const SALTO_MODES = providerModes(SALTO_PROVIDER);
const DOOR_MODES = ["authorization", "remote", "both"];
const AUTO_OPEN_ACTION = "auto";
const OPEN_ACTIONS = [
  AUTO_OPEN_ACTION,
  "unlock",
  "unlatch",
  "lock_n_go",
  "lock_n_go_unlatch",
];
const OPEN_ACTION_FIELD = "config.openAction";

// The two ways into a new access point: taken over from what the provider
// lists, or entered by hand.
const PROVIDER_MODE = "provider";
const MANUAL_MODE = "manual";
const CREATE_MODES = [
  { value: PROVIDER_MODE, icon: "mdi-cloud-download-outline" },
  { value: MANUAL_MODE, icon: "mdi-pencil-outline" },
];

/**
 * The question about the bookings at Fächer that leave the Anlage, and the
 * notice about the ones that could not move (ECCdigital/tickets#1043).
 */
function closedLeave() {
  return {
    open: false,
    mode: "confirm",
    bookings: [],
    total: 0,
    unreadable: false,
    // The answer of a save that left bookings behind, handed on as `saved`
    // once the notice is read.
    answer: null,
  };
}

function emptyForm() {
  return {
    id: null,
    label: "",
    type: DOOR_TYPE,
    provider: "",
    externalId: "",
    providerLocationId: "",
    mode: "remote",
    location: null,
  };
}

export default {
  name: "AccessPointEditDialog",
  components: {
    AccessPointCompartmentBookingsDialog,
    AccessPointCompartmentPicker,
    LocationInput,
  },
  props: {
    open: { type: Boolean, default: false },
    // The access point to edit; `null` opens the dialog in create mode.
    accessPoint: { type: Object, default: null },
    // All access points of the tenant, to mark locks that already have one.
    accessPoints: { type: Array, default: () => [] },
    // Active providers incl. their `providerCapabilities`.
    providers: { type: Array, default: () => [] },
  },
  data() {
    return {
      valid: false,
      // The way into a new access point, chosen by the switch at the top:
      // "provider" shows the listing over the form, "manual" the form alone.
      // Switching hides and shows the listing and touches nothing entered.
      mode: PROVIDER_MODE,
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
      leave: closedLeave(),
      configText: "{}",
      configError: "",
      // The switch as the admin set it, or as a stored access point has it.
      // A new one shows the provider's default until touched, see
      // `qrScanShown`.
      qrScanRequired: true,
      // Only a switch the admin actually touched is sent on create - an
      // untouched switch leaves the field out so the server default applies.
      validationRulesTouched: false,
      advancedPanel: [],
      saving: false,
      saveError: "",
      pickerProvider: "",
      pickerLockId: "",
      // The provider the form was opened on when there was nothing to take
      // over from and one provider active - a Pareva Anlage is entered by
      // hand, and with Pareva alone there is no choice to ask for. Remembered
      // so that a preset does not count as something typed.
      presetProvider: "",
      providerLocks: [],
      // The provider `providerLocks` were asked of.
      locksProvider: "",
      loadingLocks: false,
      lockLoadError: "",
      // The provider whose listing answered that the tenant has not switched
      // it on: the access point is saved all the same and checked once it is.
      inactiveProvider: "",
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
    title() {
      return this.isEdit
        ? this.$t("accessPoint.management.dialog.editTitle")
        : this.$t("accessPoint.management.dialog.createTitle");
    },
    isLocker() {
      return isLockerAccessPoint(this.form);
    },
    // The type is shown, not asked: it follows the provider, and a select
    // whose answer is already settled is a question without a choice.
    typeLabel() {
      return accessPointTypeLabel(this.form);
    },
    // Asked only where the provider offers more than one type - Open Locker
    // its Schließfachanlage and the fixed Fach - and only for a new access
    // point: a stored one keeps the type its bookings were made with.
    typeOptions() {
      if (this.isEdit) return [];
      const types = providerTypes(this.form.provider);
      if (types.length < 2) return [];
      return types.map((type) => ({
        value: type,
        text: accessPointTypeLabel({ provider: this.form.provider, type }),
      }));
    },
    // A Schließfachanlage whose Fächer are chosen here and assigned by the
    // platform (ECCdigital/tickets#1037), rather than by its provider.
    // A stored one by its data; a new one by its provider, as it has none.
    picksCompartments() {
      if (!this.isLocker) return false;
      return this.isEdit
        ? carriesOwnCompartments(this.accessPoint)
        : lockerCarriesCompartments(this.form.provider);
    },
    // The provider whose listing the Fächer are chosen from, while there is
    // one to choose for.
    compartmentSource() {
      return this.picksCompartments ? this.form.provider : "";
    },
    takenCompartments() {
      return takenProviderIds(this.accessPoints, {
        provider: this.form.provider,
        exceptId: this.form.id,
      });
    },
    providerTitle() {
      const provider = this.form.provider;
      return (
        this.providers.find((p) => p.id === provider)?.title ||
        createLockAndAccessAppDefaults()[provider]?.title ||
        provider
      );
    },
    // Which id fields the access point shows follows the provider, the same
    // way on create and on edit: a door and an unknown provider carry both,
    // a locker system of iFBS or Pareva only the one its provider reads, an
    // Open Locker Schließfachanlage none.
    idFields() {
      return providerIdFields(this.form.provider, this.form.type);
    },
    externalIdLabel() {
      return this.$t(`accessPoint.management.fields.${this.idFields.label}`);
    },
    // A provider with a field of its own brings its hint along. Otherwise the
    // hint goes by type: swapping the device behind a door keeps its QR code,
    // a locker system has none, so the sentence about reprinting must not be
    // shown for it.
    externalIdHint() {
      if (this.idFields.hint) {
        return this.$t(`accessPoint.management.fields.${this.idFields.hint}`);
      }
      return this.isLocker
        ? this.$t("accessPoint.management.fields.externalIdHintLocker")
        : this.$t("accessPoint.management.fields.externalIdHint");
    },
    externalIdPlaceholder() {
      return this.idFields.placeholder
        ? this.$t(`accessPoint.management.fields.${this.idFields.placeholder}`)
        : "";
    },
    showLocationField() {
      return this.idFields.locationField;
    },
    typeIcon() {
      return this.isLocker ? "mdi-locker-multiple" : "mdi-door-closed-lock";
    },
    // The choice between the two ways in is only offered while there is a
    // provider that lists access points to take over from; without one the
    // dialog is the form alone.
    showModeToggle() {
      return !this.isEdit && this.pickerProviderOptions.length > 0;
    },
    createModes() {
      return CREATE_MODES.map((mode) => ({
        ...mode,
        text: this.$t(`accessPoint.management.dialog.modes.${mode.value}`),
      }));
    },
    modeHint() {
      return this.$t(`accessPoint.management.dialog.modeHints.${this.mode}`);
    },
    // Nothing entered yet: the form is what `reset()` made of it - a preset
    // provider included - the configuration untouched, the QR switch not
    // flipped. The provider defaults only ever run behind a provider, so
    // type and mode need no check of their own.
    untouched() {
      const blank = emptyForm();
      return (
        ["label", "externalId", "providerLocationId", "location"].every(
          (field) => this.form[field] === blank[field]
        ) &&
        (this.form.provider === blank.provider ||
          this.form.provider === this.presetProvider) &&
        this.configText === "{}" &&
        this.compartments.length === 0 &&
        !this.validationRulesTouched
      );
    },
    // A new access point starts with the rule the server would default to
    // for its provider - a QR scan, except for an Open Locker compartment -
    // so what the switch shows is what an untouched create produces. Once
    // touched, and for a stored access point, it shows what is set.
    qrScanShown() {
      if (this.isEdit || this.validationRulesTouched) {
        return this.qrScanRequired;
      }
      return providerRequiresScanByDefault(this.form.provider);
    },
    // The hint under the untouched switch of a new access point names the
    // default it shows.
    qrScanDefaultHint() {
      return this.qrScanShown
        ? this.$t("accessPoint.management.rules.defaultHint")
        : this.$t("accessPoint.management.rules.defaultHintOff");
    },
    // The picker is the way into an iFBS locker system and the shortcut for
    // a door - it is what reads `listAccessPoints`. Entering a door or a
    // Pareva Anlage by hand goes without it.
    showPicker() {
      return this.showModeToggle && this.mode === PROVIDER_MODE;
    },
    // A Schließfachanlage that carries its own Fächer is not one lock of the
    // listing: its Fächer are chosen below, so the single pick is left out.
    showLockSelect() {
      return !this.picksCompartments;
    },
    // The PIN-at-the-lock modes stay listed while they are unfinished, so the
    // dialog shows what is coming - but they cannot be chosen. A Nuki door
    // already stored on one keeps it; only picking it anew is barred.
    //
    // A Salto door opens remotely or not at all, for good: the backend
    // refuses `authorization` and `both` at every Salto lock (tickets#499), so
    // the dialog offers `remote` alone, without a „coming soon“ for the rest.
    // A Salto door stored on one of them opens on `remote`, and the hint
    // names the stored mode (`reset()`). An Open Locker compartment is opened
    // remotely and in no other way, so it is offered `remote` alone as well.
    modeOptions() {
      const modes = providerModes(this.form.provider) || DOOR_MODES;
      return modes.map((value) => {
        const comingSoon = isComingSoonAccessPointMode(value);
        return {
          value,
          text: this.$t(`accessPoint.management.modes.${value}`),
          description: comingSoon
            ? this.$t("accessPoint.comingSoon.mode")
            : this.$t(`accessPoint.management.modeHints.${value}`),
          disabled: comingSoon,
        };
      });
    },
    // Only Nuki knows an Öffnungsart, and only a door has one: the provider
    // decides what `open` sends, and a compartment of a locker system has no
    // latch to pull. While creating, the field follows the provider the
    // moment it is taken over or typed in.
    showOpenAction() {
      return (
        this.form.provider === NUKI_PROVIDER && this.form.type === DOOR_TYPE
      );
    },
    // What the picked lock can carry out, as the listing reports it. A
    // listing without the field - an older backend - says nothing, and
    // nothing is greyed out then: the backend refuses what it must when the
    // access point is saved.
    supportedOpenActions() {
      const supported = this.matchingLock?.supportedOpenActions;
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
    // Swapping the device behind a door keeps the Öffnungsart it was set to,
    // so the field says what the listing thinks of it instead of the sentence
    // about what Nuki does - the mismatch is the news here.
    openActionHint() {
      return this.isUnsupportedOpenAction(this.openAction)
        ? this.$t("accessPoint.management.openActionMismatch")
        : this.$t("accessPoint.management.openActionHint");
    },
    // The JSON field says where the Öffnungsart is edited, but only where
    // there is one to edit.
    configHint() {
      const hint = this.$t("accessPoint.management.config.hint");
      return this.showOpenAction
        ? `${hint} ${this.$t("accessPoint.management.config.hintOpenAction")}`
        : hint;
    },
    // The picker offers only what can be taken over: providers that list
    // access points. Pareva is not among them - its listing names size
    // codes, not the products a Pareva Anlage stands for.
    pickerProviderOptions() {
      return this.providers.filter(canListAccessPoints).map((provider) => ({
        value: provider.id,
        text: provider.title || provider.id,
      }));
    },
    // The free-text field keeps plain ids, and every active provider: one
    // that lists nothing is still entered by hand here, and a provider may
    // be edited to one that is not active for this tenant (swapping a lock,
    // migrations).
    providerIds() {
      return this.providers.map((provider) => provider.id);
    },
    requiredRule() {
      return [(v) => !!v || this.$t("accessPoint.management.required")];
    },
    // A Fach of an Anlage that carries its own is taken as well: it is no
    // fixed Fach once it stands in an Anlage.
    pickerItems() {
      const taken = new Map();
      const takenAt = (provider) => {
        if (!taken.has(provider)) {
          taken.set(
            provider,
            takenProviderIds(this.accessPoints, {
              provider,
              exceptId: this.form.id,
            })
          );
        }
        return taken.get(provider);
      };
      return this.providerLocks.map((lock) => {
        const externalId = lock.externalId || lock.id;
        return {
          ...lock,
          externalId,
          alreadyCreated: takenAt(lock.provider || this.pickerProvider).has(
            String(externalId)
          ),
        };
      });
    },
    // The provider lock behind the currently edited access point, when the
    // list happens to be loaded - used for the mode hint only.
    matchingLock() {
      return this.pickerItems.find(
        (lock) => lock.externalId === this.form.externalId
      );
    },
    doorModeHint() {
      if (this.unsupportedStoredMode) {
        return this.$t("accessPoint.management.storedModeUnsupported", {
          stored: this.$t(
            `accessPoint.management.modes.${this.unsupportedStoredMode}`
          ),
          proposed: this.$t(`accessPoint.management.modes.${SALTO_MODES[0]}`),
        });
      }
      return this.unsupportedMode
        ? this.$t("accessPoint.management.modeUnsupported")
        : "";
    },
    unsupportedMode() {
      const supported = this.matchingLock?.supportedModes;
      if (!Array.isArray(supported) || supported.length === 0) return false;
      return !supported.includes(this.form.mode);
    },
    // A Salto lock whose IQ is not activated, or needs re-activation, lists
    // no modes: it can do nothing right now. The backend saves the door all
    // the same (tickets#570); the hint says why it does not open yet and
    // where the IQ is activated - on the tab of the locking systems, not here.
    iqNotActivatedHint() {
      if (this.form.provider !== SALTO_PROVIDER) return "";
      const supported = this.matchingLock?.supportedModes;
      if (!Array.isArray(supported) || supported.length > 0) return "";

      return this.$t("accessPoint.management.iqNotActivated", {
        tab: this.$t("accessPoint.management.providersTab"),
        section: this.$t("accessPoint.tenant.salto.iq.title"),
      });
    },
    // Lock and mode are judged against the provider's listing. While the
    // provider is not active there is none, and the backend saves without
    // it - the hint says so, so a save without a check is no surprise.
    providerInactiveHint() {
      const provider = this.inactiveProvider;
      if (!provider) return "";
      const picked = this.showPicker && this.pickerProvider === provider;
      if (!picked && this.form.provider !== provider) return "";

      const title =
        this.providers.find((p) => p.id === provider)?.title ||
        createLockAndAccessAppDefaults()[provider]?.title ||
        provider;
      const key = this.isLocker ? "locker" : "door";
      return this.$t(`accessPoint.management.providerInactive.${key}`, {
        provider: title,
      });
    },
    canPrefillLocation() {
      if (!this.isEdit) return false;
      const provider = this.providers.find((p) => p.id === this.form.provider);
      return hasProviderCapability(provider, GET_LOCATION_CAPABILITY);
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
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.reset();
    },
    // The picker's own listing; an access point opened for editing has
    // none, its listing comes from `reset()`.
    pickerProvider(provider) {
      if (this.isEdit) return;
      this.providerLocks = [];
      this.pickerLockId = "";
      this.inactiveProvider = "";
      if (provider) this.fetchProviderLocks(provider);
      this.followPickerProvider();
    },
    // The listing a Schließfachanlage chooses its Fächer from, once the form
    // is one: typed in, chosen as the type, or opened stored.
    compartmentSource(provider) {
      if (provider) this.loadCompartmentListing();
    },
    // The provider list may still be loading while the dialog opens: a dialog
    // that opened on the bare form for want of a listing chooses its way in
    // anew once the list arrives - as long as nothing has been typed yet. A
    // dialog that already had a listing keeps what the admin did with it.
    providers() {
      if (!this.open || this.isEdit || !this.untouched) return;
      if (this.mode === PROVIDER_MODE || this.pickerProvider) return;
      this.chooseWayIn();
    },
  },
  methods: {
    // What a provider hands out is the provider's business: Nuki and Salto KS
    // list doors, iFBS and Pareva locker systems, whose mode follows from the
    // provider too. A provider outside that table leaves the type as it is.
    //
    // Applied where the provider is chosen - typed in, or taken over from a
    // listing - and not on a watcher: a stored access point opens with the
    // provider it has, and its mode must survive that, since for a locker
    // system the mode field is not even shown.
    applyProviderDefaults(provider) {
      const defaults = providerAccessPointDefaults(provider);
      if (!defaults) return;

      this.form.type = defaults.type;
      if (defaults.mode) this.form.mode = defaults.mode;
    },
    // A listing provider that offers a choice of type (Open Locker) puts the
    // untouched form on itself at once, so the choice - and with it the
    // Schließfachanlage the form starts as - is there before anything is
    // taken over. A form with a provider of its own keeps it.
    followPickerProvider() {
      const provider = this.pickerProvider;
      if (!provider || this.mode !== PROVIDER_MODE) return;
      if (providerTypes(provider).length < 2) return;
      if (this.form.provider && this.form.provider !== this.presetProvider) {
        return;
      }
      this.form.provider = provider;
      this.presetProvider = provider;
      this.applyProviderDefaults(provider);
    },
    chooseType(type) {
      this.form.type = type;
      this.compartmentErrors = {};
    },
    // Asked of an active provider that lists, and of one that is not active,
    // whose answer says so; never twice for the same provider.
    loadCompartmentListing() {
      const provider = this.compartmentSource;
      if (!provider || this.locksProvider === provider) return;
      const active = this.providers.find((p) => p.id === provider);
      if (active && !canListAccessPoints(active)) return;
      this.fetchProviderLocks(provider);
    },
    // A provider typed in that is not active for the tenant has its listing
    // asked all the same, so the dialog can say that lock and mode are
    // checked once it is (tickets#311). The listing of an active provider is
    // the picker's; this asks only whether the provider is on.
    onProviderChange(provider) {
      this.applyProviderDefaults(provider);
      if (!provider || this.providers.some((p) => p.id === provider)) return;
      this.checkProviderActive(provider);
    },
    async checkProviderActive(provider) {
      try {
        await ApiAccessAppsService.getAccessPoints(this.tenantId, provider);
      } catch (error) {
        if (isProviderNotActiveError(error)) this.inactiveProvider = provider;
      }
    },
    // True where the lock lists its Öffnungsarten and this one is not among
    // them - a listing that says nothing leaves every option alone.
    isUnsupportedOpenAction(openAction) {
      const supported = this.supportedOpenActions;
      return !!supported && !supported.includes(openAction);
    },
    reset() {
      const source = this.accessPoint;
      this.form = source ? { ...emptyForm(), ...source } : emptyForm();
      this.form.providerLocationId = this.form.providerLocationId || "";
      this.unsupportedStoredMode = "";
      if (
        this.form.provider === SALTO_PROVIDER &&
        !isLockerAccessPoint(this.form) &&
        !SALTO_MODES.includes(this.form.mode)
      ) {
        this.unsupportedStoredMode = this.form.mode;
        this.form.mode = SALTO_MODES[0];
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
      this.leave = closedLeave();
      // A stored value outside the five - written into the JSON text past an
      // older backend - is kept and saved back unchanged, rather than being
      // read as "Automatisch", which would change the door behind the admin's
      // back. The select has no option for it and shows empty; refusing it is
      // the backend's word, not this dialog's.
      this.openAction =
        typeof openAction === "string" && openAction
          ? openAction
          : AUTO_OPEN_ACTION;
      this.openActionError = "";
      this.configText = JSON.stringify(config, null, 2);
      this.configError = "";
      this.saveError = "";
      this.prefillHint = "";
      this.lockLoadError = "";
      this.inactiveProvider = "";
      this.providerLocks = [];
      this.locksProvider = "";
      this.pickerLockId = "";
      this.advancedPanel = [];
      this.validationRulesTouched = false;
      this.opening += 1;
      // A new access point shows the provider's default until the switch is
      // touched (`qrScanShown`).
      this.qrScanRequired = source ? requiresQrScan(source) : true;
      // A stored access point is edited as it is; only a new one has a way
      // in to choose.
      if (source) {
        this.mode = MANUAL_MODE;
        this.pickerProvider = "";
        this.presetProvider = "";
        if (this.listsOnEdit(source)) this.fetchProviderLocks(source.provider);
      } else {
        this.chooseWayIn();
        this.followPickerProvider();
      }
      this.$nextTick(() => this.$refs.form?.resetValidation());
    },
    // The way into a new access point, from what is active: a provider that
    // lists access points opens the listing, preset to the first of them.
    // Without one the dialog is the form alone - and with exactly one
    // provider active, the form starts on it, the way a tenant with Pareva
    // alone lands on the Pareva Anlage without being asked. Two providers
    // and no listing leave the choice to the admin.
    //
    // Runs on an untouched form only - fresh from `reset()`, or before
    // anything was typed - so the provider it finds there is its own doing:
    // a preset from an earlier run goes when the preset goes, with the type
    // and mode it brought along.
    chooseWayIn() {
      const listable = this.pickerProviderOptions;
      const preset =
        !listable.length && this.providers.length === 1
          ? this.providers[0].id
          : "";
      const blank = emptyForm();

      this.mode = listable.length ? PROVIDER_MODE : MANUAL_MODE;
      this.pickerProvider = listable[0]?.value || "";
      this.presetProvider = preset;
      this.form.provider = preset || blank.provider;
      this.form.type = blank.type;
      this.form.mode = blank.mode;
      if (preset) this.applyProviderDefaults(preset);
    },
    // A stored access point is checked against its provider's listing on
    // every save, so the dialog reads it too: to say what the save will
    // find. An active provider that lists nothing (Pareva) is not asked; a
    // provider that is not active is, and its answer says so.
    listsOnEdit(accessPoint) {
      if (!accessPoint.provider) return false;
      if (!accessPoint.externalId && !carriesOwnCompartments(accessPoint)) {
        return false;
      }
      const active = this.providers.find((p) => p.id === accessPoint.provider);
      return !active || canListAccessPoints(active);
    },
    async fetchProviderLocks(provider) {
      this.locksProvider = provider;
      this.loadingLocks = true;
      this.lockLoadError = "";
      this.inactiveProvider = "";
      try {
        const response = await ApiAccessAppsService.getAccessPoints(
          this.tenantId,
          provider
        );
        this.providerLocks = response.data || [];
      } catch (error) {
        this.providerLocks = [];
        if (isProviderNotActiveError(error)) {
          this.inactiveProvider = provider;
        } else {
          this.lockLoadError = formatAccessPointErrorMessage(error, {
            fallbackKey: "accessPoint.load.error.message",
          });
        }
      } finally {
        this.loadingLocks = false;
      }
    },
    lockText(lock) {
      return accessPointLabel(lock);
    },
    // Prefill from the picked lock; every field stays editable afterwards, so
    // the same form covers manual creation and swapping a lock.
    applyLock() {
      const lock = this.pickerItems.find(
        (item) => item.externalId === this.pickerLockId
      );
      if (!lock) return;

      this.form.provider = lock.provider || this.pickerProvider;
      this.form.externalId = lock.externalId;
      this.form.label = lock.label || this.form.label;
      // A provider whose access point shows no location field gets none from
      // the listing either: Pareva lists the `lockerId` of the app there, iFBS
      // its `LocationID` a second time - neither is read back.
      if (this.showLocationField) {
        this.form.providerLocationId = lock.locationId || "";
      }
      // What the provider lists is what it hands out. For a provider the
      // defaults table knows, the table has the last word; for any other
      // provider the listing is the only answer there is.
      if (lock.type) this.form.type = lock.type;
      if (isLockerAccessPoint(lock) && lock.supportedModes?.length) {
        this.form.mode = lock.supportedModes[0];
      }
      this.applyProviderDefaults(this.form.provider);
      // A provider that offers several types lists one of them: an Open
      // Locker compartment taken over is the fixed Fach, not the Anlage the
      // provider starts with.
      if (providerTypes(this.form.provider).includes(lock.type)) {
        this.form.type = lock.type;
      }
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
     * at all - a missing key is what the provider reads as "decide by device",
     * so an untouched door produces no diff in `config`. An access point that
     * carries no Öffnungsart - another provider, a locker system - loses the
     * key with it.
     */
    withOpenAction(config) {
      const merged = { ...config };
      delete merged.openAction;
      if (this.picksCompartments) {
        merged.compartments = this.compartments.map(
          ({ id, number, lockerBank, outOfService }) => ({
            id,
            number,
            lockerBank,
            outOfService: outOfService === true,
          })
        );
      }
      if (!this.showOpenAction || this.openAction === AUTO_OPEN_ACTION) {
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
        label: this.form.label,
        type: this.form.type,
        provider: this.form.provider,
        // An Anlage that carries its own Fächer has no id of its own.
        externalId: this.picksCompartments ? "" : this.form.externalId,
        // Created without a location field, the access point is created
        // without a location id. Edited, the stored one passes through unseen
        // - an old Pareva row loses nothing.
        providerLocationId:
          this.isEdit || this.showLocationField
            ? this.form.providerLocationId || null
            : null,
        mode: this.form.mode,
        config: this.form.config,
        location: this.form.location || null,
      };

      if (this.isEdit) payload.id = this.form.id;

      if (this.isLocker) {
        // A locker system has no rules to validate - the compartment is opened
        // through the provider, not at a QR code. Left out on create, the
        // server would apply its `qrScan` default.
        payload.validationRules = [];
      } else if (this.isEdit || this.validationRulesTouched) {
        // Explicitly empty means "no scan needed"; leaving the field out on
        // create is what makes the server apply its qrScan default.
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
      if (this.saveRefusal || !this.$refs.form.validate()) return;
      if (!this.parseConfig()) {
        this.advancedPanel = [0];
        return;
      }

      this.saveError = "";
      this.openActionError = "";
      this.compartmentErrors = {};

      const leaving =
        this.isEdit && this.picksCompartments
          ? leavingCompartmentIds(this.accessPoint, this.compartments)
          : [];
      if (leaving.length > 0 && (await this.askAboutLeaving(leaving))) {
        return;
      }
      await this.store();
    },
    /**
     * Reads the bookings at the Fächer that leave the Anlage and, where any
     * hang there - or they cannot be read -, asks before the save. The
     * backend moves the future ones on the save; the question names them.
     *
     * @param {string[]} compartmentIds The leaving Fächer
     * @returns {Promise<boolean>} Whether the question is open now
     */
    async askAboutLeaving(compartmentIds) {
      this.saving = true;
      try {
        const { data } = await ApiAccessPointService.getCompartmentBookings(
          this.form.id,
          compartmentIds,
          this.tenantId
        );
        if (!data?.total) return false;
        this.leave = {
          ...closedLeave(),
          open: true,
          bookings: data.bookings || [],
          total: data.total,
        };
      } catch (error) {
        this.leave = { ...closedLeave(), open: true, unreadable: true };
      } finally {
        this.saving = false;
      }
      return true;
    },
    async store() {
      this.saving = true;
      try {
        const response = await ApiAccessPointService.storeAccessPoint(
          this.buildPayload(),
          this.tenantId
        );
        const unmoved = response.data?.unmovedBookings || [];
        if (unmoved.length > 0) {
          this.leave = {
            ...closedLeave(),
            open: true,
            mode: "unmoved",
            bookings: unmoved,
            total: unmoved.length,
            answer: response.data,
          };
          return;
        }
        this.leave = closedLeave();
        this.$emit("saved", response.data);
      } catch (error) {
        this.leave = closedLeave();
        this.applySaveError(error);
      } finally {
        this.saving = false;
      }
    },
    // Cancelling the question saves nothing; closing the notice after a
    // save hands the answer on.
    closeLeave() {
      const { answer } = this.leave;
      this.leave = closedLeave();
      if (answer) this.$emit("saved", answer);
    },
    // The Öffnungsart's own faults belong at the select, a Fach's at the
    // Fach; everything else - another field, a provider that did not answer
    // - in the alert below, which names the refused Fächer as well, since
    // the list may be scrolled away.
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
    max-width="860"
    scrollable
    persistent
    @input="!$event && close()"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>{{ typeIcon }}</v-icon>
        <span class="text-h5">{{ title }}</span>
        <v-spacer />
        <v-btn icon :disabled="saving" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="valid">
          <!-- The way in: from the provider's listing, or by hand -->
          <template v-if="showModeToggle">
            <v-btn-toggle
              v-model="mode"
              mandatory
              dense
              color="primary"
              class="create-mode-toggle d-flex mb-2"
            >
              <v-btn
                v-for="option in createModes"
                :key="option.value"
                :value="option.value"
                :class="`create-mode-${option.value}`"
                class="flex-grow-1"
                text
              >
                <v-icon left small>{{ option.icon }}</v-icon>
                {{ option.text }}
              </v-btn>
            </v-btn-toggle>
            <div class="create-mode-hint text-caption text--secondary mb-4">
              {{ modeHint }}
            </div>
          </template>

          <!-- Provider listing, the way an iFBS locker system and optionally
               a door is taken over -->
          <template v-if="showPicker">
            <div class="provider-picker section-title mb-3">
              <v-icon small left>mdi-magnify</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.picker.title") }}
              </span>
            </div>

            <v-row dense align="center">
              <v-col cols="12" md="4">
                <v-select
                  ref="pickerProviderSelect"
                  v-model="pickerProvider"
                  :items="pickerProviderOptions"
                  :label="$t('accessPoint.management.picker.provider')"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                />
              </v-col>
              <v-col v-if="showLockSelect" cols="12" md="6">
                <v-select
                  ref="lockSelect"
                  v-model="pickerLockId"
                  :items="pickerItems"
                  :item-text="lockText"
                  item-value="externalId"
                  :label="$t('accessPoint.management.picker.lock')"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                  :loading="loadingLocks"
                  :disabled="loadingLocks || !pickerProvider"
                >
                  <template v-slot:item="{ item }">
                    <div class="py-1">
                      <div class="font-weight-medium">
                        {{ lockText(item) }}
                        <v-chip
                          v-if="item.alreadyCreated"
                          x-small
                          label
                          color="grey lighten-1"
                          class="ml-2"
                        >
                          {{
                            $t("accessPoint.management.picker.alreadyCreated")
                          }}
                        </v-chip>
                      </div>
                      <div class="text-caption text--secondary">
                        {{ item.provider || pickerProvider }} •
                        {{ item.externalId }}
                      </div>
                    </div>
                  </template>
                </v-select>
              </v-col>
              <v-col v-if="showLockSelect" cols="12" md="2" class="text-right">
                <v-btn
                  class="apply-lock"
                  color="primary"
                  outlined
                  :disabled="!pickerLockId"
                  @click="applyLock"
                >
                  {{ $t("accessPoint.management.picker.apply") }}
                </v-btn>
              </v-col>
            </v-row>

            <v-alert v-if="lockLoadError" color="error" text dense class="mt-2">
              <v-icon left>mdi-alert-circle</v-icon>
              {{ lockLoadError }}
            </v-alert>

            <div class="text-caption text--secondary mt-2 mb-4">
              {{ $t("accessPoint.management.picker.hint") }}
            </div>
            <v-divider class="mb-4" />
          </template>

          <!-- Base data -->
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                class="label-field"
                v-model="form.label"
                :label="$t('accessPoint.management.fields.label')"
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col cols="12" md="6">
              <div class="access-point-type">
                <div class="text-caption text--secondary">
                  {{ $t("accessPoint.management.fields.type") }}
                </div>
                <template v-if="typeOptions.length">
                  <v-btn-toggle
                    ref="typeChoice"
                    :value="form.type"
                    mandatory
                    dense
                    color="primary"
                    class="type-choice"
                    @change="chooseType"
                  >
                    <v-btn
                      v-for="option in typeOptions"
                      :key="option.value"
                      :value="option.value"
                      :class="`type-choice-${option.value}`"
                      small
                      text
                    >
                      {{ option.text }}
                    </v-btn>
                  </v-btn-toggle>
                  <div class="text-caption text--secondary mt-1">
                    {{ $t("accessPoint.management.fields.typeChoiceHint") }}
                  </div>
                </template>
                <template v-else>
                  <v-chip
                    small
                    label
                    :color="isLocker ? 'indigo' : 'primary'"
                    dark
                  >
                    <v-icon left small>{{ typeIcon }}</v-icon>
                    {{ typeLabel }}
                  </v-chip>
                  <div class="text-caption text--secondary mt-1">
                    {{ $t("accessPoint.management.fields.typeHint") }}
                  </div>
                </template>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                class="provider-field"
                v-model="form.provider"
                :items="providerIds"
                @change="onProviderChange"
                :label="$t('accessPoint.management.fields.provider')"
                background-color="accent"
                filled
                dense
                :rules="requiredRule"
              />
            </v-col>
            <v-col v-if="idFields.idField" cols="12" md="6">
              <v-text-field
                class="external-id-field"
                v-model="form.externalId"
                :label="externalIdLabel"
                :hint="externalIdHint"
                :placeholder="externalIdPlaceholder"
                :persistent-placeholder="!!externalIdPlaceholder"
                persistent-hint
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col v-if="showLocationField" cols="12" md="6">
              <v-text-field
                v-model="form.providerLocationId"
                :label="$t('accessPoint.management.fields.providerLocationId')"
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col v-if="!isLocker" cols="12" md="6">
              <v-select
                ref="modeSelect"
                v-model="form.mode"
                :items="modeOptions"
                :label="$t('accessPoint.management.fields.mode')"
                background-color="accent"
                filled
                dense
                :rules="requiredRule"
                :hint="doorModeHint"
                persistent-hint
              >
                <template v-slot:item="{ item }">
                  <v-list-item-content>
                    <v-list-item-title>
                      {{ item.text }}
                      <v-chip
                        v-if="item.disabled"
                        x-small
                        color="warning"
                        text-color="white"
                        label
                        class="ml-2"
                      >
                        {{ $t("accessPoint.comingSoon.badge") }}
                      </v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle
                      class="text-wrap"
                      style="white-space: normal"
                    >
                      {{ item.description }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </template>
              </v-select>
            </v-col>
            <v-col v-if="showOpenAction" cols="12" md="6">
              <v-select
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
            </v-col>
          </v-row>

          <v-alert
            v-if="iqNotActivatedHint"
            class="iq-not-activated-hint mt-2"
            type="info"
            text
            dense
          >
            {{ iqNotActivatedHint }}
          </v-alert>

          <v-alert
            v-if="providerInactiveHint"
            class="provider-inactive-hint mt-2"
            type="info"
            text
            dense
          >
            {{ providerInactiveHint }}
          </v-alert>

          <!-- The Fächer of a Schließfachanlage that carries its own -->
          <template v-if="picksCompartments">
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-locker-multiple</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.compartments.title") }}
              </span>
            </div>
            <AccessPointCompartmentPicker
              :value="compartments"
              :listing="locksProvider === form.provider ? providerLocks : []"
              :taken="takenCompartments"
              :errors="compartmentErrors"
              :loading="loadingLocks"
              :provider-title="providerTitle"
              @input="onCompartmentsChange"
            />
          </template>

          <!-- Mode, QR rules and address describe a door; a locker system has
               none of them -->
          <template v-if="!isLocker">
            <!-- Validation rules -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-shield-check</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.rules.title") }}
              </span>
            </div>
            <v-switch
              :input-value="qrScanShown"
              color="primary"
              hide-details
              class="mt-0"
              @change="onValidationRuleChange($event)"
            >
              <template v-slot:label>
                <div>
                  <div class="font-weight-medium">
                    {{ $t("accessPoint.management.rules.qrScan") }}
                  </div>
                  <div class="text-caption text--secondary">
                    {{ $t("accessPoint.management.rules.qrScanHint") }}
                  </div>
                </div>
              </template>
            </v-switch>
            <div
              v-if="!isEdit && !validationRulesTouched"
              class="text-caption text--secondary mt-2"
            >
              {{ qrScanDefaultHint }}
            </div>

            <!-- Location -->
            <div class="section-title mt-6 mb-3">
              <v-icon small left>mdi-map-marker</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.location.title") }}
              </span>
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
            <div v-if="!isEdit" class="text-caption text--secondary mb-2">
              {{ $t("accessPoint.management.location.prefillAfterSave") }}
            </div>
            <div v-if="canPrefillLocation" class="mb-2">
              <v-btn
                small
                outlined
                color="primary"
                :loading="prefilling"
                :disabled="prefilling"
                @click="prefillLocation"
              >
                <v-icon left small>mdi-crosshairs-gps</v-icon>
                {{ $t("accessPoint.management.location.prefill") }}
              </v-btn>
            </div>
            <div v-if="prefillHint" class="text-caption text--secondary mb-2">
              {{ prefillHint }}
            </div>
          </template>

          <!-- Advanced -->
          <v-expansion-panels
            v-model="advancedPanel"
            flat
            multiple
            class="mt-4"
          >
            <v-expansion-panel>
              <v-expansion-panel-header color="accent">
                {{ $t("accessPoint.management.config.title") }}
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-textarea
                  class="config-field"
                  v-model="configText"
                  :label="$t('accessPoint.management.config.label')"
                  :hint="configHint"
                  persistent-hint
                  background-color="accent"
                  filled
                  dense
                  rows="5"
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
          :disabled="!!saveRefusal"
          @click="submit"
        >
          <v-icon left small>mdi-content-save</v-icon>
          {{ $t("accessPoint.management.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
    <AccessPointCompartmentBookingsDialog
      :open="leave.open"
      :mode="leave.mode"
      :bookings="leave.bookings"
      :total="leave.total"
      :unreadable="leave.unreadable"
      :saving="saving"
      @confirm="store"
      @close="closeLeave"
    />
  </v-dialog>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.theme--dark .section-title {
  color: rgba(255, 255, 255, 0.8);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
</style>

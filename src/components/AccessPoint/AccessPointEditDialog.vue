<script>
import { mapGetters } from "vuex";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  accessPointLabel,
  accessPointTypeLabel,
  isLockerAccessPoint,
  providerAccessPointDefaults,
  requiresQrScan,
  DOOR_TYPE,
  QR_SCAN_RULE,
} from "@/utilities/access-points";
import { isComingSoonAccessPointMode } from "@/utilities/coming-soon";

const GET_LOCATION_CAPABILITY = "getLocation";

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
  components: { AddressLookup },
  props: {
    open: { type: Boolean, default: false },
    // The access point to edit; `null` opens the dialog in create mode.
    accessPoint: { type: Object, default: null },
    // All access points of the tenant, to mark locks that already have one.
    accessPoints: { type: Array, default: () => [] },
    // Active providers incl. their `providerCapabilities`.
    providers: { type: Array, default: () => [] },
    // Which of the two buttons over the table opened the dialog: "manual"
    // starts on an empty form, "provider" starts at the provider listing. The
    // dialog is one and the same - only where it begins differs.
    source: {
      type: String,
      default: "provider",
      validator: (value) => ["manual", "provider"].includes(value),
    },
  },
  data() {
    return {
      valid: false,
      form: emptyForm(),
      configText: "{}",
      configError: "",
      qrScanRequired: true,
      // Only a switch the admin actually touched is sent on create - an
      // untouched switch leaves the field out so the server default applies.
      validationRulesTouched: false,
      advancedPanel: [],
      saving: false,
      saveError: "",
      pickerProvider: "",
      pickerLockId: "",
      providerLocks: [],
      loadingLocks: false,
      lockLoadError: "",
      prefilling: false,
      prefillHint: "",
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
      if (this.isEdit) {
        return this.$t("accessPoint.management.dialog.editTitle");
      }
      return this.showPicker
        ? this.$t("accessPoint.management.dialog.createFromProviderTitle")
        : this.$t("accessPoint.management.dialog.createDoorTitle");
    },
    isLocker() {
      return isLockerAccessPoint(this.form);
    },
    // The type is shown, not asked: it follows the provider, and a select
    // whose answer is already settled is a question without a choice.
    typeLabel() {
      return accessPointTypeLabel(this.form);
    },
    // Swapping the device behind a door keeps its QR code; a locker system
    // has none, so the sentence about reprinting must not be shown for it.
    externalIdHint() {
      return this.isLocker
        ? this.$t("accessPoint.management.fields.externalIdHintLocker")
        : this.$t("accessPoint.management.fields.externalIdHint");
    },
    typeIcon() {
      return this.isLocker ? "mdi-locker-multiple" : "mdi-door-closed-lock";
    },
    // The picker is the way into a locker system - it is what reads
    // `listAccessPoints` - and the shortcut for a door. Entering a door by
    // hand starts without it.
    showPicker() {
      return !this.isEdit && this.source === "provider";
    },
    // The PIN-at-the-lock modes stay listed while they are unfinished, so the
    // dialog shows what is coming - but they cannot be chosen. An access point
    // already stored on one keeps it; only picking it anew is barred.
    modeOptions() {
      return ["authorization", "remote", "both"].map((value) => {
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
    providerOptions() {
      return this.providers.map((provider) => ({
        value: provider.id,
        text: provider.title || provider.id,
      }));
    },
    // The free-text field keeps plain ids: a provider may be edited to one
    // that is not active for this tenant (swapping a lock, migrations).
    providerIds() {
      return this.providers.map((provider) => provider.id);
    },
    requiredRule() {
      return [(v) => !!v || this.$t("accessPoint.management.required")];
    },
    takenLockKeys() {
      return new Set(
        this.accessPoints
          .filter((point) => point.id !== this.form.id)
          .map((point) => `${point.provider}::${point.externalId}`)
      );
    },
    pickerItems() {
      return this.providerLocks.map((lock) => {
        const externalId = lock.externalId || lock.id;
        return {
          ...lock,
          externalId,
          alreadyCreated: this.takenLockKeys.has(
            `${lock.provider || this.pickerProvider}::${externalId}`
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
    unsupportedMode() {
      const supported = this.matchingLock?.supportedModes;
      if (!Array.isArray(supported) || supported.length === 0) return false;
      return !supported.includes(this.form.mode);
    },
    canPrefillLocation() {
      if (!this.isEdit) return false;
      const provider = this.providers.find((p) => p.id === this.form.provider);
      return !!provider?.providerCapabilities?.includes(
        GET_LOCATION_CAPABILITY
      );
    },
    coordinates() {
      const points = this.form.location?.coordinates?.points;
      if (!Array.isArray(points) || points.length < 2) return "";
      return `${points[1]}, ${points[0]}`;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.reset();
    },
    pickerProvider(provider) {
      this.providerLocks = [];
      this.pickerLockId = "";
      if (provider) this.fetchProviderLocks();
    },
    // The provider list may still be loading while the dialog opens.
    providerOptions(options) {
      if (
        this.open &&
        this.showPicker &&
        !this.pickerProvider &&
        options.length
      ) {
        this.pickerProvider = options[0].value;
      }
    },
    // What a provider hands out is the provider's business: Nuki and Salto KS
    // list doors, iFBS and Pareva locker systems, whose mode follows from the
    // provider too. A provider outside that table leaves the type as it is.
    "form.provider": function (provider) {
      const defaults = providerAccessPointDefaults(provider);
      if (!defaults) return;

      this.form.type = defaults.type;
      if (defaults.mode) this.form.mode = defaults.mode;
    },
  },
  methods: {
    reset() {
      const source = this.accessPoint;
      this.form = source ? { ...emptyForm(), ...source } : emptyForm();
      this.form.providerLocationId = this.form.providerLocationId || "";
      this.configText = JSON.stringify(source?.config || {}, null, 2);
      this.configError = "";
      this.saveError = "";
      this.prefillHint = "";
      this.lockLoadError = "";
      this.providerLocks = [];
      this.pickerLockId = "";
      this.advancedPanel = [];
      this.validationRulesTouched = false;
      // A new access point starts with the rule the server would default to,
      // so what the switch shows is what an untouched create produces.
      this.qrScanRequired = source ? requiresQrScan(source) : true;
      this.pickerProvider = this.showPicker
        ? this.providerOptions[0]?.value || ""
        : "";
      this.$nextTick(() => this.$refs.form?.resetValidation());
    },
    async fetchProviderLocks() {
      this.loadingLocks = true;
      this.lockLoadError = "";
      try {
        const response = await ApiAccessAppsService.getAccessPoints(
          this.tenantId,
          this.pickerProvider
        );
        this.providerLocks = response.data || [];
      } catch (error) {
        this.providerLocks = [];
        this.lockLoadError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.load.error.message",
        });
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
      this.form.providerLocationId = lock.locationId || "";
      // What the provider lists is what it hands out. For the four providers
      // the table above knows, its watcher answers the same and overwrites
      // these two on the next tick; for any other provider the listing is the
      // only answer there is.
      if (lock.type) this.form.type = lock.type;
      if (isLockerAccessPoint(lock) && lock.supportedModes?.length) {
        this.form.mode = lock.supportedModes[0];
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
        const location = response.data;

        if (!location) {
          this.prefillHint = this.$t(
            "accessPoint.management.location.prefillEmpty"
          );
          return;
        }

        this.form.location = { ...(this.form.location || {}), ...location };
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
    parseConfig() {
      const text = (this.configText || "").trim();
      if (!text) {
        this.form.config = {};
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
        this.form.config = parsed;
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
        externalId: this.form.externalId,
        providerLocationId: this.form.providerLocationId || null,
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
      if (!this.$refs.form.validate()) return;
      if (!this.parseConfig()) {
        this.advancedPanel = [0];
        return;
      }

      this.saving = true;
      this.saveError = "";

      try {
        const response = await ApiAccessPointService.storeAccessPoint(
          this.buildPayload(),
          this.tenantId
        );
        this.$emit("saved", response.data);
      } catch (error) {
        this.saveError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.saveFailed",
        });
      } finally {
        this.saving = false;
      }
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
      <v-card-title class="d-flex align-center">
        <v-icon left color="primary">{{ typeIcon }}</v-icon>
        {{ title }}
      </v-card-title>
      <v-divider />

      <v-card-text class="pt-4">
        <v-form ref="form" v-model="valid">
          <!-- Provider listing, the way a locker system and optionally a door
               is taken over -->
          <template v-if="showPicker">
            <div class="provider-picker section-title mb-3">
              <v-icon small left>mdi-magnify</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.picker.title") }}
              </span>
            </div>
            <v-alert
              v-if="providerOptions.length === 0"
              color="info"
              text
              dense
              class="mb-4"
            >
              <v-icon left>mdi-information-outline</v-icon>
              {{ $t("accessPoint.management.picker.noProvider") }}
            </v-alert>

            <v-row v-else dense align="center">
              <v-col cols="12" md="4">
                <v-select
                  v-model="pickerProvider"
                  :items="providerOptions"
                  :label="$t('accessPoint.management.picker.provider')"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
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
              <v-col cols="12" md="2" class="text-right">
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
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                class="provider-field"
                v-model="form.provider"
                :items="providerIds"
                :label="$t('accessPoint.management.fields.provider')"
                background-color="accent"
                filled
                dense
                :rules="requiredRule"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.externalId"
                :label="$t('accessPoint.management.fields.externalId')"
                :hint="externalIdHint"
                persistent-hint
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col cols="12" md="6">
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
                v-model="form.mode"
                :items="modeOptions"
                :label="$t('accessPoint.management.fields.mode')"
                background-color="accent"
                filled
                dense
                :rules="requiredRule"
                :hint="
                  unsupportedMode
                    ? $t('accessPoint.management.modeUnsupported')
                    : ''
                "
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
          </v-row>

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
              :input-value="qrScanRequired"
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
              {{ $t("accessPoint.management.rules.defaultHint") }}
            </div>

            <!-- Location -->
            <div class="section-title mt-6 mb-3">
              <v-icon small left>mdi-map-marker</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.management.location.title") }}
              </span>
            </div>
            <AddressLookup
              :value="form.location"
              :label="$t('accessPoint.management.location.address')"
              @input="onLocationChange"
            />
            <div v-if="coordinates" class="text-caption text--secondary mb-2">
              {{ $t("accessPoint.management.location.coordinates") }}:
              {{ coordinates }}
            </div>
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
                  v-model="configText"
                  :label="$t('accessPoint.management.config.label')"
                  :hint="$t('accessPoint.management.config.hint')"
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
      <v-card-actions>
        <v-spacer />
        <v-btn text :disabled="saving" @click="close">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <v-btn
          class="save-access-point"
          color="primary"
          :loading="saving"
          @click="submit"
        >
          {{ $t("accessPoint.management.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
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

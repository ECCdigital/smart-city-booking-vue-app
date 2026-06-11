<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mapGetters } from "vuex";

const ALL_MODES = ["authorization", "remote", "both"];
const MAX_BUFFER_MINUTES = 1440;

export default {
  name: "BookableEditAccessPoints",
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      accessApps: [],
      accessPoints: [],
      selectedAccessPointId: "",
      loadingApps: false,
      loadingAccessPoints: false,
      loadError: "",
    };
  },
  computed: {
    modeOptions() {
      return [
        {
          value: "authorization",
          text: this.$t("accessPoint.bookable.modeAuthorization"),
          description: this.$t("accessPoint.bookable.modeAuthorizationDesc"),
          icon: "mdi-dialpad",
        },
        {
          value: "remote",
          text: this.$t("accessPoint.bookable.modeRemote"),
          description: this.$t("accessPoint.bookable.modeRemoteDesc"),
          icon: "mdi-cellphone-key",
        },
        {
          value: "both",
          text: this.$t("accessPoint.bookable.modeBoth"),
          description: this.$t("accessPoint.bookable.modeBothDesc"),
          icon: "mdi-cellphone-key",
        },
      ];
    },
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    accessPointDetails: {
      get() {
        return this.model.accessPointDetails || { active: false, points: [] };
      },
      set(value) {
        this.$set(this.model, "accessPointDetails", value);
      },
    },
    accessBuffer() {
      return (
        this.accessPointDetails.accessBuffer || { beforeMs: 0, afterMs: 0 }
      );
    },
    bufferRules() {
      return [
        (v) => {
          if (v === "" || v === null || v === undefined) return true;
          const num = Number(v);
          return (
            (Number.isInteger(num) &&
              num >= 0 &&
              num <= MAX_BUFFER_MINUTES) ||
            this.$t("accessPoint.bookable.buffer.invalid", {
              max: MAX_BUFFER_MINUTES,
            })
          );
        },
      ];
    },
    activeNukiApp() {
      return this.accessApps.find((app) => app.id === "nuki" && app.active);
    },
    selectedAccessPoint() {
      return this.accessPoints.find(
        (point) => point.externalId === this.selectedAccessPointId
      );
    },
    availableAccessPoints() {
      const selectedIds = new Set(
        (this.accessPointDetails.points || []).map((point) => point.externalId)
      );
      return this.accessPoints
        .filter((point) => !selectedIds.has(point.externalId))
        .map((point) => ({
          ...point,
          disabled: this.isUnassignable(point),
        }));
    },
    canAddAccessPoint() {
      return (
        !!this.selectedAccessPoint &&
        !!this.activeNukiApp &&
        !this.isUnassignable(this.selectedAccessPoint)
      );
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.fetchAccessApps();
      },
    },
    "accessPointDetails.active"(active) {
      if (active && this.activeNukiApp && this.accessPoints.length === 0) {
        this.fetchAccessPoints();
      }
    },
    activeNukiApp(app) {
      if (app && this.accessPointDetails.active) {
        this.fetchAccessPoints();
      }
    },
  },
  mounted() {
    if (!this.model.accessPointDetails) {
      this.accessPointDetails = { active: false, points: [] };
    }
    if (!this.accessPointDetails.points) {
      this.$set(this.accessPointDetails, "points", []);
    }
    if (!this.accessPointDetails.accessBuffer) {
      this.$set(this.accessPointDetails, "accessBuffer", {
        before: 0,
        after: 0,
      });
    }
  },
  methods: {
    validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    async fetchAccessApps() {
      if (!this.tenantId) return;

      this.loadingApps = true;
      try {
        const tenant = await ApiTenantService.getTenant(this.tenantId);
        this.accessApps =
          tenant.data.applications?.filter((app) => app.type === "access") ||
          [];

        if (this.activeNukiApp && this.accessPointDetails.active) {
          await this.fetchAccessPoints();
        }
      } catch (error) {
        this.accessApps = [];
      } finally {
        this.loadingApps = false;
      }
    },
    async fetchAccessPoints() {
      if (!this.tenantId || !this.activeNukiApp) return;

      this.loadingAccessPoints = true;
      this.loadError = "";
      try {
        const response = await ApiAccessAppsService.getAccessPoints(
          this.tenantId
        );
        this.accessPoints = response.data || [];
        this.migratePointModes();
      } catch (error) {
        this.accessPoints = [];
        this.loadError =
          error.response?.data?.message ||
          error.message ||
          this.$t("accessPoint.load.error.message");
      } finally {
        this.loadingAccessPoints = false;
      }
    },
    addAccessPoint() {
      if (!this.selectedAccessPoint) return;

      if (!this.accessPointDetails.points) {
        this.$set(this.accessPointDetails, "points", []);
      }

      const point = this.selectedAccessPoint;
      this.accessPointDetails.points.push({
        id: point.externalId || point.id,
        provider: point.provider || "nuki",
        externalId: point.externalId || point.id,
        label: point.label,
        mode: this.getDefaultMode(point),
        locationId: point.locationId || null,
        config: {},
      });
      this.selectedAccessPointId = "";
    },
    removeAccessPoint(idx) {
      this.accessPointDetails.points.splice(idx, 1);
    },
    getPointLabel(point) {
      return point.label || point.externalId || point.id;
    },
    findProviderAccessPoint(point) {
      const key = point.externalId || point.id;
      return this.accessPoints.find(
        (ap) => (ap.externalId || ap.id) === key
      );
    },
    // Returns the modes supported by the lock, or null when unknown
    // (access point not loaded or field missing) -> caller should allow all.
    getSupportedModes(point) {
      const ap = this.findProviderAccessPoint(point);
      if (!ap || !Array.isArray(ap.supportedModes)) return null;
      return ap.supportedModes;
    },
    getSelectableModes(point) {
      const supported = this.getSupportedModes(point);
      return supported && supported.length ? supported : ALL_MODES;
    },
    modeOptionsForPoint(point) {
      const selectable = this.getSelectableModes(point);
      return this.modeOptions.filter((option) =>
        selectable.includes(option.value)
      );
    },
    // A lock with a known but empty supportedModes list cannot be assigned.
    isUnassignable(point) {
      const supported = this.getSupportedModes(point);
      return Array.isArray(supported) && supported.length === 0;
    },
    isOnlyRemote(point) {
      const supported = this.getSupportedModes(point);
      return (
        Array.isArray(supported) &&
        supported.length === 1 &&
        supported[0] === "remote"
      );
    },
    modeHint(point) {
      if (this.isUnassignable(point)) {
        return this.$t("accessPoint.bookable.modeUnavailable");
      }
      if (this.isOnlyRemote(point)) {
        return this.$t("accessPoint.bookable.onlyRemoteHint");
      }
      const selected = this.modeOptions.find(
        (option) => option.value === point.mode
      );
      return selected ? selected.description : "";
    },
    getDefaultMode(point) {
      const selectable = this.getSelectableModes(point);
      const preferred = ["authorization", "both", "remote"];
      return (
        preferred.find((mode) => selectable.includes(mode)) || selectable[0]
      );
    },
    normalizeBufferValue(value) {
      if (value === "" || value === null || value === undefined) return 0;
      const num = Math.floor(Number(value));
      if (Number.isNaN(num)) return 0;
      return Math.min(Math.max(num, 0), MAX_BUFFER_MINUTES);
    },
    setDefaultBuffer(key, value) {
      if (!this.accessPointDetails.accessBuffer) {
        this.$set(this.accessPointDetails, "accessBuffer", {
          before: 0,
          after: 0,
        });
      }
      this.$set(
        this.accessPointDetails.accessBuffer,
        key,
        this.normalizeBufferValue(value)
      );
    },
    hasPointBuffer(point) {
      return !!point.accessBuffer;
    },
    togglePointBuffer(point, enabled) {
      if (enabled) {
        const fallback = this.accessBuffer;
        this.$set(point, "accessBuffer", {
          before: this.normalizeBufferValue(fallback.before),
          after: this.normalizeBufferValue(fallback.after),
        });
      } else {
        this.$delete(point, "accessBuffer");
      }
    },
    setPointBuffer(point, key, value) {
      if (!point.accessBuffer) {
        this.$set(point, "accessBuffer", { before: 0, after: 0 });
      }
      this.$set(point.accessBuffer, key, this.normalizeBufferValue(value));
    },
    // Reset any saved mode that is no longer supported by its lock.
    migratePointModes() {
      (this.accessPointDetails.points || []).forEach((point) => {
        const supported = this.getSupportedModes(point);
        if (!supported || supported.length === 0) return;
        if (!supported.includes(point.mode)) {
          this.$set(point, "mode", this.getDefaultMode(point));
        }
      });
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <v-card outlined class="component-card pa-4">
      <div class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-door-open</v-icon>
        <span class="text-h6">{{ $t("accessPoint.bookable.title") }}</span>
      </div>
      <v-divider class="mt-3 mb-4" />

      <v-switch
        v-model="accessPointDetails.active"
        hide-details
        color="primary"
        class="mt-0"
      >
        <template v-slot:label>
          <div>
            <div class="font-weight-medium">
              {{ $t("accessPoint.bookable.activate") }}
            </div>
            <div class="text-caption text--secondary">
              {{ $t("accessPoint.bookable.activateHint") }}
            </div>
          </div>
        </template>
      </v-switch>

      <!-- Pufferzeiten -->
      <div v-if="accessPointDetails.active" class="mt-6">
        <div class="section-title mb-3">
          <v-icon small left>mdi-timer-sand</v-icon>
          <span class="font-weight-medium">{{
            $t("accessPoint.bookable.buffer.title")
          }}</span>
        </div>
        <div class="text-caption text--secondary mb-4">
          {{ $t("accessPoint.bookable.buffer.hint") }}
        </div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              :value="accessBuffer.before"
              type="number"
              min="0"
              :max="1440"
              step="1"
              :label="$t('accessPoint.bookable.buffer.before')"
              :suffix="$t('accessPoint.bookable.buffer.minutes')"
              :rules="bufferRules"
              background-color="accent"
              filled
              dense
              prepend-inner-icon="mdi-clock-start"
              @input="setDefaultBuffer('before', $event)"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              :value="accessBuffer.after"
              type="number"
              min="0"
              :max="1440"
              step="1"
              :label="$t('accessPoint.bookable.buffer.after')"
              :suffix="$t('accessPoint.bookable.buffer.minutes')"
              :rules="bufferRules"
              background-color="accent"
              filled
              dense
              prepend-inner-icon="mdi-clock-end"
              @input="setDefaultBuffer('after', $event)"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Nuki-Türen -->
      <div v-if="accessPointDetails.active" class="mt-6">
        <div
          class="section-title mb-3 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon small left>mdi-door</v-icon>
            <span class="font-weight-medium">{{
              $t("accessPoint.bookable.nukiDoors")
            }}</span>
          </div>
          <v-btn
            small
            text
            color="primary"
            :loading="loadingAccessPoints"
            :disabled="!activeNukiApp || loadingAccessPoints"
            @click="fetchAccessPoints"
          >
            <v-icon left small>mdi-refresh</v-icon>
            {{ $t("accessPoint.bookable.reload") }}
          </v-btn>
        </div>

        <v-alert
          v-if="!activeNukiApp && !loadingApps"
          color="info"
          dense
          text
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info"> mdi-information-outline </v-icon>
            <div>
              {{ $t("accessPoint.bookable.nukiInactive") }}
            </div>
          </div>
        </v-alert>

        <v-alert v-if="loadError" color="error" dense text class="mb-4">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ loadError }}
        </v-alert>

        <v-alert
          v-if="activeNukiApp && accessPointDetails.points.length > 0"
          color="info"
          dense
          text
          class="mb-4"
        >
          <div class="font-weight-medium mb-2">
            {{ $t("accessPoint.bookable.modeHelp") }}
          </div>
          <div class="d-flex align-start mb-1">
            <v-icon small color="info" class="mr-2 mt-1">mdi-dialpad</v-icon>
            <div class="text-caption">
              <strong
                >{{ $t("accessPoint.bookable.modeAuthorization") }}:</strong
              >
              {{ $t("accessPoint.bookable.modeAuthorizationDesc") }}
            </div>
          </div>
          <div class="d-flex align-start">
            <v-icon small color="info" class="mr-2 mt-1">
              mdi-cellphone-key
            </v-icon>
            <div class="text-caption">
              <strong>{{ $t("accessPoint.bookable.modeRemote") }}:</strong>
              {{ $t("accessPoint.bookable.modeRemoteDesc") }}
            </div>
          </div>
        </v-alert>

        <v-row v-if="activeNukiApp" dense align="center">
          <v-col cols="12" md="9">
            <v-select
              v-model="selectedAccessPointId"
              :items="availableAccessPoints"
              :item-text="getPointLabel"
              item-value="externalId"
              item-disabled="disabled"
              :label="$t('accessPoint.bookable.selectDoor')"
              background-color="accent"
              filled
              dense
              hide-details
              :loading="loadingAccessPoints"
              :disabled="loadingAccessPoints"
            >
              <template v-slot:prepend-inner>
                <v-icon small>mdi-door</v-icon>
              </template>
              <template v-slot:item="{ item }">
                <div>
                  <div class="font-weight-medium">
                    {{ getPointLabel(item) }}
                  </div>
                  <div class="text-caption text--secondary">
                    {{ item.provider || "nuki" }} •
                    {{ item.externalId || item.id }}
                  </div>
                  <div v-if="item.disabled" class="text-caption error--text">
                    {{ $t("accessPoint.bookable.notAssignable") }}
                  </div>
                </div>
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" md="3" class="text-right">
            <v-btn
              color="primary"
              :disabled="!canAddAccessPoint"
              @click="addAccessPoint"
            >
              <v-icon left small>mdi-plus</v-icon>
              {{ $t("accessPoint.bookable.add") }}
            </v-btn>
          </v-col>
        </v-row>

        <v-divider v-if="accessPointDetails.points.length > 0" class="my-4" />

        <div v-if="accessPointDetails.points.length > 0">
          <div
            v-for="(point, idx) in accessPointDetails.points"
            :key="`access-point-${point.externalId}-${idx}`"
            class="point-row pa-4 mb-3"
          >
            <v-row align="center">
              <v-col cols="12" md="5">
                <div class="font-weight-medium">
                  {{ point.label || point.externalId }}
                </div>
                <div class="text-caption text--secondary">
                  {{ point.provider || "nuki" }} • {{ point.externalId }}
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="point.mode"
                  :items="modeOptionsForPoint(point)"
                  :label="$t('accessPoint.bookable.mode')"
                  background-color="accent"
                  filled
                  :disabled="isUnassignable(point)"
                  :hint="modeHint(point)"
                  persistent-hint
                >
                  <template v-slot:selection="{ item }">
                    <v-icon small class="mr-2">{{ item.icon }}</v-icon>
                    <span>{{ item.text }}</span>
                  </template>
                  <template v-slot:item="{ item }">
                    <v-list-item-icon class="mr-3 align-self-center">
                      <v-icon>{{ item.icon }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-title class="font-weight-medium">
                        {{ item.text }}
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
              <v-col cols="12" md="1" class="text-right">
                <v-btn icon small @click="removeAccessPoint(idx)">
                  <v-icon small>mdi-delete-outline</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-divider class="my-3" />

            <v-switch
              :input-value="hasPointBuffer(point)"
              hide-details
              dense
              color="primary"
              class="mt-0 mb-2"
              @change="togglePointBuffer(point, $event)"
            >
              <template v-slot:label>
                <span class="text-caption">
                  {{ $t("accessPoint.bookable.buffer.overrideLabel") }}
                </span>
              </template>
            </v-switch>

            <v-expand-transition>
              <v-row v-if="hasPointBuffer(point)" dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    :value="point.accessBuffer.before"
                    type="number"
                    min="0"
                    :max="1440"
                    step="1"
                    :label="$t('accessPoint.bookable.buffer.before')"
                    :suffix="$t('accessPoint.bookable.buffer.minutes')"
                    :rules="bufferRules"
                    background-color="accent"
                    filled
                    dense
                    prepend-inner-icon="mdi-clock-start"
                    @input="setPointBuffer(point, 'before', $event)"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    :value="point.accessBuffer.after"
                    type="number"
                    min="0"
                    :max="1440"
                    step="1"
                    :label="$t('accessPoint.bookable.buffer.after')"
                    :suffix="$t('accessPoint.bookable.buffer.minutes')"
                    :rules="bufferRules"
                    background-color="accent"
                    filled
                    dense
                    prepend-inner-icon="mdi-clock-end"
                    @input="setPointBuffer(point, 'after', $event)"
                  />
                </v-col>
              </v-row>
              <div v-else class="text-caption text--secondary mb-1">
                {{
                  $t("accessPoint.bookable.buffer.inherited", {
                    before: accessBuffer.before || 0,
                    after: accessBuffer.after || 0,
                  })
                }}
              </div>
            </v-expand-transition>
          </div>
        </div>

        <div v-else class="text-center py-6">
          <v-icon large color="grey lighten-1" class="mb-2">
            mdi-door-open
          </v-icon>
          <div class="text-body-1 mb-1">
            {{ $t("accessPoint.bookable.emptyTitle") }}
          </div>
          <div class="text-caption text--secondary">
            {{ $t("accessPoint.bookable.emptyHint") }}
          </div>
        </div>
      </div>
    </v-card>
  </v-form>
</template>

<style scoped>
.component-card {
  border-radius: 8px !important;
}
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
.point-row {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}
.theme--dark .point-row {
  border-color: rgba(255, 255, 255, 0.12);
}
</style>

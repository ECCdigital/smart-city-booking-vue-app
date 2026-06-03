<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mapGetters } from "vuex";

export default {
  name: "BookableEditAccessPoints",
  components: { BaseSection },
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
        },
        {
          value: "remote",
          text: this.$t("accessPoint.bookable.modeRemote"),
        },
        {
          value: "both",
          text: this.$t("accessPoint.bookable.modeBoth"),
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
      return this.accessPoints.filter(
        (point) => !selectedIds.has(point.externalId)
      );
    },
    canAddAccessPoint() {
      return !!this.selectedAccessPoint && !!this.activeNukiApp;
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
  },
  methods: {
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
        mode: "authorization",
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
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection
      :title="$t('accessPoint.bookable.title')"
      icon="mdi-door-open"
    />

    <v-switch
      v-model="accessPointDetails.active"
      :label="$t('accessPoint.bookable.activate')"
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

    <v-card
      v-if="accessPointDetails.active"
      class="my-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-door</v-icon>
          <span class="text-h6 font-weight-bold">{{
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
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-alert
          v-if="!activeNukiApp && !loadingApps"
          color="info"
          dense
          text
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info">
              mdi-information-outline
            </v-icon>
            <div>
              {{ $t("accessPoint.bookable.nukiInactive") }}
            </div>
          </div>
        </v-alert>

        <v-alert v-if="loadError" color="error" dense text class="mb-4">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ loadError }}
        </v-alert>

        <v-row v-if="activeNukiApp" dense align="center">
          <v-col cols="12" md="9">
            <v-select
              v-model="selectedAccessPointId"
              :items="availableAccessPoints"
              :item-text="getPointLabel"
              item-value="externalId"
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

        <v-divider
          v-if="accessPointDetails.points.length > 0"
          class="my-4"
        />

        <div v-if="accessPointDetails.points.length > 0">
          <v-card
            v-for="(point, idx) in accessPointDetails.points"
            :key="`access-point-${point.externalId}-${idx}`"
            class="mb-3 point-card"
            outlined
          >
            <v-card-text class="pa-4">
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
                    :items="modeOptions"
                    :label="$t('accessPoint.bookable.mode')"
                    background-color="accent"
                    filled
                    dense
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="1" class="text-right">
                  <v-btn icon small @click="removeAccessPoint(idx)">
                    <v-icon small>mdi-delete-outline</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
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
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}
.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.point-card {
  border-radius: 8px !important;
}
</style>

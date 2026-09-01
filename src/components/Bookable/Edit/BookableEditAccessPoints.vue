<script>
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import AccessPointPermissionService from "@/services/permissions/AccessPointPermissionService";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  accessPointLabel,
  accessPointTypeLabel,
} from "@/utilities/access-points";
import { mapGetters } from "vuex";

const MAX_BUFFER_MINUTES = 1440;

/**
 * The access tab of the bookable editor - a selector and nothing else.
 *
 * Access points are tenant-wide entities with their own management area, so a
 * bookable only ever references them by id. What describes a door - provider,
 * mode, QR rules, location - is edited there and deliberately absent here;
 * otherwise the same door would have two truths.
 *
 * The list is read through the access point management API, which grants
 * reading to everyone who may read bookables. Editors without tenant owner
 * rights can therefore assign doors although they may not create them.
 */
export default {
  name: "BookableEditAccessPoints",
  props: {
    bookable: { type: Object, required: true },
    // When true, hides the own card header and activation switch so the
    // component can be embedded in a parent layout that controls activation.
    embedded: { type: Boolean, default: false },
  },
  data() {
    return {
      valid: true,
      accessPoints: [],
      loading: false,
      loadError: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    accessPointDetails() {
      return this.bookable.accessPointDetails || {};
    },
    active: {
      get() {
        return !!this.accessPointDetails.active;
      },
      set(active) {
        this.patchDetails({ active });
      },
    },
    accessBuffer() {
      return this.accessPointDetails.accessBuffer || { before: 0, after: 0 };
    },
    selectedIds: {
      get() {
        return this.accessPointDetails.accessPointIds || [];
      },
      set(accessPointIds) {
        this.patchDetails({ accessPointIds });
      },
    },
    bufferRules() {
      return [
        (v) => {
          if (v === "" || v === null || v === undefined) return true;
          const num = Number(v);
          return (
            (Number.isInteger(num) && num >= 0 && num <= MAX_BUFFER_MINUTES) ||
            this.$t("accessPoint.bookable.buffer.invalid", {
              max: MAX_BUFFER_MINUTES,
            })
          );
        },
      ];
    },
    accessPointOptions() {
      return this.accessPoints.map((accessPoint) => ({
        value: accessPoint.id,
        label: accessPointLabel(accessPoint),
        subtitle: [
          accessPointTypeLabel(accessPoint),
          accessPoint.provider,
          accessPoint.externalId,
        ]
          .filter(Boolean)
          .join(" • "),
      }));
    },
    selectedOptions() {
      return this.selectedIds
        .map((id) =>
          this.accessPointOptions.find((option) => option.value === id)
        )
        .filter(Boolean);
    },
    // Access points are created and edited in the tenant's management area,
    // which is owner-only - so the pointer there is only shown to those who
    // can actually act on it.
    canManageAccessPoints() {
      return AccessPointPermissionService.allowWrite();
    },
    // Ids without an access point: doors that were deleted in the management
    // area. They are shown so the editor can drop them - the bookable PUT
    // rejects them, and until then they are references that open nothing.
    unknownSelectedIds() {
      if (this.loading || this.loadError) return [];
      const known = new Set(this.accessPoints.map((point) => point.id));
      return this.selectedIds.filter((id) => !known.has(id));
    },
    managementHref() {
      return this.$router.resolve({ name: "access-points" }).href;
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.fetchAccessPoints();
      },
    },
  },
  methods: {
    validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    patchDetails(patch) {
      this.$emit("update:bookable", {
        ...this.bookable,
        accessPointDetails: { ...this.accessPointDetails, ...patch },
      });
    },
    async fetchAccessPoints() {
      if (!this.tenantId) return;

      this.loading = true;
      this.loadError = "";
      try {
        const response = await ApiAccessPointService.getAccessPoints(
          this.tenantId
        );
        this.accessPoints = response.data || [];
      } catch (error) {
        this.accessPoints = [];
        this.loadError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.loadFailed",
          forbiddenKey: "accessPoint.bookable.readForbidden",
        });
      } finally {
        this.loading = false;
      }
    },
    removeAccessPoint(id) {
      this.selectedIds = this.selectedIds.filter(
        (selectedId) => selectedId !== id
      );
    },
    normalizeBufferValue(value) {
      if (value === "" || value === null || value === undefined) return 0;
      const num = Math.floor(Number(value));
      if (Number.isNaN(num)) return 0;
      return Math.min(Math.max(num, 0), MAX_BUFFER_MINUTES);
    },
    setBuffer(key, value) {
      this.patchDetails({
        accessBuffer: {
          ...this.accessBuffer,
          [key]: this.normalizeBufferValue(value),
        },
      });
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <v-card
      :outlined="!embedded"
      :flat="embedded"
      :class="embedded ? 'pa-0' : 'component-card pa-4'"
    >
      <template v-if="!embedded">
        <div class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-door-open</v-icon>
          <span class="text-h6">{{ $t("accessPoint.bookable.title") }}</span>
        </div>
        <v-divider class="mt-3 mb-4" />

        <v-switch v-model="active" hide-details color="primary" class="mt-0">
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
      </template>

      <template v-if="embedded || active">
        <!-- Buffer -->
        <div :class="embedded ? '' : 'mt-6'">
          <div class="section-title mb-3">
            <v-icon small left>mdi-timer-sand</v-icon>
            <span class="font-weight-medium">
              {{ $t("accessPoint.bookable.buffer.title") }}
            </span>
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
                @input="setBuffer('before', $event)"
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
                @input="setBuffer('after', $event)"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Selection -->
        <div class="mt-6">
          <div
            class="section-title mb-3 d-flex justify-space-between align-center"
          >
            <div>
              <v-icon small left>mdi-door</v-icon>
              <span class="font-weight-medium">
                {{ $t("accessPoint.bookable.selectTitle") }}
              </span>
            </div>
            <v-btn
              small
              text
              color="primary"
              :loading="loading"
              :disabled="loading"
              @click="fetchAccessPoints"
            >
              <v-icon left small>mdi-refresh</v-icon>
              {{ $t("accessPoint.bookable.reload") }}
            </v-btn>
          </div>

          <v-alert color="info" dense text class="mb-4">
            <div class="d-flex align-start">
              <v-icon class="mr-3 mt-1" small color="info">
                mdi-information-outline
              </v-icon>
              <div>
                <div class="text-caption">
                  {{ $t("accessPoint.bookable.manageHint") }}
                </div>
                <a
                  v-if="canManageAccessPoints"
                  :href="managementHref"
                  target="_blank"
                  rel="noopener"
                  class="text-caption font-weight-medium"
                >
                  {{ $t("accessPoint.bookable.manageLink") }}
                  <v-icon x-small color="primary">mdi-open-in-new</v-icon>
                </a>
              </div>
            </div>
          </v-alert>

          <v-alert v-if="loadError" color="error" dense text class="mb-4">
            <v-icon left>mdi-alert-circle</v-icon>
            {{ loadError }}
          </v-alert>

          <v-alert
            v-if="unknownSelectedIds.length > 0"
            color="warning"
            dense
            text
            class="mb-4"
          >
            <div class="font-weight-medium">
              {{ $t("accessPoint.bookable.unknownTitle") }}
            </div>
            <div class="text-caption mb-2">
              {{ $t("accessPoint.bookable.unknownHint") }}
            </div>
            <v-chip
              v-for="id in unknownSelectedIds"
              :key="`unknown-${id}`"
              small
              close
              class="mr-2 mb-1"
              color="warning"
              outlined
              @click:close="removeAccessPoint(id)"
            >
              {{ id }}
            </v-chip>
          </v-alert>

          <v-autocomplete
            v-model="selectedIds"
            :items="accessPointOptions"
            item-text="label"
            item-value="value"
            multiple
            clearable
            background-color="accent"
            filled
            dense
            :loading="loading"
            :label="$t('accessPoint.bookable.select')"
            :hint="$t('accessPoint.bookable.selectHint')"
            persistent-hint
            :no-data-text="$t('accessPoint.bookable.noneAvailable')"
            :menu-props="{ closeOnContentClick: false }"
          >
            <template v-slot:prepend-inner>
              <v-icon small>mdi-door</v-icon>
            </template>
            <template v-slot:selection="{ index }">
              <span v-if="index === 0" class="text-caption">
                {{
                  $t("accessPoint.bookable.selectedCount", {
                    count: selectedIds.length,
                  })
                }}
              </span>
            </template>
            <template v-slot:item="{ item, attrs, on }">
              <v-list-item v-bind="attrs" v-on="on">
                <v-list-item-action>
                  <v-simple-checkbox
                    :value="attrs.inputValue"
                    :ripple="false"
                  />
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title class="font-weight-medium">
                    {{ item.label }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ item.subtitle }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </template>
          </v-autocomplete>

          <div v-if="selectedOptions.length > 0" class="mt-4">
            <div
              v-for="option in selectedOptions"
              :key="`selected-${option.value}`"
              class="point-row pa-3 mb-2 d-flex align-center"
            >
              <v-icon small class="mr-3">mdi-door</v-icon>
              <div>
                <div class="font-weight-medium">{{ option.label }}</div>
                <div class="text-caption text--secondary">
                  {{ option.subtitle }}
                </div>
              </div>
              <v-spacer />
              <v-btn icon small @click="removeAccessPoint(option.value)">
                <v-icon small>mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </div>

          <div v-else-if="!unknownSelectedIds.length" class="text-center py-6">
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
      </template>
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

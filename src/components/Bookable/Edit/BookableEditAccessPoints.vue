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
 * An access point as both the table and the picker show it: what it is called,
 * what kind it is, and the ids that identify it at the provider.
 *
 * @param {Object} accessPoint An access point of the tenant
 * @returns {Object} The row the template renders
 */
function toRow(accessPoint) {
  const typeLabel = accessPointTypeLabel(accessPoint);
  return {
    id: accessPoint.id,
    label: accessPointLabel(accessPoint),
    externalId: accessPoint.externalId || "",
    provider: accessPoint.provider || "",
    isLocker: accessPoint.type === "locker",
    typeLabel,
    subtitle: [typeLabel, accessPoint.provider, accessPoint.externalId]
      .filter(Boolean)
      .join(" • "),
  };
}

/**
 * The assignment part of the bookable editor's access tab - a table of what is
 * assigned, and the buffer that applies to all of it.
 *
 * Access points are tenant-wide entities with their own management area, so a
 * bookable only ever references them by id. What describes an access point -
 * provider, mode, QR rules, location - is edited there and deliberately absent
 * here; otherwise the same door would have two truths.
 *
 * Since the locker fold a locker system is an access point like a door, so the
 * same table carries both. What differs is what a booking gets: a door is
 * shared for the booking period, a locker system hands out one compartment per
 * unit the booking books, picked by the provider. The bookable's `amount` is
 * not that number - it is the capacity the concurrent bookings are counted
 * against - which is why it is shown one level up, not in this table.
 *
 * The list is read through the access point management API, which grants
 * reading to everyone who may read bookables. Editors without tenant owner
 * rights can therefore assign access points although they may not create them.
 */
export default {
  name: "BookableEditAccessPoints",
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      accessPoints: [],
      loading: false,
      loadError: "",
      pickerOpen: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    accessPointDetails() {
      return this.bookable.accessPointDetails || {};
    },
    accessBuffer() {
      return this.accessPointDetails.accessBuffer || { before: 0, after: 0 };
    },
    selectedIds() {
      return this.accessPointDetails.accessPointIds || [];
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
    // One row per assigned id, in the order the bookable stores them. Ids
    // without an access point are not rows - they are named separately, so
    // that a table row always describes something that exists.
    assignedRows() {
      return this.selectedIds
        .map((id) => this.accessPoints.find((point) => point.id === id))
        .filter(Boolean)
        .map(toRow);
    },
    // The picker lists what the tenant has and this bookable does not use yet.
    // It says nothing about whether the provider is active - that question
    // belongs to the access point, not to the assignment.
    assignableAccessPoints() {
      return this.accessPoints
        .filter((point) => !this.selectedIds.includes(point.id))
        .map(toRow);
    },
    // Access points are created and edited in the tenant's management area,
    // which is owner-only - so the pointer there is only shown to those who
    // can actually act on it.
    canManageAccessPoints() {
      return AccessPointPermissionService.allowWrite();
    },
    // Ids without an access point: entries that were deleted in the management
    // area. They are shown so the editor can drop them - the bookable PUT
    // rejects them, and until then they are references that open nothing.
    unknownSelectedIds() {
      if (this.loading || this.loadError) return [];
      const known = new Set(this.accessPoints.map((point) => point.id));
      return this.selectedIds.filter((id) => !known.has(id));
    },
    // Why the picker has nothing to offer. A list still in flight is neither
    // "all assigned" nor "none exists" - claiming either would be a sentence
    // the UI cannot say yet.
    emptyPickerText() {
      if (this.loading) return this.$t("accessPoint.bookable.pickerLoading");
      if (this.loadError) return this.loadError;
      return this.accessPoints.length
        ? this.$t("accessPoint.bookable.allAssigned")
        : this.$t("accessPoint.bookable.noneAvailable");
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
    /**
     * What a booking gets at this access point. At a locker system it gets one
     * compartment per unit it books (`bookableItem.amount`), assigned by the
     * provider - not the bookable's `amount`, which the backend uses as the
     * capacity the concurrent bookings are counted against. A door is not
     * handed out at all; it is shared for the booking period.
     */
    grantText(row) {
      return row.isLocker
        ? this.$t("accessPoint.bookable.grants.locker")
        : this.$t("accessPoint.bookable.grants.door");
    },
    assignAccessPoint(id) {
      this.pickerOpen = false;
      if (this.selectedIds.includes(id)) return;
      this.patchDetails({ accessPointIds: [...this.selectedIds, id] });
    },
    removeAccessPoint(id) {
      this.patchDetails({
        accessPointIds: this.selectedIds.filter(
          (selectedId) => selectedId !== id
        ),
      });
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
    <v-card flat class="pa-0">
      <!-- Buffer -->
      <div>
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
              class="buffer-before"
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
              class="buffer-after"
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

      <!-- Assignment -->
      <div class="mt-6">
        <div
          class="section-title mb-3 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon small left>mdi-shield-key-outline</v-icon>
            <span class="font-weight-medium">
              {{ $t("accessPoint.bookable.selectTitle") }}
            </span>
          </div>
          <div class="picker-anchor d-flex align-center">
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
            <v-menu
              v-model="pickerOpen"
              attach
              offset-y
              left
              :close-on-content-click="false"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  class="assign-button ml-2"
                  small
                  color="primary"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon left small>mdi-plus</v-icon>
                  {{ $t("accessPoint.bookable.assign") }}
                </v-btn>
              </template>
              <v-list dense max-height="320" class="overflow-y-auto">
                <v-list-item
                  v-for="option in assignableAccessPoints"
                  :key="`assignable-${option.id}`"
                  class="assign-option"
                  @click="assignAccessPoint(option.id)"
                >
                  <v-list-item-icon class="mr-3">
                    <v-icon :color="option.isLocker ? 'indigo' : 'primary'">
                      {{ option.isLocker ? "mdi-locker-multiple" : "mdi-door" }}
                    </v-icon>
                  </v-list-item-icon>
                  <v-list-item-content>
                    <v-list-item-title>{{ option.label }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ option.subtitle }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
                <v-list-item v-if="!assignableAccessPoints.length">
                  <v-list-item-content>
                    <v-list-item-title
                      class="text-caption text--secondary text-wrap"
                    >
                      {{ emptyPickerText }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
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

        <v-simple-table class="assignment-table">
          <thead>
            <tr>
              <th>{{ $t("accessPoint.bookable.table.point") }}</th>
              <th>{{ $t("accessPoint.bookable.table.type") }}</th>
              <th>{{ $t("accessPoint.bookable.table.provider") }}</th>
              <th>{{ $t("accessPoint.bookable.table.grants") }}</th>
              <th class="text-right">
                {{ $t("accessPoint.bookable.table.remove") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in assignedRows"
              :key="`assigned-${row.id}`"
              class="assignment-row"
            >
              <td>
                <div class="font-weight-medium">{{ row.label }}</div>
                <div class="text-caption text--secondary">
                  {{ row.externalId }}
                </div>
              </td>
              <td>
                <v-chip
                  x-small
                  label
                  outlined
                  :color="row.isLocker ? 'indigo' : 'primary'"
                >
                  {{ row.typeLabel }}
                </v-chip>
              </td>
              <td class="text-caption">{{ row.provider }}</td>
              <td class="text-caption">{{ grantText(row) }}</td>
              <td class="text-right">
                <v-btn
                  class="assignment-remove"
                  icon
                  small
                  :aria-label="$t('accessPoint.bookable.table.remove')"
                  @click="removeAccessPoint(row.id)"
                >
                  <v-icon small color="error">mdi-link-off</v-icon>
                </v-btn>
              </td>
            </tr>
            <tr v-if="!assignedRows.length">
              <td colspan="5" class="text-center py-6">
                <div class="text-body-1 mb-1">
                  {{ $t("accessPoint.bookable.emptyTitle") }}
                </div>
                <div class="text-caption text--secondary">
                  {{ $t("accessPoint.bookable.emptyHint") }}
                </div>
              </td>
            </tr>
          </tbody>
        </v-simple-table>
      </div>
    </v-card>
  </v-form>
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
/* The picker menu is attached to this element (`attach` on the v-menu), so it
   has to be the positioned ancestor its absolute offsets are measured from. */
.picker-anchor {
  position: relative;
}
.assignment-table {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}
.theme--dark .assignment-table {
  border-color: rgba(255, 255, 255, 0.12);
}
</style>

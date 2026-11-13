<script>
import { accessPointLabel } from "@/utilities/access-points";
import {
  deviations,
  hasQr,
  metaLine,
  moreActions,
  nextStep,
  qrTitle,
} from "@/utilities/access-point-rows";

/**
 * The row of one access point on the Zugangspunkte page
 * (ECCdigital/tickets#1108). It shows the access point and hands every
 * action up as an event; the page opens the dialogs and calls the backend.
 * What it shows and offers comes from `@/utilities/access-point-rows`.
 *
 * Events: `edit`, `qr` (the visible QR code), `assign` (the button or a
 * chip), and from the menu „…“ `download` (with "svg" or "png"), `rotate`,
 * `rotate-all` and `delete`. `fresh` marks the row of an access point just
 * created, with its next step (ECCdigital/tickets#1110).
 */
export default {
  name: "AccessPointRow",
  props: {
    accessPoint: { type: Object, required: true },
    // The bookables it is assigned to; `null` where they were not readable,
    // so the row makes no claim about them.
    bookables: { type: Array, default: null },
    fresh: { type: Boolean, default: false },
  },
  computed: {
    label() {
      return accessPointLabel(this.accessPoint);
    },
    meta() {
      return metaLine(this.accessPoint);
    },
    markers() {
      return deviations(this.accessPoint);
    },
    hasQr() {
      return hasQr(this.accessPoint);
    },
    qrTitle() {
      return this.hasQr ? qrTitle(this.accessPoint) : "";
    },
    moreActions() {
      return moreActions(this.accessPoint);
    },
    nextStep() {
      return nextStep(this.accessPoint);
    },
  },
};
</script>

<template>
  <div
    class="access-point-row"
    :class="{ 'access-point-row--fresh': fresh }"
    data-test="access-point-row"
  >
    <div class="access-point-row__main">
      <div class="access-point-row__label">
        {{ label }}
        <v-tooltip v-for="marker in markers" :key="marker.key" bottom>
          <template #activator="{ on, attrs }">
            <span
              class="access-point-row__marker"
              :class="`access-point-row__marker--${marker.tone}`"
              data-test="access-point-marker"
              v-bind="attrs"
              v-on="on"
              >{{ marker.label }}</span
            >
          </template>
          <span>{{ marker.tooltip }}</span>
        </v-tooltip>
      </div>
      <div class="access-point-row__meta" data-test="access-point-meta">
        {{ meta }}
      </div>
      <div
        v-if="fresh"
        class="access-point-row__next"
        data-test="access-point-next"
      >
        {{ nextStep }}
      </div>
    </div>
    <div class="access-point-row__bookables">
      <span v-if="!bookables" class="text--secondary">
        {{ $t("accessPoint.management.row.assignmentForbidden") }}
      </span>
      <template v-else-if="bookables.length">
        <v-chip
          v-for="bookable in bookables"
          :key="bookable.id"
          x-small
          class="mr-1 my-1"
          data-test="access-point-bookable"
          @click="$emit('assign')"
        >
          {{ bookable.title }}
        </v-chip>
      </template>
      <v-btn
        v-else
        x-small
        outlined
        color="warning"
        data-test="assign-bookable"
        @click="$emit('assign')"
      >
        <v-icon left x-small>mdi-link-variant</v-icon>
        {{ $t("accessPoint.management.row.assign") }}
      </v-btn>
    </div>
    <div class="access-point-row__actions">
      <!-- QR-Code and Bearbeiten keep their places: a row without a QR
           code leaves the gap. -->
      <v-btn
        v-if="hasQr"
        icon
        small
        :title="qrTitle"
        :aria-label="qrTitle"
        data-test="row-qr"
        @click="$emit('qr')"
      >
        <v-icon small>mdi-qrcode</v-icon>
      </v-btn>
      <span v-else class="access-point-row__gap" />
      <v-btn
        icon
        small
        :title="$t('accessPoint.management.edit')"
        :aria-label="$t('accessPoint.management.edit')"
        data-test="row-edit"
        @click="$emit('edit')"
      >
        <v-icon small>mdi-pencil-outline</v-icon>
      </v-btn>
      <v-menu offset-y left>
        <template #activator="{ on, attrs }">
          <v-btn
            icon
            small
            :title="$t('accessPoint.management.row.more')"
            :aria-label="$t('accessPoint.management.row.more')"
            data-test="row-menu"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon small>mdi-dots-horizontal</v-icon>
          </v-btn>
        </template>
        <v-list dense>
          <template v-for="(action, index) in moreActions">
            <v-divider
              v-if="action.danger && index > 0"
              :key="`divider-${action.key}`"
            />
            <v-list-item
              :key="action.key"
              link
              :data-test="`row-action-${action.key}`"
              @click="$emit(action.event, action.arg)"
            >
              <v-list-item-icon>
                <v-icon small :color="action.danger ? 'error' : undefined">
                  {{ action.icon }}
                </v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{ action.label }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<style scoped>
.access-point-row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) auto;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 16px;
}

.access-point-row + .access-point-row {
  border-top: 1px solid var(--scb-rule);
}

.access-point-row--fresh {
  background: var(--scb-selected-tint-faint);
  box-shadow: inset 3px 0 0 var(--v-primary-base);
}

.access-point-row__next {
  font-size: var(--scb-font-size-xs);
  color: var(--v-primary-base);
}

.access-point-row__label {
  font-weight: var(--scb-font-weight-medium);
}

.access-point-row__marker {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: var(--scb-radius-badge);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-medium);
  line-height: 16px;
  vertical-align: 1px;
  cursor: default;
}

.access-point-row__marker--neutral {
  border: 1px solid var(--scb-surface-border);
  color: var(--scb-text-muted);
}

.access-point-row__meta {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.access-point-row__actions {
  display: flex;
  align-items: center;
}

.access-point-row__gap {
  display: inline-block;
  width: 28px;
}

@media (max-width: 760px) {
  .access-point-row {
    grid-template-columns: 1fr auto;
  }

  .access-point-row__bookables {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>

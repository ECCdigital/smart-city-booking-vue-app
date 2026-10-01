<template>
  <div class="realm-check" data-test="check-rows">
    <div
      v-for="(row, index) in rows"
      :key="`${row.id}-${index}`"
      class="realm-check__row"
      :class="`realm-check__row--${row.status}`"
      data-test="check-row"
    >
      <div class="realm-check__head">
        <v-icon small :color="look(row.status).color">
          {{ look(row.status).icon }}
        </v-icon>
        <span class="realm-check__title" data-test="check-row-title">
          {{ title(row) }}
        </span>
        <span class="realm-check__status" data-test="check-row-status">
          {{ statusText(row.status) }}
        </span>
      </div>
      <p
        v-if="!hasParts(row)"
        class="realm-check__sentence"
        data-test="check-row-sentence"
      >
        {{ sentence(row.id, row) }}
      </p>
      <ul v-else class="realm-check__parts">
        <li
          v-for="(part, index) in row.parts"
          :key="index"
          class="realm-check__part"
          data-test="check-part"
        >
          <v-icon x-small :color="look(part.status).color">
            {{ look(part.status).icon }}
          </v-icon>
          <div class="realm-check__part-body">
            <span class="realm-check__part-head">
              <span
                class="realm-check__part-label"
                data-test="check-part-label"
                >{{ label(row.id, part) }}</span
              >
              <span class="realm-check__status" data-test="check-part-status">
                {{ statusText(part.status) }}
              </span>
            </span>
            <span
              class="realm-check__part-sentence"
              data-test="check-part-sentence"
            >
              {{ sentence(row.id, part) }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import {
  checkLook,
  hasParts,
  partLabel,
  reasonSentence,
  rowTitle,
  statusLabel,
} from "@/services/keycloak/realmCheck";

/**
 * The results of „Realm prüfen“ in one step of the checklist: per result its
 * title and state, and the reason in one sentence — per part (a Rücksprung-
 * adresse, an Adresse, a probe) when the result has parts.
 */
export default {
  name: "RealmCheckRows",
  props: {
    /** The rows of the answer that belong to the step. */
    rows: { type: Array, required: true },
  },
  methods: {
    look: checkLook,
    statusText(status) {
      return statusLabel(status);
    },
    label(rowId, part) {
      return partLabel(rowId, part);
    },
    title(row) {
      return rowTitle(row);
    },
    hasParts,
    sentence(rowId, item) {
      return reasonSentence(rowId, item);
    },
  },
};
</script>

<style scoped>
.realm-check {
  margin-bottom: var(--scb-space-4);
}

.realm-check__row {
  padding: var(--scb-space-2) var(--scb-space-3);
  border-left: 3px solid var(--scb-rule-strong);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface-tint);
  font-size: var(--scb-font-size-sm);
}

.realm-check__row + .realm-check__row {
  margin-top: var(--scb-space-2);
}

.realm-check__row--ok {
  border-left-color: var(--v-success-base);
}

.realm-check__row--fail {
  border-left-color: var(--v-error-base);
}

.realm-check__row--info {
  border-left-color: var(--v-info-base);
}

.realm-check__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
}

.realm-check__title {
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text);
}

.realm-check__status {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.realm-check__sentence {
  margin: var(--scb-space-1) 0 0;
  color: var(--scb-text);
}

.realm-check__parts {
  margin: var(--scb-space-1) 0 0;
  padding: 0;
  list-style: none;
}

.realm-check__part {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
  padding: 2px 0;
}

.realm-check__part > .v-icon {
  margin-top: 3px;
}

.realm-check__part-body {
  min-width: 0;
}

.realm-check__part-head {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--scb-space-2);
  margin-right: var(--scb-space-2);
}

.realm-check__part-label {
  overflow-wrap: anywhere;
  color: var(--scb-text);
}

.realm-check__part-sentence {
  color: var(--scb-text);
}
</style>

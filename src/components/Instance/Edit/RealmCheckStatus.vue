<template>
  <div>
    <div
      v-if="lock"
      class="realm-check-status__note"
      data-test="sso-check-lock"
    >
      <v-icon small>mdi-lock-outline</v-icon>
      <span>{{ lock }}</span>
    </div>
    <v-alert
      v-if="failure"
      type="error"
      text
      dense
      class="mt-3 mb-0"
      data-test="sso-check-error"
    >
      {{ failure }}
    </v-alert>
    <div
      v-if="result"
      class="realm-check-status__summary"
      data-test="sso-check-summary"
    >
      <v-chip
        v-for="{ status, count } in counts"
        :key="status"
        small
        label
        :color="color(status)"
        text-color="white"
        data-test="sso-check-count"
      >
        {{ countText(status, count) }}
      </v-chip>
      <span class="realm-check-status__time">
        {{ $t("instance.edit.sso.check.checkedAt", { time }) }}
      </span>
    </div>
  </div>
</template>

<script>
import {
  CHECK_LOOK,
  checkTime,
  resultSteps,
  statusCounts,
  statusLabel,
} from "@/services/keycloak/realmCheck";

/**
 * Below „Realm prüfen“ in the status card: why it is locked, why the last
 * check brought no result, and the number of results per state with the
 * time of the check.
 */
export default {
  name: "RealmCheckStatus",
  props: {
    /** Why „Realm prüfen“ is locked, or `null`. */
    lock: { type: String, default: null },
    /** Why the last check brought no result, or `null`. */
    failure: { type: String, default: null },
    /** The result of the check, `{ checkedAt, rows }`, or `null`. */
    result: { type: Object, default: null },
  },
  computed: {
    counts() {
      return statusCounts(resultSteps(this.result));
    },
    time() {
      return checkTime(this.result.checkedAt);
    },
  },
  methods: {
    color(status) {
      return CHECK_LOOK[status].color;
    },
    countText(status, count) {
      return this.$t("instance.edit.sso.check.count", {
        count,
        status: statusLabel(status),
      });
    },
  },
};
</script>

<style scoped>
.realm-check-status__note {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.realm-check-status__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
  margin-top: var(--scb-space-3);
}

.realm-check-status__time {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>

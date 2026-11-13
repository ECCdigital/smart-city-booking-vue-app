<script>
/**
 * PROTOTYPE (tickets#1087) — Ergebnis eines Verbindungstests. Salto KS zeigt
 * die Prüfschritte wie heute, die anderen eine Zeile.
 */
const ICON = {
  ok: ["mdi-check-circle", "success"],
  fail: ["mdi-close-circle", "error"],
  warn: ["mdi-alert-circle", "warning"],
  skip: ["mdi-circle-outline", "grey"],
};

export default {
  name: "TestResult",
  props: {
    result: { type: Object, default: null },
    running: Boolean,
    runningText: { type: String, default: "Prüfe die Verbindung …" },
  },
  methods: {
    icon(state) {
      return ICON[state][0];
    },
    color(state) {
      return ICON[state][1];
    },
  },
};
</script>

<template>
  <div v-if="running" class="tr tr--running">
    <v-progress-circular indeterminate size="16" width="2" class="mr-2" />
    {{ runningText }}
  </div>
  <div v-else-if="result" class="tr" :class="result.ok ? 'tr--ok' : 'tr--fail'">
    <div class="d-flex align-start">
      <v-icon small :color="result.ok ? 'success' : 'error'" class="mr-2 mt-0">
        {{ result.ok ? "mdi-check-circle" : "mdi-close-circle" }}
      </v-icon>
      <span>{{ result.message }}</span>
    </div>
    <ul v-if="result.checks" class="tr__checks">
      <li v-for="c in result.checks" :key="c.label">
        <v-icon x-small :color="color(c.state)" class="mr-1">
          {{ icon(c.state) }}
        </v-icon>
        <span :class="{ 'text--disabled': c.state === 'skip' }">{{
          c.label
        }}</span>
        <slot v-if="c.state === 'warn'" name="iq-action" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tr {
  font-size: var(--scb-font-size-sm);
  padding: 10px 12px;
  border-radius: var(--scb-radius-surface);
}

.tr--running {
  display: flex;
  align-items: center;
  color: var(--scb-text-muted);
}

.tr--ok {
  background: var(--scb-success-tint, rgba(76, 175, 80, 0.08));
}

.tr--fail {
  background: var(--scb-error-tint, rgba(244, 67, 54, 0.08));
}

.tr__checks {
  list-style: none;
  padding: 6px 0 0 22px;
  font-size: var(--scb-font-size-xs);
}

.tr__checks li {
  display: flex;
  align-items: center;
  min-height: 22px;
}
</style>

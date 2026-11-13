<script>
/**
 * PROTOTYPE (tickets#1093) — the head of an Anbieter's Abschnitt, as decided
 * in tickets#1084 and tickets#1087. Fixed here, the same in all variants: the
 * rows below it are the question.
 */
import { store, stub } from "../zugangspunkte-fuehrung/data";
import { isPaused } from "./rows";

export default {
  name: "SectionHead",
  props: {
    provider: { type: Object, required: true },
    count: { type: Number, default: 0 },
  },
  computed: {
    paused() {
      return isPaused(this.provider.id);
    },
    iq() {
      return store.systems[this.provider.id] || {};
    },
    iqOpen() {
      return this.iq.iqTotal > this.iq.iqActive;
    },
    createLabel() {
      return this.provider.fromProvider
        ? "Aus der Liste übernehmen"
        : "Zugangspunkt anlegen";
    },
  },
  methods: {
    stub,
  },
};
</script>

<template>
  <div>
    <header class="head" :class="{ 'head--paused': paused }">
      <v-icon class="mr-2" color="primary">{{ provider.icon }}</v-icon>
      <span class="head__name">{{ provider.name }}</span>
      <v-chip
        x-small
        :color="paused ? 'grey' : 'success'"
        text-color="white"
        class="ml-3"
      >
        {{ paused ? "Ausgeschaltet" : "Verbunden" }}
      </v-chip>
      <span class="head__count ml-3">
        {{ count }} {{ count === 1 ? "Zugangspunkt" : "Zugangspunkte" }}
      </span>
      <slot name="after-count" />
      <v-spacer />
      <v-btn
        small
        text
        @click="
          stub('Stub: klappt die Einstellungen des Anbieters auf (#1087).')
        "
      >
        <v-icon left small>mdi-cog-outline</v-icon>
        Einstellungen
      </v-btn>
      <v-btn
        small
        depressed
        color="primary"
        :disabled="paused"
        @click="stub('Stub: öffnet den Dialog zum Anlegen (#1085).')"
      >
        <v-icon left small>mdi-plus</v-icon>
        {{ createLabel }}
      </v-btn>
    </header>
    <div v-if="iqOpen" class="iq">
      <v-icon small color="warning" class="mr-2">mdi-alert-circle</v-icon>
      IQs: {{ iq.iqActive }} von {{ iq.iqTotal }} aktiviert
      <v-spacer />
      <v-btn
        x-small
        text
        color="warning darken-2"
        @click="stub('Stub: klappt die Liste der IQs auf (#1087).')"
      >
        IQs aktivieren
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
  padding: 10px 12px 10px 16px;
  background: var(--scb-surface-tint);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.head__name {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}

.iq {
  display: flex;
  align-items: center;
  padding: 4px 12px 4px 16px;
  font-size: var(--scb-font-size-sm);
  background: var(--scb-warning-tint);
  border-bottom: 1px solid var(--scb-rule);
}

.head__count {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>

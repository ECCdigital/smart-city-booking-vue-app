<script>
/**
 * PROTOTYPE (tickets#1087) — die IQs von Salto KS mit ihrem Stand. Der
 * Assistent von heute (Vorbereitung, PIN-Mail, PIN, Fertig) bleibt; hier ist
 * er auf „Aktivieren“ und „PIN eingeben“ verkürzt.
 */
import { conn, startIq, finishIq } from "./connections";
import { stub } from "../zugangspunkte-fuehrung/data";

const STATUS = {
  aktiviert: { text: "Aktiviert", color: "success" },
  offen: { text: "Nicht aktiviert", color: "warning" },
  pin: { text: "PIN-Mail verschickt", color: "info" },
};

export default {
  name: "IqList",
  props: { flat: Boolean },
  data() {
    return { pins: {} };
  },
  computed: {
    iqs() {
      return conn.iqs;
    },
  },
  methods: {
    status(iq) {
      return STATUS[iq.status];
    },
    start(iq) {
      startIq(iq.id);
      stub(
        `Stub: Assistent wie heute. Salto schickt die PIN für „${iq.name}“ an den System-User.`
      );
    },
    finish(iq) {
      finishIq(iq.id);
      this.$emit("activated", iq);
    },
  },
};
</script>

<template>
  <div class="iqs" :class="{ 'iqs--flat': flat }">
    <div v-if="!iqs.length" class="iqs__empty">
      Salto KS meldet keine IQs für diese Site.
    </div>
    <div v-for="iq in iqs" :key="iq.id" class="iq">
      <v-icon small class="mr-3" :color="status(iq).color"
        >mdi-router-wireless</v-icon
      >
      <div class="iq__name">
        {{ iq.name }}
        <div class="iq__doors">
          {{ iq.doors }} {{ iq.doors === 1 ? "Tür" : "Türen" }}
        </div>
      </div>
      <span class="iq__status" :class="`iq__status--${status(iq).color}`">
        {{ status(iq).text }}
      </span>
      <div class="iq__action">
        <v-btn
          v-if="iq.status === 'offen'"
          x-small
          outlined
          color="primary"
          @click="start(iq)"
        >
          Aktivieren
        </v-btn>
        <div v-else-if="iq.status === 'pin'" class="d-flex align-center">
          <v-text-field
            v-model="pins[iq.id]"
            placeholder="PIN aus der Mail"
            dense
            hide-details
            outlined
            class="iq__pin mr-2"
          />
          <v-btn x-small depressed color="primary" @click="finish(iq)">
            Abschließen
          </v-btn>
        </div>
        <v-btn v-else x-small text disabled>Verwerfen</v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.iqs {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.iqs--flat {
  border: 0;
  border-radius: 0;
}

.iqs__empty {
  padding: 12px 16px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.iq {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 16px;
  font-size: var(--scb-font-size-sm);
}

.iq + .iq {
  border-top: 1px solid var(--scb-rule);
}

.iq__name {
  flex: 1;
  min-width: 0;
}

.iq__doors {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.iq__status {
  width: 150px;
  font-size: var(--scb-font-size-xs);
}

.iq__status--success {
  color: var(--v-success-base);
}

.iq__status--warning {
  color: var(--v-warning-darken1, var(--v-warning-base));
}

.iq__status--info {
  color: var(--v-info-base);
}

.iq__action {
  width: 230px;
  display: flex;
  justify-content: flex-end;
}

.iq__pin {
  max-width: 130px;
}
</style>

<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): flips the stub inputs of the guide
       and the check. Not part of the design; hidden in production builds. -->
  <div v-if="enabled" class="scenario-panel">
    <button type="button" class="scenario-panel__toggle" @click="open = !open">
      Szenario {{ open ? "▾" : "▸" }}
    </button>
    <div v-if="open" class="scenario-panel__body">
      <label v-for="f in fields" :key="f.key" :class="{ off: f.off }">
        <span>{{ f.label }}</span>
        <select v-model="scenario[f.key]" :disabled="f.off" @change="onChange">
          <option v-for="o in f.options" :key="o[0]" :value="o[0]">
            {{ o[1] }}
          </option>
        </select>
      </label>
      <div class="scenario-panel__state">{{ stateLine }}</div>
    </div>
  </div>
</template>

<script>
import { scenario, resetCheck } from "./scenario";

export default {
  name: "ScenarioPanel",
  data() {
    return { scenario, open: true };
  },
  computed: {
    enabled() {
      return process.env.NODE_ENV !== "production";
    },
    fields() {
      return [
        { key: "mode", label: "Modus", options: [["bff", "BFF"], ["direct", "direct"]] },
        {
          key: "values",
          label: "Werte",
          options: [
            ["example", "Beispiel (eingerichtet)"],
            ["empty", "leer (SSO nicht eingerichtet)"],
            ["form", "aus dem Formular"],
          ],
        },
        {
          key: "roleMapping",
          label: "Rollenzuordnung",
          options: [["on", "an"], ["off", "aus"]],
          off: scenario.values === "form",
        },
        { key: "login", label: "Angemeldet", options: [["sso", "per SSO"], ["local", "lokal"]] },
        { key: "portalUrl", label: "Portal-URL", options: [["set", "gesetzt"], ["empty", "leer"]] },
        {
          key: "allowlist",
          label: "Allowlist BFF",
          options: [
            ["ok", "zwei Adressen"],
            ["empty", "leer"],
            ["unreachable", "Endpunkt antwortet nicht"],
            ["ownMissing", "eigene Adresse fehlt"],
          ],
          off: scenario.mode !== "bff",
        },
        {
          key: "result",
          label: "Ergebnis beim Prüfen",
          options: [
            ["good", "alles gut"],
            ["errors", "mit Fehlern"],
            ["discovery", "Realm nicht erreichbar"],
          ],
        },
        { key: "unsaved", label: "Ungespeichert", options: [["no", "nein"], ["yes", "ja"]] },
        { key: "justSaved", label: "Gerade gespeichert", options: [["no", "nein"], ["yes", "ja"]] },
      ];
    },
    stateLine() {
      return Object.entries(scenario)
        .map(([k, val]) => `${k}=${val}`)
        .join(" · ");
    },
  },
  methods: {
    onChange() {
      resetCheck();
    },
  },
};
</script>

<style scoped>
.scenario-panel {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 10000;
  width: 260px;
  background: #ff00aa;
  color: #fff;
  font: 11px/1.3 monospace;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  opacity: 0.95;
}
.scenario-panel__toggle {
  color: inherit;
  font: 600 11px monospace;
  padding: 6px 10px;
  width: 100%;
  text-align: left;
}
.scenario-panel__body {
  padding: 0 10px 8px;
}
.scenario-panel label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.scenario-panel label.off {
  opacity: 0.5;
}
.scenario-panel select {
  background: #fff;
  color: #000;
  font: 11px monospace;
  max-width: 140px;
  border-radius: 3px;
  padding: 1px 2px;
  appearance: auto;
}
.scenario-panel__state {
  margin-top: 6px;
  opacity: 0.85;
  word-break: break-all;
}
</style>

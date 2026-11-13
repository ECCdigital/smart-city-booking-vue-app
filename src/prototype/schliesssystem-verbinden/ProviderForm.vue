<script>
/**
 * PROTOTYPE (tickets#1087) — das Formular eines Schließsystems, gleich in
 * allen drei Varianten. Die Varianten unterscheiden sich darin, wo es steht
 * und wie Test, Speichern und Ausschalten laufen, nicht in seinen Feldern.
 *
 * Zuerst sichtbar: nur, was der Anbieter für die Verbindung braucht.
 * Eingeklappt: die Hilfe (Voraussetzungen, Token-Rechte) und „Weitere
 * Einstellungen“ mit Standard (Adresse, Umgebung, Kundenservice).
 * Gespeicherte Secrets kommen nie zurück ins Formular: Die Zeile sagt
 * „Gespeichert“, „Ändern“ öffnet ein leeres Feld.
 */
import { FORMS } from "./connections";

export default {
  name: "ProviderForm",
  props: {
    providerId: { type: String, required: true },
    form: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    mode: { type: String, default: "connect" }, // connect | edit
    dense: Boolean,
    hideHelp: Boolean,
  },
  data() {
    const spec = FORMS[this.providerId];
    return {
      helpOpen: this.mode === "connect" && !!spec.help?.openOnConnect,
      advancedOpen: false,
    };
  },
  computed: {
    spec() {
      return FORMS[this.providerId];
    },
    advancedSummary() {
      return this.spec.advanced
        .map((f) => {
          const v = this.form.values[f.key];
          if (f.type === "secret")
            return this.form.secretSaved[f.key] || v
              ? `${f.label}: gesetzt`
              : null;
          if (f.type === "select") {
            const item = f.items.find((i) => i.value === v);
            return `${f.label}: ${item ? item.text : "–"}`;
          }
          if (f.default !== undefined)
            return v && v !== f.default ? `${f.label}: ${v}` : null;
          return v ? `${f.label}: ${v}` : null;
        })
        .filter(Boolean)
        .join(", ");
    },
  },
  methods: {
    changeSecret(key) {
      this.form.editing[key] = true;
      this.$nextTick(() => {
        const el = this.$refs[`f-${key}`];
        const input = Array.isArray(el) ? el[0] : el;
        input?.focus();
      });
    },
    keepSecret(key) {
      this.form.values[key] = "";
      this.form.editing[key] = false;
    },
    fieldError(key) {
      return this.errors[key] ? [this.errors[key]] : [];
    },
  },
};
</script>

<template>
  <div class="pform" :class="{ 'pform--dense': dense }">
    <!-- Hilfe: was vorher im Anbieter einzurichten ist -->
    <div v-if="spec.help && !hideHelp" class="pform__help mb-4">
      <button
        type="button"
        class="pform__help-toggle"
        @click="helpOpen = !helpOpen"
      >
        <v-icon small color="primary" class="mr-1">
          {{ helpOpen ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        {{ spec.help.title }}
      </button>
      <div v-if="helpOpen" class="pform__help-body">
        <p class="mb-1">{{ spec.help.intro }}</p>
        <ul v-if="spec.help.items.length">
          <li v-for="item in spec.help.items" :key="item">{{ item }}</li>
        </ul>
        <p v-if="spec.help.note" class="mb-0 mt-1 text--secondary">
          {{ spec.help.note }}
        </p>
      </div>
    </div>

    <!-- Felder, die die Verbindung braucht -->
    <template v-for="f in spec.primary">
      <div
        v-if="
          f.type === 'secret' && form.secretSaved[f.key] && !form.editing[f.key]
        "
        :key="f.key"
        class="pform__secret"
        :class="{ 'pform__secret--error': errors[f.key] }"
      >
        <div class="flex-grow-1">
          <div class="pform__secret-label">{{ f.label }}</div>
          <div class="pform__secret-value">
            <v-icon x-small color="success" class="mr-1">mdi-lock-check</v-icon>
            Gespeichert
          </div>
          <div v-if="errors[f.key]" class="pform__secret-err">
            {{ errors[f.key] }}
          </div>
        </div>
        <v-btn small text color="primary" @click="changeSecret(f.key)">
          Ändern
        </v-btn>
      </div>
      <v-select
        v-else-if="f.type === 'select'"
        :key="f.key"
        v-model="form.values[f.key]"
        :items="f.items"
        :label="f.label"
        outlined
        dense
      />
      <v-text-field
        v-else
        :key="f.key"
        :ref="`f-${f.key}`"
        v-model="form.values[f.key]"
        :label="f.label"
        :type="f.type === 'secret' ? 'password' : 'text'"
        :placeholder="f.placeholder"
        :hint="f.hint"
        :persistent-hint="!!f.hint && mode === 'connect'"
        :error-messages="fieldError(f.key)"
        outlined
        dense
        class="mb-1"
      >
        <template
          v-if="f.type === 'secret' && form.secretSaved[f.key]"
          #append-outer
        >
          <v-btn x-small text class="mt-1" @click="keepSecret(f.key)">
            Gespeichertes behalten
          </v-btn>
        </template>
      </v-text-field>
    </template>

    <!-- Weitere Einstellungen, mit Standard -->
    <div v-if="spec.advanced.length" class="pform__more">
      <button
        type="button"
        class="pform__more-toggle"
        @click="advancedOpen = !advancedOpen"
      >
        <v-icon small class="mr-1">
          {{ advancedOpen ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        Weitere Einstellungen
        <span v-if="!advancedOpen" class="pform__more-sum">
          {{ advancedSummary || "alles auf Standard" }}
        </span>
      </button>
      <div v-if="advancedOpen" class="pt-3">
        <template v-for="f in spec.advanced">
          <v-select
            v-if="f.type === 'select'"
            :key="f.key"
            v-model="form.values[f.key]"
            :items="f.items"
            :label="f.label"
            outlined
            dense
          />
          <div
            v-else-if="
              f.type === 'secret' &&
              form.secretSaved[f.key] &&
              !form.editing[f.key]
            "
            :key="f.key"
            class="pform__secret"
          >
            <div class="flex-grow-1">
              <div class="pform__secret-label">{{ f.label }}</div>
              <div class="pform__secret-value">Gespeichert</div>
            </div>
            <v-btn small text color="primary" @click="changeSecret(f.key)">
              Ändern
            </v-btn>
          </div>
          <v-text-field
            v-else
            :key="f.key"
            :ref="`f-${f.key}`"
            v-model="form.values[f.key]"
            :label="f.label"
            :type="f.type === 'secret' ? 'password' : 'text'"
            :placeholder="f.default"
            :hint="f.hint || (f.default ? `Standard: ${f.default}` : '')"
            persistent-hint
            outlined
            dense
            class="mb-2"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pform__help {
  border-left: 3px solid var(--v-primary-base);
  padding: 6px 0 6px 12px;
  background: var(--scb-surface-tint);
  border-radius: 0 var(--scb-radius-surface) var(--scb-radius-surface) 0;
}

.pform__help-toggle,
.pform__more-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.pform__help-body {
  font-size: var(--scb-font-size-xs);
  padding: 6px 12px 4px 22px;
  max-width: 68ch;
}

.pform__help-body ul {
  padding-left: 16px;
}

.pform__secret {
  display: flex;
  align-items: center;
  border: 1px solid var(--scb-surface-border);
  border-radius: 4px;
  padding: 6px 8px 6px 12px;
  margin-bottom: 18px;
}

.pform__secret--error {
  border-color: var(--v-error-base);
}

.pform__secret-label {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.pform__secret-value {
  font-size: var(--scb-font-size-sm);
}

.pform__secret-err {
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}

.pform__more {
  border-top: 1px solid var(--scb-rule);
  padding-top: 10px;
  margin-top: 4px;
}

.pform__more-sum {
  margin-left: 10px;
  font-weight: normal;
  color: var(--scb-text-muted);
  font-size: var(--scb-font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

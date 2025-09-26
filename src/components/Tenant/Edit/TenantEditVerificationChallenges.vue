<template>
  <BaseSection
    title="Verifikationsprozesse"
    icon="mdi-check-decagram"
    hint="Definiere, wie neue Benutzer verifiziert werden, bevor sie eine Rolle
          erhalten. Eine Challenge kann als Standard für Einladungen markiert
          werden."
  >
    <v-row class="mb-3">
      <v-col class="col-12 col-md-8"> </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="addChallenge">
          <v-icon left>mdi-plus</v-icon>
          Challenge hinzufügen
        </v-btn>
      </v-col>
    </v-row>

    <v-expansion-panels flat multiple>
      <v-expansion-panel
        v-for="(c, idx) in localChallenges"
        :key="c.key + '-' + idx"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default="{ open }">
            <v-row no-gutters align="center" class="w-100">
              <v-col class="col-6 d-flex align-center">
                <v-chip
                  x-small
                  :color="c.enabled ? 'success' : 'grey'"
                  text-color="white"
                  label
                  class="mr-2"
                >
                  {{ c.enabled ? "Aktiv" : "Inaktiv" }}
                </v-chip>
                <strong class="mr-2">{{ c.label || keyLabel(c.key) }}</strong>
                <span class="text--secondary">({{ keyLabel(c.key) }})</span>
              </v-col>

              <v-col class="col-3 d-flex align-center">
                <v-icon left small color="primary">mdi-account-key</v-icon>
                <span class="text--secondary">
                  Rolle: {{ roleLabel(c.roleToAssign) }}
                </span>
                <v-chip
                  v-if="localDefaultKey === c.key"
                  small
                  class="ml-2"
                  color="primary"
                  text-color="white"
                  label
                >
                  Standard
                </v-chip>
              </v-col>

              <v-col class="col-3 d-flex justify-end">
                <v-btn icon :disabled="idx === 0" @click.stop="moveUp(idx)">
                  <v-icon>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  :disabled="idx === localChallenges.length - 1"
                  @click.stop="moveDown(idx)"
                >
                  <v-icon>mdi-arrow-down</v-icon>
                </v-btn>
                <v-btn icon @click.stop="editChallenge(idx)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon color="error" @click.stop="askRemove(idx)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>
        <v-expansion-panel-content class="pt-2">
          <v-row>
            <v-col class="col-12 col-md-8">
              <div class="text--secondary" v-if="c.description">
                {{ c.description }}
              </div>
              <div class="mt-2">
                <span class="text-caption">Konfiguration:</span>
                <pre class="pa-3 rounded grey lighten-4"
                  >{{ pretty(c.defaultConfig) }}
                </pre>
              </div>
            </v-col>
            <v-col class="col-12 col-md-4">
              <v-switch
                v-model="c.enabled"
                color="primary"
                label="Challenge aktivieren"
                class="mt-2"
                @change="emitAll()"
              />
              <v-radio-group
                v-model="localDefaultKey"
                @change="emitDefaultKey()"
              >
                <v-radio
                  :value="c.key"
                  label="Als Standard für Einladungen verwenden"
                />
              </v-radio-group>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <v-expansion-panel v-if="!localChallenges.length" disabled>
        <v-expansion-panel-header>
          Keine Challenges definiert. Klicke auf „Challenge hinzufügen“.
        </v-expansion-panel-header>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-dialog v-model="editDialog.open" max-width="720px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon left color="primary">mdi-shield-check</v-icon>
          {{ editDialog.isNew ? "Neue Challenge" : "Challenge bearbeiten" }}
          <v-spacer />
          <v-switch
            v-model="editModel.enabled"
            color="primary"
            hide-details
            inset
            label="Aktiv"
          />
        </v-card-title>
        <v-divider />

        <v-card-text>
          <v-form ref="editForm" v-model="editValid">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  :items="challengeTypes"
                  item-text="label"
                  item-value="key"
                  label="Typ"
                  :disabled="!editDialog.isNew"
                  :rules="[(v) => !!v || 'Pflichtfeld']"
                  v-model="editModel.key"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  :items="roles"
                  label="Rolle nach Verifikation"
                  :rules="[(v) => !!v || 'Pflichtfeld']"
                  v-model="editModel.roleToAssign"
                  clearable
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Label"
                  :rules="[(v) => !!v || 'Pflichtfeld']"
                  v-model="editModel.label"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Beschreibung (optional)"
                  v-model="editModel.description"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Spezifische Einstellungen</div>

            <div v-if="editModel.key === 'domainEmail'">
              <v-combobox
                v-model="editModel.defaultConfig.allowedDomains"
                label="Erlaubte Domains"
                multiple
                chips
                deletable-chips
                hide-selected
                small-chips
                :rules="[
                  (arr) => (arr && arr.length) || 'Mindestens eine Domain',
                  (arr) =>
                    arr.every(isValidDomain) || 'Ungültige Domain enthalten',
                ]"
                hint="Beispiele: firma.de, example.org"
                persistent-hint
              />
            </div>

            <div v-else-if="editModel.key === 'manualApproval'">
              <v-textarea
                v-model="editModel.defaultConfig.instructions"
                label="Anleitung für Anfragende"
                auto-grow
                rows="2"
                hint="Dieser Text wird dem Benutzer im Prozess angezeigt."
                persistent-hint
              />
            </div>

            <div v-else>
              <v-alert type="warning" outlined dense>
                Unbekannter Typ. Bitte wähle einen der unterstützten Typen.
              </v-alert>
            </div>
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeEdit">Abbrechen</v-btn>
          <v-btn color="primary" @click="saveEdit">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirm.open" max-width="420">
      <v-card>
        <v-card-title>Challenge löschen?</v-card-title>
        <v-card-text>
          Diese Aktion kann nicht rückgängig gemacht werden.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirm.open = false">Abbrechen</v-btn>
          <v-btn color="error" @click="doRemove">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseSection>
</template>

<script>
import debounce from "lodash/debounce";
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditVerificationChallenges",
  components: { BaseSection },
  props: {
    tenant: { type: Object, required: true },
    challenges: { type: Array, default: () => [] },
    roles: {
      type: Array,
      default: () => ["admin", "editor", "viewer"],
    },
    approverGroups: {
      type: Array,
      default: () => [],
    },
    defaultKey: { type: String, default: "" },
  },
  data() {
    return {
      localChallenges: [],
      localDefaultKey: "",
      editDialog: { open: false, isNew: true, idx: -1 },
      editModel: this.emptyChallenge(),
      editValid: false,
      confirm: { open: false, idx: -1 },
      challengeTypes: [
        { key: "domainEmail", label: "E-Mail-Domain prüfen" },
        { key: "manualApproval", label: "Manuelle Freigabe" },
      ],
    };
  },
  watch: {
    challenges: {
      deep: true,
      immediate: true,
      handler(v) {
        this.localChallenges = JSON.parse(JSON.stringify(v || []));
      },
    },
    defaultKey: {
      immediate: true,
      handler(v) {
        this.localDefaultKey = v || "";
      },
    },
  },
  created() {
    this._emitDebounced = debounce(() => {
      this.$emit(
        "update:challenges",
        JSON.parse(JSON.stringify(this.localChallenges))
      );
    }, 200);
  },
  methods: {
    emptyChallenge() {
      return {
        tenantId: this.tenant?.id || "",
        key: "",
        enabled: true,
        defaultConfig: {},
        label: "",
        description: "",
        roleToAssign: "",
      };
    },
    keyLabel(k) {
      const map = {
        domainEmail: "E-Mail-Domain prüfen",
        manualApproval: "Manuelle Freigabe",
      };
      return map[k] || k || "Unbekannt";
    },
    roleLabel(r) {
      return r || "—";
    },
    pretty(obj) {
      try {
        return JSON.stringify(obj || {}, null, 2);
      } catch (e) {
        return "{}";
      }
    },
    isValidDomain(d) {
      if (!d || typeof d !== "string") return false;
      return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d.trim());
    },

    addChallenge() {
      this.editDialog = { open: true, isNew: true, idx: -1 };
      this.editModel = this.emptyChallenge();
    },
    editChallenge(idx) {
      this.editDialog = { open: true, isNew: false, idx };
      const c = this.localChallenges[idx];
      this.editModel = JSON.parse(JSON.stringify(c));
      this.ensureDefaultConfigShape(this.editModel);
    },
    askRemove(idx) {
      this.confirm = { open: true, idx };
    },
    doRemove() {
      const idx = this.confirm.idx;
      if (idx > -1) {
        const removed = this.localChallenges.splice(idx, 1)[0];
        if (removed?.key === this.localDefaultKey) {
          this.localDefaultKey = "";
          this.emitDefaultKey();
        }
        this.emitAll();
      }
      this.confirm.open = false;
    },
    moveUp(idx) {
      if (idx <= 0) return;
      this.localChallenges.splice(
        idx - 1,
        0,
        this.localChallenges.splice(idx, 1)[0]
      );
      this.emitAll();
    },
    moveDown(idx) {
      if (idx >= this.localChallenges.length - 1) return;
      this.localChallenges.splice(
        idx + 1,
        0,
        this.localChallenges.splice(idx, 1)[0]
      );
      this.emitAll();
    },

    closeEdit() {
      this.editDialog.open = false;
    },
    saveEdit() {
      const ok = this.$refs.editForm ? this.$refs.editForm.validate() : true;
      if (!ok) return;

      if (this.editModel.key === "domainEmail") {
        const arr = this.editModel.defaultConfig.allowedDomains || [];
        if (!arr.length || !arr.every(this.isValidDomain)) return;
      }

      if (this.editDialog.isNew) {
        this.localChallenges.push(JSON.parse(JSON.stringify(this.editModel)));
      } else if (this.editDialog.idx > -1) {
        this.$set(
          this.localChallenges,
          this.editDialog.idx,
          JSON.parse(JSON.stringify(this.editModel))
        );
      }
      if (!this.localDefaultKey && this.editModel.enabled) {
        this.localDefaultKey = this.editModel.key;
        this.emitDefaultKey();
      }
      this.emitAll();
      this.closeEdit();
    },

    ensureDefaultConfigShape(model) {
      model.defaultConfig = model.defaultConfig || {};
      if (model.key === "domainEmail") {
        model.defaultConfig.allowedDomains =
          model.defaultConfig.allowedDomains || [];
      }
      if (model.key === "manualApproval") {
        model.defaultConfig.instructions =
          model.defaultConfig.instructions || "";
      }
    },

    emitAll() {
      this._emitDebounced();
    },
    emitDefaultKey() {
      this.$emit("update:defaultKey", this.localDefaultKey);
    },

    async validate() {
      return true;
    },
    resetValidation() {
    },
  },
};
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

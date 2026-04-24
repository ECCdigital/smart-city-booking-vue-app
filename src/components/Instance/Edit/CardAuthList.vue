<!-- src/components/Instance/Edit/CardAuthList.vue -->
<template>
  <div>
    <v-row class="mb-1">
      <v-col class="col-12 col-md-8">
        <p class="text--secondary body-2 mb-0">
          Konfigurieren Sie hier die Karten-Authentifizierung für
          Ehrenamtskarte, Vereinskarte o.&#8239;ä.
        </p>
      </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="addCardApp">
          <v-icon left>mdi-plus</v-icon>
          Karten Authenticator hinzufügen
        </v-btn>
      </v-col>
    </v-row>

    <v-expansion-panels multiple>
      <v-expansion-panel
        v-for="(app, idx) in localApps"
        :key="app.id + '-' + idx"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default>
            <v-row no-gutters align="center" class="w-100">
              <!-- Name + ID -->
              <v-col class="col-5 d-flex align-center">
                <v-chip
                  x-small
                  :color="app.enabled ? 'success' : 'grey'"
                  text-color="white"
                  label
                  class="mr-2"
                >
                  {{ app.enabled ? "Aktiv" : "Inaktiv" }}
                </v-chip>
                <strong class="mr-2 text-truncate">
                  {{ app.label || `Karten-Service #${idx + 1}` }}
                </strong>
                <span class="text--secondary text-caption">
                  ({{ app.id }})
                </span>
              </v-col>

              <!-- Tags -->
              <v-col class="col-4 d-flex align-center flex-wrap">
                <v-chip
                  v-if="app.cardType"
                  x-small
                  color="indigo"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  {{ app.cardType }}
                </v-chip>
                <v-chip
                  v-if="app.serviceUrl"
                  x-small
                  outlined
                  label
                  class="mr-1 mb-1"
                >
                  {{ shortenUrl(app.serviceUrl) }}
                </v-chip>
                <span
                  v-if="!app.cardType && !app.serviceUrl"
                  class="text--disabled text-caption"
                >
                  –
                </span>
              </v-col>

              <!-- Actions -->
              <v-col class="col-3 d-flex justify-end align-center">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="openEdit(idx)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                  <span>Bearbeiten</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      color="error"
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="askRemove(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Löschen</span>
                </v-tooltip>
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>

        <v-expansion-panel-content class="pt-2">
          <v-row>
            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text--secondary">
                  Beschreibung:
                </span>
                {{ app.description || "–" }}
              </div>
              <div class="mb-2">
                <span class="text-caption text--secondary">Service-URL:</span>
                {{ app.serviceUrl || "–" }}
              </div>
              <div class="mb-2">
                <span class="text-caption text--secondary">API-Token:</span>
                {{ app.apiToken ? "••••••••" : "–" }}
              </div>
              <div class="mb-2">
                <span class="text-caption text--secondary">Kartentyp:</span>
                {{ app.cardType || "–" }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text--secondary">
                  Public-ID Feld:
                </span>
                <v-chip
                  v-if="app.publicIdField && app.publicIdField.label"
                  x-small
                  outlined
                  label
                  class="ml-1"
                >
                  {{ app.publicIdField.label }}
                </v-chip>
                <span v-else class="text--disabled">–</span>
              </div>
              <div>
                <span class="text-caption text--secondary">Secret Feld:</span>
                <v-chip
                  v-if="app.secretField && app.secretField.label"
                  x-small
                  outlined
                  label
                  class="ml-1"
                >
                  {{ app.secretField.label }}
                </v-chip>
                <span v-else class="text--disabled">–</span>
              </div>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <!-- Empty state -->
      <v-expansion-panel v-if="!localApps.length" disabled>
        <v-expansion-panel-header>
          Keine Karten-Services konfiguriert. Klicke auf „Karten-Service
          hinzufügen".
        </v-expansion-panel-header>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- ═══ Edit Dialog ═══ -->
    <v-dialog v-model="editDialog.open" max-width="820" persistent>
      <v-card>
        <v-card-title class="subtitle-1">
          <v-icon left color="primary">mdi-card-account-details</v-icon>
          {{
            editDialog.index >= 0
              ? "Karten-Service bearbeiten"
              : "Neuen Karten-Service anlegen"
          }}
        </v-card-title>

        <v-card-text v-if="editDialog.app">
          <v-form ref="editForm">
            <!-- Aktivierung & Grunddaten -->
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="editDialog.app.enabled"
                  color="primary"
                  hide-details
                  label="Service aktivieren"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.id"
                  background-color="accent"
                  filled
                  dense
                  label="Technische ID"
                  hint="Eindeutiger Bezeichner (z.B. 'ehrenamtskarte')"
                  persistent-hint
                  :rules="[rules.required, rules.slug]"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.label"
                  background-color="accent"
                  filled
                  dense
                  label="Anzeigename"
                  hint="Wird dem Nutzer im Login-Formular angezeigt"
                  persistent-hint
                  :rules="[rules.required]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.description"
                  background-color="accent"
                  filled
                  dense
                  label="Beschreibung"
                  hint="Optionaler Hilfetext unter dem Login-Button"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 font-weight-medium mb-2">
              <v-icon small left>mdi-server-network</v-icon>
              Karten Authenticator
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.serviceUrl"
                  background-color="accent"
                  filled
                  dense
                  label="Service-URL"
                  hint="Basis-URL des Karten Authenticators"
                  persistent-hint
                  placeholder="https://cards-api.example.com"
                  :rules="[rules.required, rules.url]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.apiToken"
                  background-color="accent"
                  filled
                  dense
                  :type="showApiToken ? 'text' : 'password'"
                  :append-icon="showApiToken ? 'mdi-eye' : 'mdi-eye-off'"
                  label="API-Token"
                  hint="Bearer-Token zur Authentifizierung"
                  persistent-hint
                  @click:append="showApiToken = !showApiToken"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editDialog.app.cardType"
                  background-color="accent"
                  filled
                  dense
                  label="Kartentyp"
                  hint="Wird als 'cardType' gesendet (optional)"
                  persistent-hint
                  placeholder="z.B. ehrenamtskarte"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div class="text-subtitle-2 font-weight-medium mb-2">
              <v-icon small left>mdi-form-textbox</v-icon>
              Felddefinitionen für das Login-Formular
            </div>

            <v-card flat color="grey lighten-4" class="pa-3 mb-3">
              <div class="text-caption font-weight-medium mb-2">
                Feld: Public-ID (Kartennummer / Mitgliedsnummer / …)
              </div>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.publicIdField.label"
                    background-color="accent"
                    filled
                    dense
                    label="Label"
                    placeholder="z.B. Kartennummer"
                    :rules="[rules.required]"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.publicIdField.placeholder"
                    background-color="accent"
                    filled
                    dense
                    label="Platzhalter"
                    placeholder="z.B. EA-2024-00001"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.publicIdField.helpText"
                    background-color="accent"
                    filled
                    dense
                    label="Hilfetext"
                    placeholder="z.B. Nummer auf der Kartenvorderseite"
                  />
                </v-col>
              </v-row>
            </v-card>

            <v-card flat color="grey lighten-4" class="pa-3">
              <div class="text-caption font-weight-medium mb-2">
                Feld: Secret (Gültigkeitscode / PIN / …)
              </div>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.secretField.label"
                    background-color="accent"
                    filled
                    dense
                    label="Label"
                    placeholder="z.B. Gültigkeitscode"
                    :rules="[rules.required]"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.secretField.placeholder"
                    background-color="accent"
                    filled
                    dense
                    label="Platzhalter"
                    placeholder="z.B. 2026-12-31"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editDialog.app.secretField.helpText"
                    background-color="accent"
                    filled
                    dense
                    label="Hilfetext"
                    placeholder="z.B. Datum auf der Kartenrückseite"
                  />
                </v-col>
              </v-row>
            </v-card>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelEdit">Abbrechen</v-btn>
          <v-btn color="primary" text @click="saveEdit">Übernehmen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ Delete Confirmation ═══ -->
    <v-dialog v-model="confirmDelete.open" max-width="420">
      <v-card>
        <v-card-title class="subtitle-1">Service entfernen?</v-card-title>
        <v-card-text>
          Der Karten-Service
          <strong>{{ deletingLabel }}</strong>
          wird aus der Konfiguration entfernt. Diese Aktion wird erst beim
          Speichern übernommen.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDelete.open = false">Abbrechen</v-btn>
          <v-btn color="error" text @click="doRemove">Entfernen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
let cardIdCounter = 0;

export default {
  name: "CardAuthList",
  props: {
    /** Full applications array from the instance */
    applications: { type: Array, default: () => [] },
  },
  data() {
    return {
      showApiToken: false,
      editDialog: {
        open: false,
        index: -1,
        app: null,
      },
      confirmDelete: { open: false, idx: -1 },
      rules: {
        required: (v) => !!v || "Pflichtfeld",
        slug: (v) =>
          /^[a-z0-9-]+$/.test(v) ||
          "Nur Kleinbuchstaben, Zahlen und Bindestriche",
        url: (v) =>
          !v ||
          /^https?:\/\/.+/.test(v) ||
          "Muss mit http:// oder https:// beginnen",
      },
    };
  },
  computed: {
    localApps() {
      return (this.applications || []).filter((a) => a.type === "card-auth");
    },
    deletingLabel() {
      const idx = this.confirmDelete.idx;
      return idx >= 0 && this.localApps[idx]
        ? this.localApps[idx].label || this.localApps[idx].id
        : "";
    },
  },
  methods: {
    // ── Helpers ──
    shortenUrl(url) {
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    },

    createEmptyApp() {
      const id = `card-auth-${Date.now()}-${++cardIdCounter}`;
      return {
        id,
        type: "card-auth",
        label: "",
        description: "",
        enabled: false,
        serviceUrl: "",
        apiToken: "",
        cardType: "",
        publicIdField: { label: "", placeholder: "", helpText: "" },
        secretField: { label: "", placeholder: "", helpText: "" },
      };
    },

    cloneApp(src) {
      return {
        ...src,
        publicIdField: { ...(src.publicIdField || {}) },
        secretField: { ...(src.secretField || {}) },
      };
    },

    // ── CRUD ──
    addCardApp() {
      this.editDialog = {
        open: true,
        index: -1,
        app: this.createEmptyApp(),
      };
      this.showApiToken = false;
    },

    openEdit(idx) {
      this.editDialog = {
        open: true,
        index: idx,
        app: this.cloneApp(this.localApps[idx]),
      };
      this.showApiToken = false;
    },

    cancelEdit() {
      this.editDialog.open = false;
    },

    saveEdit() {
      if (this.$refs.editForm && !this.$refs.editForm.validate()) return;

      const allApps = [...(this.applications || [])];
      const saved = { ...this.editDialog.app };

      if (this.editDialog.index >= 0) {
        // Update: find the real index in the full array
        let cardCount = -1;
        for (let i = 0; i < allApps.length; i++) {
          if (allApps[i].type === "card-auth") {
            cardCount++;
            if (cardCount === this.editDialog.index) {
              allApps.splice(i, 1, saved);
              break;
            }
          }
        }
      } else {
        allApps.push(saved);
      }

      this.editDialog.open = false;
      this.$emit("update:applications", allApps);
    },

    askRemove(idx) {
      this.confirmDelete = { open: true, idx };
    },

    doRemove() {
      const allApps = [...(this.applications || [])];
      let cardCount = -1;
      for (let i = 0; i < allApps.length; i++) {
        if (allApps[i].type === "card-auth") {
          cardCount++;
          if (cardCount === this.confirmDelete.idx) {
            allApps.splice(i, 1);
            break;
          }
        }
      }
      this.confirmDelete.open = false;
      this.$emit("update:applications", allApps);
    },
  },
};
</script>

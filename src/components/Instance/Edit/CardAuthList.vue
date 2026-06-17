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
    <v-dialog v-model="editDialog.open" max-width="900px" persistent scrollable>
      <v-card v-if="editDialog.app">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-avatar
            :color="editDialog.app.enabled ? 'success' : 'blue-grey'"
            size="48"
            class="white--text font-weight-bold mr-4"
          >
            <v-icon dark>mdi-card-account-details</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="text-h5 font-weight-medium">
              {{
                editDialog.index >= 0
                  ? editDialog.app.label || "Karten-Service bearbeiten"
                  : "Neuen Karten-Service anlegen"
              }}
            </div>
            <div class="text-caption grey--text">
              <span v-if="editDialog.app.id">ID: {{ editDialog.app.id }}</span>
              <span v-else>Neue Konfiguration</span>
              <span v-if="editDialog.app.cardType" class="mx-2">•</span>
              <span v-if="editDialog.app.cardType">
                Typ: {{ editDialog.app.cardType }}
              </span>
            </div>
          </div>
          <v-chip
            v-if="editDialog.app.enabled"
            color="green"
            text-color="white"
            class="mr-2"
          >
            <v-icon left small>mdi-check-circle</v-icon>
            Aktiv
          </v-chip>
          <v-chip v-else color="grey" text-color="white" class="mr-2">
            <v-icon left small>mdi-pause-circle</v-icon>
            Inaktiv
          </v-chip>
          <v-btn icon @click="cancelEdit">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-tabs v-model="editActiveTab" grow>
          <v-tab>
            <v-icon left>mdi-information-outline</v-icon>
            Allgemein
          </v-tab>
          <v-tab>
            <v-icon left>mdi-server-network</v-icon>
            Service
          </v-tab>
          <v-tab>
            <v-icon left>mdi-form-textbox</v-icon>
            Felder
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text class="pa-6" style="max-height: 500px; overflow-y: auto">
          <v-form ref="editForm">
            <v-tabs-items v-model="editActiveTab">
              <v-tab-item>
                <div class="mb-4">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">
                      mdi-card-account-details-outline
                    </v-icon>
                    <span class="text-h6 font-weight-medium">
                      Grundeinstellungen
                    </span>
                  </div>
                  <p class="text-body-2 grey--text mb-0">
                    Identifikation und Anzeige des Karten-Services
                  </p>
                </div>

                <v-card outlined class="mb-4">
                  <v-card-text class="pa-5">
                    <div class="d-flex flex-column flex-sm-row align-center">
                      <div class="flex-grow-1 mb-3 mb-sm-0">
                        <div class="text-body-1 font-weight-medium mb-1">
                          <v-icon
                            :color="editDialog.app.enabled ? 'success' : 'grey'"
                            class="mr-1"
                          >
                            {{
                              editDialog.app.enabled
                                ? "mdi-toggle-switch"
                                : "mdi-toggle-switch-off-outline"
                            }}
                          </v-icon>
                          Service-Status
                        </div>
                        <div class="text-body-2 grey--text">
                          {{
                            editDialog.app.enabled
                              ? "Der Karten-Service ist aktiv und für Benutzer verfügbar"
                              : "Der Karten-Service ist deaktiviert"
                          }}
                        </div>
                      </div>
                      <v-switch
                        v-model="editDialog.app.enabled"
                        color="success"
                        hide-details
                        label="Aktiviert"
                        class="mt-0 pt-0"
                      />
                    </div>
                  </v-card-text>
                </v-card>

                <!-- Identifikation -->
                <v-card outlined class="mb-4">
                  <v-card-text class="pa-4">
                    <v-row>
                      <v-col cols="12" sm="6">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-identifier</v-icon>
                          Technische ID
                        </div>
                        <v-text-field
                          :value="editDialog.app.id"
                          background-color="grey lighten-4"
                          filled
                          dense
                          readonly
                          disabled
                          hide-details="auto"
                          persistent-hint
                          hint="Automatisch generierte UUID"
                        />
                      </v-col>
                      <v-col cols="12" sm="6">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-tag</v-icon>
                          Kartentyp
                        </div>
                        <v-text-field
                          v-model="editDialog.app.cardType"
                          background-color="accent"
                          filled
                          dense
                          hide-details="auto"
                          placeholder="z.B. ehrenamtskarte"
                          persistent-hint
                          hint="Wird als 'cardType' an den Service gesendet (optional)"
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <!-- Anzeige -->
                <v-card outlined>
                  <v-card-text class="pa-4">
                    <v-row>
                      <v-col cols="12" sm="6">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-format-title</v-icon>
                          Anzeigename
                        </div>
                        <v-text-field
                          v-model="editDialog.app.label"
                          background-color="accent"
                          filled
                          dense
                          hide-details="auto"
                          placeholder="z.B. Ehrenamtskarte"
                          persistent-hint
                          hint="Wird dem Nutzer im Login-Formular angezeigt"
                          :rules="[rules.required]"
                        />
                      </v-col>
                      <v-col cols="12" sm="6">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-text</v-icon>
                          Beschreibung
                        </div>
                        <v-text-field
                          v-model="editDialog.app.description"
                          background-color="accent"
                          filled
                          dense
                          hide-details="auto"
                          placeholder="Optionaler Hilfetext"
                          persistent-hint
                          hint="Wird unter dem Login-Button angezeigt"
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-tab-item>

              <!-- Tab 2: Service -->
              <v-tab-item>
                <div class="mb-4">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">
                      mdi-server-network
                    </v-icon>
                    <span class="text-h6 font-weight-medium">
                      Karten Authenticator
                    </span>
                  </div>
                  <p class="text-body-2 grey--text mb-0">
                    Verbindungsdaten zum externen Authentifizierungs-Service
                  </p>
                </div>

                <v-card outlined>
                  <v-card-text class="pa-4">
                    <v-row>
                      <v-col cols="12">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-link-variant</v-icon>
                          Service-URL
                        </div>
                        <v-text-field
                          v-model="editDialog.app.serviceUrl"
                          background-color="accent"
                          filled
                          dense
                          hide-details="auto"
                          placeholder="https://cards-api.example.com"
                          persistent-hint
                          hint="Basis-URL des Karten Authenticators"
                          :rules="[rules.required, rules.url]"
                        />
                      </v-col>
                    </v-row>

                    <v-row class="mt-3">
                      <v-col cols="12">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-key-variant</v-icon>
                          API-Token
                        </div>
                        <v-text-field
                          v-model="editDialog.app.apiToken"
                          background-color="accent"
                          filled
                          dense
                          hide-details="auto"
                          :type="showApiToken ? 'text' : 'password'"
                          :append-icon="
                            showApiToken ? 'mdi-eye' : 'mdi-eye-off'
                          "
                          placeholder="Bearer-Token"
                          persistent-hint
                          hint="Token zur Authentifizierung beim Service"
                          @click:append="showApiToken = !showApiToken"
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-tab-item>

              <!-- Tab 3: Felder -->
              <v-tab-item>
                <div class="mb-4">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2"
                      >mdi-form-textbox</v-icon
                    >
                    <span class="text-h6 font-weight-medium">
                      Felddefinitionen
                    </span>
                  </div>
                  <p class="text-body-2 grey--text mb-0">
                    Konfiguration der Eingabefelder im Login-Formular
                  </p>
                </div>

                <!-- Public-ID Field -->
                <v-card outlined class="mb-4">
                  <v-card-title class="d-flex align-center py-3 px-4">
                    <v-avatar color="primary" size="36" class="mr-3">
                      <v-icon dark small>mdi-card-text-outline</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium">
                        Public-ID
                      </div>
                      <div class="text-caption grey--text">
                        Kartennummer, Mitgliedsnummer o.&#8239;ä.
                      </div>
                    </div>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4">
                    <v-row>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-label</v-icon>
                          Label
                        </div>
                        <v-text-field
                          v-model="editDialog.app.publicIdField.label"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. Kartennummer"
                          :rules="[rules.required]"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-form-textbox</v-icon>
                          Platzhalter
                        </div>
                        <v-text-field
                          v-model="editDialog.app.publicIdField.placeholder"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. EA-2024-00001"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1"
                            >mdi-help-circle-outline</v-icon
                          >
                          Hilfetext
                        </div>
                        <v-text-field
                          v-model="editDialog.app.publicIdField.helpText"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. Nummer auf der Vorderseite"
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <!-- Secret Field -->
                <v-card outlined>
                  <v-card-title class="d-flex align-center py-3 px-4">
                    <v-avatar color="amber" size="36" class="mr-3">
                      <v-icon color="black" small>mdi-lock-outline</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium">
                        Secret
                      </div>
                      <div class="text-caption grey--text">
                        Gültigkeitscode, PIN o.&#8239;ä.
                      </div>
                    </div>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4">
                    <v-row>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-label</v-icon>
                          Label
                        </div>
                        <v-text-field
                          v-model="editDialog.app.secretField.label"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. Gültigkeitscode"
                          :rules="[rules.required]"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1">mdi-form-textbox</v-icon>
                          Platzhalter
                        </div>
                        <v-text-field
                          v-model="editDialog.app.secretField.placeholder"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. 2026-12-31"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <div class="text-subtitle-2 mb-2 grey--text">
                          <v-icon small class="mr-1"
                            >mdi-help-circle-outline</v-icon
                          >
                          Hilfetext
                        </div>
                        <v-text-field
                          v-model="editDialog.app.secretField.helpText"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          placeholder="z.B. Datum auf der Rückseite"
                        />
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-tab-item>
            </v-tabs-items>
          </v-form>
        </v-card-text>

        <v-divider />

        <!-- Actions -->
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="cancelEdit">
            <v-icon left small>mdi-close</v-icon>
            Abbrechen
          </v-btn>
          <v-btn color="primary" @click="saveEdit">
            <v-icon left small>mdi-content-save</v-icon>
            Übernehmen
          </v-btn>
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
      editActiveTab: 0,
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
    shortenUrl(url) {
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    },

    generateUUID() {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    createEmptyApp() {
      return {
        id: this.generateUUID(),
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
      this.editActiveTab = 0;
      this.editDialog = {
        open: true,
        index: -1,
        app: this.createEmptyApp(),
      };
      this.showApiToken = false;
    },

    openEdit(idx) {
      this.editActiveTab = 0;
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

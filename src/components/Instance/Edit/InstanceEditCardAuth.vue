<template>
  <v-card outlined class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-2">
      <v-icon left color="primary">mdi-card-account-details</v-icon>
      <span class="text-subtitle-1 font-weight-medium">
        {{ local.label || `Karten-Service #${index + 1}` }}
      </span>
      <v-spacer />
      <v-chip x-small label :color="local.enabled ? 'success' : 'grey'" dark>
        {{ local.enabled ? "Aktiv" : "Inaktiv" }}
      </v-chip>
      <v-btn icon small class="ml-2" @click="confirmRemove">
        <v-icon color="error" small>mdi-delete</v-icon>
      </v-btn>
    </div>

    <v-divider class="mb-4" />

    <!-- Aktivierung & Grunddaten -->
    <v-row>
      <v-col cols="12" md="6">
        <v-switch
          v-model="local.enabled"
          color="primary"
          hide-details
          label="Service aktivieren"
          @change="emitUpdate"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.id"
          background-color="accent"
          filled
          dense
          label="Technische ID"
          hint="Eindeutiger Bezeichner (z.B. 'ehrenamtskarte')"
          persistent-hint
          :rules="[rules.required, rules.slug]"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.label"
          background-color="accent"
          filled
          dense
          label="Anzeigename"
          hint="Wird dem Nutzer im Login-Formular angezeigt"
          persistent-hint
          :rules="[rules.required]"
          @input="emitUpdate"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.description"
          background-color="accent"
          filled
          dense
          label="Beschreibung"
          hint="Optionaler Hilfetext unter dem Login-Button"
          persistent-hint
          @input="emitUpdate"
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
          v-model="local.serviceUrl"
          background-color="accent"
          filled
          dense
          label="Service-URL"
          hint="Basis-URL des Karten Authenticators"
          persistent-hint
          placeholder="https://cards-api.example.com"
          :rules="[rules.required, rules.url]"
          @input="emitUpdate"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.apiToken"
          background-color="accent"
          filled
          dense
          :type="showApiToken ? 'text' : 'password'"
          :append-icon="showApiToken ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showApiToken = !showApiToken"
          label="API-Token"
          hint="Bearer-Token zur Authentifizierung am Karten Authenticator"
          persistent-hint
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="local.cardType"
          background-color="accent"
          filled
          dense
          label="Kartentyp"
          hint="Wird als 'cardType' an den Karten Authenticator gesendet (optional)"
          persistent-hint
          placeholder="z.B. ehrenamtskarte"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <!-- Felddefinitionen -->
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
            v-model="local.publicIdField.label"
            background-color="accent"
            filled
            dense
            label="Label"
            placeholder="z.B. Kartennummer"
            :rules="[rules.required]"
            @input="emitUpdate"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="local.publicIdField.placeholder"
            background-color="accent"
            filled
            dense
            label="Platzhalter"
            placeholder="z.B. EA-2024-00001"
            @input="emitUpdate"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="local.publicIdField.helpText"
            background-color="accent"
            filled
            dense
            label="Hilfetext"
            placeholder="z.B. Nummer auf der Kartenvorderseite"
            @input="emitUpdate"
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
            v-model="local.secretField.label"
            background-color="accent"
            filled
            dense
            label="Label"
            placeholder="z.B. Gültigkeitscode"
            :rules="[rules.required]"
            @input="emitUpdate"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="local.secretField.placeholder"
            background-color="accent"
            filled
            dense
            label="Platzhalter"
            placeholder="z.B. 2026-12-31"
            @input="emitUpdate"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="local.secretField.helpText"
            background-color="accent"
            filled
            dense
            label="Hilfetext"
            placeholder="z.B. Datum auf der Kartenrückseite"
            @input="emitUpdate"
          />
        </v-col>
      </v-row>
    </v-card>

    <v-dialog v-model="showDeleteDialog" max-width="420">
      <v-card>
        <v-card-title>Service entfernen?</v-card-title>
        <v-card-text>
          Der Karten-Service
          <strong>{{ local.label || local.id }}</strong> wird aus der
          Konfiguration entfernt. Diese Aktion wird erst beim Speichern
          übernommen.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteDialog = false">Abbrechen</v-btn>
          <v-btn color="error" text @click="doRemove">Entfernen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
export default {
  name: "InstanceEditCardAuth",
  props: {
    app: { type: Object, required: true },
    index: { type: Number, required: true },
    total: { type: Number, default: 1 },
  },
  data() {
    return {
      local: this.cloneApp(this.app),
      showApiToken: false,
      showDeleteDialog: false,
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
  watch: {
    app: {
      handler(n) {
        this.local = this.cloneApp(n);
      },
      deep: true,
    },
  },
  methods: {
    cloneApp(src) {
      return {
        ...src,
        publicIdField: { ...(src.publicIdField || {}) },
        secretField: { ...(src.secretField || {}) },
      };
    },
    emitUpdate() {
      this.$emit("update", { ...this.local });
    },
    confirmRemove() {
      this.showDeleteDialog = true;
    },
    doRemove() {
      this.showDeleteDialog = false;
      this.$emit("remove");
    },
  },
};
</script>

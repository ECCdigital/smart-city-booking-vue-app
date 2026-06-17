<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text class="pa-8">
        <v-img :src="appLogo" max-width="200" class="mx-auto mb-6" />

        <v-icon :color="iconColor" size="72" class="mb-4">
          {{ iconName }}
        </v-icon>

        <h2 class="mb-3">{{ title }}</h2>

        <p class="subtitle-2 mb-2">
          {{ message }}
        </p>

        <p v-if="hint" class="body-2 text--secondary mb-6">
          {{ hint }}
        </p>

        <v-alert
          v-if="showRawReason"
          type="info"
          text
          dense
          class="text-left mt-4 mb-4"
        >
          <div class="caption"><strong>Fehler-Code:</strong> {{ reason }}</div>
        </v-alert>

        <div class="d-flex justify-center flex-wrap" style="gap: 8px">
          <v-btn outlined :to="{ name: 'login' }">
            <v-icon left>mdi-arrow-left</v-icon>
            Zurück zur Anmeldung
          </v-btn>

          <v-btn v-if="canRetry" color="primary" elevation="0" @click="retry">
            <v-icon left>mdi-refresh</v-icon>
            Erneut versuchen
          </v-btn>
        </div>
      </v-card-text>

      <v-card-text class="text-center">
        <ContactInformation class="px-6" />
      </v-card-text>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <router-link to="/datenschutz">Datenschutz</router-link>
        |
        <router-link to="/nutzungsbedingungen">
          Nutzungsbedingungen
        </router-link>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import ContactInformation from "@/components/ContactInformation.vue";

/**
 * Reason → UI mapping.
 * Keep keys in sync with reasons your backend throws in confirmCardLink().
 */
const REASON_MAP = {
  "Invalid or expired link": {
    title: "Link ungültig",
    message: "Der Link ist ungültig oder wurde bereits verwendet.",
    hint: "Bitte starten Sie den Verknüpfungsvorgang erneut, indem Sie sich mit Ihrer Karte anmelden.",
    icon: "mdi-link-variant-off",
    color: "error",
    canRetry: true,
  },
  "This link has already been used": {
    title: "Link bereits verwendet",
    message: "Dieser Bestätigungslink wurde bereits eingelöst.",
    hint: "Falls Ihre Karte trotzdem nicht funktioniert, kontaktieren Sie bitte den Support.",
    icon: "mdi-link-lock",
    color: "warning",
    canRetry: false,
  },
  "Link expired": {
    title: "Link abgelaufen",
    message: "Der Bestätigungslink ist abgelaufen (24 Stunden gültig).",
    hint: "Bitte starten Sie den Verknüpfungsvorgang erneut.",
    icon: "mdi-clock-alert-outline",
    color: "warning",
    canRetry: true,
  },
  "Link does not match user": {
    title: "Link stimmt nicht überein",
    message: "Der Link passt nicht zur angegebenen Email-Adresse.",
    hint: "Bitte öffnen Sie den Link direkt aus der Email, die wir Ihnen gesendet haben.",
    icon: "mdi-alert-circle-outline",
    color: "error",
    canRetry: false,
  },
  "Invalid link type": {
    title: "Ungültiger Link",
    message: "Dieser Link kann nicht zur Karten-Verknüpfung verwendet werden.",
    hint: null,
    icon: "mdi-alert-circle-outline",
    color: "error",
    canRetry: false,
  },
  "This card is already linked to another account": {
    title: "Karte bereits verknüpft",
    message:
      "Diese Karte ist zwischenzeitlich einem anderen Account zugeordnet worden.",
    hint: "Falls Sie der rechtmäßige Besitzer dieser Karte sind, kontaktieren Sie bitte den Support.",
    icon: "mdi-card-account-details-outline",
    color: "error",
    canRetry: false,
  },
};

const DEFAULT_MAPPING = {
  title: "Verknüpfung fehlgeschlagen",
  message: "Die Karte konnte nicht mit Ihrem Account verknüpft werden.",
  hint: "Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.",
  icon: "mdi-close-circle",
  color: "error",
  canRetry: true,
};

export default {
  name: "CardLinkFailed",
  components: { ContactInformation },

  computed: {
    reason() {
      return this.$route.query.reason || "";
    },
    mapping() {
      return REASON_MAP[this.reason] || DEFAULT_MAPPING;
    },
    title() {
      return this.mapping.title;
    },
    message() {
      return this.mapping.message;
    },
    hint() {
      return this.mapping.hint;
    },
    iconName() {
      return this.mapping.icon;
    },
    iconColor() {
      return this.mapping.color;
    },
    canRetry() {
      return this.mapping.canRetry;
    },
    showRawReason() {
      // Show raw reason code only if we couldn't map it —
      // helps support diagnose unexpected errors.
      return !!this.reason && !REASON_MAP[this.reason];
    },
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
    },
  },

  methods: {
    retry() {
      this.$router.push({ name: "login" });
    },
  },
};
</script>

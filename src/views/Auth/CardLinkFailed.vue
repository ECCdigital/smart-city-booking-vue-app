<template>
  <AuthPage :title="title" :icon="iconName">
    <div class="scb-form">
      <v-alert :type="alertType" text dense class="mb-0">
        {{ message }}
      </v-alert>
      <p v-if="hint" class="scb-form__note mt-4 mb-0">{{ hint }}</p>
      <v-alert v-if="showRawReason" type="info" text dense class="mt-4 mb-0">
        <div class="caption"><strong>Fehler-Code:</strong> {{ reason }}</div>
      </v-alert>

      <v-btn
        v-if="canRetry"
        color="primary"
        block
        elevation="0"
        class="scb-form__submit mt-4"
        @click="retry"
      >
        Erneut versuchen
      </v-btn>
      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="scb-form__link">
          Zurück zur Anmeldung
        </router-link>
      </p>
    </div>
  </AuthPage>
</template>

<script>
import AuthPage from "@/components/Auth/AuthPage.vue";

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
  components: { AuthPage },

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
    /** The message as `error`, or `warning` for a used or expired link. */
    alertType() {
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
  },

  methods: {
    retry() {
      this.$router.push({ name: "login" });
    },
  },
};
</script>

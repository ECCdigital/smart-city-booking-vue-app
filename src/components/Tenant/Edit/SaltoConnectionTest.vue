<script>
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";

const SECRET_FIELDS = ["clientSecret", "password"];

/**
 * The connection test of Salto KS: the button, what it tests with, and the
 * answer. A secret field left empty is sent empty; the backend then takes the
 * stored secret, as long as it belongs to the client id, system user and
 * environment in the form, and answers `missing_secret` with the reason per
 * secret otherwise.
 */
export default {
  name: "SaltoConnectionTest",
  props: {
    tenantId: { type: String, required: true },
    /** The Salto KS application as the form holds it. */
    app: { type: Object, required: true },
    secretConfigured: { type: Boolean, default: false },
    passwordConfigured: { type: Boolean, default: false },
  },
  data() {
    return {
      testing: false,
      /** The backend's answer as it came, or `{ success: false, message }`. */
      result: null,
    };
  },
  computed: {
    /** Per secret: `form`, `stored`, or `missing` when neither is there. */
    sources() {
      const configured = {
        clientSecret: this.secretConfigured,
        password: this.passwordConfigured,
      };
      return Object.fromEntries(
        SECRET_FIELDS.map((field) => [
          field,
          this.app[field] ? "form" : configured[field] ? "stored" : "missing",
        ])
      );
    },
    basisText() {
      const sources = Object.values(this.sources);
      if (sources.includes("missing")) {
        return this.$t("accessPoint.tenant.salto.connectionTest.basisMissing");
      }
      if (sources.every((source) => source === "stored")) {
        return this.$t("accessPoint.tenant.salto.connectionTest.basisStored");
      }
      if (sources.every((source) => source === "form")) {
        return this.$t("accessPoint.tenant.salto.connectionTest.basisForm");
      }
      return this.$t("accessPoint.tenant.salto.connectionTest.basisMixed");
    },
    missingSecret() {
      return this.result?.code === "missing_secret";
    },
    missingTexts() {
      return (this.result?.missing || []).map(({ field, reason }) => {
        const key = `accessPoint.tenant.salto.connectionTest.missing.${field}.${reason}`;
        return this.$te(key)
          ? this.$t(key)
          : this.$t("accessPoint.tenant.salto.connectionTest.missing.fallback");
      });
    },
  },
  methods: {
    credentials() {
      const app = this.app;
      return {
        clientId: app.clientId || undefined,
        clientSecret: app.clientSecret || "",
        username: app.username || undefined,
        password: app.password || "",
        siteId: app.siteId || undefined,
        environment: app.environment,
      };
    },
    async test() {
      this.testing = true;
      this.result = null;

      try {
        const response = await ApiAccessAppsService.testConnection(
          this.tenantId,
          this.credentials(),
          "salto-ks"
        );
        this.result = {
          ...response.data,
          success: response.data.success === true,
        };
      } catch (error) {
        this.result = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.connection.error.message"),
        };
      } finally {
        this.testing = false;
      }
    },
  },
};
</script>

<template>
  <div>
    <!-- Testergebnis -->
    <v-row v-if="result" dense>
      <v-col cols="12">
        <v-alert v-if="missingSecret" type="warning" text dense>
          <div v-for="(text, index) in missingTexts" :key="index">
            {{ text }}
          </div>
        </v-alert>
        <v-alert
          v-else
          :color="result.success ? 'success' : 'error'"
          dense
          text
        >
          <div v-if="result.success">
            <v-icon left>mdi-check-circle</v-icon>
            {{ result.message || $t("accessPoint.tenant.connectionSuccess") }}
          </div>
          <div v-else>
            <v-icon left>mdi-alert-circle</v-icon>
            {{ result.message }}
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Aktion -->
    <v-row dense class="mt-2">
      <v-col class="d-flex align-center justify-end flex-wrap test-action">
        <span class="text-caption text--secondary">{{ basisText }}</span>
        <v-btn
          color="primary"
          :loading="testing"
          :disabled="testing"
          @click="test"
        >
          <v-icon left>mdi-connection</v-icon>
          {{ $t("accessPoint.tenant.testConnection") }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.test-action {
  gap: 12px;
}
</style>

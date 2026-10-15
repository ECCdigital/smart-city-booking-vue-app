<script>
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { saltoSecretSources } from "@/utilities/access-apps";

const T = "accessPoint.tenant.salto.connectionTest";

/** The checks in the order an admin works through them. */
const CHECKS = [
  "credentials",
  "login",
  "site",
  "remoteAccess",
  "remoteLockingRight",
  "iqs",
];

/** Sign and colour per status; `todo` is an IQ check with open IQs. */
const SIGNS = {
  ok: ["mdi-check", "success"],
  failed: ["mdi-close", "error"],
  skipped: ["mdi-minus", "grey"],
  unknown: ["mdi-help", "grey"],
  not_verifiable: ["mdi-eye-off-outline", "warning"],
  todo: ["mdi-alert", "warning"],
};

/** The statuses that ask the admin to look, counted in the headline. */
const HINT_STATUSES = ["failed", "unknown", "not_verifiable", "todo"];

/**
 * The IQs in numbers: all of them, those that need an activation (OTP on),
 * how many of those are activated, how many are open, how many offline.
 */
function iqSummary(iqs) {
  const needed = iqs.filter((iq) => iq.otpEnabled);
  const ready = needed.filter((iq) => iq.state === "activated").length;
  return {
    total: iqs.length,
    needed: needed.length,
    ready,
    open: needed.length - ready,
    offline: iqs.filter((iq) => iq.online === false).length,
  };
}

/**
 * The connection test of Salto KS: the button, what it tests with, and the
 * answer. A secret field left empty is sent empty; the backend then takes the
 * stored secret, as long as it belongs to the client id, system user and
 * environment in the form, and answers `missing_secret` with the reason per
 * secret otherwise. The text next to the button follows the same rule.
 *
 * A test that ran is a checklist under the button: a headline, one row per
 * check with sign, value and, where needed, what to do, and where each secret
 * came from. The IQs are a summary only, with a jump to the activation
 * (`to-activation`) that shows the state per IQ.
 */
export default {
  name: "SaltoConnectionTest",
  props: {
    tenantId: { type: String, required: true },
    /** The Salto KS application as the form holds it. */
    app: { type: Object, required: true },
    /** The stored Salto KS application, whose identity the secrets are for. */
    stored: { type: Object, default: null },
    secretConfigured: { type: Boolean, default: false },
    passwordConfigured: { type: Boolean, default: false },
    /** Whether the activation of the IQs is on the page to jump to. */
    activationShown: { type: Boolean, default: false },
  },
  data() {
    return {
      testing: false,
      /** The backend's answer as it came, or `{ success: false, message }`. */
      result: null,
    };
  },
  computed: {
    /** Per secret: `form`, `stored`, or `missing` with the reason. */
    sources() {
      return saltoSecretSources(this.app, this.stored, {
        clientSecret: this.secretConfigured,
        password: this.passwordConfigured,
      });
    },
    basisText() {
      const missing = Object.entries(this.sources)
        .filter(([, { source }]) => source === "missing")
        .map(([field, { reason }]) => this.missingText({ field, reason }));
      if (missing.length) return missing.join(" ");

      const sources = Object.values(this.sources).map(({ source }) => source);
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
    /** A test that ran and answered per check. */
    checklist() {
      return !this.missingSecret && !!this.result?.checks;
    },
    summary() {
      return iqSummary(this.result?.details?.iqs || []);
    },
    rows() {
      if (!this.checklist) return [];
      return CHECKS.map((key) => this.row(key, this.result.checks[key]));
    },
    headline() {
      if (!this.result.success) return this.$t(`${T}.headline.notConnected`);
      const environment = this.result.environment;
      const count = this.rows.filter((row) =>
        HINT_STATUSES.includes(row.status)
      ).length;
      return count
        ? this.$tc(`${T}.headline.connectedWithHints`, count, {
            environment,
            count,
          })
        : this.$t(`${T}.headline.connected`, { environment });
    },
    testedWithText() {
      const source = (field) =>
        this.$t(`${T}.sources.${this.result.testedWith?.[field] || "form"}`);
      return this.$t(`${T}.testedWith`, {
        clientSecret: source("clientSecret"),
        password: source("password"),
      });
    },
    testedAtText() {
      if (!this.result?.testedAt) return "";
      return new Date(this.result.testedAt).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    missingTexts() {
      return (this.result?.missing || []).map(this.missingText);
    },
  },
  methods: {
    missingText({ field, reason }) {
      const key = `${T}.missing.${field}.${reason}`;
      return this.$te(key) ? this.$t(key) : this.$t(`${T}.missing.fallback`);
    },
    /** One row of the checklist: status, sign, value and hint. */
    row(key, check = { status: "skipped" }) {
      let status = check.status;
      let value = "";
      let hint = "";
      let jump = false;

      if (status === "skipped") {
        value = this.$t(`${T}.status.skipped`);
      } else if (status === "unknown") {
        hint = this.$t(`${T}.status.unknown`);
      } else if (status === "not_verifiable") {
        value = this.$t(`${T}.status.notVerifiable`);
        hint = this.$t(`${T}.status.notVerifiableHint`);
      } else if (status === "failed") {
        const failure = `${T}.failures.${check.code}`;
        hint =
          check.code && this.$te(failure)
            ? this.$t(failure)
            : this.$t(`${T}.failures.other`, { message: this.result.message });
      }

      if (key === "credentials") {
        value = this.result.environment || value;
      }
      if (key === "site" && status === "ok") {
        value = this.$tc(`${T}.site`, check.locks || 0, {
          count: check.locks || 0,
        });
      }
      if (key === "iqs" && status === "ok") {
        const summary = this.summary;
        value = summary.total
          ? this.$t(`${T}.iqs.summary`, summary)
          : this.$t(`${T}.iqs.none`);
        const hints = [];
        if (summary.open) {
          status = "todo";
          jump = this.activationShown;
          hints.push(
            this.$tc(`${T}.iqs.open`, summary.open, { count: summary.open })
          );
        }
        if (summary.offline) {
          hints.push(
            this.$tc(`${T}.iqs.offline`, summary.offline, {
              count: summary.offline,
            })
          );
        }
        hint = hints.join(" ");
      }

      const [icon, color] = SIGNS[status] || SIGNS.unknown;
      return {
        key,
        label: this.$t(`${T}.checks.${key}`),
        status,
        value,
        hint,
        icon,
        color,
        jump,
      };
    },
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
        <v-sheet
          v-else-if="checklist"
          outlined
          rounded
          class="pa-2 checklist"
          :class="result.success ? 'checklist-ok' : 'checklist-failed'"
        >
          <div class="d-flex align-center px-2 pt-1 pb-2">
            <v-icon :color="result.success ? 'success' : 'error'" class="mr-2">
              {{ result.success ? "mdi-check-circle" : "mdi-alert-circle" }}
            </v-icon>
            <span class="font-weight-medium" data-test="salto-check-headline">{{
              headline
            }}</span>
            <v-spacer />
            <span class="text-caption text--secondary">{{ testedAtText }}</span>
          </div>
          <v-list dense class="py-0 transparent">
            <v-list-item
              v-for="row in rows"
              :key="row.key"
              class="px-2"
              :data-test="`salto-check-row salto-check-${row.key}`"
            >
              <v-list-item-icon class="mr-3 my-2">
                <v-icon small :color="row.color">{{ row.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content class="py-1">
                <v-list-item-title
                  :class="{ 'text--disabled': row.status === 'skipped' }"
                >
                  {{ row.label }}
                  <span v-if="row.value" class="text--secondary">
                    · {{ row.value }}
                  </span>
                </v-list-item-title>
                <div v-if="row.hint" class="text-caption text--secondary hint">
                  {{ row.hint }}
                </div>
              </v-list-item-content>
              <v-list-item-action v-if="row.jump" class="my-1">
                <v-btn
                  small
                  text
                  color="primary"
                  data-test="salto-to-activation"
                  @click="$emit('to-activation')"
                >
                  {{
                    $t(
                      "accessPoint.tenant.salto.connectionTest.iqs.toActivation"
                    )
                  }}
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
          <div
            class="text-caption text--secondary px-2 pt-1"
            data-test="salto-tested-with"
          >
            {{ testedWithText }}
          </div>
        </v-sheet>
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
.checklist-ok {
  border-left: 3px solid var(--v-success-base) !important;
}
.checklist-failed {
  border-left: 3px solid var(--v-error-base) !important;
}
.hint {
  white-space: normal;
}
</style>

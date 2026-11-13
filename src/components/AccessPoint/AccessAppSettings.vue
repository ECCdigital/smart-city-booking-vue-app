<script>
import { mapActions, mapGetters } from "vuex";
import AccessAppForm from "@/components/AccessPoint/AccessAppForm.vue";
import SaltoConnectionTest from "@/components/Tenant/Edit/SaltoConnectionTest.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import { runConnectionTest } from "@/utilities/access-connection-test";
import { SALTO_PROVIDER, saltoIdentityChanged } from "@/utilities/access-apps";
import { removalHint } from "@/utilities/access-app-lifecycle";
import {
  fieldLabelKey,
  newSettings,
  secretStored,
  savePayload,
  storedTestPayload,
  testFaults,
  testPayload,
} from "@/utilities/access-app-settings";

const T = "accessPoint.management.settings";

/**
 * The settings of one provider, unfolded in the head of its section on the
 * Zugangspunkte page (ECCdigital/tickets#1104): the form on the left,
 * „Verbindung“ with the last test, the test and its result on the right,
 * and in the foot „Verbindung entfernen“, „Abbrechen“ and „Speichern“.
 *
 * Testing and saving are apart: a test saves nothing, and a save goes
 * through - untested or after a failed test too - to the provider's own
 * route, touching no other provider. A result holds only for the values it
 * tested; once a field changes it lapses. What was saved goes out as
 * `saved`, with the application as the backend answered it.
 *
 * A provider saved the first time (ECCdigital/tickets#1106) is tested once
 * more on what was stored when the form was tested before with the same
 * values: that test ran without a stored application, so the backend kept
 * no last test of it. `saved` then says `retested`, and the state of the
 * connection is to be read anew.
 *
 * Salto KS keeps its checklist of the test here, whose jump to the IQs goes
 * out as `to-iqs` - the IQs are a row of the section
 * (ECCdigital/tickets#1107) - and asks before a save that lets activations
 * rest (ECCdigital/tickets#574).
 */
export default {
  name: "AccessAppSettings",
  components: { AccessAppForm, SaltoConnectionTest },
  props: {
    // The provider as the section knows it: `id` and `title`.
    provider: { type: Object, required: true },
    // The stored access application without its secrets, or null.
    app: { type: Object, default: null },
    // The provider's access points: while there are any, the connection
    // cannot be removed (ECCdigital/tickets#1107).
    accessPoints: { type: Array, default: () => [] },
    // Salto KS: the IQs with an activation of the stored identity.
    activatedIqCount: { type: Number, default: 0 },
  },
  data() {
    const settings = newSettings(this.provider.id, this.app);
    return {
      settings,
      // The values as the settings opened, to tell what changed since.
      openedValues: JSON.stringify(settings.values),
      testing: false,
      // The answer of the last test, and the values it tested.
      result: null,
      testedValues: null,
      saving: false,
      saveError: "",
      removing: false,
      removeError: "",
      // The open question before an identity change: { count, resolve }.
      identityQuestion: null,
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    dirty() {
      return JSON.stringify(this.settings.values) !== this.openedValues;
    },
    removeBlocked() {
      return this.accessPoints.length
        ? removalHint(this.provider.id, this.accessPoints)
        : "";
    },
    isSalto() {
      return this.provider.id === SALTO_PROVIDER;
    },
    showsIqActivation() {
      return this.isSalto && !!this.app?.active;
    },
    lastTestText() {
      const testedAt = this.app?.lastTest?.testedAt;
      if (!testedAt) return this.$t(`${T}.never`);
      return this.$t(`${T}.lastTest`, {
        at: new Date(testedAt).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    },
    // The result of the last test, while the form holds what it tested.
    currentResult() {
      if (!this.result) return null;
      return JSON.stringify(this.settings.values) === this.testedValues
        ? this.result
        : null;
    },
    saveCaption() {
      if (this.testing) return "";
      if (!this.currentResult) return this.$t(`${T}.caption.unchecked`);
      return this.currentResult.success
        ? this.$t(`${T}.caption.checked`)
        : this.$t(`${T}.caption.failed`);
    },
    faults() {
      return testFaults(this.provider.id, this.currentResult);
    },
    fieldErrors() {
      return Object.fromEntries(
        Object.entries(this.faults).map(([field, kind]) => [
          field,
          this.$t(`${T}.faults.${kind}`),
        ])
      );
    },
    resultText() {
      const result = this.currentResult;
      if (!result) return "";
      if (result.success)
        return this.$t("accessPoint.tenant.connectionSuccess");
      if (["missing_fields", "missing_secret"].includes(result.code)) {
        const fields = (result.missing || [])
          .map(({ field }) => this.$t(fieldLabelKey(this.provider.id, field)))
          .join(", ");
        return this.$t(`${T}.result.${result.code}`, { fields });
      }
      const coded = `${T}.result.codes.${result.code}`;
      if (result.code && this.$te(coded)) return this.$t(coded);
      return result.message || this.$t("accessPoint.connection.error.message");
    },
  },
  watch: {
    dirty: {
      immediate: true,
      handler(dirty) {
        this.$emit("dirty", dirty);
      },
    },
  },
  beforeDestroy() {
    if (this.dirty) this.$emit("dirty", false);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    secretStored,
    update(key, value) {
      this.$set(this.settings.values, key, value);
    },
    changeSecret(key) {
      this.$set(this.settings.changing, key, true);
    },
    // Back to the stored secret: whatever was typed is dropped.
    keepSecret(key) {
      this.$set(this.settings.values, key, "");
      this.$set(this.settings.changing, key, false);
    },
    async test() {
      this.testing = true;
      this.result = null;
      const values = JSON.stringify(this.settings.values);
      const result = await runConnectionTest(
        this.tenantId,
        testPayload(this.settings),
        this.provider.id
      );
      this.result = result;
      this.testedValues = values;
      this.testing = false;
    },
    toIqActivation() {
      this.$emit("to-iqs");
    },
    /**
     * Asks before a save that changes site, System-User or environment of
     * Salto KS while IQs are activated: their activations rest under another
     * identity (ECCdigital/tickets#574, decided in ECCdigital/tickets#505).
     *
     * @returns {Promise<boolean>} Whether the save may go on
     */
    confirmIdentity() {
      if (
        !this.isSalto ||
        !this.app ||
        !this.activatedIqCount ||
        !saltoIdentityChanged(this.app, this.settings.values)
      ) {
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        this.identityQuestion = { count: this.activatedIqCount, resolve };
      });
    },
    answerIdentityQuestion(proceed) {
      const question = this.identityQuestion;
      this.identityQuestion = null;
      question?.resolve(proceed);
    },
    // Removes the stored application with its credentials. While the
    // provider has access points the backend refuses (409), and the
    // settings say what the barred button says.
    async remove() {
      this.removing = true;
      this.removeError = "";
      try {
        await ApiAccessAppsService.removeApp(this.tenantId, this.provider.id);
        this.$emit("removed");
      } catch (error) {
        this.removeError =
          error.response?.data?.code === "access_app_has_access_points"
            ? removalHint(this.provider.id, this.accessPoints)
            : getApiErrorMessage(error, this.$t(`${T}.removeFailed`));
      } finally {
        this.removing = false;
      }
    },
    async save() {
      if (!(await this.confirmIdentity())) return;
      this.saving = true;
      this.saveError = "";
      const retest = !this.app && !!this.currentResult;
      try {
        const response = await ApiAccessAppsService.saveApp(
          this.tenantId,
          this.provider.id,
          savePayload(this.provider.id, this.settings)
        );
        if (retest) {
          await runConnectionTest(
            this.tenantId,
            storedTestPayload(this.provider.id, this.settings),
            this.provider.id
          );
        }
        await this.addToast(
          ToastService.createToast(`${T}.toasts.saved`, "success", 5000, {
            provider: this.provider.title || this.provider.id,
          })
        );
        this.$emit("saved", response.data, { retested: retest });
      } catch (error) {
        this.saveError = getApiErrorMessage(error, this.$t(`${T}.saveFailed`));
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<template>
  <div class="access-app-settings" data-test="access-app-settings">
    <div class="access-app-settings__grid">
      <AccessAppForm
        :provider-id="provider.id"
        :settings="settings"
        :app="app"
        :errors="fieldErrors"
        @update="update"
        @change-secret="changeSecret"
        @keep-secret="keepSecret"
      />
      <aside
        class="access-app-settings__connection"
        data-test="access-app-connection"
      >
        <div class="access-app-settings__title">
          {{ $t("accessPoint.management.settings.connection") }}
        </div>
        <div class="access-app-settings__sub">{{ lastTestText }}</div>
        <v-btn
          small
          outlined
          color="primary"
          :loading="testing"
          :disabled="testing"
          @click="test"
        >
          <v-icon left small>mdi-connection</v-icon>
          {{ $t("accessPoint.management.settings.test") }}
        </v-btn>
        <SaltoConnectionTest
          v-if="isSalto"
          :result="currentResult"
          :app="settings.values"
          :stored="app"
          :secret-configured="secretStored(app, 'clientSecret')"
          :password-configured="secretStored(app, 'password')"
          :activation-shown="showsIqActivation"
          @to-activation="toIqActivation"
        />
        <div
          v-else-if="currentResult"
          class="access-app-settings__result mt-3"
          :class="
            currentResult.success
              ? 'access-app-settings__result--ok'
              : 'access-app-settings__result--failed'
          "
          data-test="access-app-test-result"
        >
          <v-icon
            small
            :color="currentResult.success ? 'success' : 'error'"
            class="mr-2"
          >
            {{
              currentResult.success ? "mdi-check-circle" : "mdi-close-circle"
            }}
          </v-icon>
          <span>{{ resultText }}</span>
        </div>
      </aside>
    </div>
    <v-alert
      v-if="removeError"
      type="error"
      text
      dense
      class="mx-5 mb-0"
      data-test="access-app-remove-error"
    >
      {{ removeError }}
    </v-alert>
    <v-alert
      v-if="saveError"
      type="error"
      text
      dense
      class="mx-5 mb-0"
      data-test="access-app-save-error"
    >
      {{ saveError }}
    </v-alert>
    <div class="access-app-settings__foot" data-test="access-app-foot">
      <v-btn
        v-if="app"
        small
        text
        :loading="removing"
        :disabled="removing || !!removeBlocked"
        @click="remove"
      >
        {{ $t("accessPoint.management.settings.remove") }}
      </v-btn>
      <span
        v-if="app && removeBlocked"
        class="access-app-settings__caption"
        data-test="access-app-remove-blocked"
      >
        {{ removeBlocked }}
      </span>
      <v-spacer />
      <span
        class="access-app-settings__caption"
        data-test="access-app-save-caption"
      >
        {{ saveCaption }}
      </span>
      <v-btn small text @click="$emit('cancel')">
        {{ $t("accessPoint.management.settings.cancel") }}
      </v-btn>
      <v-btn
        small
        depressed
        color="primary"
        :loading="saving"
        :disabled="saving"
        @click="save"
      >
        {{
          app
            ? $t("accessPoint.management.settings.save")
            : $t("accessPoint.management.settings.saveAndActivate")
        }}
      </v-btn>
    </div>

    <!-- Question before a change of site, System-User or environment -->
    <v-dialog
      :value="!!identityQuestion"
      max-width="520"
      persistent
      scrollable
      @input="answerIdentityQuestion(false)"
    >
      <v-card v-if="identityQuestion" data-test="salto-identity-change">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>mdi-alert-outline</v-icon>
          <span class="text-h5">
            {{ $t("accessPoint.tenant.salto.identityChange.title") }}
          </span>
          <v-spacer />
          <v-btn icon @click="answerIdentityQuestion(false)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          {{
            $tc(
              "accessPoint.tenant.salto.identityChange.text",
              identityQuestion.count,
              { count: identityQuestion.count }
            )
          }}
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="answerIdentityQuestion(false)">
            {{ $t("accessPoint.tenant.salto.identityChange.cancel") }}
          </v-btn>
          <v-btn color="primary" @click="answerIdentityQuestion(true)">
            <v-icon left small>mdi-content-save</v-icon>
            {{ $t("accessPoint.tenant.salto.identityChange.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.access-app-settings {
  border-bottom: 1px solid var(--scb-rule-strong);
  box-shadow: inset 3px 0 0 var(--v-primary-base);
}

.access-app-settings__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  padding: 16px 16px 4px 20px;
}

.access-app-settings__connection {
  border-left: 1px solid var(--scb-rule);
  padding-left: 20px;
}

.access-app-settings__title {
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
}

.access-app-settings__sub {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  margin-bottom: 10px;
}

.access-app-settings__result {
  display: flex;
  align-items: flex-start;
  font-size: var(--scb-font-size-sm);
  padding: 10px 12px;
  border-radius: var(--scb-radius-surface);
}

.access-app-settings__result--ok {
  background: var(--scb-success-tint, rgba(76, 175, 80, 0.08));
}

.access-app-settings__result--failed {
  background: var(--scb-error-tint, rgba(244, 67, 54, 0.08));
}

.access-app-settings__caption {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.access-app-settings__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 12px 20px;
}

@media (max-width: 860px) {
  .access-app-settings__grid {
    grid-template-columns: 1fr;
  }

  .access-app-settings__connection {
    border-left: 0;
    padding-left: 0;
  }
}
</style>

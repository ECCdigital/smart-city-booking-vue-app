<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import AppPanel from "@/components/AppPanel.vue";
import AccessAuditExport from "@/components/Tenant/Edit/AccessAuditExport.vue";
import SaltoIqActivationSection from "@/components/Tenant/Edit/SaltoIqActivation/SaltoIqActivationSection.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";

export default {
  name: "TenantEditAccess",
  components: {
    AppPanel,
    BaseSection,
    AccessAuditExport,
    SaltoIqActivationSection,
  },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
    nukiTokenConfigured: { type: Boolean, default: false },
    saltoSecretConfigured: { type: Boolean, default: false },
    saltoPasswordConfigured: { type: Boolean, default: false },
  },
  data() {
    return {
      valid: false,
      localApps: this.cloneApps(this.apps),
      showSecret: {
        nuki: false,
        "salto-ks": false,
        "salto-ks-password": false,
      },
      testing: { nuki: false, "salto-ks": false },
      testResult: { nuki: null, "salto-ks": null },
      webhook: {
        nuki: {
          callbackUrl: "",
          notificationId: "",
          registering: false,
          unregistering: false,
          result: null,
        },
        "salto-ks": {
          callbackUrl: "",
          notificationId: "",
          registering: false,
          unregistering: false,
          result: null,
        },
      },
    };
  },
  watch: {
    apps: {
      deep: true,
      handler(v) {
        this.localApps = this.cloneApps(v);
      },
    },
  },
  computed: {
    allowAuditExport() {
      return BookingPermissionService.allowAuditExport();
    },
    saltoEnvironments() {
      return [
        {
          value: "accept",
          text: this.$t("accessPoint.tenant.salto.environmentAccept"),
        },
        {
          value: "production",
          text: this.$t("accessPoint.tenant.salto.environmentProduction"),
        },
      ];
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    cloneApps(apps) {
      const cloned = JSON.parse(JSON.stringify(apps));
      if (!cloned.nuki) {
        cloned.nuki = {
          type: "access",
          id: "nuki",
          title: "Nuki",
          apiToken: "",
          apiBaseUrl: "https://api.nuki.io",
          active: false,
        };
      }
      if (!cloned["salto-ks"]) {
        cloned["salto-ks"] = {
          type: "access",
          id: "salto-ks",
          title: "Salto KS",
          clientId: "",
          clientSecret: "",
          username: "",
          password: "",
          siteId: "",
          environment: "accept",
          active: false,
        };
      }
      if (!cloned["salto-ks"].environment) {
        // Configurations from before the environment switch only carried a
        // free-text API URL; an accept host meant accept, anything else
        // production.
        const legacyUrl = String(cloned["salto-ks"].apiBaseUrl || "");
        cloned["salto-ks"].environment =
          legacyUrl && !legacyUrl.includes("accept") ? "production" : "accept";
      }
      return cloned;
    },
    emitApps() {
      this.$emit("update:apps", this.localApps);
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    testCredentials(provider) {
      const app = this.localApps[provider];
      if (provider === "salto-ks") {
        return {
          clientId: app.clientId || undefined,
          clientSecret: app.clientSecret || undefined,
          username: app.username || undefined,
          password: app.password || undefined,
          siteId: app.siteId || undefined,
          environment: app.environment,
        };
      }
      return {
        apiToken: app.apiToken || undefined,
        apiBaseUrl: app.apiBaseUrl,
      };
    },
    async testConnection(provider) {
      this.$set(this.testing, provider, true);
      this.$set(this.testResult, provider, null);

      try {
        const response = await ApiAccessAppsService.testConnection(
          this.tenant.id,
          this.testCredentials(provider),
          provider
        );

        this.$set(this.testResult, provider, {
          success: response.data.success === true,
          message: response.data.message,
        });
      } catch (error) {
        this.$set(this.testResult, provider, {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.connection.error.message"),
        });
      } finally {
        this.$set(this.testing, provider, false);
      }
    },
    async registerWebhook(provider) {
      const wh = this.webhook[provider];
      if (!wh.callbackUrl) return;
      wh.registering = true;
      wh.result = null;

      try {
        const response = await ApiAccessAppsService.registerWebhook(
          this.tenant.id,
          wh.callbackUrl,
          provider
        );
        const data = response.data?.data || response.data;
        if (data?.notificationId) {
          wh.notificationId = data.notificationId;
        }
        await this.addToast(
          ToastService.createToast(
            "accessPoint.webhook.register.success",
            "success"
          )
        );
        wh.result = {
          success: true,
          message: this.$t("accessPoint.webhook.register.success.message"),
        };
      } catch (error) {
        wh.result = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.webhook.register.error.message"),
        };
      } finally {
        wh.registering = false;
      }
    },
    async unregisterWebhook(provider) {
      const wh = this.webhook[provider];
      if (!wh.notificationId) return;
      wh.unregistering = true;
      wh.result = null;

      try {
        await ApiAccessAppsService.unregisterWebhook(
          this.tenant.id,
          wh.notificationId,
          provider
        );
        wh.notificationId = "";
        await this.addToast(
          ToastService.createToast(
            "accessPoint.webhook.unregister.success",
            "success"
          )
        );
        wh.result = {
          success: true,
          message: this.$t("accessPoint.webhook.unregister.success.message"),
        };
      } catch (error) {
        wh.result = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.webhook.unregister.error.message"),
        };
      } finally {
        wh.unregistering = false;
      }
    },
    formatTimestamp(ts) {
      if (!ts) return "";
      try {
        return new Date(ts).toLocaleString("de-DE");
      } catch (e) {
        return "";
      }
    },
  },
};
</script>

<template>
  <BaseSection
    :title="$t('accessPoint.tenant.title')"
    icon="mdi-door"
    :hint="$t('accessPoint.tenant.sectionHint')"
  >
    <v-form ref="form" v-model="valid">
      <v-row>
        <v-col>
          <!-- ============ NUKI ============ -->
          <AppPanel
            v-if="localApps.nuki"
            title="Nuki"
            :logo="require('@/assets/nuki-logo.png')"
            :active="localApps.nuki.active"
            class="mb-2"
          >
            <!-- Beschreibung -->
            <v-alert
              color="primary"
              text
              dense
              class="provider-description mb-4 mt-2"
            >
              <div class="d-flex">
                <v-icon color="primary" class="mr-3 mt-1">mdi-door</v-icon>
                <div>
                  <div class="font-weight-bold mb-1">
                    {{ $t("accessPoint.tenant.providerTitle") }}
                  </div>
                  <div class="text-body-2">
                    {{ $t("accessPoint.tenant.providerDescription") }}
                  </div>
                  <v-btn
                    text
                    small
                    color="primary"
                    class="px-0 mt-1"
                    href="https://nuki.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <v-icon left small>mdi-open-in-new</v-icon>
                    {{ $t("accessPoint.tenant.providerLink") }}
                  </v-btn>
                </div>
              </div>
            </v-alert>

            <!-- Aktivierung -->
            <v-row dense>
              <v-col cols="12">
                <v-switch
                  v-model="localApps.nuki.active"
                  color="primary"
                  hide-details
                  :label="$t('accessPoint.tenant.activate')"
                  @change="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- API-Zugangsdaten -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-key-variant</v-icon>
              <span class="font-weight-medium">{{
                $t("accessPoint.tenant.apiCredentials")
              }}</span>
            </div>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.apiToken')"
                  v-model="localApps.nuki.apiToken"
                  @input="emitApps()"
                  :placeholder="
                    nukiTokenConfigured
                      ? $t('accessPoint.tenant.apiTokenUnchanged')
                      : $t('accessPoint.tenant.apiTokenPlaceholder')
                  "
                  :hint="
                    nukiTokenConfigured
                      ? $t('accessPoint.tenant.apiTokenHint')
                      : ''
                  "
                  persistent-hint
                  :append-icon="showSecret.nuki ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append="showSecret.nuki = !showSecret.nuki"
                  :type="showSecret.nuki ? 'text' : 'password'"
                  autocomplete="off"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.apiBaseUrl')"
                  v-model="localApps.nuki.apiBaseUrl"
                  @input="emitApps()"
                  placeholder="https://api.nuki.io"
                />
              </v-col>
            </v-row>

            <!-- Benötigte Token-Berechtigungen -->
            <v-row dense>
              <v-col cols="12">
                <v-alert type="info" text dense class="mb-0">
                  <div class="font-weight-medium mb-1">
                    {{ $t("accessPoint.tenant.permissionsTitle") }}
                  </div>
                  <div class="text-caption mb-3">
                    {{ $t("accessPoint.tenant.permissionsIntro") }}
                  </div>

                  <div class="font-weight-medium text-body-2">
                    {{ $t("accessPoint.tenant.permissionsMinTitle") }}
                  </div>
                  <ul class="permissions-list text-caption mb-2">
                    <li>{{ $t("accessPoint.tenant.permissionReadOnly") }}</li>
                    <li>{{ $t("accessPoint.tenant.permissionAction") }}</li>
                  </ul>

                  <div class="font-weight-medium text-body-2">
                    {{ $t("accessPoint.tenant.permissionsFullTitle") }}
                  </div>
                  <ul class="permissions-list text-caption mb-2">
                    <li>{{ $t("accessPoint.tenant.permissionAuth") }}</li>
                    <li>{{ $t("accessPoint.tenant.permissionLog") }}</li>
                  </ul>

                  <div class="text-caption font-italic">
                    {{ $t("accessPoint.tenant.permissionsNote") }}
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Testergebnis -->
            <v-row v-if="testResult.nuki" dense>
              <v-col cols="12">
                <v-alert
                  :color="testResult.nuki.success ? 'success' : 'error'"
                  dense
                  text
                >
                  <div v-if="testResult.nuki.success">
                    <v-icon left>mdi-check-circle</v-icon>
                    {{
                      testResult.nuki.message ||
                      $t("accessPoint.tenant.connectionSuccess")
                    }}
                  </div>
                  <div v-else>
                    <v-icon left>mdi-alert-circle</v-icon>
                    {{ testResult.nuki.message }}
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Aktion -->
            <v-row dense class="mt-2">
              <v-col class="text-right">
                <v-btn
                  color="primary"
                  :loading="testing.nuki"
                  :disabled="testing.nuki"
                  @click="testConnection('nuki')"
                >
                  <v-icon left>mdi-connection</v-icon>
                  {{ $t("accessPoint.tenant.testConnection") }}
                </v-btn>
              </v-col>
            </v-row>

            <!-- Webhook (optional) -->
            <div class="section-title mt-6 mb-2">
              <v-icon small left>mdi-webhook</v-icon>
              <span class="font-weight-medium">{{
                $t("accessPoint.tenant.webhookTitle")
              }}</span>
            </div>
            <v-alert type="info" text dense class="mb-3">
              {{ $t("accessPoint.tenant.webhookInfo") }}
            </v-alert>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.callbackUrl')"
                  v-model="webhook.nuki.callbackUrl"
                  placeholder="https://<backend>/api/webhooks/access/nuki/<tenant>"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.notificationId')"
                  v-model="webhook.nuki.notificationId"
                  :hint="$t('accessPoint.tenant.notificationIdHint')"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-row v-if="webhook.nuki.result" dense>
              <v-col cols="12">
                <v-alert
                  :color="webhook.nuki.result.success ? 'success' : 'error'"
                  dense
                  text
                >
                  <v-icon left>
                    {{
                      webhook.nuki.result.success
                        ? "mdi-check-circle"
                        : "mdi-alert-circle"
                    }}
                  </v-icon>
                  {{ webhook.nuki.result.message }}
                </v-alert>
              </v-col>
            </v-row>

            <v-row dense class="mt-2">
              <v-col class="text-right">
                <v-btn
                  text
                  color="error"
                  class="mr-2"
                  :loading="webhook.nuki.unregistering"
                  :disabled="
                    webhook.nuki.unregistering || !webhook.nuki.notificationId
                  "
                  @click="unregisterWebhook('nuki')"
                >
                  {{ $t("accessPoint.tenant.unregisterWebhook") }}
                </v-btn>
                <v-btn
                  color="primary"
                  :loading="webhook.nuki.registering"
                  :disabled="
                    webhook.nuki.registering || !webhook.nuki.callbackUrl
                  "
                  @click="registerWebhook('nuki')"
                >
                  <v-icon left>mdi-webhook</v-icon>
                  {{ $t("accessPoint.tenant.registerWebhook") }}
                </v-btn>
              </v-col>
            </v-row>
          </AppPanel>

          <!-- ============ SALTO KS ============ -->
          <AppPanel
            v-if="localApps['salto-ks']"
            title="Salto KS"
            :logo="require('@/assets/salto-logo.png')"
            :active="localApps['salto-ks'].active"
            class="mb-2"
          >
            <!-- Beschreibung -->
            <v-alert
              color="primary"
              text
              dense
              class="provider-description mb-4 mt-2"
            >
              <div class="d-flex">
                <v-icon color="primary" class="mr-3 mt-1">mdi-door</v-icon>
                <div>
                  <div class="font-weight-bold mb-1">
                    {{ $t("accessPoint.tenant.salto.providerTitle") }}
                  </div>
                  <div class="text-body-2">
                    {{ $t("accessPoint.tenant.salto.providerDescription") }}
                  </div>
                  <v-btn
                    text
                    small
                    color="primary"
                    class="px-0 mt-1"
                    href="https://saltoks.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <v-icon left small>mdi-open-in-new</v-icon>
                    {{ $t("accessPoint.tenant.salto.providerLink") }}
                  </v-btn>
                </div>
              </div>
            </v-alert>

            <!-- Aktivierung -->
            <v-row dense>
              <v-col cols="12">
                <v-switch
                  v-model="localApps['salto-ks'].active"
                  color="primary"
                  hide-details
                  :label="$t('accessPoint.tenant.salto.activate')"
                  @change="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Hinweis: System-User fehlt (Migration bestehender Integrationen) -->
            <v-row
              v-if="
                localApps['salto-ks'].active &&
                !localApps['salto-ks'].username &&
                !saltoPasswordConfigured
              "
              dense
            >
              <v-col cols="12">
                <v-alert type="warning" text dense class="mb-0">
                  <v-icon left>mdi-account-alert</v-icon>
                  {{ $t("accessPoint.tenant.salto.systemUserMissing") }}
                </v-alert>
              </v-col>
            </v-row>

            <!-- API-Zugangsdaten -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-key-variant</v-icon>
              <span class="font-weight-medium">{{
                $t("accessPoint.tenant.apiCredentials")
              }}</span>
            </div>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.salto.clientId')"
                  v-model="localApps['salto-ks'].clientId"
                  @input="emitApps()"
                  autocomplete="off"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.salto.siteId')"
                  v-model="localApps['salto-ks'].siteId"
                  @input="emitApps()"
                  autocomplete="off"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.salto.clientSecret')"
                  v-model="localApps['salto-ks'].clientSecret"
                  @input="emitApps()"
                  :placeholder="
                    saltoSecretConfigured
                      ? $t('accessPoint.tenant.salto.clientSecretUnchanged')
                      : $t('accessPoint.tenant.salto.clientSecretPlaceholder')
                  "
                  :hint="
                    saltoSecretConfigured
                      ? $t('accessPoint.tenant.salto.clientSecretHint')
                      : ''
                  "
                  persistent-hint
                  :append-icon="
                    showSecret['salto-ks'] ? 'mdi-eye' : 'mdi-eye-off'
                  "
                  @click:append="
                    showSecret['salto-ks'] = !showSecret['salto-ks']
                  "
                  :type="showSecret['salto-ks'] ? 'text' : 'password'"
                  autocomplete="off"
                />
              </v-col>
              <!-- System-User (Password-Grant) -->
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  type="email"
                  :label="$t('accessPoint.tenant.salto.username')"
                  v-model="localApps['salto-ks'].username"
                  @input="emitApps()"
                  :placeholder="
                    $t('accessPoint.tenant.salto.usernamePlaceholder')
                  "
                  :hint="$t('accessPoint.tenant.salto.usernameHint')"
                  persistent-hint
                  autocomplete="off"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.salto.password')"
                  v-model="localApps['salto-ks'].password"
                  @input="emitApps()"
                  :placeholder="
                    saltoPasswordConfigured
                      ? $t('accessPoint.tenant.salto.passwordUnchanged')
                      : $t('accessPoint.tenant.salto.passwordPlaceholder')
                  "
                  :hint="
                    saltoPasswordConfigured
                      ? $t('accessPoint.tenant.salto.passwordHint')
                      : ''
                  "
                  persistent-hint
                  :append-icon="
                    showSecret['salto-ks-password'] ? 'mdi-eye' : 'mdi-eye-off'
                  "
                  @click:append="
                    showSecret['salto-ks-password'] =
                      !showSecret['salto-ks-password']
                  "
                  :type="showSecret['salto-ks-password'] ? 'text' : 'password'"
                  autocomplete="off"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.salto.environment')"
                  v-model="localApps['salto-ks'].environment"
                  :items="saltoEnvironments"
                  :hint="$t('accessPoint.tenant.salto.environmentHint')"
                  persistent-hint
                  @change="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Testergebnis -->
            <v-row v-if="testResult['salto-ks']" dense>
              <v-col cols="12">
                <v-alert
                  :color="testResult['salto-ks'].success ? 'success' : 'error'"
                  dense
                  text
                >
                  <div v-if="testResult['salto-ks'].success">
                    <v-icon left>mdi-check-circle</v-icon>
                    {{
                      testResult["salto-ks"].message ||
                      $t("accessPoint.tenant.connectionSuccess")
                    }}
                  </div>
                  <div v-else>
                    <v-icon left>mdi-alert-circle</v-icon>
                    {{ testResult["salto-ks"].message }}
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Aktion -->
            <v-row dense class="mt-2">
              <v-col class="text-right">
                <v-btn
                  color="primary"
                  :loading="testing['salto-ks']"
                  :disabled="testing['salto-ks']"
                  @click="testConnection('salto-ks')"
                >
                  <v-icon left>mdi-connection</v-icon>
                  {{ $t("accessPoint.tenant.testConnection") }}
                </v-btn>
              </v-col>
            </v-row>

            <!-- Webhook-Status (automatisch registriert) -->
            <div class="section-title mt-6 mb-2">
              <v-icon small left>mdi-webhook</v-icon>
              <span class="font-weight-medium">{{
                $t("accessPoint.tenant.webhookTitle")
              }}</span>
            </div>
            <v-alert type="info" text dense class="mb-3">
              {{ $t("accessPoint.tenant.salto.webhookInfo") }}
            </v-alert>
            <v-row dense>
              <v-col cols="12">
                <v-alert
                  v-if="localApps['salto-ks'].webhookRegistrationError"
                  color="error"
                  text
                  dense
                  class="mb-0"
                >
                  <v-icon left>mdi-alert-circle</v-icon>
                  {{ $t("accessPoint.tenant.salto.webhookError") }}
                  {{ localApps["salto-ks"].webhookRegistrationError }}
                </v-alert>
                <v-alert
                  v-else-if="localApps['salto-ks'].webhookRegisteredAt"
                  color="success"
                  text
                  dense
                  class="mb-0"
                >
                  <v-icon left>mdi-check-circle</v-icon>
                  {{ $t("accessPoint.tenant.salto.webhookRegistered") }}
                  {{
                    formatTimestamp(localApps["salto-ks"].webhookRegisteredAt)
                  }}
                </v-alert>
                <v-alert v-else color="grey" text dense class="mb-0">
                  <v-icon left>mdi-information-outline</v-icon>
                  {{ $t("accessPoint.tenant.salto.webhookPending") }}
                </v-alert>
              </v-col>
            </v-row>

            <!-- IQ activation for remote-open -->
            <SaltoIqActivationSection
              v-if="localApps['salto-ks'].active"
              :tenant-id="tenant.id"
            />
          </AppPanel>

          <div v-if="allowAuditExport" class="mt-8">
            <v-divider class="mb-6" />
            <AccessAuditExport :tenant="tenant.id" />
          </div>
        </v-col>
      </v-row>
    </v-form>
  </BaseSection>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.theme--dark .section-title {
  color: rgba(255, 255, 255, 0.8);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
.permissions-list {
  margin: 2px 0 0 0;
  padding-left: 18px;
}
.permissions-list li {
  margin-bottom: 2px;
}
.provider-description {
  border-left: 3px solid var(--v-primary-base);
}
</style>

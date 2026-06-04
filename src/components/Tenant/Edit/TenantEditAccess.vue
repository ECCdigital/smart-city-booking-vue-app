<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import AppPanel from "@/components/AppPanel.vue";
import AccessAuditExport from "@/components/Tenant/Edit/AccessAuditExport.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";

export default {
  name: "TenantEditAccess",
  components: { AppPanel, BaseSection, AccessAuditExport },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
    nukiTokenConfigured: { type: Boolean, default: false },
  },
  data() {
    return {
      valid: false,
      localApps: this.cloneApps(this.apps),
      showNukiToken: false,
      testingConnection: false,
      testResult: null,
      webhook: {
        callbackUrl: "",
        notificationId: "",
        registering: false,
        unregistering: false,
        result: null,
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
    async testNukiConnection() {
      this.testingConnection = true;
      this.testResult = null;

      try {
        const response = await ApiAccessAppsService.testConnection(
          this.tenant.id,
          {
            apiToken: this.localApps.nuki.apiToken || undefined,
            apiBaseUrl: this.localApps.nuki.apiBaseUrl,
          }
        );

        this.testResult = {
          success: response.data.success === true,
          message: response.data.message,
        };
      } catch (error) {
        this.testResult = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.connection.error.message"),
        };
      } finally {
        this.testingConnection = false;
      }
    },
    async registerWebhook() {
      if (!this.webhook.callbackUrl) return;
      this.webhook.registering = true;
      this.webhook.result = null;

      try {
        const response = await ApiAccessAppsService.registerWebhook(
          this.tenant.id,
          this.webhook.callbackUrl
        );
        if (response.data?.notificationId) {
          this.webhook.notificationId = response.data.notificationId;
        }
        await this.addToast(
          ToastService.createToast(
            "accessPoint.webhook.register.success",
            "success"
          )
        );
        this.webhook.result = {
          success: true,
          message: this.$t("accessPoint.webhook.register.success.message"),
        };
      } catch (error) {
        this.webhook.result = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.webhook.register.error.message"),
        };
      } finally {
        this.webhook.registering = false;
      }
    },
    async unregisterWebhook() {
      if (!this.webhook.notificationId) return;
      this.webhook.unregistering = true;
      this.webhook.result = null;

      try {
        await ApiAccessAppsService.unregisterWebhook(
          this.tenant.id,
          this.webhook.notificationId
        );
        this.webhook.notificationId = "";
        await this.addToast(
          ToastService.createToast(
            "accessPoint.webhook.unregister.success",
            "success"
          )
        );
        this.webhook.result = {
          success: true,
          message: this.$t("accessPoint.webhook.unregister.success.message"),
        };
      } catch (error) {
        this.webhook.result = {
          success: false,
          message:
            error.response?.data?.message ||
            error.message ||
            this.$t("accessPoint.webhook.unregister.error.message"),
        };
      } finally {
        this.webhook.unregistering = false;
      }
    },
  },
};
</script>

<template>
  <BaseSection :title="$t('accessPoint.tenant.title')" icon="mdi-door">
    <v-form ref="form" v-model="valid">
      <v-row>
        <v-col>
          <!-- ============ NUKI ============ -->
          <AppPanel
            v-if="localApps.nuki"
            :logo="require('@/assets/nuki-logo.png')"
            :active="localApps.nuki.active"
            class="mb-2"
          >
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
                  :append-icon="showNukiToken ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append="showNukiToken = !showNukiToken"
                  :type="showNukiToken ? 'text' : 'password'"
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
            <v-row v-if="testResult" dense>
              <v-col cols="12">
                <v-alert
                  :color="testResult.success ? 'success' : 'error'"
                  dense
                  text
                >
                  <div v-if="testResult.success">
                    <v-icon left>mdi-check-circle</v-icon>
                    {{
                      testResult.message ||
                      $t("accessPoint.tenant.connectionSuccess")
                    }}
                  </div>
                  <div v-else>
                    <v-icon left>mdi-alert-circle</v-icon>
                    {{ testResult.message }}
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Aktion -->
            <v-row dense class="mt-2">
              <v-col class="text-right">
                <v-btn
                  color="primary"
                  :loading="testingConnection"
                  :disabled="testingConnection"
                  @click="testNukiConnection"
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
                  v-model="webhook.callbackUrl"
                  placeholder="https://<backend>/api/webhooks/access/nuki/<tenant>"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  :label="$t('accessPoint.tenant.notificationId')"
                  v-model="webhook.notificationId"
                  :hint="$t('accessPoint.tenant.notificationIdHint')"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-row v-if="webhook.result" dense>
              <v-col cols="12">
                <v-alert
                  :color="webhook.result.success ? 'success' : 'error'"
                  dense
                  text
                >
                  <v-icon left>
                    {{
                      webhook.result.success
                        ? "mdi-check-circle"
                        : "mdi-alert-circle"
                    }}
                  </v-icon>
                  {{ webhook.result.message }}
                </v-alert>
              </v-col>
            </v-row>

            <v-row dense class="mt-2">
              <v-col class="text-right">
                <v-btn
                  text
                  color="error"
                  class="mr-2"
                  :loading="webhook.unregistering"
                  :disabled="webhook.unregistering || !webhook.notificationId"
                  @click="unregisterWebhook"
                >
                  {{ $t("accessPoint.tenant.unregisterWebhook") }}
                </v-btn>
                <v-btn
                  color="primary"
                  :loading="webhook.registering"
                  :disabled="webhook.registering || !webhook.callbackUrl"
                  @click="registerWebhook"
                >
                  <v-icon left>mdi-webhook</v-icon>
                  {{ $t("accessPoint.tenant.registerWebhook") }}
                </v-btn>
              </v-col>
            </v-row>
          </AppPanel>

          <v-card v-if="allowAuditExport" outlined class="mb-2 pa-4">
            <AccessAuditExport :tenant="tenant.id" />
          </v-card>
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
</style>

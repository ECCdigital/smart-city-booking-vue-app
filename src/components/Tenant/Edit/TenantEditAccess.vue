<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import AppPanel from "@/components/AppPanel.vue";
import AccessAuditExport from "@/components/Tenant/Edit/AccessAuditExport.vue";
import AccessAppCustomerServiceFields from "@/components/Tenant/Edit/AccessAppCustomerServiceFields.vue";
import {
  emptyCustomerService,
  findTenantApp,
  saltoEnvironment,
  saltoIdentityChanged,
} from "@/utilities/access-apps";
import SaltoIqActivationSection from "@/components/Tenant/Edit/SaltoIqActivation/SaltoIqActivationSection.vue";
import SaltoConnectionTest from "@/components/Tenant/Edit/SaltoConnectionTest.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

export default {
  name: "TenantEditAccess",
  components: {
    AppPanel,
    BaseSection,
    AccessAppCustomerServiceFields,
    AccessAuditExport,
    SaltoIqActivationSection,
    SaltoConnectionTest,
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
      testing: { nuki: false },
      testResult: { nuki: null },
      // IQs with an activation of the stored identity, as the activation
      // section last listed them. Kept while the section is hidden.
      activatedIqCount: 0,
      // The open question before an identity change: { count, resolve }.
      identityQuestion: null,
    };
  },
  watch: {
    apps: {
      deep: true,
      handler(v) {
        this.localApps = this.cloneApps(v);
      },
    },
    // After a save under another identity the IQ list still shows the old
    // one's activations; load it again.
    storedSalto(next, previous) {
      if (next && previous && saltoIdentityChanged(previous, next)) {
        this.$refs.iqActivation?.load();
      }
    },
  },
  computed: {
    storedSalto() {
      return findTenantApp(this.tenant.applications, "salto-ks") || null;
    },
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
      if (!cloned.nuki.customerService) {
        // Stored before the contact existed: read as an empty contact.
        cloned.nuki.customerService = emptyCustomerService();
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
          environment: "production",
          active: false,
        };
      }
      cloned["salto-ks"].environment = saltoEnvironment(cloned["salto-ks"]);
      return cloned;
    },
    emitApps() {
      this.$emit("update:apps", this.localApps);
    },
    /**
     * Asks before a save that changes site, System-User or environment of
     * Salto KS while IQs are activated: their activations rest under another
     * identity (ECCdigital/tickets#505).
     *
     * @returns {Promise<boolean>} Whether the save may go on
     */
    confirmSave() {
      const stored = this.storedSalto;
      if (
        !stored ||
        !this.activatedIqCount ||
        !saltoIdentityChanged(stored, this.localApps["salto-ks"])
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
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    toIqActivation() {
      this.$refs.iqActivation?.$el.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    testCredentials(provider) {
      const app = this.localApps[provider];
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

            <!-- Kundenservice -->
            <AccessAppCustomerServiceFields
              v-model="localApps.nuki.customerService"
              @input="emitApps()"
            />

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

            <!-- Voraussetzungen in Salto KS -->
            <v-row dense class="mt-2">
              <v-col cols="12">
                <v-alert
                  type="info"
                  text
                  dense
                  class="mb-0"
                  data-test="salto-prerequisites"
                >
                  <div class="font-weight-medium mb-1">
                    {{ $t("accessPoint.tenant.salto.prerequisites.title") }}
                  </div>
                  <div class="text-caption mb-1">
                    {{ $t("accessPoint.tenant.salto.prerequisites.intro") }}
                  </div>
                  <ul class="permissions-list text-caption mb-2">
                    <li>
                      {{
                        $t("accessPoint.tenant.salto.prerequisites.systemUser")
                      }}
                    </li>
                    <li>
                      {{ $t("accessPoint.tenant.salto.prerequisites.role") }}
                    </li>
                    <li>
                      {{
                        $t(
                          "accessPoint.tenant.salto.prerequisites.remoteOpening"
                        )
                      }}
                    </li>
                    <li>
                      {{ $t("accessPoint.tenant.salto.prerequisites.mailbox") }}
                    </li>
                    <li>
                      {{ $t("accessPoint.tenant.salto.prerequisites.appBan") }}
                    </li>
                  </ul>
                  <div class="text-caption font-italic">
                    {{ $t("accessPoint.tenant.salto.prerequisites.note") }}
                  </div>
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

            <SaltoConnectionTest
              :tenant-id="tenant.id"
              :app="localApps['salto-ks']"
              :stored="storedSalto"
              :secret-configured="saltoSecretConfigured"
              :password-configured="saltoPasswordConfigured"
              :activation-shown="localApps['salto-ks'].active"
              @to-activation="toIqActivation"
            />

            <!-- IQ activation for remote-open -->
            <SaltoIqActivationSection
              v-if="localApps['salto-ks'].active"
              ref="iqActivation"
              :tenant-id="tenant.id"
              @update:activated-count="activatedIqCount = $event"
            />
          </AppPanel>

          <div v-if="allowAuditExport" class="mt-8">
            <v-divider class="mb-6" />
            <AccessAuditExport :tenant="tenant.id" />
          </div>
        </v-col>
      </v-row>
    </v-form>

    <!-- Question before a change of site, System-User or environment -->
    <v-dialog
      :value="!!identityQuestion"
      max-width="520"
      persistent
      @input="answerIdentityQuestion(false)"
    >
      <v-card v-if="identityQuestion" data-test="salto-identity-change">
        <v-card-title class="headline">
          {{ $t("accessPoint.tenant.salto.identityChange.title") }}
        </v-card-title>
        <v-card-text>
          {{
            $tc(
              "accessPoint.tenant.salto.identityChange.text",
              identityQuestion.count,
              { count: identityQuestion.count }
            )
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="answerIdentityQuestion(false)">
            {{ $t("accessPoint.tenant.salto.identityChange.cancel") }}
          </v-btn>
          <v-btn color="primary" text @click="answerIdentityQuestion(true)">
            {{ $t("accessPoint.tenant.salto.identityChange.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

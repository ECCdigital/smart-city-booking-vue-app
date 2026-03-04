<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import AppPanel from "@/components/AppPanel.vue";
import ApiLockerService from "@/services/api/ApiLockerService";

export default {
  name: "TenantEditLocks",
  components: { AppPanel, BaseSection },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { ...this.tenant },
      localApps: JSON.parse(JSON.stringify(this.apps)),
      showParevaPassword: false,
      testingConnection: {
        pareva: false,
        ifbs: false,
      },
      testResults: {
        pareva: null,
        ifbs: null,
      },
      validationRules: {
        required: [(v) => !!v || "Pflichtfeld"],
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
        paymentPurposeSuffix: [
          (v) => !v || v.length <= 12 || "Maximal 12 Zeichen erlaubt.",
        ],
        weblink: [
          (v) =>
            !v ||
            /https?\:\/\/([a-z\.A-Z\-]+)\/.*/g.test(v) ||
            "Ungültige URL.",
        ],
      },
    };
  },
  watch: {
    tenant: {
      deep: true,
      handler(v) {
        this.localTenant = { ...v };
      },
    },
    apps: {
      deep: true,
      handler(v) {
        this.localApps = JSON.parse(JSON.stringify(v));
      },
    },
  },
  methods: {
    emitTenant() {
      this.$emit("update:tenant", this.localTenant);
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
    async testIfbsConnection() {
      this.testingConnection.ifbs = true;
      this.testResults.ifbs = null;

      try {
        const config = {
          serverUrl: this.localApps.ifbs.serverUrl,
          apiKeyID: this.localApps.ifbs.apiKeyID,
          apiKey: this.localApps.ifbs.apiKey,
        };

        const response = await ApiLockerService.testConnection({
          tenantID: this.tenant.id,
          provider: "ifbs",
          config,
        });

        this.testResults.ifbs = {
          success: response.data.success === "true" || response.data.success === true,
          errNo: response.data.errorCode,
          errMsg: response.data.message,
        };

      } catch (error) {
        this.testResults.ifbs = {
          success: false,
          errMsg:
            error.response?.data?.ErrMsg ||
            error.response?.data?.message ||
            error.message ||
            "Verbindung fehlgeschlagen",
          errNo: error.response?.data?.errorCode,
        };
      } finally {
        this.testingConnection.ifbs = false;
      }
    },
    async testParevaConnection() {
      this.testingConnection.pareva = true;
      this.testResults.pareva = null;

      try {
        const config = {
          serverUrl: this.localApps.pareva.serverUrl,
          lockerId: this.localApps.pareva.lockerId,
          user: this.localApps.pareva.user,
          password: this.localApps.pareva.password,
        };

        const response = await ApiLockerService.testConnection(
          {
            tenantID: this.tenant.id,
            provider: "pareva",
            config
          }
        );

        this.testResults.pareva = {
          success: response.data.success === "true" || response.data.success === true,
          errNo: response.data.errorCode,
          errMsg: response.data.message,
        };
      } catch (error) {
        this.testResults.pareva = {
          success: false,
          errMsg:
            error.response?.data?.ErrMsg ||
            error.response?.data?.message ||
            error.message ||
            "Verbindung fehlgeschlagen",
          errNo: error.response?.data?.errorCode,
        };
      } finally {
        this.testingConnection.pareva = false;
      }
    },
  },
};
</script>

<template>
  <BaseSection title="Schließsysteme" icon="mdi-lock">
    <v-row>
      <v-col>
        <AppPanel
          v-if="localApps.pareva"
          :title="'Pareva'"
          :logo="require('@/assets/pareva-logo.png')"
          :active="localApps.pareva.active"
        >
          <v-row>
            <v-col class="col-12">
              <v-switch
                v-model="localApps.pareva.active"
                color="primary"
                hide-details
                label="Parava aktivieren"
                class="mt-2"
                @change="emitApps()"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Server-URL"
                v-model="localApps.pareva.serverUrl"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Locker-ID"
                v-model="localApps.pareva.lockerId"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Benutzername"
                v-model="localApps.pareva.user"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Passwort"
                v-model="localApps.pareva.password"
                @input="emitApps()"
                :append-icon="showParevaPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showParevaPassword = !showParevaPassword"
                :type="showParevaPassword ? 'text' : 'password'"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row v-if="testResults.pareva">
            <v-col>
              <v-alert
                :color="testResults.pareva.success ? 'success' : 'error'"
                dense
                text
              >
                <div v-if="testResults.pareva.success">
                  <v-icon left>mdi-check-circle</v-icon>
                  Verbindung erfolgreich!
                </div>
                <div v-else>
                  <v-icon left>mdi-alert-circle</v-icon>
                  <strong>Fehler {{ testResults.pareva.errNo }}:</strong>
                  {{ testResults.pareva.errMsg }}
                </div>
              </v-alert>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="text-right">
              <v-btn
                color="primary"
                :loading="testingConnection.pareva"
                :disabled="testingConnection.pareva"
                @click="testParevaConnection"
              >
                <v-icon left>mdi-connection</v-icon>
                Verbindung testen
              </v-btn>
            </v-col>
          </v-row>
        </AppPanel>
        <AppPanel
          v-if="localApps.ifbs"
          :title="localApps.ifbs.title || 'Fahrradboxen'"
          :logo="require('@/assets/prsn-logo.png')"
          :active="localApps.ifbs.active"
        >
          <v-row>
            <v-col class="col-12">
              <v-switch
                v-model="localApps.ifbs.active"
                color="primary"
                hide-details
                label="Fahrradboxen aktivieren"
                class="mt-2"
                @change="emitApps()"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Server-URL"
                v-model="localApps.ifbs.serverUrl"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="API Key ID"
                v-model="localApps.ifbs.apiKeyID"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="API Key"
                v-model="localApps.ifbs.apiKey"
                @input="emitApps()"
                :append-icon="showParevaPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showParevaPassword = !showParevaPassword"
                :type="showParevaPassword ? 'text' : 'password'"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row v-if="testResults.ifbs">
            <v-col>
              <v-alert
                :color="testResults.ifbs.success ? 'success' : 'error'"
                dense
                text
              >
                <div v-if="testResults.ifbs.success">
                  <v-icon left>mdi-check-circle</v-icon>
                  Verbindung erfolgreich!
                </div>
                <div v-else>
                  <v-icon left>mdi-alert-circle</v-icon>
                  <strong
                    >Fehler
                    <span v-if="testResults.ifbs.errNo"
                      >{{ testResults.ifbs.errNo }}:</span
                    ></strong
                  >
                  {{ testResults.ifbs.errMsg }}
                </div>
              </v-alert>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="text-right">
              <v-btn
                color="primary"
                :loading="testingConnection.ifbs"
                :disabled="testingConnection.ifbs"
                @click="testIfbsConnection"
              >
                <v-icon left>mdi-connection</v-icon>
                Verbindung testen
              </v-btn>
            </v-col>
          </v-row>
        </AppPanel>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>

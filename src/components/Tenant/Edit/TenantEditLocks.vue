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
      localApps: this.cloneApps(this.apps),
      showParevaPassword: false,
      showIfbsSecretPhrase: false,
      showIfbsApiKey: false,
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
          (v) =>
            !v ||
            /.+@.+\..+/.test(v) ||
            "Muss eine gültige Email-Adresse sein.",
        ],
        phone: [
          (v) =>
            !v ||
            /^[+\d][\d\s\-/()]{3,}$/.test(v) ||
            "Muss eine gültige Telefonnummer sein.",
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
        this.localApps = this.cloneApps(v);
      },
    },
  },
  methods: {
    cloneApps(apps) {
      const cloned = JSON.parse(JSON.stringify(apps));
      if (cloned.ifbs && !cloned.ifbs.customerService) {
        cloned.ifbs.customerService = { name: "", email: "", phone: "" };
      }
      return cloned;
    },
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
          success:
            response.data.success === "true" || response.data.success === true,
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

        const response = await ApiLockerService.testConnection({
          tenantID: this.tenant.id,
          provider: "pareva",
          config,
        });

        this.testResults.pareva = {
          success:
            response.data.success === "true" || response.data.success === true,
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
  <BaseSection
    title="Schließfächer & Fahrradboxen"
    icon="mdi-locker-multiple"
    hint="Hinterlegen Sie Buchungsobjekte in Schließfächern oder bieten Sie abschließbare Fahrradboxen an. Buchende entnehmen bzw. öffnen sie selbstständig zum Zeitpunkt ihrer Buchung."
  >
    <v-form ref="form" v-model="valid">
      <v-row>
        <v-col>
          <!-- ============ PAREVA ============ -->
          <AppPanel
            v-if="localApps.pareva"
            :title="'Pareva'"
            :logo="require('@/assets/pareva-logo.png')"
            :active="localApps.pareva.active"
            class="mb-2"
          >
            <!-- Beschreibung -->
            <v-alert color="primary" text dense class="provider-description mb-4 mt-2">
              <div class="d-flex">
                <v-icon color="primary" class="mr-3 mt-1"
                  >mdi-locker-multiple</v-icon
                >
                <div>
                  <div class="font-weight-bold mb-1">
                    Schließfach-System (Smart Locker)
                  </div>
                  <div class="text-body-2">
                    Mit Pareva hinterlegen Sie ein Buchungsobjekt – zum Beispiel
                    ein iPad, Werkzeug oder anderes Equipment – in einem
                    abschließbaren Fach. Buchende entnehmen den Gegenstand
                    selbstständig zum Zeitpunkt ihrer Buchung und legen ihn nach
                    Ablauf wieder zurück.
                  </div>
                  <v-btn
                    text
                    small
                    color="primary"
                    class="px-0 mt-1"
                    href="https://www.pareva.de"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <v-icon left small>mdi-open-in-new</v-icon>
                    Mehr über Pareva
                  </v-btn>
                </div>
              </div>
            </v-alert>

            <!-- Aktivierung -->
            <v-row dense>
              <v-col cols="12">
                <v-switch
                  v-model="localApps.pareva.active"
                  color="primary"
                  hide-details
                  label="Pareva aktivieren"
                  @change="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Serverkonfiguration -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-server-network</v-icon>
              <span class="font-weight-medium">Serverkonfiguration</span>
            </div>
            <v-row dense>
              <v-col cols="12" md="8">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Server-URL"
                  v-model="localApps.pareva.serverUrl"
                  @input="emitApps()"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Locker-ID"
                  v-model="localApps.pareva.lockerId"
                  @input="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Zugangsdaten -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-key-variant</v-icon>
              <span class="font-weight-medium">Zugangsdaten</span>
            </div>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Benutzername"
                  v-model="localApps.pareva.user"
                  @input="emitApps()"
                />
              </v-col>
              <v-col cols="12" md="6">
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
                />
              </v-col>
            </v-row>

            <!-- Testergebnis -->
            <v-row v-if="testResults.pareva" dense>
              <v-col cols="12">
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

            <!-- Aktion -->
            <v-row dense class="mt-2">
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

          <!-- ============ IFBS / Fahrradboxen ============ -->
          <AppPanel
            v-if="localApps.ifbs"
            :title="localApps.ifbs.title || 'Fahrradboxen'"
            :logo="require('@/assets/prsn-logo.png')"
            :active="localApps.ifbs.active"
          >
            <!-- Beschreibung -->
            <v-alert color="primary" text dense class="provider-description mb-4 mt-2">
              <div class="d-flex">
                <v-icon color="primary" class="mr-3 mt-1">mdi-bike</v-icon>
                <div>
                  <div class="font-weight-bold mb-1">
                    Abschließbare Fahrradboxen
                  </div>
                  <div class="text-body-2">
                    Die Fahrradboxen der PRS Parkraum Service GmbH
                    (Parkraumservice) bieten sichere Stellplätze für Fahrräder
                    und E-Bikes. Buchende reservieren eine Box und öffnen sie zum
                    Zeitpunkt ihrer Buchung.
                  </div>
                  <v-btn
                    text
                    small
                    color="primary"
                    class="px-0 mt-1"
                    href="https://parkraumservice.de"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <v-icon left small>mdi-open-in-new</v-icon>
                    Mehr über Parkraumservice
                  </v-btn>
                </div>
              </div>
            </v-alert>

            <!-- Aktivierung -->
            <v-row dense>
              <v-col cols="12">
                <v-switch
                  v-model="localApps.ifbs.active"
                  color="primary"
                  hide-details
                  label="Fahrradboxen aktivieren"
                  @change="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Serverkonfiguration -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-server-network</v-icon>
              <span class="font-weight-medium">Serverkonfiguration</span>
            </div>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Server-URL"
                  v-model="localApps.ifbs.serverUrl"
                  @input="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- API Zugangsdaten -->
            <div class="section-title mt-4 mb-2">
              <v-icon small left>mdi-key-variant</v-icon>
              <span class="font-weight-medium">API-Zugangsdaten</span>
            </div>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="API Key ID"
                  v-model="localApps.ifbs.apiKeyID"
                  @input="emitApps()"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="API Key"
                  v-model="localApps.ifbs.apiKey"
                  @input="emitApps()"
                  :append-icon="showIfbsApiKey ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append="showIfbsApiKey = !showIfbsApiKey"
                  :type="showIfbsApiKey ? 'text' : 'password'"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Secret Phrase"
                  v-model="localApps.ifbs.secretPhrase"
                  @input="emitApps()"
                  :append-icon="
                    showIfbsSecretPhrase ? 'mdi-eye' : 'mdi-eye-off'
                  "
                  @click:append="showIfbsSecretPhrase = !showIfbsSecretPhrase"
                  :type="showIfbsSecretPhrase ? 'text' : 'password'"
                />
              </v-col>
            </v-row>

            <!-- Kundenservice -->
            <div class="section-title mt-6 mb-2">
              <v-icon small left>mdi-face-agent</v-icon>
              <span class="font-weight-medium">Kundenservice</span>
            </div>
            <v-alert type="info" text dense class="mb-3">
              Diese Kontaktdaten werden dem Kunden angezeigt, sofern angegeben.
              Alle Felder sind optional.
            </v-alert>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Name / Ansprechpartner"
                  prepend-inner-icon="mdi-account"
                  v-model="localApps.ifbs.customerService.name"
                  @input="emitApps()"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="E-Mail"
                  prepend-inner-icon="mdi-email-outline"
                  type="email"
                  :rules="validationRules.mail"
                  v-model="localApps.ifbs.customerService.email"
                  @input="emitApps()"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Telefon"
                  prepend-inner-icon="mdi-phone-outline"
                  type="tel"
                  :rules="validationRules.phone"
                  v-model="localApps.ifbs.customerService.phone"
                  @input="emitApps()"
                />
              </v-col>
            </v-row>

            <!-- Testergebnis -->
            <v-row v-if="testResults.ifbs" dense>
              <v-col cols="12">
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
                    <strong>
                      Fehler
                      <span v-if="testResults.ifbs.errNo"
                        >{{ testResults.ifbs.errNo }}:</span
                      >
                    </strong>
                    {{ testResults.ifbs.errMsg }}
                  </div>
                </v-alert>
              </v-col>
            </v-row>

            <!-- Aktion -->
            <v-row dense class="mt-2">
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
.provider-description {
  border-left: 3px solid var(--v-primary-base);
}
</style>

<template>
  <BaseSection title="Zahlungs-Konfiguration" icon="mdi-credit-card">
    <SubSection title="Zahlungsanbieter" icon="fa-credit-card">
      <div class="text--secondary caption mb-2">
        Hier können Sie die Zugangsdaten für die Zahlungsanbieter konfigurieren,
        die Sie Ihren Kunden im Checkout anbieten möchten.
      </div>
      <AppPanel
        v-if="modelApps.giroCockpit"
        :title="'GiroCockpit'"
        :logo="require('@/assets/sparkasse-logo.png')"
        :active="modelApps.giroCockpit.active"
        class="mb-2"
      >
        <v-row dense>
          <v-col cols="12">
            <v-switch
              v-model="modelApps.giroCockpit.active"
              color="primary"
              hide-details
              label="GiroCockpit als Zahlungsanbieter aktivieren"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Kundennummer"
              v-model="modelApps.giroCockpit.paymentMerchantId"
            />
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Projektnummer"
              v-model="modelApps.giroCockpit.paymentProjectId"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Schlüssel"
              :append-icon="showPaymentSecret ? 'mdi-eye' : 'mdi-eye-off'"
              :type="showPaymentSecret ? 'text' : 'password'"
              @click:append="showPaymentSecret = !showPaymentSecret"
              v-model="modelApps.giroCockpit.paymentSecret"
            />
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              prefix="[Buchungsnummer] - "
              :rules="[
                (v) => !v || v.length <= 12 || 'Maximal 12 Zeichen erlaubt.',
              ]"
              v-model="modelApps.giroCockpit.paymentPurposeSuffix"
            />
          </v-col>
        </v-row>
      </AppPanel>

      <AppPanel
        v-if="modelApps.pmPayment"
        :title="'pmPayment'"
        :logo="require('@/assets/gov-connect-logo.png')"
        :active="modelApps.pmPayment.active"
        class="mb-2"
      >
        <v-row>
          <v-col class="col-auto">
            <v-switch
              v-model="modelApps.pmPayment.active"
              color="primary"
              hide-details
              label="pmPayment als Zahlungsanbieter aktivieren"
              class="mt-2"
            ></v-switch>
          </v-col>
          <v-col>
            <v-switch
              v-model="modelApps.pmPayment.paymentMode"
              color="primary"
              hide-details
              true-value="test"
              false-value="prod"
              label="Testmodus"
              class="mt-2"
            ></v-switch>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Amtlicher Gemeindeschlüssel"
              hide-details
              v-model="modelApps.pmPayment.paymentMerchantId"
            ></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Verfahren"
              v-model="modelApps.pmPayment.paymentProjectId"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Salt Passwort"
              v-model="modelApps.pmPayment.paymentSecret"
              :append-icon="showPmPaymentSecret ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append="showPmPaymentSecret = !showPmPaymentSecret"
              :type="showPmPaymentSecret ? 'text' : 'password'"
            ></v-text-field>
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              prefix="[Buchungsnummer] - "
              :rules="validationRules.paymentPurposeSuffix"
              v-model="modelApps.pmPayment.paymentPurposeSuffix"
            ></v-text-field>
          </v-col>
        </v-row>
      </AppPanel>
      <AppPanel
        v-if="modelApps.ePayBL"
        :title="'ePayBL'"
        :logo="require('@/assets/epaybl-logo.png')"
        :active="modelApps.ePayBL.active"
        class="mb-2"
      >
        <v-row dense>
          <v-col cols="12">
            <v-switch
              v-model="modelApps.ePayBL.active"
              color="primary"
              hide-details
              label="ePayBL als Zahlungsanbieter aktivieren"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Base URL"
              v-model="modelApps.ePayBL.baseUrl"
              placeholder="https://epaybl.example.de/api"
            />
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Mandantennummer"
              v-model="modelApps.ePayBL.merchantId"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Bewirtschafternummer"
              v-model="modelApps.ePayBL.managerId"
            />
          </v-col>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Haushaltsstelle"
              v-model="modelApps.ePayBL.budgetAccount"
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col>
            <v-text-field
              background-color="accent"
              filled
              label="Objektnummer"
              v-model="modelApps.ePayBL.objectNumber"
            />
          </v-col>
          <v-col>
            <v-select
              background-color="accent"
              filled
              label="Zahlungsmethoden"
              v-model="modelApps.ePayBL.paymentMethods"
              :items="ePayBLPaymentMethodOptions"
              multiple
              chips
              small-chips
              deletable-chips
              persistent-hint
              hint="Nur Zahlungsmethoden auswählen, die vertraglich freigeschaltet sind. Verfügbare Methoden können über den Verbindungstest ermittelt werden."
            />
          </v-col>
        </v-row>
        <v-row dense>
          <v-col cols="12">
            <v-card
              :color="
                modelApps.ePayBL.clientP12
                  ? 'success lighten-5'
                  : 'error lighten-5'
              "
              class="rounded"
            >
              <v-card-text
                :class="
                  (modelApps.ePayBL.clientP12 ? 'success' : 'error') +
                  '--text text--darken-1 d-flex justify-space-between align-center'
                "
              >
                <div>
                  <v-icon left>{{
                    modelApps.ePayBL.clientP12 ? "mdi-check" : "mdi-close"
                  }}</v-icon>
                  {{
                    modelApps.ePayBL.clientP12
                      ? "Client-Zertifikat (.p12) ist hinterlegt."
                      : "Kein Client-Zertifikat hinterlegt."
                  }}
                </div>
                <div class="d-flex align-center" style="gap: 8px">
                  <v-btn
                    v-if="modelApps.ePayBL.clientP12"
                    small
                    outlined
                    color="error"
                    @click="removeCertificate"
                  >
                    <v-icon small left>mdi-delete</v-icon>
                    Entfernen
                  </v-btn>
                  <v-btn small outlined @click="$refs.certFileInput.click()">
                    <v-icon small left>mdi-upload</v-icon>
                    {{ modelApps.ePayBL.clientP12 ? "Ersetzen" : "Hochladen" }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
            <input
              ref="certFileInput"
              type="file"
              accept=".p12,.pfx"
              style="display: none"
              @change="onCertFileInputChange"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="6">
            <v-text-field
              background-color="accent"
              filled
              label="Zertifikat-Passwort"
              :value="modelApps.ePayBL.certPassphrase"
              @input="update('certPassphrase', $event)"
              :append-icon="showEPayBLSecret ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append="showEPayBLSecret = !showEPayBLSecret"
              :type="showEPayBLSecret ? 'text' : 'password'"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              background-color="accent"
              filled
              label="Benachrichtigungs-Geheimnis"
              :value="modelApps.ePayBL.notificationSecret"
              @input="update('notificationSecret', $event)"
              :append-icon="
                showEPayBLNotificationSecret ? 'mdi-eye' : 'mdi-eye-off'
              "
              @click:append="
                showEPayBLNotificationSecret = !showEPayBLNotificationSecret
              "
              :type="showEPayBLNotificationSecret ? 'text' : 'password'"
            />
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col class="d-flex align-center justify-end">
            <span v-if="hasUnsavedChanges" class="ml-3 text--secondary caption">
              <v-icon small color="warning" class="mr-1">mdi-alert</v-icon>
              Bitte zuerst speichern, bevor Sie die Verbindung testen.
            </span>
            <v-btn
              color="primary"
              :loading="ePayBLTestLoading"
              :disabled="hasUnsavedChanges || !modelApps.ePayBL.active"
              @click="testEPayBLConnection"
            >
              <v-icon left>mdi-connection</v-icon>
              Verbindung testen
            </v-btn>
          </v-col>
        </v-row>
      </AppPanel>

      <AppPanel
        v-if="modelApps.invoice"
        :title="'Rechnung'"
        icon="fa-file-invoice-dollar"
        :active="modelApps.invoice.active"
      >
        <!-- Aktivierung -->
        <v-row dense>
          <v-col cols="12">
            <v-switch
              v-model="modelApps.invoice.active"
              color="primary"
              hide-details
              label="Rechnung als Zahlungsmittel aktivieren"
            />
          </v-col>
        </v-row>

        <!-- Vorlage -->
        <v-row dense class="mt-2">
          <v-col cols="12">
            <v-card
              :color="
                modelTenant?.invoiceTemplate
                  ? 'success lighten-5'
                  : 'error lighten-5'
              "
              class="rounded"
              flat
            >
              <v-card-text
                :class="
                  (modelTenant?.invoiceTemplate ? 'success' : 'error') +
                  '--text text--darken-1 d-flex justify-space-between align-center'
                "
              >
                <div>
                  <v-icon left>{{
                    modelTenant?.invoiceTemplate ? "mdi-check" : "mdi-close"
                  }}</v-icon>
                  {{
                    modelTenant?.invoiceTemplate
                      ? "Es ist eine Rechnungs-Vorlage hinterlegt."
                      : "Es ist keine Rechnungs-Vorlage hinterlegt."
                  }}
                </div>
                <v-btn small outlined @click="$emit('open-invoice-template')">
                  bearbeiten
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bankdaten -->
        <div class="section-title mt-6 mb-2">
          <v-icon small left>mdi-bank</v-icon>
          <span class="font-weight-medium">Bankverbindung</span>
        </div>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Bank"
              v-model="modelApps.invoice.bank"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Kontoinhaber"
              v-model="modelApps.invoice.accountHolder"
            />
          </v-col>
          <v-col cols="12" md="8">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="IBAN"
              v-model="modelApps.invoice.iban"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="BIC"
              v-model="modelApps.invoice.bic"
            />
          </v-col>
        </v-row>

        <!-- Zahlungsbedingungen -->
        <div class="section-title mt-6 mb-2">
          <v-icon small left>mdi-calendar-clock</v-icon>
          <span class="font-weight-medium">Zahlungsbedingungen</span>
        </div>
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Zahlungsziel in Tagen"
              type="number"
              v-model="modelApps.invoice.daysUntilPaymentDue"
            />
          </v-col>
          <v-col cols="12" md="8">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Ergänzung zum Verwendungszweck"
              prefix="[Buchungsnummer] - "
              :rules="[
                (v) => !v || v.length <= 12 || 'Maximal 12 Zeichen erlaubt.',
              ]"
              v-model="modelTenant.paymentPurposeSuffix"
            />
          </v-col>
        </v-row>

        <!-- Erstellung -->
        <div class="section-title mt-6 mb-2">
          <v-icon small left>mdi-file-document-plus-outline</v-icon>
          <span class="font-weight-medium">Rechnungserstellung</span>
        </div>
        <v-row dense>
          <v-col cols="12">
            <v-switch
              v-model="modelApps.invoice.manualCreation"
              color="primary"
              hide-details
              label="Rechnung manuell erstellen"
              :messages="
                modelApps.invoice.manualCreation
                  ? 'Rechnungen werden nicht automatisch erzeugt und müssen manuell ausgelöst werden.'
                  : 'Rechnungen werden automatisch bei Erstellung bzw. Freigabe einer Buchung erzeugt.'
              "
            />
          </v-col>
        </v-row>

        <!-- Berechtigungen -->
        <div class="section-title mt-6 mb-2">
          <v-icon small left>mdi-account-lock-outline</v-icon>
          <span class="font-weight-medium">Berechtigungen</span>
        </div>
        <v-alert type="info" text dense class="mb-3">
          Wenn weder Benutzer noch Rollen angegeben sind, steht die Zahlung per
          Rechnung allen Nutzern offen. Sobald mindestens ein Eintrag vorhanden
          ist, ist die Option auf diese beschränkt.
        </v-alert>

        <UserRoleSelector
          :users="modelApps.invoice.permittedUsers || []"
          :roles="modelApps.invoice.permittedRoles || []"
          @update:users="updateInvoice('permittedUsers', $event)"
          @update:roles="updateInvoice('permittedRoles', $event)"
          users-label="Rechnung verfügbar für Benutzer"
          roles-label="Rechnung verfügbar für Rollen"
          users-hint="Berechtigen Sie <strong>bestimmte Benutzer</strong>, per Rechnung zu bezahlen."
          roles-hint="Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, per Rechnung zu bezahlen."
        />
      </AppPanel>
    </SubSection>

    <SubSection
      title="Zahlungs- und Stornobelege"
      icon="fa-file-invoice-dollar"
    >
      <div class="pdf-booking-layout-section mb-6">
        <PdfBookingLayoutPicker
          v-model="pdfBookingLayoutModel"
          :table-meta.sync="pdfBookingTableMetaModel"
        />
      </div>
      <v-row>
        <v-col class="col-12 col-md-3">
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Belegnummer Präfix"
            v-model="modelTenant.receiptNumberPrefix"
          />
        </v-col>
        <v-col>
          <v-card
            :color="
              modelTenant?.receiptTemplate
                ? 'success lighten-5'
                : 'error lighten-5'
            "
            class="rounded"
          >
            <v-card-text
              :class="
                (modelTenant?.receiptTemplate ? 'success' : 'error') +
                '--text text--darken-1 d-flex justify-space-between align-center'
              "
            >
              <div>
                <v-icon left>{{
                  modelTenant?.receiptTemplate ? "mdi-check" : "mdi-close"
                }}</v-icon>
                {{
                  modelTenant?.receiptTemplate
                    ? "Es ist eine Zahlungsbelegvorlage hinterlegt."
                    : "Es ist keine Zahlungsbelegvorlage hinterlegt."
                }}
              </div>
              <v-btn small outlined @click="$emit('open-receipt-template')"
                >bearbeiten</v-btn
              >
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col class="col-12 col-md-3"
          ><v-text-field
            background-color="accent"
            filled
            dense
            label="Stornonummer Präfix"
            v-model="modelTenant.cancellationNumberPrefix"
        /></v-col>
        <v-col>
          <v-card
            :color="
              modelTenant?.cancellationTemplate
                ? 'success lighten-5'
                : 'error lighten-5'
            "
            class="rounded"
          >
            <v-card-text
              :class="
                (modelTenant?.cancellationTemplate ? 'success' : 'error') +
                '--text text--darken-1 d-flex justify-space-between align-center'
              "
            >
              <div>
                <v-icon left>{{
                  modelTenant?.cancellationTemplate ? "mdi-check" : "mdi-close"
                }}</v-icon>
                {{
                  modelTenant?.cancellationTemplate
                    ? "Es ist eine Stornobelegvorlage hinterlegt."
                    : "Es ist keine Stornobelegvorlage hinterlegt."
                }}
              </div>
              <v-btn small outlined @click="$emit('open-cancellation-template')"
                >bearbeiten</v-btn
              >
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </SubSection>

    <v-dialog v-model="showTestResultDialog" max-width="640" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon left :color="ePayBLTestResult?.success ? 'success' : 'error'">
            {{
              ePayBLTestResult?.success
                ? "mdi-check-circle"
                : "mdi-alert-circle"
            }}
          </v-icon>
          ePayBL Verbindungstest
        </v-card-title>

        <v-card-text>
          <v-alert v-if="ePayBLTestError" type="error" dense class="mb-0">
            {{ ePayBLTestError }}
          </v-alert>

          <template v-if="ePayBLTestResult">
            <v-alert
              :type="ePayBLTestResult.success ? 'success' : 'error'"
              dense
              class="mb-4"
            >
              {{
                ePayBLTestResult.success
                  ? "Alle Prüfungen erfolgreich bestanden."
                  : "Mindestens eine Prüfung ist fehlgeschlagen."
              }}
            </v-alert>

            <template v-if="ePayBLTestResult.checks">
              <div
                v-if="ePayBLTestResult.checks.basicConnection"
                class="d-flex align-center mb-3"
              >
                <v-icon
                  :color="
                    testCheckColor(
                      ePayBLTestResult.checks.basicConnection.status
                    )
                  "
                  class="mr-2"
                >
                  {{
                    testCheckIcon(
                      ePayBLTestResult.checks.basicConnection.status
                    )
                  }}
                </v-icon>
                <div>
                  <div class="font-weight-medium">Basisverbindung</div>
                  <div class="text--secondary caption">
                    {{ ePayBLTestResult.checks.basicConnection.message }}
                  </div>
                </div>
              </div>

              <div
                v-if="ePayBLTestResult.checks.authentication"
                class="d-flex align-center mb-3"
              >
                <v-icon
                  :color="
                    testCheckColor(
                      ePayBLTestResult.checks.authentication.status
                    )
                  "
                  class="mr-2"
                >
                  {{
                    testCheckIcon(ePayBLTestResult.checks.authentication.status)
                  }}
                </v-icon>
                <div>
                  <div class="font-weight-medium">Authentifizierung</div>
                  <div class="text--secondary caption">
                    Zertifikat:
                    {{
                      ePayBLTestResult.checks.authentication.hasCertificate
                        ? "vorhanden"
                        : "nicht vorhanden"
                    }}
                  </div>
                </div>
              </div>

              <div v-if="ePayBLTestResult.checks.paymentMethods">
                <div class="d-flex align-center mb-2">
                  <v-icon
                    :color="
                      testCheckColor(
                        ePayBLTestResult.checks.paymentMethods.status
                      )
                    "
                    class="mr-2"
                  >
                    {{
                      testCheckIcon(
                        ePayBLTestResult.checks.paymentMethods.status
                      )
                    }}
                  </v-icon>
                  <div class="font-weight-medium">
                    Zahlungsmethoden
                    <span
                      v-if="
                        ePayBLTestResult.checks.paymentMethods.status === 'ok'
                      "
                      class="text--secondary font-weight-regular"
                    >
                      ({{ ePayBLTestResult.checks.paymentMethods.count }}
                      verfügbar)
                    </span>

                    <span
                      v-else-if="
                        ePayBLTestResult.checks.paymentMethods.status ===
                        'pending'
                      "
                      class="text--secondary font-weight-regular"
                    >
                      – nicht geprüft (vorheriger Schritt fehlgeschlagen)
                    </span>
                  </div>
                </div>

                <v-list
                  v-if="
                    ePayBLTestResult.checks.paymentMethods.methods &&
                    ePayBLTestResult.checks.paymentMethods.methods.length
                  "
                  dense
                  class="ml-6 pa-0"
                >
                  <v-list-item
                    v-for="m in ePayBLTestResult.checks.paymentMethods.methods"
                    :key="m.code"
                    class="px-0"
                  >
                    <v-list-item-icon class="mr-2">
                      <v-icon small color="success"
                        >mdi-credit-card-outline</v-icon
                      >
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-chip x-small label class="mr-2">{{ m.code }}</v-chip>
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        {{ m.min?.toFixed(2) }} € –
                        {{
                          m.max?.toLocaleString("de-DE", {
                            minimumFractionDigits: 2,
                          })
                        }}
                        €
                        <span v-if="m.viaProvider" class="ml-1"
                          >• via Provider</span
                        >
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </div>
            </template>

            <div class="text--secondary caption mt-4">
              Zeitpunkt:
              {{ new Date(ePayBLTestResult.timestamp).toLocaleString("de-DE") }}
            </div>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showTestResultDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseSection>
</template>

<script>
import debounce from "lodash/debounce";
import AppPanel from "@/components/AppPanel.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiPaymentService from "@/services/api/ApiPaymentService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import SubSection from "@/components/commons/SubSection.vue";
import UserRoleSelector from "@/components/commons/UserRoleSelector.vue";

import PdfBookingLayoutPicker from "@/components/PDF/PdfBookingLayoutPicker.vue";
import { DEFAULT_PDF_BOOKING_LAYOUT } from "@/components/PDF/pdfBookingLayoutConstants.js";
import { normalizePdfBookingTableMeta } from "@/components/PDF/pdfBookingTableMeta.js";

export default {
  name: "TenantEditPayments",
  components: {
    UserRoleSelector,
    SubSection,
    BaseSection,
    AppPanel,
    PdfBookingLayoutPicker,
  },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
    hasUnsavedChanges: { type: Boolean, default: false },
  },
  data() {
    return {
      showPaymentSecret: false,
      showPmPaymentSecret: false,
      showEPayBLSecret: false,
      showEPayBLNotificationSecret: false,
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
      showEPayBLClientCert: false,
      showEPayBLClientKey: false,
      ePayBLTestLoading: false,
      ePayBLTestResult: null,
      ePayBLTestError: null,
      showTestResultDialog: false,
      ePayBLPaymentMethodOptions: [
        "KREDITKARTE",
        "GIROPAY",
        "PAYDIREKT",
        "PAYPAL",
        "LASTSCHRIFT",
        "UEBERWEISUNG",
        "LASTSCHRIFTOHNE",
      ],
    };
  },
  created() {
    this._emitTenantDebounced = debounce((val) => {
      this.$emit("update:tenant", { ...val });
    }, 200);
    this._emitAppsDebounced = debounce((val) => {
      this.$emit("update:apps", JSON.parse(JSON.stringify(val)));
    }, 200);
  },
  computed: {
    modelTenant: {
      get() {
        return this.tenant;
      },
      set(v) {
        this._emitTenantDebounced(v);
      },
    },
    modelApps: {
      get() {
        return this.apps;
      },
      set(v) {
        this._emitAppsDebounced(v);
      },
    },
    pdfBookingLayoutModel: {
      get() {
        return this.modelTenant.pdfBookingLayout || DEFAULT_PDF_BOOKING_LAYOUT;
      },
      set(value) {
        this.$emit("update:tenant", {
          ...this.modelTenant,
          pdfBookingLayout: value,
        });
      },
    },
    pdfBookingTableMetaModel: {
      get() {
        return normalizePdfBookingTableMeta(
          this.modelTenant.pdfBookingTableMeta
        );
      },
      set(value) {
        this.$emit("update:tenant", {
          ...this.modelTenant,
          pdfBookingTableMeta: normalizePdfBookingTableMeta(value),
        });
      },
    },
  },
  methods: {
    update(field, value) {
      this.$emit("update:apps", {
        ...this.modelApps,
        ePayBL: {
          ...this.modelApps.ePayBL,
          [field]: value,
        },
      });
    },

    updateInvoice(field, value) {
      this.$emit("update:apps", {
        ...this.modelApps,
        invoice: {
          ...this.modelApps.invoice,
          [field]: value,
        },
      });
    },

    removeCertificate() {
      this.modelApps.ePayBL.clientP12 = "";
      this.modelApps.ePayBL.certPassphrase = "";
    },

    onCertFileInputChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      this.fileToBase64(file)
        .then((base64) => {
          this.update("clientP12", base64);
        })
        .catch((err) => {
          console.error("Fehler beim Lesen der Zertifikatsdatei:", err);
        })
        .finally(() => {
          this.$refs.certFileInput.value = "";
        });
    },

    async testEPayBLConnection() {
      this.ePayBLTestResult = null;
      this.ePayBLTestError = null;
      this.ePayBLTestLoading = true;

      try {
        const response = await ApiPaymentService.testConnection(
          "epaybl",
          this.tenant.id
        );
        console.log("Verbindungstest erfolgreich:", response);
        this.ePayBLTestResult = response.data || response;
      } catch (err) {
        const data = err?.response?.data;
        if (data && data.checks) {
          this.ePayBLTestResult = data;
        } else {
          // The 4.3.x error shape carries no `message`, so a denied test used
          // to read "Request failed with status code 403".
          this.ePayBLTestError = getApiErrorMessage(
            err,
            data?.message || err?.message || "Verbindungstest fehlgeschlagen."
          );
        }
      } finally {
        this.ePayBLTestLoading = false;
        this.showTestResultDialog = true;
      }
    },
    testCheckIcon(status) {
      if (status === "ok") return "mdi-check-circle";
      if (status === "pending") return "mdi-clock-outline";
      return "mdi-alert-circle";
    },
    testCheckColor(status) {
      if (status === "ok") return "success";
      if (status === "pending") return "grey";
      return "error";
    },

    async onCertFileChange(file) {
      if (!file) {
        this.update("clientP12", "");
        return;
      }

      try {
        const base64 = await this.fileToBase64(file);
        this.update("clientP12", base64);
      } catch (err) {
        console.error("Fehler beim Lesen der Zertifikatsdatei:", err);
      }
    },
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    async validate() {
      return true;
    },
  },
};
</script>

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
</style>

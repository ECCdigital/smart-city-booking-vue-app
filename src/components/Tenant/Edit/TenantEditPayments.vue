<template>
  <BaseSection title="Zahlungs Konfiguration" icon="mdi-credit-card">
    <h3 class="mb-2">Zahlungsbeleg</h3>
    <v-row>
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
                  ? "Es ist eine Zahlungsbeleg-Vorlage hinterlegt."
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

    <v-row class="mt-4">
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Belegnummer Präfix"
          v-model="modelTenant.receiptNumberPrefix"
        />
      </v-col>
    </v-row>

    <h3 class="mb-2">Zahlungsmethoden</h3>
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
      v-if="modelApps.invoice"
      :title="'Rechnung'"
      icon="fa-file-invoice-dollar"
      :active="modelApps.invoice.active"
    >
      <v-row>
        <v-col class="col-12">
          <v-switch
            v-model="modelApps.invoice.active"
            color="primary"
            hide-details
            label="Rechnung als Zahlungsmittel aktivieren"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card
            :color="
              modelTenant?.invoiceTemplate
                ? 'success lighten-5'
                : 'error lighten-5'
            "
            class="rounded"
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
              <v-btn small outlined @click="$emit('open-invoice-template')"
                >bearbeiten</v-btn
              >
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- IBAN/BIC usw. -->
      <v-row class="mt-4">
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="Bank"
            v-model="modelApps.invoice.bank"
          />
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="IBAN"
            v-model="modelApps.invoice.iban"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="BIC"
            v-model="modelApps.invoice.bic"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="Kontoinhaber"
            v-model="modelApps.invoice.accountHolder"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col class="col-12 col-md-6">
          <v-text-field
            background-color="accent"
            filled
            label="Zahlungsziel in Tagen"
            type="number"
            v-model="modelApps.invoice.daysUntilPaymentDue"
          />
        </v-col>

        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="Ergänzung zum Verwendungszweck"
            prefix="[Buchungsnummer] - "
            :rules="[
            (v) => !v || v.length <= 12 || 'Maximal 12 Zeichen erlaubt.',
          ]"
            v-model="modelTenant.paymentPurposeSuffix"
          />
        </v-col>

      </v-row>
    </AppPanel>
  </BaseSection>
</template>

<script>
import debounce from "lodash/debounce";
import AppPanel from "@/components/AppPanel.vue";
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditPayments",
  components: { BaseSection, AppPanel },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
  },
  data() {
    return {
      showPaymentSecret: false,
      showPmPaymentSecret: false,
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
  },
  methods: {
    async validate() {
      return true;
    },
  },
};
</script>

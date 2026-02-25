<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Rechnungs Vorlage bearbeiten</span>
      </v-card-title>
      <v-card-subtitle>
        <div class="mt-6 text--info info--text">
          <v-icon color="info"> mdi-information-outline </v-icon>
          <span>
            Die Vorlage muss in einem validen HTML-Format geschrieben sein.
          </span>
        </div>
      </v-card-subtitle>
      <v-card-text>
        <HTMLTemplateEditor
          v-model="internalTemplate"
          :default-template="defaultTemplate"
          :variables="templateVariables"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">abbrechen</v-btn>
        <v-btn color="primary" @click="onSave">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import HTMLTemplateEditor from "@/components/HTMLTemplateEditor.vue";

export default {
  name: "InvoiceTemplateDialog",
  components: { HTMLTemplateEditor },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    invoiceTemplate: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      internalTemplate: "",
      templateVariables: [
        {
          name: "invoiceNumber",
          placeholder: "{{invoiceNumber}}",
          description: "Rechnungsnummer der Rechnung",
        },
        {
          name: "invoiceDate",
          placeholder: "{{invoiceDate}}",
          description: "Datum der Rechnungsausstellung",
        },
        {
          name: "invoiceAddress",
          placeholder: "{{invoiceAddress}}",
          description: "Rechnungsadresse",
        },
        {
          name: "daysUntilPaymentDue",
          placeholder: "{{daysUntilPaymentDue}}",
          description: "Tage bis zur Zahlung fällig ist",
        },
        {
          name: "mainContent",
          placeholder: "{{{mainContent}}}",
          description: "Hauptinhalt der Rechnung (HTML formatiert)",
        },
        {
          name: "bookingId",
          placeholder: "{{bookingId}}",
          description: "ID der Buchung",
        },
        {
          name: "bookingDate",
          placeholder: "{{bookingDate}}",
          description: "Datum der Buchung",
        },
        {
          name: "bookingPeriod",
          placeholder: "{{bookingPeriod}}",
          description: "Buchungszeitraum",
        },
        {
          name: "totalAmount",
          placeholder: "{{totalAmount}}",
          description: "Gesamtbetrag der Rechnung",
        },
        {
          name: "bank",
          placeholder: "{{bank}}",
          description: "Name der Bank",
        },
        {
          name: "iban",
          placeholder: "{{iban}}",
          description: "IBAN der Bankverbindung",
        },
        {
          name: "bic",
          placeholder: "{{bic}}",
          description: "BIC der Bankverbindung",
        },
        {
          name: "location",
          placeholder: "{{location}}",
          description: "Ort der Rechnungsausstellung",
        },
        {
          name: "purposeOfPayment",
          placeholder: "{{purposeOfPayment}}",
          description: "Verwendungszweck für die Zahlung",
        },
      ],
      defaultTemplate: `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>{{ title }}</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Work+Sans&display=swap");
      body {
        padding-left: 1cm;
        padding-right: 1cm;
        padding-top: 0.5cm;
        padding-bottom: 0.5cm;
      }
      .invoice-box {
        font-size: 12px;
        line-height: 16px;
        font-family: "Work Sans", "SansSerif", "SansSerif", SansSerif, SansSerif,
          sans-serif;
        padding-bottom: 20px;
      }
      .invoice-box table {
        width: 100%;
        line-height: inherit;
        text-align: left;
        padding-bottom: 20px;
      }
      .invoice-box table td {
        padding: 5px;
        vertical-align: top;
      }
      .invoice-box table tr td:nth-child(2) {
        text-align: right;
        line-height: 18px;
      }
      .invoice-box table tr.top table td tr {
        padding-bottom: 20px;
        text-align: center;
      }
      .invoice-box table tr.heading td {
        background: #eee;
        border-bottom: 1px solid #ddd;
        font-weight: bold;
      }
      .invoice-box table tr.item td {
        border-bottom: 1px solid #eee;
      }
      .invoice-box table tr.item.last td {
        border-bottom: none;
      }
      .invoice-box table tr.total td:nth-child(2) {
        border-top: 2px solid #eee;
        font-weight: bold;
      }
      @media only screen and (max-width: 600px) {
        .invoice-box table tr.top table td {
          display: block;
          text-align: center;
        }
        .invoice-box table tr.information table td {
          display: block;
          text-align: center;
        }
      }
      .invoice-box.rtl table {
        text-align: right;
        padding-bottom: 20px;
      }
      .invoice-box.rtl table tr td:nth-child(2) {
        text-align: left;
      }
      .header {
        text-align: center;
        font-size: 12px;
        line-height: 25px;
        padding-bottom: 20px;
        padding-left: 40px;
      }
      .header-address {
        text-align: left;
        padding-left: 40px;
      }
      .information {
        padding-top: 0px;
        padding-bottom: 20px;
        line-height: 20px;
        font-size: 12px;
        text-align: left;
      }
      .details {
        padding-bottom: 40px;
        line-height: 14px;
        font-size: 10px;
        text-align: left;
        horiz-align: right;
      }
      .spacer {
        padding-bottom: 20px;
        padding-left: 0px;
        padding-right: 10px;
        min-width: 80px;
      }
      .image {
        width: 100%;
        max-width: 60px;
        padding-bottom: 20px;
        padding-left: 20px;
      }
      .logo {
        width: 100%;
        max-width: 250px;
        padding-bottom: 20px;
      }
      .footer {
        bottom: 0;
        right: 0;
        position: absolute;
        padding: 20px;
        text-align: left;
        line-height: 15px;
        font-size: 8px;
      }
    </style>
  </head>
  <body>
    <div class="invoice-box">
      <tr class="top">
        <td colspan="2">
          <table>
            <tr>
              <td>
                <div class="header">
                  <span style="font-weight: bold; font-size: x-large"
                    >Smart City Booking</span
                  >
                  <br />
                  <br />
                </div>
                <div class="header-address">
                  <span
                    style="font-size: x-small; text-decoration: underline"
                  ></span>
                  <br /><br />
                  {{{invoiceAddress}}}
                </div>
              </td>
              <td><div class="spacer"></div></td>
              <td>
                <div>
                  <div class="details">
                    Rechnungsnummer: {{invoiceNumber}} <br />
                    <br />
                    {{location}}, {{bookingDate}}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <div class="information">
        <span style="font-size: larger; font-weight: bolder">
          Rechnung – Smart City Booking </span
        ><br /><br />
        <p>
          Sehr geehrte Damen und Herren,<br /><br />
          vielen Dank für Ihre Buchung bei Smart City Booking. Bitte überweisen
          Sie den genannten Betrag innerhalb von {{ daysUntilPaymentDue }} Tagen
          mit dem Verwendungszweck {{ purposeOfPayment }} auf folgendes
          Konto:<br /><br />
          {{ bank }} <br />
          IBAN: {{ iban }} <br />
          BIC: {{ bic }} <br />
          <br />
        </p>
      </div>
      Buchungsnummer:{{bookingId}} </br>
      Zeitraum: {{bookingPeriod}} </br>
      {{{ mainContent }}}
      <div class="information">
        Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift
        gültig.
      </div>
      <div class="footer"></div>
    </div>
  </body>
</html>
`,
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    onSave() {
      this.$emit("submit", this.internalTemplate);
    },
  },
  watch: {
    open() {
      this.internalTemplate = this.invoiceTemplate;
    },
  },
};
</script>

<style scoped></style>

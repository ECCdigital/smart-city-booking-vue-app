<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Stornobeleg Vorlage bearbeiten</span>
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
          :example-data="exampleData"
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
  name: "CancellationTemplateDialog",
  components: { HTMLTemplateEditor },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    cancellationTemplate: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      internalTemplate: "",
      templateVariables: [
        {
          name: "cancellationNumber",
          placeholder: "{{cancellationNumber}}",
          description:
            "Eindeutige Nummer des Stornobelegs, z.B. für Rückfragen oder als Referenz",
        },
        {
          name: "originalInvoiceNumber",
          placeholder: "{{originalInvoiceNumber}}",
          description:
            "Rechnungsnummer der ursprünglichen Rechnung, die storniert wird",
        },
        {
          name: "location",
          placeholder: "{{location}}",
          description: "Ort",
        },
        {
          name: "cancellationDate",
          placeholder: "{{cancellationDate}}",
          description: "Datum der Stornierung",
        },
        {
          name: "invoiceAddress",
          placeholder: "{{invoiceAddress}}",
          description: "Adresse des Kunden",
        },

        {
          name: "refundReference",
          placeholder: "{{refundReference}}",
          description:
            "Referenz für die Erstattung (nur relevant, wenn bereits gezahlt wurde)",
        },
        {
          name: "refundMethod",
          placeholder: "{{refundMethod}}",
          description:
            "Erstattungsmethode (nur relevant, wenn bereits gezahlt wurde)",
        },
        {
          name: "refundAmount",
          placeholder: "{{refundAmount}}",
          description:
            "Erstattungsbetrag (nur relevant, wenn bereits gezahlt wurde)",
        },
        {
          name: "cancellationReason",
          placeholder: "{{cancellationReason}}",
          description: "Grund der Stornierung",
        },
        {
          name: "mainContent",
          placeholder: "{{mainContent}}",
          description:
            "Hier werden die stornierten Positionen mit ihren Preisen aufgelistet",
        },
        {
          name: "bank",
          placeholder: "{{bank}}",
          description:
            "Name der Bank für die Rückfrage (nur relevant, wenn showBankDetails true ist)",
        },
        {
          name: "iban",
          placeholder: "{{iban}}",
          description:
            "IBAN der Bank für die Rückfrage (nur relevant, wenn showBankDetails true ist)",
        },
        {
          name: "bic",
          placeholder: "{{bic}}",
          description:
            "BIC der Bank für die Rückfrage (nur relevant, wenn showBankDetails true ist)",
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
      .cancellation-note {
        margin-top: 10px;
        padding: 10px;
        border-left: 4px solid #c0392b;
        background: #fdecea;
        font-size: 12px;
        line-height: 18px;
      }
      .refund-note {
        margin-top: 10px;
        padding: 10px;
        border-left: 4px solid #2e7d32;
        background: #eaf5ea;
        font-size: 12px;
        line-height: 18px;
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
                    Stornobelegnummer: {{cancellationNumber}} <br />
                    Ursprüngliche Rechnungsnummer: {{originalInvoiceNumber}}
                    <br />
                    <br />
                    {{location}}, {{cancellationDate}}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <div class="information">
        <span style="font-size: larger; font-weight: bolder">
          Stornorechnung – Smart City Booking </span
        ><br /><br />
        <p>
          Sehr geehrte Damen und Herren,<br /><br />
          hiermit stornieren wir die Rechnung mit der Nummer
          <strong>{{originalInvoiceNumber}}</strong> vom
          {{originalInvoiceDate}}. Die nachfolgend aufgeführten Positionen
          werden Ihnen in voller Höhe gutgeschrieben.<br /><br />

          {{#if cancellationReason}}
          <strong>Grund der Stornierung:</strong>
          {{cancellationReason}}<br /><br />
          {{/if}} {{#if alreadyPaid}} Der bereits gezahlte Betrag in Höhe von
          <strong>{{refundAmount}}</strong> wird Ihnen auf folgendem Weg
          erstattet:<br />
          {{refundMethod}}<br />
          {{#if refundDate}} Voraussichtliches Erstattungsdatum:
          {{refundDate}}<br />
          {{/if}} {{#if refundReference}} Referenz: {{refundReference}}<br />
          {{/if}} {{else}} Sofern noch keine Zahlung erfolgt ist, entfällt die
          Zahlungsverpflichtung aus der ursprünglichen Rechnung. Bitte beachten
          Sie, dass diese Stornorechnung die Rechnung
          <strong>{{originalInvoiceNumber}}</strong> vollständig aufhebt.
          {{/if}}
          <br />
        </p>
      </div>

      {{{ mainContent }}} {{#if showBankDetails}}
      <div class="information">
        <strong>Unsere Bankverbindung für Rückfragen:</strong><br />
        {{ bank }} <br />
        IBAN: {{ iban }} <br />
        BIC: {{ bic }} <br />
      </div>
      {{/if}}

      <div class="information">
        Bei Rückfragen zu dieser Stornorechnung wenden Sie sich bitte unter
        Angabe der Stornobelegnummer <strong>{{cancellationNumber}}</strong>
        an uns.
      </div>

      <div class="information">
        Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift
        gültig.
      </div>
      <div class="footer"></div>
    </div>
  </body>
</html>

`,
      exampleData: {
        cancellationNumber: "STN-12345",
        location: "Berlin",
        cancellationDate: "2023-10-01",
        invoiceAddress: "Max Mustermann Musterstraße 1 12345 Musterstadt",
        mainContent: `<table  class="booked-items" style="width:100%; border-collapse: collapse;">
  <tr style="background: #eee; border-bottom: 1px solid #ddd;">
    <th class='bi-title'>Beschreibung</th>
            <th class='bi-amount'>Anzahl</th>
            <th class='bi-price-item'>Einzelpreis</th>
            <th class='bi-price-total'>Gesamtpreis</th>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td>Artikel 1</td>
    <td>1</td>
    <td> -100,00 EUR</td>
    <td> -100,00 EUR</td>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td>Artikel 2</td>
    <td>1</td>
    <td> -150,00 EUR</td>
    <td> -150,00 EUR</td>
  </tr>
  <tr>
    <td colspan="3"><strong>Gesamt</strong></td>
    <td><strong> -250,00 EUR</strong></td>
  </tr>
  <tr>
    <td colspan="3"><strong>zzgl. MwSt.</strong></td>
    <td><strong> -47,50 EUR</strong></td>
  </tr>
  <tr>
    <td colspan="3"><strong>Gesamtbetrag</strong></td>
    <td><strong> -297,50 EUR</strong></td>
  </tr>
</table>`,
        cancellationReason: "Kunde hat storniert",
        alreadyPaid: true,
      },
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
      this.internalTemplate = this.cancellationTemplate;
    },
  },
};
</script>

<style scoped></style>

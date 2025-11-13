<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Zahlungsbeleg Vorlage bearbeiten</span>
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
  name: "ReceiptTemplateDialog",
  components: { HTMLTemplateEditor },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    receiptTemplate: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      internalTemplate: "",
      templateVariables: [
        {
          name: "receiptNumber",
          placeholder: "{{receiptNumber}}",
          description: "Belegnummer der Zahlung",
        },
        {
          name: "bookingDate",
          placeholder: "{{bookingDate}}",
          description: "Datum der Buchung",
        },
        {
          name: "receiptAddress",
          placeholder: "{{{receiptAddress}}}",
          description: "Rechnungsadresse des Empfängers (HTML formatiert)",
        },
        {
          name: "isAggregated",
          placeholder: "{{#if isAggregated}}... {{else}} ... {{/if}}",
          description:
            "Bedingte Anweisung, die angibt, ob es sich um eine Sammelbuchung handelt",
        },
        {
          name: "bookingEntries",
          placeholder: "{{{bookingEntries}}}",
          description: "HTML-Tabelle mit den Details der gebuchten Objekten",
        },
      ],
      defaultTemplate:
        "<!doctype html>\n" +
        '<html lang="de">\n' +
        "  <head>\n" +
        '    <meta charset="utf-8" />\n' +
        "    <title>Ihr Zahlungsbeleg</title>\n" +
        "    <style>\n" +
        "      body {\n" +
        '        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;\n' +
        "        font-size: 1rem;\n" +
        "      }\n" +
        "      .booking-detail {\n" +
        "        border-collapse: collapse;\n" +
        "        width: 100%;\n" +
        "      }\n" +
        "      .booking-detail td,\n" +
        "      .booking-detail th {\n" +
        "        padding: 8px;\n" +
        "        border-bottom: 1px solid #ddd;\n" +
        "      }\n" +
        "      .total-row {\n" +
        "        font-weight: bold;\n" +
        "      }\n" +
        "    </style>\n" +
        "  </head>\n" +
        "  <body>\n" +
        '    <p class="receipt-data">\n' +
        "      Belegnummer: {{receiptNumber}}<br />\n" +
        "      Buchungsdatum: {{bookingDate}}\n" +
        "    </p>\n" +
        '    <p class="receipt-address">{{{receiptAddress}}}</p>\n' +
        "    <h1>Ihr Zahlungsbeleg</h1>\n" +
        "    <p>\n" +
        "      {{#if isAggregated}} Hiermit bestätigen wir den vollständigen\n" +
        "      Zahlungseingang für die folgenden Buchungen: {{else}} Hiermit bestätigen\n" +
        "      wir Ihre Buchung sowie den vollständigen Zahlungseingang für die folgenden\n" +
        "      Buchungsdaten: {{/if}}\n" +
        "    </p>\n" +
        "    {{{bookingEntries}}}\n" +
        "    <p>\n" +
        "      Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift\n" +
        "      gültig.\n" +
        "    </p>\n" +
        "  </body>\n" +
        "</html>\n",
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
      this.internalTemplate = this.receiptTemplate;
    },
  },
};
</script>

<style scoped></style>

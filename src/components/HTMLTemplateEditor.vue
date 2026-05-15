<template>
  <div>
    <v-tabs v-model="activeTab" background-color="transparent">
      <v-tab>Editor</v-tab>
      <v-tab>Vorschau</v-tab>
      <v-tab v-if="showVariables">Variablen</v-tab>
    </v-tabs>

    <v-tabs-items v-model="activeTab" class="mt-4">
      <v-tab-item>
        <v-textarea
          v-model="internalTemplate"
          filled
          :rows="editorRows"
          label="HTML Template"
          placeholder="<html>...</html>"
          @input="onTemplateChange"
          :error-messages="templateErrors"
          class="code-editor"
          ref="textarea"
        >
          <template v-slot:append>
            <v-tooltip left>
              <template v-slot:activator="{ on }">
                <v-btn icon small v-on="on" @click="formatTemplate">
                  <v-icon>mdi-code-braces</v-icon>
                </v-btn>
              </template>
              <span>Code formatieren</span>
            </v-tooltip>
          </template>
        </v-textarea>

        <v-alert
          v-if="templateValidation && internalTemplate"
          type="success"
          text
          dense
          class="mt-2"
        >
          Template ist valide
        </v-alert>

        <div class="d-flex mt-2">
          <v-btn
            text
            small
            color="primary"
            @click="loadDefaultTemplate"
            v-if="showDefaultTemplate"
          >
            <v-icon small left>mdi-restore</v-icon>
            Standardvorlage laden
          </v-btn>
          <v-btn text small color="error" @click="clearTemplate">
            <v-icon small left>mdi-delete</v-icon>
            Vorlage löschen
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            text
            small
            color="primary"
            @click="copyToClipboard"
            v-if="internalTemplate"
          >
            <v-icon small left>mdi-content-copy</v-icon>
            Kopieren
          </v-btn>
        </div>
      </v-tab-item>

      <v-tab-item>
        <v-card outlined class="preview-card">
          <v-toolbar dense flat color="grey lighten-4">
            <v-toolbar-title class="text-caption">
              Live-Vorschau
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn-toggle v-model="previewDevice" mandatory dense class="mr-2">
              <v-btn x-small value="desktop">
                <v-icon small>mdi-monitor</v-icon>
              </v-btn>
              <v-btn x-small value="tablet">
                <v-icon small>mdi-tablet</v-icon>
              </v-btn>
              <v-btn x-small value="mobile">
                <v-icon small>mdi-cellphone</v-icon>
              </v-btn>
            </v-btn-toggle>
          </v-toolbar>
          <v-card-text class="pa-0">
            <div
              v-if="internalTemplate"
              class="preview-container"
              :class="previewDeviceClass"
            >
              <iframe
                ref="previewIframe"
                :key="previewKey"
                class="preview-iframe"
                sandbox="allow-same-origin"
                @load="updateIframeContent"
              ></iframe>
            </div>
            <div v-else class="text-center grey--text py-8">
              <v-icon large color="grey lighten-1"> mdi-email-outline </v-icon>
              <div class="mt-2">Keine Vorlage vorhanden</div>
            </div>
          </v-card-text>
        </v-card>
      </v-tab-item>

      <v-tab-item v-if="showVariables">
        <v-card outlined>
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon left color="primary">mdi-code-tags</v-icon>
              <span class="text-subtitle-2">Verfügbare Platzhalter</span>
            </div>

            <v-alert type="info" text dense class="mb-4">
              Klicken Sie auf "Einfügen", um einen Platzhalter an der aktuellen
              Cursor-Position einzufügen.
            </v-alert>

            <v-simple-table dense>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th>Platzhalter</th>
                    <th>Beschreibung</th>
                    <th width="120">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="variable in variables" :key="variable.name">
                    <td>
                      <code class="variable-code">
                        {{ variable.placeholder }}
                      </code>
                    </td>
                    <td>{{ variable.description }}</td>
                    <td>
                      <v-btn
                        x-small
                        outlined
                        color="primary"
                        @click="insertVariable(variable.placeholder)"
                      >
                        <v-icon x-small left>mdi-plus</v-icon>
                        Einfügen
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script>
import prettier from "prettier/standalone";
import parserHtml from "prettier/parser-html";

export default {
  name: "HTMLTemplateEditor",
  props: {
    value: {
      type: String,
      default: "",
    },
    variables: {
      type: Array,
      default: () => [
        {
          name: "userName",
          placeholder: "{{userName}}",
          description: "Name des Empfängers",
        },
        {
          name: "userEmail",
          placeholder: "{{userEmail}}",
          description: "E-Mail des Empfängers",
        },
        {
          name: "subject",
          placeholder: "{{subject}}",
          description: "Betreff der E-Mail",
        },
        {
          name: "title",
          placeholder: "{{title}}",
          description: "Titel der E-Mail",
        },
        {
          name: "content",
          placeholder: "{{{content}}}",
          description: "Hauptinhalt der Nachricht",
        },
        {
          name: "companyName",
          placeholder: "{{companyName}}",
          description: "Name des Unternehmens",
        },
        {
          name: "currentDate",
          placeholder: "{{currentDate}}",
          description: "Aktuelles Datum",
        },
      ],
    },
    defaultTemplate: {
      type: String,
      default: null,
    },
    showVariables: {
      type: Boolean,
      default: true,
    },
    showDefaultTemplate: {
      type: Boolean,
      default: true,
    },
    editorRows: {
      type: Number,
      default: 20,
    },
    exampleData: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      activeTab: 0,
      internalTemplate: "",
      templateErrors: [],
      previewKey: 0,
      previewDevice: "desktop",
    };
  },
  computed: {
    previewHtml() {
      let html = this.internalTemplate || "";

      this.variables.forEach((variable) => {
        const example = this.getExampleData(variable.name);

        const varName = variable.placeholder
          .replace(/^\{+/, "")
          .replace(/\}+$/, "")
          .trim();

        const doublePattern = new RegExp(
          `\\{\\{\\s*${this.escapeRegex(varName)}\\s*\\}\\}`,
          "g"
        );

        const triplePattern = new RegExp(
          `\\{\\{\\{\\s*${this.escapeRegex(varName)}\\s*\\}\\}\\}`,
          "g"
        );

        html = html.replace(triplePattern, example);
        html = html.replace(doublePattern, example);
      });

      return html;
    },
    templateValidation() {
      return this.validateTemplate(this.internalTemplate);
    },
    previewDeviceClass() {
      return `preview-${this.previewDevice}`;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        this.internalTemplate = newVal || "";
      },
    },
    previewHtml() {
      this.updateIframeContent();
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.updateIframeContent();
    });
  },
  methods: {
    escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    updateIframeContent() {
      const iframe = this.$refs.previewIframe;
      if (!iframe || !iframe.contentWindow) return;

      const doc = iframe.contentDocument || iframe.contentWindow.document;

      doc.open();
      doc.write(this.previewHtml);
      doc.close();

      this.$nextTick(() => {
        try {
          // Berücksichtige auch absolut positionierte Elemente
          const body = doc.body;
          const html = doc.documentElement;

          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );

          iframe.style.height = Math.max(height + 50, 400) + "px"; // +50px Buffer
        } catch (e) {
          iframe.style.height = "400px";
        }
      });
    },

    onTemplateChange() {
      this.validateTemplate(this.internalTemplate);
      this.$emit("input", this.internalTemplate);
      this.$emit("change", this.internalTemplate);
    },

    validateTemplate(template) {
      if (!template) {
        this.templateErrors = [];
        return false;
      }

      this.templateErrors = [];

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(template, "text/html");

        const parserErrors = doc.getElementsByTagName("parsererror");
        if (parserErrors.length > 0) {
          this.templateErrors.push(
            "HTML-Syntax-Fehler: " + parserErrors[0].textContent
          );
          return false;
        }

        const selfClosingTags = [
          "area",
          "base",
          "br",
          "col",
          "embed",
          "hr",
          "img",
          "input",
          "link",
          "meta",
          "param",
          "source",
          "track",
          "wbr",
        ];

        let cleanTemplate = template
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<!DOCTYPE[^>]*>/gi, "");

        selfClosingTags.forEach((tag) => {
          const pattern = new RegExp(`<${tag}[^>]*\\/?>`, "gi");
          cleanTemplate = cleanTemplate.replace(pattern, "");
        });

        const openTags = (cleanTemplate.match(/<[^/!][^>]*>/g) || []).length;
        const closeTags = (cleanTemplate.match(/<\/[^>]+>/g) || []).length;

        if (openTags !== closeTags) {
          this.templateErrors.push(
            `Tags nicht ausgeglichen: ${openTags} öffnende, ${closeTags} schließende`
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error("Validierungsfehler:", error);
        this.templateErrors.push("Fehler bei der Validierung");
        return false;
      }
    },

    async formatTemplate() {
      try {
        const formatted = prettier.format(this.internalTemplate, {
          parser: "html",
          plugins: [parserHtml],
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: "css",
        });

        this.internalTemplate = formatted;
        this.onTemplateChange();
      } catch (error) {
        console.error("Formatierungsfehler:", error);
        this.formatTemplateSimple();
      }
    },

    formatTemplateSimple() {
      let formatted = this.internalTemplate;
      const indent = "  ";

      formatted = formatted.replace(/>\s*</g, ">\n<");

      const lines = formatted.split("\n");
      let indentLevel = 0;
      const formattedLines = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        if (trimmedLine.startsWith("</")) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        formattedLines.push(indent.repeat(indentLevel) + trimmedLine);

        if (
          trimmedLine.startsWith("<") &&
          !trimmedLine.startsWith("</") &&
          !trimmedLine.startsWith("<!") &&
          !trimmedLine.endsWith("/>") &&
          !trimmedLine.match(/<\w+[^>]*>.*<\/\w+>/)
        ) {
          indentLevel++;
        }
      });

      this.internalTemplate = formattedLines.join("\n");
      this.onTemplateChange();
    },

    insertVariable(placeholder) {
      const textarea = this.$refs.textarea?.$el?.querySelector("textarea");
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.internalTemplate || "";

      this.internalTemplate =
        text.substring(0, start) + placeholder + text.substring(end);

      this.onTemplateChange();

      this.$nextTick(() => {
        textarea.focus();
        const newPos = start + placeholder.length;
        textarea.setSelectionRange(newPos, newPos);
        this.activeTab = 0;
      });
    },

    loadDefaultTemplate() {
      const template = this.defaultTemplate || this.getBuiltInDefaultTemplate();


      this.internalTemplate = template;
      this.onTemplateChange();
      this.$emit("default-loaded");
    },

    getBuiltInDefaultTemplate() {
      return `<!DOCTYPE html>
<html lang="de">
  <head>
    <style>
      .content {
        text-align: left;
        background-color: white;
        border: 1px solid grey;
        padding: 10px 40px;
        border-radius: 2px;
        margin: auto;
        max-width: 750px;
      }

      body {
        align-content: center;
      }

      .layer {
        text-align: center;
      }
    </style>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ title }}</title>
  </head>

  <body>
    <div class="layer">
      <div class="content">
        <h1>{{ title }}</h1>
        <p>{{{ content }}}</p>
      </div>
    </div>
  </body>
  <footer class="footer"></footer>
</html>
`;
    },

    clearTemplate() {

      this.internalTemplate = "";
      this.onTemplateChange();
      this.$emit("cleared");
    },

    refreshPreview() {
      this.previewKey++;
      this.$nextTick(() => {
        this.updateIframeContent();
      });
    },

    copyToClipboard() {
      navigator.clipboard.writeText(this.internalTemplate).then(() => {
        this.$emit("copied");
      });
    },

    getExampleData(variableName) {
      if (this.exampleData[variableName]) {
        return this.exampleData[variableName];
      }

      const defaults = {
        userName: "Max Mustermann",
        userEmail: "max@beispiel.de",
        subject: "Beispiel-Betreff",
        title: "E-Mail Titel",
        bookingId: "BK-2024-0001",
        bookingPeriod: "14.10.2024, 10:00 - 14.10.2024, 20:00",
        content:
          "<p>Dies ist der Hauptinhalt der E-Mail.</p><p>Mit mehreren Absätzen.</p>",
        companyName: "Ihre Firma GmbH",
        currentDate: new Date().toLocaleDateString("de-DE"),
        receiptAddress: "Musterstraße 1, 12345 Musterstadt",
        receiptNumber: "RE-2024-0001",
        bookingDate: new Date().toLocaleDateString("de-DE"),
        invoiceDate: new Date().toLocaleDateString("de-DE"),

        bookingEntries: `<table class="booking-detail">
      <tr><td>Buchungsnummer</td><td>RCEE-SQJG</td></tr>
      <tr><td>Gesamt (netto)</td><td>29,83 €</td></tr>
      <tr><td>zzgl. MwSt.</td><td>5,67 €</td></tr>
      <tr><td>Gesamt (brutto)</td><td>35,50 €</td></tr>
      <tr><td>Zahlungsdatum</td><td>13.11.2025, 16:00</td></tr>
      <tr><td>Zahlungsmethode</td><td>Überweisung</td></tr>
      <tr><td>Buchungszeitraum</td><td>14.11.2025, 14:01 – 14.11.2025, 17:00</td></tr>
      <tr><td>Buchungsobjekt</td><td>Backen mit "The Rock", Menge: 1</td></tr>
    </table>`,
        daysUntilPaymentDue: "14",
        totalAmount: "297,50",
        mainContent: `

 <table  class="booked-items" style="width:100%; border-collapse: collapse;">
  <tr style="background: #eee; border-bottom: 1px solid #ddd;">
    <th class='bi-title'>Beschreibung</th>
            <th class='bi-amount'>Anzahl</th>
            <th class='bi-price-item'>Einzelpreis</th>
            <th class='bi-price-total'>Gesamtpreis</th>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td>Artikel 1</td>
    <td>1</td>
    <td>100,00 EUR</td>
    <td>100,00 EUR</td>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td>Artikel 2</td>
    <td>1</td>
    <td>150,00 EUR</td>
    <td>150,00 EUR</td>
  </tr>
  <tr>
    <td colspan="3"><strong>Gesamt</strong></td>
    <td><strong>250,00 EUR</strong></td>
  </tr>
  <tr>
    <td colspan="3"><strong>zzgl. MwSt.</strong></td>
    <td><strong>47,50 EUR</strong></td>
  </tr>
  <tr>
    <td colspan="3"><strong>Gesamtbetrag</strong></td>
    <td><strong>297,50 EUR</strong></td>
  </tr>
</table>`,
        invoiceNumber: "INV-2024-0001",
        invoiceAddress: "Musterstraße 1, 12345 Musterstadt",
        bank: "Musterbank",
        iban: "DE89 3704 0044 0532 013000",
        bic: "COBADEFFXXX",
        location: "Musterstadt",
        purposeOfPayment: "Rechnung INV-2024-0001",
      };

      return defaults[variableName] || "";
    },
  },
};
</script>

<style scoped>
.code-editor >>> textarea {
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
}

.preview-card {
  max-height: 700px;
  overflow-y: auto;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #f5f5f5;
  min-height: 400px;
  transition: all 0.3s ease;
}

.preview-iframe {
  width: 100%;
  border: 1px solid #e0e0e0;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 400px;
  border-radius: 4px;
}

.preview-desktop .preview-iframe {
  max-width: 100%;
}

.preview-tablet .preview-iframe {
  max-width: 768px;
}

.preview-mobile .preview-iframe {
  max-width: 375px;
}

.variable-code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  color: #e91e63;
  font-size: 13px;
}
</style>

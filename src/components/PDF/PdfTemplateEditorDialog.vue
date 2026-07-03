<template>
  <v-dialog v-model="dialogOpen" persistent max-width="1400px" scrollable>
    <v-card v-if="catalog">
      <v-card-title class="d-flex align-center">
        <v-icon left>{{ catalog.icon }}</v-icon>
        <span class="text-h6">{{ catalog.title }}</span>
        <v-chip
          x-small
          :color="mode === 'expert' ? 'warning' : 'success'"
          class="ml-3"
          text-color="white"
        >
          {{ mode === "expert" ? "Experten-Modus" : "Visuell" }}
        </v-chip>
        <v-spacer />
        <v-btn icon @click="onClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-subtitle>
        <div class="mt-1 mb-1 text-body-2 grey--text text--darken-1">
          {{ catalog.description }}
        </div>
        <v-alert type="info" text dense class="text-caption mb-0">
          Das Dokument wird automatisch in ein gültiges
          <code>&lt;!doctype html&gt;</code>-Gerüst eingebettet. Pflicht-
          Platzhalter wie <code>{{ requiredVariableLabels.join(", ") }}</code>
          (oder ein entsprechendes Partial wie
          <code>{{ partialExampleSnippet }}</code>) müssen vorhanden
          bleiben, sonst rendert das PDF unvollständig.
        </v-alert>
      </v-card-subtitle>

      <v-card-text class="pa-3">
        <v-tabs v-model="activeTab" background-color="transparent" class="mb-3">
          <v-tab>
            <v-icon left small>mdi-view-grid-outline</v-icon>
            Visuell
          </v-tab>
          <v-tab>
            <v-icon left small>mdi-eye-outline</v-icon>
            Vorschau
          </v-tab>
          <v-tab>
            <v-icon left small>mdi-code-tags</v-icon>
            Experten (HTML)
          </v-tab>
        </v-tabs>

        <v-tabs-items v-model="activeTab">
          <!-- Tab 1: Visuell -->
          <v-tab-item :transition="false" eager>
            <div v-if="mode === 'expert' && !expertConfirmed">
              <v-alert type="warning" text>
                Dieses Template wurde im Experten-Modus bearbeitet und kann
                nicht automatisch in den visuellen Editor zurückgewandelt
                werden.
                <div class="mt-2">
                  <v-btn small color="primary" @click="startFromScratch">
                    <v-icon left small>mdi-restart</v-icon>
                    Mit visueller Vorlage neu starten
                  </v-btn>
                </div>
              </v-alert>
            </div>
            <BlockEditor
              v-else
              v-model="blocks"
              :variables="catalog.variables"
              @change="onBlocksChange"
            />
            <v-alert
              v-if="mode === 'visual' && missingInBlocks.length"
              type="warning"
              text
              dense
              class="mt-3"
            >
              Pflicht-Platzhalter im visuellen Modell fehlen:
              <code>{{ missingInBlocks.join(", ") }}</code>. Füge sie als
              Roh-HTML-Baustein oder über den Variablen-Picker im Text-Baustein
              ein.
            </v-alert>

            <v-card outlined class="mt-4">
              <v-card-title class="text-subtitle-2 py-2">
                <v-icon small left>mdi-page-layout-header-footer</v-icon>
                Seitenkopf / Seitenfuß (auf jeder Seite wiederholt)
              </v-card-title>
              <v-card-text>
                <v-alert type="info" text dense class="text-caption mb-3">
                  Kopf- und Fußzeile erscheinen nur im PDF – auf jeder Seite
                  wiederholt. In der Browser-Vorschau werden sie ausgeblendet;
                  prüfe sie über die PDF-Vorschau. Inhalte benötigen
                  Inline-Styles (Grundformatierung wie Schriftgröße und Ränder
                  wird automatisch ergänzt).
                </v-alert>
                <v-alert
                  v-if="mode === 'expert'"
                  type="info"
                  text
                  dense
                  class="text-caption mb-3"
                >
                  Experten-Modus: Beim Speichern ersetzen diese Felder vorhandene
                  <code>&lt;template data-pdf-header/footer&gt;</code>-Elemente
                  im Experten-HTML.
                </v-alert>
                <v-textarea
                  v-model="pageHeaderHtml"
                  filled
                  dense
                  rows="2"
                  auto-grow
                  hide-details
                  label="Seitenkopf (HTML, optional)"
                  class="code-editor mb-1"
                />
                <div class="d-flex mb-3">
                  <v-btn
                    x-small
                    text
                    @click="appendPageSnippet('pageHeaderHtml', pageNumberSpan)"
                  >
                    + Seitenzahl
                  </v-btn>
                  <v-btn
                    x-small
                    text
                    @click="appendPageSnippet('pageHeaderHtml', totalPagesSpan)"
                  >
                    + Gesamtseiten
                  </v-btn>
                </div>
                <v-textarea
                  v-model="pageFooterHtml"
                  filled
                  dense
                  rows="2"
                  auto-grow
                  hide-details
                  label="Seitenfuß (HTML, optional)"
                  class="code-editor mb-1"
                />
                <div class="d-flex">
                  <v-btn
                    x-small
                    text
                    @click="appendPageSnippet('pageFooterHtml', pageNumberSpan)"
                  >
                    + Seitenzahl
                  </v-btn>
                  <v-btn
                    x-small
                    text
                    @click="appendPageSnippet('pageFooterHtml', totalPagesSpan)"
                  >
                    + Gesamtseiten
                  </v-btn>
                  <v-spacer />
                  <v-btn x-small text @click="resetPageTemplatesToDefault">
                    <v-icon x-small left>mdi-restore</v-icon>
                    Standard-Fußzeile
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-tab-item>

          <!-- Tab 2: Vorschau -->
          <v-tab-item :transition="false">
            <v-card outlined class="preview-card">
              <v-toolbar dense flat color="grey lighten-4">
                <v-toolbar-title class="text-caption">
                  {{
                    previewMode === "pdf"
                      ? "PDF-Vorschau (mit mehrseitigen Demodaten)"
                      : "Live-Vorschau (mit Demodaten)"
                  }}
                  · Buchungsdarstellung: {{ pdfBookingLayoutLabel }}
                </v-toolbar-title>
                <v-spacer />
                <v-btn-toggle
                  v-model="previewMode"
                  mandatory
                  dense
                  class="mr-2"
                >
                  <v-btn x-small value="browser">
                    <v-icon small left>mdi-web</v-icon>
                    Browser
                  </v-btn>
                  <v-btn x-small value="pdf" :disabled="!tenantId">
                    <v-icon small left>mdi-file-pdf-box</v-icon>
                    PDF
                  </v-btn>
                </v-btn-toggle>
                <v-btn-toggle
                  v-if="previewMode === 'browser'"
                  v-model="previewDevice"
                  mandatory
                  dense
                  class="mr-2"
                >
                  <v-btn x-small value="desktop">
                    <v-icon small>mdi-monitor</v-icon>
                  </v-btn>
                  <v-btn x-small value="a4">
                    <v-icon small>mdi-file-document-outline</v-icon>
                  </v-btn>
                </v-btn-toggle>
                <v-btn
                  v-if="previewMode === 'pdf'"
                  x-small
                  outlined
                  :loading="pdfLoading"
                  @click="refreshPdfPreview"
                >
                  <v-icon x-small left>mdi-refresh</v-icon>
                  Aktualisieren
                </v-btn>
              </v-toolbar>
              <v-card-text class="pa-0">
                <div
                  v-if="previewMode === 'browser'"
                  class="preview-container"
                  :class="previewDeviceClass"
                >
                  <iframe
                    ref="previewIframe"
                    :key="previewKey"
                    class="preview-iframe"
                    sandbox="allow-same-origin"
                  ></iframe>
                </div>
                <div v-else class="pdf-preview-container">
                  <v-alert
                    v-if="pdfError"
                    type="error"
                    text
                    dense
                    class="ma-3"
                  >
                    <div class="pdf-error-text">{{ pdfError }}</div>
                  </v-alert>
                  <div v-if="pdfLoading" class="pdf-preview-loading">
                    <v-progress-circular indeterminate color="primary" />
                    <div class="text-caption grey--text mt-3">
                      PDF wird auf dem Server gerendert …
                    </div>
                  </div>
                  <embed
                    v-else-if="pdfUrl && !pdfError"
                    :src="pdfUrl"
                    type="application/pdf"
                    class="pdf-preview-embed"
                  />
                  <div
                    v-else-if="!pdfError"
                    class="pdf-preview-loading text-caption grey--text"
                  >
                    Noch keine PDF-Vorschau erzeugt. Klicke auf "Aktualisieren".
                  </div>
                </div>
              </v-card-text>
            </v-card>
            <div class="text-caption grey--text mt-2">
              <template v-if="previewMode === 'pdf'">
                Serverseitig gerendert mit mehrseitigen Beispieldaten –
                Seitenumbrüche, Kopf-/Fußzeilen und Seitenzahlen entsprechen dem
                echten PDF.
              </template>
              <template v-else>
                Vorgerendert mit Demodaten
                ({{ Object.keys(catalog.sampleData).join(", ") }}).
                Seitenumbrüche und Kopf-/Fußzeilen sind nur in der PDF-Vorschau
                sichtbar.
              </template>
            </div>
          </v-tab-item>

          <!-- Tab 3: Experten -->
          <v-tab-item :transition="false">
            <v-alert
              v-if="mode !== 'expert'"
              type="warning"
              text
              dense
              class="mb-2"
            >
              Im Experten-Modus wird das visuelle Modell überschrieben. Beim
              Wechsel zurück lässt sich das Modell nicht automatisch
              rekonstruieren – du kannst aber jederzeit "Mit visueller Vorlage
              neu starten" wählen.
            </v-alert>
            <v-textarea
              v-model="expertHtml"
              filled
              :rows="22"
              label="Handlebars/HTML (komplettes Dokument)"
              class="code-editor"
              @input="onExpertEdit"
            />
            <v-alert
              v-if="!validDocument && expertHtml"
              type="error"
              text
              dense
              class="mt-2"
            >
              Das Template enthält nicht alle Pflicht-Tags
              (<code>&lt;!DOCTYPE html&gt;</code>,
              <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>,
              <code>&lt;body&gt;</code>) – der Server würde ein leeres PDF
              erzeugen.
            </v-alert>
            <v-alert
              v-if="missingInExpert.length"
              type="warning"
              text
              dense
              class="mt-2"
            >
              Pflicht-Platzhalter fehlen:
              <code>{{ missingInExpert.join(", ") }}</code>.
            </v-alert>
            <div class="d-flex flex-wrap mt-2">
              <v-btn small outlined @click="resetToDefault" class="mr-2 mb-1">
                <v-icon small left>mdi-restore</v-icon>
                Auf Standardvorlage zurücksetzen
              </v-btn>
              <v-btn small outlined @click="copyToClipboard" class="mr-2 mb-1">
                <v-icon small left>mdi-content-copy</v-icon>
                Kopieren
              </v-btn>
              <v-spacer />
              <div>
                <v-menu offset-y content-class="variable-menu-content">
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn small text v-bind="attrs" v-on="on">
                      <v-icon small left>mdi-code-tags</v-icon>
                      Variable einfügen
                    </v-btn>
                  </template>
                  <v-list
                    dense
                    class="variable-menu"
                    style="max-height: 320px; overflow-y: auto; background: #fff;"
                  >
                    <template v-for="group in groupedVariables">
                      <v-subheader
                        v-if="group.items.length"
                        :key="`header-${group.key}`"
                        class="text-uppercase"
                      >
                        {{ group.label }}
                      </v-subheader>
                      <v-list-item
                        v-for="v in group.items"
                        :key="`${group.key}-${v.name}`"
                        @click="insertVariable(v)"
                      >
                        <v-list-item-content>
                          <v-list-item-title>
                            {{ v.label || v.name }}
                          </v-list-item-title>
                          <v-list-item-subtitle>
                            <code>{{ v.placeholder }}</code>
                            <span v-if="v.description" class="ml-1 grey--text">
                              - {{ v.description }}
                            </span>
                          </v-list-item-subtitle>
                        </v-list-item-content>
                      </v-list-item>
                    </template>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>

      <v-card-actions class="border-top">
        <div class="text-caption grey--text">
          {{ Math.round((currentSize / 1024) * 10) / 10 }} KB
        </div>
        <v-spacer />
        <v-btn text @click="onClose">abbrechen</v-btn>
        <v-btn color="primary" @click="onSave">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import BlockEditor from "@/components/Mail/BlockEditor/BlockEditor.vue";
import {
  cryptoRandomId,
  renderBlocksToHtml,
} from "@/components/Mail/BlockEditor/render/renderBlocksToHtml.js";
import {
  extractBlockMetadata,
  embedBlockMetadata,
} from "@/components/Mail/BlockEditor/render/parseMetadata.js";
import {
  getPdfTemplateCatalogEntry,
  isValidPdfTemplate,
  findMissingRequiredVariables,
  getRequiredVariableLabels,
  extractPdfPageTemplates,
  applyPdfPageTemplates,
  decodeHandlebarsEntities,
  stripVariableChips,
} from "@/components/PDF/pdfTemplateCatalog.js";
import ApiTenantService from "@/services/api/ApiTenantService.js";
import { registerPdfRuntime } from "@/components/PDF/pdfHandlebarsRuntime.js";
import {
  buildPdfPreviewSampleData,
  DEFAULT_PDF_BOOKING_LAYOUT,
} from "@/components/PDF/pdfSampleDataBuilder.js";

export default {
  name: "PdfTemplateEditorDialog",
  components: { BlockEditor },
  props: {
    open: { type: Boolean, default: false },
    templateType: {
      type: String,
      required: true,
      validator: (v) => ["receipt", "invoice", "cancellation"].includes(v),
    },
    value: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    pdfBookingLayout: {
      type: String,
      default: DEFAULT_PDF_BOOKING_LAYOUT,
    },
  },
  data() {
    return {
      activeTab: 0,
      blocks: [],
      expertHtml: "",
      mode: "visual",
      expertConfirmed: false,
      previewKey: 0,
      previewDevice: "desktop",
      previewMode: "browser",
      previewRenderToken: 0,
      previewSampleDataCache: null,
      handlebarsLib: null,
      pdfLoading: false,
      pdfError: null,
      pdfUrl: null,
      pdfRequestToken: 0,
      pageHeaderHtml: "",
      pageFooterHtml: "",
      pageNumberSpan: "<span class=\"pageNumber\"></span>",
      totalPagesSpan: "<span class=\"totalPages\"></span>",
    };
  },
  computed: {
    dialogOpen: {
      get() {
        return this.open;
      },
      set(v) {
        if (!v) this.$emit("close");
      },
    },
    catalog() {
      return getPdfTemplateCatalogEntry(this.templateType);
    },
    requiredVariableLabels() {
      if (!this.catalog) return [];
      return getRequiredVariableLabels(this.catalog.requiredVariables);
    },
    partialExampleSnippet() {
      return "{{> pdfBookingItemsTable …}}";
    },
    composedOutput() {
      return this.composeOutput();
    },
    currentSize() {
      return new Blob([this.composedOutput]).size;
    },
    validDocument() {
      return isValidPdfTemplate(this.composedOutput);
    },
    missingInBlocks() {
      if (!this.catalog) return [];
      const html = this.normalizeBlockHtml(
        renderBlocksToHtml(this.blocks || []),
      );
      return findMissingRequiredVariables(html, this.catalog.requiredVariables);
    },
    missingInExpert() {
      if (!this.catalog) return [];
      if (this.mode !== "expert") return [];
      return findMissingRequiredVariables(
        this.expertHtml,
        this.catalog.requiredVariables,
      );
    },
    previewDeviceClass() {
      return `preview-${this.previewDevice}`;
    },
    pdfBookingLayoutLabel() {
      const labels = {
        summary: "Zusammenfassung",
        compact: "Kompakt",
        detailed: "Ausführlich",
      };
      return labels[this.pdfBookingLayout] || labels.detailed;
    },
    groupedVariables() {
      const variables = (this.catalog && this.catalog.variables) || [];
      return [
        {
          key: "variables",
          label: "Variablen",
          items: variables.filter((v) => !v.category),
        },
        {
          key: "helpers",
          label: "Helper",
          items: variables.filter((v) => v.category === "helper"),
        },
        {
          key: "partials",
          label: "Partials (Tabellen-Bausteine)",
          items: variables.filter((v) => v.category === "partial"),
        },
      ];
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(v) {
        if (v) {
          this.loadFromValue();
        } else {
          this.resetPdfPreview();
        }
      },
    },
    templateType() {
      if (this.open) this.loadFromValue();
    },
    activeTab(newTab) {
      if (newTab === 1) {
        if (this.previewMode === "pdf") {
          this.refreshPdfPreview();
        } else {
          this.schedulePreviewUpdate();
        }
      }
      // Experten-Tab zeigt immer die aktuelle Komposition des visuellen
      // Modells (nicht den zuletzt gespeicherten Stand).
      if (newTab === 2 && this.mode === "visual") {
        this.expertHtml = this.composeFromBlocks(this.blocks);
      }
    },
    previewMode(newMode) {
      if (newMode === "pdf") {
        this.refreshPdfPreview();
      } else {
        this.schedulePreviewUpdate();
      }
    },
    pdfBookingLayout() {
      if (!this.open) return;
      this.previewSampleDataCache = null;
      if (this.activeTab === 1) {
        if (this.previewMode === "pdf") {
          this.refreshPdfPreview();
        } else {
          this.schedulePreviewUpdate();
        }
      }
    },
    pageHeaderHtml() {
      this.onPageTemplatesChange();
    },
    pageFooterHtml() {
      this.onPageTemplatesChange();
    },
  },
  methods: {
    loadFromValue() {
      const incoming = this.normalizeLegacyTemplate(this.value || "");
      this.expertConfirmed = false;
      this.previewDevice = "desktop";
      this.previewMode = "browser";
      this.previewSampleDataCache = null;
      this.resetPdfPreview();
      if (!incoming) {
        this.applyDefaultPageTemplates();
        this.blocks = this.makeDefaultBlocks();
        this.expertHtml = this.composeFromBlocks(this.blocks);
        this.mode = "visual";
        this.activeTab = 0;
        this.previewKey++;
        return;
      }
      const pageTemplates = extractPdfPageTemplates(incoming);
      this.pageHeaderHtml = pageTemplates.headerHtml;
      this.pageFooterHtml = pageTemplates.footerHtml;
      const { blocks, body } = extractBlockMetadata(incoming);
      if (blocks) {
        this.blocks = this.normalizeBlockIds(
          this.normalizeLegacyBlocks(blocks),
        );
        this.expertHtml = body;
        this.mode = "visual";
        this.activeTab = 0;
      } else {
        this.blocks = this.makeDefaultBlocks();
        this.expertHtml = incoming;
        this.mode = "expert";
        this.activeTab = 2;
      }
      this.$nextTick(() => {
        this.previewKey++;
      });
    },
    makeDefaultBlocks() {
      if (!this.catalog) return [];
      try {
        return this.normalizeBlockIds(
          this.normalizeLegacyBlocks(this.catalog.defaultBlocks()),
        );
      } catch (_) {
        return [];
      }
    },
    normalizeLegacyTemplate(html) {
      if (this.templateType !== "cancellation") return html;
      const oldRefundBlock =
        "{{#if alreadyPaid}}" +
        "<p>Der bereits gezahlte Betrag in Höhe von <strong>{{refundAmount}}</strong> wird Ihnen per {{refundMethod}} erstattet." +
        "{{#if customerBankDetails}}{{{customerBankDetails}}}{{/if}}" +
        "{{else}}" +
        "<p>Sofern noch keine Zahlung erfolgt ist, entfällt die Zahlungsverpflichtung aus der ursprünglichen Rechnung.</p>" +
        "{{/if}}";
      const newRefundBlock =
        "{{#if alreadyPaid}}" +
        "<p>Der bereits gezahlte Betrag in Höhe von <strong>{{refundAmount}}</strong> wird Ihnen per {{refundMethod}} erstattet." +
        "{{#if customerBankDetails}}{{{customerBankDetails}}}{{/if}}" +
        "{{/if}}" +
        "{{#unless alreadyPaid}}" +
        "<p>Sofern noch keine Zahlung erfolgt ist, entfällt die Zahlungsverpflichtung aus der ursprünglichen Rechnung.</p>" +
        "{{/unless}}";
      return String(html || "").split(oldRefundBlock).join(newRefundBlock);
    },
    normalizeLegacyBlocks(blocks) {
      const normalizeBlock = (block) => {
        const next = { ...(block || {}) };
        if (typeof next.html === "string") {
          next.html = this.normalizeLegacyTemplate(next.html);
        }
        if (Array.isArray(next.columns)) {
          next.columns = next.columns.map((column) => ({
            ...column,
            blocks: (column.blocks || []).map(normalizeBlock),
          }));
        }
        return next;
      };
      return (blocks || []).map(normalizeBlock);
    },
    normalizeBlockIds(blocks) {
      const seen = new Set();
      const ensureId = (block) => {
        const next = { ...(block || {}) };
        if (!next.id || seen.has(next.id)) {
          next.id = cryptoRandomId();
        }
        seen.add(next.id);
        if (Array.isArray(next.columns)) {
          next.columns = next.columns.map((column) => ({
            ...column,
            blocks: (column.blocks || []).map(ensureId),
          }));
        }
        return next;
      };
      return JSON.parse(JSON.stringify(blocks || [])).map(ensureId);
    },
    currentPageTemplates() {
      return {
        headerHtml: this.pageHeaderHtml,
        footerHtml: this.pageFooterHtml,
      };
    },
    applyDefaultPageTemplates() {
      const defaults =
        this.catalog && this.catalog.defaultPageTemplates
          ? this.catalog.defaultPageTemplates()
          : { headerHtml: "", footerHtml: "" };
      this.pageHeaderHtml = defaults.headerHtml;
      this.pageFooterHtml = defaults.footerHtml;
    },
    resetPageTemplatesToDefault() {
      this.applyDefaultPageTemplates();
    },
    appendPageSnippet(field, snippet) {
      this[field] = `${this[field] || ""}${snippet}`;
    },
    // Reihenfolge wichtig: erst Chips entfernen (solange Attributwerte noch
    // HTML-escaped sind), dann Entities in Mustache-Ausdrücken dekodieren.
    normalizeBlockHtml(html) {
      return decodeHandlebarsEntities(stripVariableChips(html));
    },
    composeFromBlocks(blocks) {
      if (!this.catalog) return "";
      const bodyHtml = this.normalizeBlockHtml(
        renderBlocksToHtml(blocks || []),
      );
      return this.catalog.buildDocument(bodyHtml, this.currentPageTemplates());
    },
    onBlocksChange({ html }) {
      const normalized = this.normalizeBlockHtml(html);
      this.expertHtml = this.catalog
        ? this.catalog.buildDocument(normalized, this.currentPageTemplates())
        : normalized;
      this.mode = "visual";
    },
    onExpertEdit() {
      this.mode = "expert";
    },
    startFromScratch() {
      this.expertConfirmed = true;
      this.applyDefaultPageTemplates();
      this.blocks = this.makeDefaultBlocks();
      this.expertHtml = this.composeFromBlocks(this.blocks);
      this.mode = "visual";
      this.activeTab = 0;
    },
    resetToDefault() {
      this.applyDefaultPageTemplates();
      this.blocks = this.makeDefaultBlocks();
      this.expertHtml = this.composeFromBlocks(this.blocks);
      this.expertConfirmed = true;
      this.mode = "expert";
    },
    composeOutput() {
      if (this.mode === "visual") {
        const html = this.composeFromBlocks(this.blocks);
        return embedBlockMetadata(this.blocks || [], html);
      }
      return applyPdfPageTemplates(
        this.expertHtml || "",
        this.currentPageTemplates(),
      );
    },
    onPageTemplatesChange() {
      if (this.mode === "visual" && this.activeTab === 2) {
        this.expertHtml = this.composeFromBlocks(this.blocks);
      }
      if (this.open && this.activeTab === 1 && this.previewMode === "browser") {
        this.schedulePreviewUpdate();
      }
    },
    onSave() {
      this.$emit("submit", this.composeOutput());
    },
    onClose() {
      this.$emit("close");
    },
    insertVariable(variable) {
      const textarea = this.$el.querySelector(".code-editor textarea");
      const placeholder = variable.placeholder;
      if (!textarea) {
        this.expertHtml = (this.expertHtml || "") + placeholder;
        this.onExpertEdit();
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.expertHtml || "";
      this.expertHtml =
        text.substring(0, start) + placeholder + text.substring(end);
      this.onExpertEdit();
      this.$nextTick(() => {
        textarea.focus();
        const newPos = start + placeholder.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    copyToClipboard() {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(this.expertHtml || "");
    },
    async ensureHandlebars() {
      if (this.handlebarsLib) return this.handlebarsLib;
      try {
        const mod = await import(
          /* webpackChunkName: "handlebars" */ "handlebars"
        );
        this.handlebarsLib = mod.default || mod;
        registerPdfRuntime(this.handlebarsLib);
      } catch (e) {
        this.handlebarsLib = null;
      }
      return this.handlebarsLib;
    },
    simpleVarReplace(html) {
      if (!this.catalog) return html;
      let out = html || "";
      const sampleData =
        this.previewSampleDataCache || this.catalog.sampleData || {};
      Object.entries(sampleData).forEach(([k, v]) => {
        if (v == null || typeof v === "object") return;
        const triple = new RegExp(`\\{\\{\\{\\s*${k}\\s*\\}\\}\\}`, "g");
        const double = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
        out = out.replace(triple, v);
        out = out.replace(double, v);
      });
      return out;
    },
    async getPreviewSampleData() {
      const hb = await this.ensureHandlebars();
      if (!hb || !this.catalog) {
        return this.catalog?.sampleData || {};
      }
      return buildPdfPreviewSampleData(
        this.templateType,
        this.pdfBookingLayout,
        hb,
      );
    },
    schedulePreviewUpdate() {
      const token = ++this.previewRenderToken;
      this.$nextTick(() => {
        const run = () => {
          if (token === this.previewRenderToken) {
            this.updatePreview(token);
          }
        };
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(run);
        } else {
          setTimeout(run, 0);
        }
      });
    },
    async updatePreview(token = this.previewRenderToken) {
      const sourceHtml =
        this.mode === "visual"
          ? this.composeFromBlocks(this.blocks)
          : this.expertHtml || "";

      let rendered = sourceHtml;
      try {
        const hb = await this.ensureHandlebars();
        if (hb) {
          const sampleData = await this.getPreviewSampleData();
          if (token === this.previewRenderToken) {
            this.previewSampleDataCache = sampleData;
          }
          rendered = hb.compile(sourceHtml)(sampleData);
        } else {
          rendered = this.simpleVarReplace(sourceHtml);
        }
      } catch (e) {
        rendered =
          "<!doctype html><html><body style=\"font-family:sans-serif;color:#b71c1c;padding:24px;\">" +
          `<strong>Vorschau-Fehler:</strong> ${String(e.message || e)}` +
          "</body></html>";
      }

      if (token !== this.previewRenderToken) return;
      const iframe = this.$refs.previewIframe;
      if (!iframe || !iframe.contentWindow) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;

      doc.open();
      doc.write(rendered);
      doc.close();
      this.$nextTick(() => {
        try {
          const body = doc.body;
          const htmlEl = doc.documentElement;
          const h = Math.max(
            body.scrollHeight,
            htmlEl.scrollHeight,
            body.offsetHeight,
            htmlEl.offsetHeight,
            500,
          );
          iframe.style.height = h + 32 + "px";
        } catch (_) {
          iframe.style.height = "500px";
        }
      });
    },
    resetPdfPreview() {
      this.pdfRequestToken++;
      this.pdfLoading = false;
      this.pdfError = null;
      if (this.pdfUrl) {
        URL.revokeObjectURL(this.pdfUrl);
        this.pdfUrl = null;
      }
    },
    async refreshPdfPreview() {
      if (!this.tenantId) {
        this.pdfError =
          "Keine Mandanten-ID vorhanden – PDF-Vorschau nicht möglich.";
        return;
      }
      const token = ++this.pdfRequestToken;
      this.pdfLoading = true;
      this.pdfError = null;
      try {
        const response = await ApiTenantService.getPdfPreview(
          this.tenantId,
          this.templateType,
          this.composeOutput(),
          this.pdfBookingLayout,
        );
        if (token !== this.pdfRequestToken) return;
        if (this.pdfUrl) {
          URL.revokeObjectURL(this.pdfUrl);
        }
        this.pdfUrl = URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" }),
        );
      } catch (error) {
        if (token !== this.pdfRequestToken) return;
        this.pdfError = await this.extractPdfPreviewError(error);
      } finally {
        if (token === this.pdfRequestToken) {
          this.pdfLoading = false;
        }
      }
    },
    async extractPdfPreviewError(error) {
      const data = error?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          if (text) return text;
        } catch (_) {
          // fall through to generic message
        }
      } else if (typeof data === "string" && data) {
        return data;
      }
      if (error?.response?.status === 403) {
        return "Keine Berechtigung für die PDF-Vorschau (403).";
      }
      return "PDF-Vorschau konnte nicht erzeugt werden.";
    },
  },
  beforeDestroy() {
    this.resetPdfPreview();
  },
  mounted() {
    this.$watch(
      () => [this.blocks, this.expertHtml, this.mode, this.previewDevice],
      () => {
        if (this.activeTab === 1 && this.previewMode === "browser") {
          this.schedulePreviewUpdate();
        }
      },
      { deep: true },
    );
  },
};
</script>

<style scoped>
.preview-card {
  max-height: 720px;
  overflow-y: auto;
  background: #f5f5f5;
}
.preview-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: #f5f5f5;
}
.preview-iframe {
  width: 100%;
  border: 0;
  background: white;
  min-height: 500px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.preview-desktop .preview-iframe {
  max-width: 100%;
}
.preview-a4 .preview-iframe {
  max-width: 794px; /* ~A4 @ 96dpi */
}
.pdf-preview-container {
  background: #f5f5f5;
  min-height: 500px;
}
.pdf-preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
.pdf-preview-embed {
  width: 100%;
  height: 640px;
  border: 0;
  background: white;
}
.pdf-error-text {
  white-space: pre-wrap;
  font-family: "Courier New", monospace;
  font-size: 12px;
}
.code-editor >>> textarea {
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
}
.border-top {
  border-top: 1px solid #eee;
}
.variable-menu {
  background: #fff !important;
  border-radius: 4px;
}
.variable-menu >>> .v-list-item {
  background: #fff;
}
.variable-menu code {
  font-family: "Courier New", monospace;
  font-size: 11px;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  color: #c2185b;
}
</style>

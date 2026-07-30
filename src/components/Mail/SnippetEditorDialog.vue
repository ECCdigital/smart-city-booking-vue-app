<template>
  <div>
    <v-dialog v-model="dialogOpen" persistent max-width="1400px" scrollable>
      <v-card v-if="snippet">
        <v-card-title class="d-flex align-center">
          <v-icon left>{{ snippet.icon }}</v-icon>
          <span class="text-h6">{{ snippet.title }}</span>
          <v-spacer />
          <v-btn icon @click="onClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-subtitle>
          <div class="mt-1 mb-1 text-body-2 grey--text text--darken-1">
            {{ snippet.description }}
          </div>
          <v-alert type="info" text dense class="text-caption mb-0">
            Buchungsdetails, Buttons, QR-Code und der System-Footer werden vom
            Server automatisch zwischen Einleitung und Abschluss eingefügt. Eine
            eigene Überschrift kannst du am Anfang der Einleitung einbauen
            (z.&nbsp;B. <code>&lt;h1&gt;…&lt;/h1&gt;</code>). Der Abschluss ist
            optional und erscheint danach – vor dem Layout-Footer.
          </v-alert>
        </v-card-subtitle>

        <v-card-text class="pa-3">
          <div class="subject-field-wrapper mb-4">
            <v-text-field
              v-model="subjectValue"
              label="Betreff der Mail (optional)"
              :hint="subjectFieldHint"
              persistent-hint
              outlined
              dense
              :counter="MAX_SUBJECT_LENGTH"
              :error-messages="subjectErrors"
              :placeholder="snippet.defaultSubject"
            >
              <template #append-outer>
                <v-btn
                  small
                  text
                  :disabled="!subjectHasOverride"
                  @click="resetSubjectToDefault"
                >
                  <v-icon small left>mdi-restore</v-icon>
                  Standard
                </v-btn>
              </template>
            </v-text-field>
          </div>

          <v-divider class="mb-3" />

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
            <v-tab-item :transition="false">
              <div
                v-if="
                  (mode === 'expert' && !expertConfirmed) ||
                  (afterMode === 'expert' && !afterExpertConfirmed)
                "
              >
                <v-alert
                  v-if="mode === 'expert' && !expertConfirmed"
                  type="warning"
                  text
                  class="mb-2"
                >
                  Die Einleitung wurde im Experten-Modus bearbeitet und kann
                  nicht automatisch in den visuellen Editor zurückgewandelt
                  werden.
                  <div class="mt-2">
                    <v-btn small color="primary" @click="startFromScratch">
                      <v-icon left small>mdi-restart</v-icon>
                      Einleitung mit visueller Vorlage neu starten
                    </v-btn>
                  </div>
                </v-alert>
                <v-alert
                  v-if="afterMode === 'expert' && !afterExpertConfirmed"
                  type="warning"
                  text
                  class="mb-2"
                >
                  Der Abschluss wurde im Experten-Modus bearbeitet und kann
                  nicht automatisch in den visuellen Editor zurückgewandelt
                  werden.
                  <div class="mt-2">
                    <v-btn small color="primary" @click="startAfterFromScratch">
                      <v-icon left small>mdi-restart</v-icon>
                      Abschluss visuell neu starten
                    </v-btn>
                  </div>
                </v-alert>
              </div>
              <template v-else>
                <div class="d-flex align-center mb-2">
                  <v-chip
                    v-if="mode === 'expert' || afterMode === 'expert'"
                    x-small
                    color="warning"
                    text-color="white"
                    class="mr-2"
                  >
                    Experten-Modus
                  </v-chip>
                  <v-spacer />
                  <v-btn
                    small
                    outlined
                    :disabled="!hasDefaultBlocks"
                    @click="loadDefaultBlocks"
                  >
                    <v-icon small left>mdi-restore</v-icon>
                    Einleitung: Standardvorlage
                  </v-btn>
                </div>
                <CombinedSnippetBlockEditor
                  :intro-blocks.sync="blocks"
                  :after-blocks.sync="afterBlocks"
                  :variables="variables"
                  :snippet-key="snippetKey"
                  :show-support-footer="showSupportFooter"
                  :booking-period-format="bookingPeriodFormat"
                  @change="onCombinedChange"
                  @clear-after="clearAfter"
                />
              </template>
            </v-tab-item>

            <!-- Tab 2: Vorschau -->
            <v-tab-item :transition="false">
              <v-card outlined class="preview-card">
                <v-toolbar dense flat color="grey lighten-4">
                  <v-toolbar-title class="text-caption">
                    Live-Vorschau
                  </v-toolbar-title>
                  <v-spacer />
                  <v-switch
                    v-if="layoutTemplate"
                    v-model="useLayoutInPreview"
                    dense
                    hide-details
                    inset
                    class="mt-0"
                    label="Mit E-Mail-Layout"
                  />
                </v-toolbar>
                <v-card-text class="pa-0">
                  <iframe
                    ref="previewIframe"
                    :key="previewKey"
                    class="preview-iframe"
                    sandbox="allow-same-origin"
                    @load="updatePreview"
                  ></iframe>
                </v-card-text>
              </v-card>
              <div class="text-caption grey--text mt-2">
                Vorschau mit Beispielwerten ({{
                  Object.keys(sampleData).join(", ")
                }}).
                <span v-if="useLayoutInPreview && layoutTemplate">
                  Das Snippet ist hier in das hinterlegte E-Mail-Layout
                  eingebettet.
                </span>
                <span v-else> Snippet ohne Layout-Wrapper. </span>
                Reihenfolge: Einleitung → Buchungsdetails / Buttons / QR /
                System-Footer (simuliert) → Abschluss.
              </div>
            </v-tab-item>

            <!-- Tab 3: Experten -->
            <v-tab-item :transition="false">
              <v-alert
                v-if="mode !== 'expert' || afterMode !== 'expert'"
                type="warning"
                text
                dense
                class="mb-2"
              >
                Im Experten-Modus wird das visuelle Modell überschrieben. Beim
                Wechsel zurück lässt sich das Modell nicht automatisch
                rekonstruieren – du kannst aber jederzeit neu starten.
              </v-alert>

              <div class="section-label mb-2">
                <strong>Einleitung</strong>
                <span class="grey--text text--darken-1 ml-1">
                  (vor Buchungsdetails)
                </span>
              </div>
              <v-textarea
                v-model="expertHtml"
                filled
                :rows="10"
                label="Handlebars/HTML – Einleitung"
                class="code-editor"
                @input="onExpertEdit"
              />
              <div class="d-flex mt-2 mb-3">
                <v-btn small outlined @click="resetToDefault">
                  <v-icon small left>mdi-restore</v-icon>
                  Einleitung auf Standard zurücksetzen
                </v-btn>
              </div>

              <div class="expert-system-mock mb-3">
                <div class="expert-system-mock__badge">
                  <v-icon x-small left>mdi-lock-outline</v-icon>
                  Vom System eingefügt (nicht editierbar)
                </div>
                <div class="text-caption grey--text">
                  Hier erscheinen Buchungsdetails, Buttons, QR-Code und
                  System-Footer.
                </div>
              </div>

              <div class="section-label mb-2">
                <strong>Abschluss</strong>
                <span class="grey--text text--darken-1 ml-1">
                  (nach System-Inhalten, optional)
                </span>
              </div>
              <v-textarea
                v-model="afterExpertHtml"
                filled
                :rows="8"
                label="Handlebars/HTML – Abschluss"
                class="code-editor"
                @input="onAfterExpertEdit"
              />
              <div class="d-flex mt-2">
                <v-btn small outlined @click="clearAfter">
                  <v-icon small left>mdi-delete-outline</v-icon>
                  Abschluss leeren
                </v-btn>
              </div>
            </v-tab-item>
          </v-tabs-items>
        </v-card-text>

        <v-card-actions class="border-top">
          <div class="text-caption grey--text">
            Einleitung
            {{ Math.round((currentIntroSize / 1024) * 10) / 10 }} KB · Abschluss
            {{ Math.round((currentAfterSize / 1024) * 10) / 10 }} KB · max. 50 KB
            je Bereich
          </div>
          <v-spacer />
          <v-btn text @click="onClose">abbrechen</v-btn>
          <v-btn
            color="primary"
            :disabled="overLimit || subjectInvalid"
            @click="onSave"
          >
            Übernehmen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmLoadDefaultOpen" max-width="420">
      <v-card>
        <v-card-title class="subtitle-1">Standardvorlage laden?</v-card-title>
        <v-card-text>
          Aktuelle Inhalte im visuellen Editor der Einleitung werden durch die
          Standardvorlage überschrieben.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmLoadDefaultOpen = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="confirmLoadDefault">Laden</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import CombinedSnippetBlockEditor from "./BlockEditor/CombinedSnippetBlockEditor.vue";
import { renderBlocksToHtml } from "./BlockEditor/render/renderBlocksToHtml.js";
import {
  extractBlockMetadata,
  embedBlockMetadata,
} from "./BlockEditor/render/parseMetadata.js";
import {
  getSnippetCatalogEntry,
  resolveDefaultSnippetContent,
  MAX_SNIPPET_SIZE_BYTES,
  MAX_SUBJECT_LENGTH,
} from "./snippetCatalog.js";
import {
  SNIPPET_VARIABLES,
  BOOKING_CANCEL_SNIPPET_VARIABLES,
  SAMPLE_DATA,
} from "./templateVariables.js";
import { buildSnippetPreviewExtrasHtml, sampleBookingPeriod } from "./snippetPreviewExtras.js";

export default {
  name: "SnippetEditorDialog",
  components: { CombinedSnippetBlockEditor },
  props: {
    open: { type: Boolean, default: false },
    snippetKey: { type: String, default: "" },
    value: { type: String, default: "" },
    valueAfter: { type: String, default: "" },
    subject: { type: String, default: "" },
    defaultMailSnippets: { type: Object, default: () => ({}) },
    layoutTemplate: { type: String, default: "" },
    tenantName: { type: String, default: "" },
    showSupportFooter: { type: Boolean, default: true },
    bookingPeriodFormat: { type: String, default: "default" },
  },
  data() {
    return {
      activeTab: 0,
      blocks: [],
      expertHtml: "",
      afterBlocks: [],
      afterExpertHtml: "",
      subjectValue: "",
      mode: "visual",
      afterMode: "visual",
      expertConfirmed: false,
      afterExpertConfirmed: false,
      previewKey: 0,
      handlebarsLib: null,
      useLayoutInPreview: true,
      confirmLoadDefaultOpen: false,
      MAX_SUBJECT_LENGTH,
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
    snippet() {
      return getSnippetCatalogEntry(this.snippetKey);
    },
    variables() {
      if (this.snippetKey === "booking-cancel") {
        return [...SNIPPET_VARIABLES, ...BOOKING_CANCEL_SNIPPET_VARIABLES];
      }
      return SNIPPET_VARIABLES;
    },
    sampleData() {
      const base = SAMPLE_DATA.snippet || {};
      return {
        ...base,
        tenantName:
          (this.tenantName && this.tenantName.trim()) || base.tenantName,
        currentDate: new Date().toLocaleDateString("de-DE"),
        bookingPeriod: sampleBookingPeriod(this.bookingPeriodFormat),
      };
    },
    currentIntroSize() {
      return new Blob([this.composeIntroOutput()]).size;
    },
    currentAfterSize() {
      return new Blob([this.composeAfterOutput()]).size;
    },
    overLimit() {
      return (
        this.currentIntroSize > MAX_SNIPPET_SIZE_BYTES ||
        this.currentAfterSize > MAX_SNIPPET_SIZE_BYTES
      );
    },
    subjectHasOverride() {
      return !!(this.subjectValue && this.subjectValue.trim());
    },
    subjectTooLong() {
      return (this.subjectValue || "").length > MAX_SUBJECT_LENGTH;
    },
    subjectHasHtml() {
      return /<[^>]+>/.test(this.subjectValue || "");
    },
    subjectHasNewline() {
      return /[\r\n]/.test(this.subjectValue || "");
    },
    subjectInvalid() {
      return (
        this.subjectTooLong || this.subjectHasHtml || this.subjectHasNewline
      );
    },
    subjectErrors() {
      const errors = [];
      if (this.subjectTooLong) {
        errors.push(`Maximal ${MAX_SUBJECT_LENGTH} Zeichen erlaubt.`);
      }
      if (this.subjectHasHtml) {
        errors.push("Im Betreff sind keine HTML-Tags erlaubt.");
      }
      if (this.subjectHasNewline) {
        errors.push("Im Betreff sind keine Zeilenumbrüche erlaubt.");
      }
      return errors;
    },
    subjectFieldHint() {
      return (
        "Wird als Subject-Header der Mail verwendet. Reiner Text – kein HTML, " +
        "keine Zeilenumbrüche. Handlebars-Variablen wie {{tenantName}} sind " +
        `erlaubt. Maximal ${MAX_SUBJECT_LENGTH} Zeichen.`
      );
    },
    hasDefaultBlocks() {
      return this.defaultSnippetContent.hasBlocks;
    },
    defaultSnippetContent() {
      return resolveDefaultSnippetContent(
        this.snippetKey,
        this.defaultMailSnippets
      );
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(v) {
        if (v) this.loadFromValue();
      },
    },
    snippetKey() {
      if (this.open) this.loadFromValue();
    },
    subject() {
      if (this.open) this.subjectValue = this.subject || "";
    },
    valueAfter() {
      if (this.open) this.loadAfterFromValue();
    },
  },
  methods: {
    loadSectionFromHtml(incoming, { allowEmptyVisual = false } = {}) {
      if (!incoming) {
        return {
          blocks: [],
          expertHtml: "",
          mode: "visual",
          expertConfirmed: false,
        };
      }
      const { blocks, body } = extractBlockMetadata(incoming);
      if (blocks) {
        return {
          blocks,
          expertHtml: body,
          mode: "visual",
          expertConfirmed: false,
        };
      }
      if (allowEmptyVisual && !String(incoming).trim()) {
        return {
          blocks: [],
          expertHtml: "",
          mode: "visual",
          expertConfirmed: false,
        };
      }
      return {
        blocks: [],
        expertHtml: incoming,
        mode: "expert",
        expertConfirmed: false,
      };
    },
    loadFromValue() {
      this.subjectValue = this.subject || "";
      this.expertConfirmed = false;
      this.afterExpertConfirmed = false;
      this.activeTab = 0;

      const incoming = this.value || "";
      if (!incoming) {
        const defaults = this.defaultSnippetContent;
        this.expertHtml = defaults.bodyHtml;
        this.blocks = defaults.hasBlocks ? defaults.blocks : [];
        this.mode = "visual";
      } else {
        const loaded = this.loadSectionFromHtml(incoming);
        this.blocks = loaded.blocks;
        this.expertHtml = loaded.expertHtml;
        this.mode = loaded.mode;
        if (loaded.mode === "expert") {
          this.activeTab = 2;
        }
      }

      this.loadAfterFromValue();
      this.$nextTick(() => {
        this.previewKey++;
      });
    },
    loadAfterFromValue() {
      const loaded = this.loadSectionFromHtml(this.valueAfter || "", {
        allowEmptyVisual: true,
      });
      this.afterBlocks = loaded.blocks;
      this.afterExpertHtml = loaded.expertHtml;
      this.afterMode = loaded.mode;
      this.afterExpertConfirmed = loaded.expertConfirmed;
    },
    onCombinedChange({ zone, introHtml, afterHtml }) {
      if (zone === "after") {
        this.afterExpertHtml = afterHtml || "";
        this.afterMode = "visual";
        return;
      }
      this.expertHtml = introHtml || "";
      this.mode = "visual";
    },
    onExpertEdit() {
      this.mode = "expert";
    },
    onAfterExpertEdit() {
      this.afterMode = "expert";
    },
    applyDefaultSnippetContent({ forExpert = false } = {}) {
      const defaults = this.defaultSnippetContent;
      if (defaults.hasBlocks) {
        this.blocks = defaults.blocks;
      } else {
        this.blocks = [];
      }
      this.expertHtml =
        forExpert && defaults.fullHtml ? defaults.fullHtml : defaults.bodyHtml;
      return defaults;
    },
    startFromScratch() {
      this.expertConfirmed = true;
      const defaults = this.applyDefaultSnippetContent();
      if (defaults.hasBlocks) {
        this.expertHtml = renderBlocksToHtml(this.blocks);
      }
      this.mode = "visual";
      this.activeTab = 0;
    },
    startAfterFromScratch() {
      this.afterExpertConfirmed = true;
      this.afterBlocks = [];
      this.afterExpertHtml = "";
      this.afterMode = "visual";
      this.activeTab = 0;
    },
    clearAfter() {
      this.afterBlocks = [];
      this.afterExpertHtml = "";
      this.afterMode = "visual";
      this.afterExpertConfirmed = true;
    },
    loadDefaultBlocks() {
      if (!this.hasDefaultBlocks) return;
      if (this.blocks && this.blocks.length) {
        this.confirmLoadDefaultOpen = true;
        return;
      }
      this.applyDefaultSnippetContent();
      this.mode = "visual";
      this.activeTab = 0;
    },
    confirmLoadDefault() {
      this.confirmLoadDefaultOpen = false;
      this.applyDefaultSnippetContent();
      this.mode = "visual";
      this.activeTab = 0;
    },
    resetToDefault() {
      this.applyDefaultSnippetContent({ forExpert: true });
      this.expertConfirmed = true;
      this.mode = "expert";
    },
    resetSubjectToDefault() {
      this.subjectValue = "";
    },
    composeIntroOutput() {
      if (this.mode === "visual" && this.blocks && this.blocks.length) {
        const html = renderBlocksToHtml(this.blocks);
        return embedBlockMetadata(this.blocks, html);
      }
      return this.expertHtml || "";
    },
    composeAfterOutput() {
      if (
        this.afterMode === "visual" &&
        this.afterBlocks &&
        this.afterBlocks.length
      ) {
        const html = renderBlocksToHtml(this.afterBlocks);
        return embedBlockMetadata(this.afterBlocks, html);
      }
      return this.afterExpertHtml || "";
    },
    onSave() {
      this.$emit("submit", {
        key: this.snippetKey,
        value: this.composeIntroOutput(),
        valueAfter: this.composeAfterOutput(),
        subject: this.subjectValue || "",
      });
    },
    onClose() {
      this.$emit("close");
    },
    async ensureHandlebars() {
      if (this.handlebarsLib) return this.handlebarsLib;
      try {
        const mod = await import(
          /* webpackChunkName: "handlebars" */ "handlebars"
        );
        const hb = mod.default || mod;
        if (!hb.helpers.priceFormatted) {
          const currencyFormatter = new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
          });
          hb.registerHelper("priceFormatted", (value) => {
            if (typeof value !== "number") return "–";
            return currencyFormatter.format(value);
          });
        }
        this.handlebarsLib = hb;
      } catch (e) {
        this.handlebarsLib = null;
      }
      return this.handlebarsLib;
    },
    renderSectionHtml(mode, blocks, expertHtml) {
      if (mode === "visual" && blocks && blocks.length) {
        return renderBlocksToHtml(blocks);
      }
      return expertHtml || "";
    },
    async renderWithSampleData(snippetHtml) {
      try {
        const hb = await this.ensureHandlebars();
        if (hb) {
          return hb.compile(snippetHtml)(this.sampleData);
        }
        return this.simpleVarReplace(snippetHtml);
      } catch (e) {
        return (
          "<div style=\"padding:16px;color:#b71c1c;font-family:sans-serif;\">" +
          `<strong>Vorschau-Fehler im Snippet:</strong> ${String(
            e.message || e
          )}` +
          "</div>" +
          this.simpleVarReplace(snippetHtml)
        );
      }
    },
    async updatePreview() {
      const iframe = this.$refs.previewIframe;
      if (!iframe || !iframe.contentWindow) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;

      const introHtml = this.renderSectionHtml(
        this.mode,
        this.blocks,
        this.expertHtml
      );
      const afterHtml = this.renderSectionHtml(
        this.afterMode,
        this.afterBlocks,
        this.afterExpertHtml
      );

      const renderedIntro = await this.renderWithSampleData(introHtml);
      const renderedAfter = afterHtml
        ? await this.renderWithSampleData(afterHtml)
        : "";

      const extrasHtml = buildSnippetPreviewExtrasHtml(this.snippetKey, {
        showSupportFooter: this.showSupportFooter,
        bookingPeriodFormat: this.bookingPeriodFormat,
      });
      const renderedSnippetWithExtras =
        renderedIntro + (extrasHtml || "") + (renderedAfter || "");

      let full;
      if (this.useLayoutInPreview && this.layoutTemplate) {
        full = await this.composeWithLayout(renderedSnippetWithExtras);
      } else {
        full = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5}</style></head><body>${renderedSnippetWithExtras}</body></html>`;
      }

      iframe.style.height = "0px";
      doc.open();
      doc.write(full);
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
            400
          );
          iframe.style.height = h + 32 + "px";
        } catch (_) {
          iframe.style.height = "400px";
        }
      });
    },
    async composeWithLayout(renderedSnippetHtml) {
      const layout = this.layoutTemplate || "";
      const data = {
        ...this.sampleData,
        title: "",
        content: renderedSnippetHtml,
      };
      try {
        const hb = await this.ensureHandlebars();
        if (hb) {
          return hb.compile(layout)(data);
        }
      } catch (e) {
        //
      }
      let out = layout;
      Object.entries(data).forEach(([k, v]) => {
        const triple = new RegExp(`\\{\\{\\{\\s*${k}\\s*\\}\\}\\}`, "g");
        const double = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
        out = out.replace(triple, v);
        out = out.replace(double, v);
      });
      return out;
    },
    simpleVarReplace(html) {
      let out = html || "";
      Object.entries(this.sampleData).forEach(([k, v]) => {
        const triple = new RegExp(`\\{\\{\\{\\s*${k}\\s*\\}\\}\\}`, "g");
        const double = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
        out = out.replace(triple, v);
        out = out.replace(double, v);
      });
      return out;
    },
  },
  mounted() {
    this.$watch(
      () => [
        this.activeTab,
        this.blocks,
        this.expertHtml,
        this.afterBlocks,
        this.afterExpertHtml,
        this.subjectValue,
        this.useLayoutInPreview,
        this.layoutTemplate,
        this.showSupportFooter,
        this.bookingPeriodFormat,
      ],
      () => {
        if (this.activeTab === 1) {
          this.$nextTick(() => this.updatePreview());
        }
      },
      { deep: true }
    );
  },
};
</script>

<style scoped>
.preview-card {
  max-height: 700px;
  overflow-y: auto;
  background: #f5f5f5;
}
.preview-iframe {
  width: 100%;
  border: 0;
  background: white;
  min-height: 400px;
}
.code-editor >>> textarea {
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
}
.border-top {
  border-top: 1px solid #eee;
}
.subject-field-wrapper {
  max-width: 900px;
}
.section-label {
  font-size: 14px;
}
.expert-system-mock {
  margin: 4px 0 12px;
  padding: 12px 14px;
  border-radius: 4px;
  border: 1px dashed #bdbdbd;
  background: repeating-linear-gradient(
    -45deg,
    #fafafa,
    #fafafa 8px,
    #f3f3f3 8px,
    #f3f3f3 16px
  );
}
.expert-system-mock__badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #616161;
  margin-bottom: 4px;
}
</style>

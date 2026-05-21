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
          Platzhalter wie <code>{{ catalog.requiredVariables.join(", ") }}</code>
          müssen vorhanden bleiben, sonst rendert das PDF unvollständig.
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
          <v-tab-item :transition="false">
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
          </v-tab-item>

          <!-- Tab 2: Vorschau -->
          <v-tab-item :transition="false">
            <v-card outlined class="preview-card">
              <v-toolbar dense flat color="grey lighten-4">
                <v-toolbar-title class="text-caption">
                  Live-Vorschau (mit Demodaten)
                </v-toolbar-title>
                <v-spacer />
                <v-btn-toggle
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
              </v-toolbar>
              <v-card-text class="pa-0">
                <div class="preview-container" :class="previewDeviceClass">
                  <iframe
                    ref="previewIframe"
                    :key="previewKey"
                    class="preview-iframe"
                    sandbox="allow-same-origin"
                    @load="updatePreview"
                  ></iframe>
                </div>
              </v-card-text>
            </v-card>
            <div class="text-caption grey--text mt-2">
              Vorgerendert mit Demodaten
              ({{ Object.keys(catalog.sampleData).join(", ") }}).
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
                    <v-list-item
                      v-for="v in catalog.variables"
                      :key="v.name"
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
} from "@/components/PDF/pdfTemplateCatalog.js";

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
      handlebarsLib: null,
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
      const html = renderBlocksToHtml(this.blocks || []);
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
  },
  watch: {
    open: {
      immediate: true,
      handler(v) {
        if (v) this.loadFromValue();
      },
    },
    templateType() {
      if (this.open) this.loadFromValue();
    },
    activeTab(newTab) {
      if (newTab === 1) {
        this.$nextTick(() => this.updatePreview());
      }
    },
  },
  methods: {
    loadFromValue() {
      const incoming = this.value || "";
      this.expertConfirmed = false;
      this.previewDevice = "desktop";
      if (!incoming) {
        this.blocks = this.makeDefaultBlocks();
        this.expertHtml = this.composeFromBlocks(this.blocks);
        this.mode = "visual";
        this.activeTab = 0;
        this.previewKey++;
        return;
      }
      const { blocks, body } = extractBlockMetadata(incoming);
      if (blocks) {
        this.blocks = this.normalizeBlockIds(blocks);
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
        return this.normalizeBlockIds(this.catalog.defaultBlocks());
      } catch (_) {
        return [];
      }
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
    composeFromBlocks(blocks) {
      if (!this.catalog) return "";
      const bodyHtml = renderBlocksToHtml(blocks || []);
      return this.catalog.buildDocument(bodyHtml);
    },
    onBlocksChange({ html }) {
      this.expertHtml = this.catalog
        ? this.catalog.buildDocument(html)
        : html;
      this.mode = "visual";
    },
    onExpertEdit() {
      this.mode = "expert";
    },
    startFromScratch() {
      this.expertConfirmed = true;
      this.blocks = this.makeDefaultBlocks();
      this.expertHtml = this.composeFromBlocks(this.blocks);
      this.mode = "visual";
      this.activeTab = 0;
    },
    resetToDefault() {
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
      return this.expertHtml || "";
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
      } catch (e) {
        this.handlebarsLib = null;
      }
      return this.handlebarsLib;
    },
    simpleVarReplace(html) {
      if (!this.catalog) return html;
      let out = html || "";
      Object.entries(this.catalog.sampleData || {}).forEach(([k, v]) => {
        const triple = new RegExp(`\\{\\{\\{\\s*${k}\\s*\\}\\}\\}`, "g");
        const double = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
        out = out.replace(triple, v);
        out = out.replace(double, v);
      });
      return out;
    },
    async updatePreview() {
      const iframe = this.$refs.previewIframe;
      if (!iframe || !iframe.contentWindow) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;

      const sourceHtml =
        this.mode === "visual"
          ? this.composeFromBlocks(this.blocks)
          : this.expertHtml || "";

      let rendered = sourceHtml;
      try {
        const hb = await this.ensureHandlebars();
        if (hb) {
          rendered = hb.compile(sourceHtml)(this.catalog.sampleData);
        } else {
          rendered = this.simpleVarReplace(sourceHtml);
        }
      } catch (e) {
        rendered =
          "<!doctype html><html><body style=\"font-family:sans-serif;color:#b71c1c;padding:24px;\">" +
          `<strong>Vorschau-Fehler:</strong> ${String(e.message || e)}` +
          "</body></html>";
      }

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
  },
  mounted() {
    this.$watch(
      () => [this.blocks, this.expertHtml, this.mode, this.previewDevice],
      () => {
        if (this.activeTab === 1) {
          this.$nextTick(() => this.updatePreview());
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

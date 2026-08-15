<template>
  <div class="theme-wizard">
    <v-row>
      <v-col cols="12" md="5">
        <v-card outlined class="pa-3">
          <div class="text-subtitle-2 mb-2">Allgemein</div>

          <v-select
            :items="presets"
            label="Stil-Vorlage"
            :value="theme.preset"
            outlined
            dense
            hide-details
            class="mb-2"
            @change="(v) => onUpdate('preset', v)"
          />

          <v-text-field
            label="Logo-URL"
            :value="theme.logoUrl"
            placeholder="https://..."
            outlined
            dense
            hide-details
            class="mb-2"
            @input="(v) => onUpdate('logoUrl', v)"
          />

          <v-row dense>
            <v-col cols="6">
              <v-text-field
                label="Primärfarbe"
                :value="theme.primaryColor"
                outlined
                dense
                hide-details
                placeholder="#1976d2"
                @input="(v) => onUpdate('primaryColor', v)"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                label="Textfarbe"
                :value="theme.textColor"
                outlined
                dense
                hide-details
                placeholder="#222222"
                @input="(v) => onUpdate('textColor', v)"
              />
            </v-col>
          </v-row>
          <v-row dense class="mt-2">
            <v-col cols="6">
              <v-text-field
                label="Hintergrund"
                :value="theme.backgroundColor"
                outlined
                dense
                hide-details
                placeholder="#f5f5f5"
                @input="(v) => onUpdate('backgroundColor', v)"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                :items="fonts"
                label="Schriftart"
                :value="theme.fontFamily"
                outlined
                dense
                hide-details
                @change="(v) => onUpdate('fontFamily', v)"
              />
            </v-col>
          </v-row>

          <MailThemeHtmlEditor
            label="Kopfzeile (optional)"
            :value="theme.headerHtml"
            :min-height="64"
            @input="(v) => onUpdate('headerHtml', v)"
          />
          <MailThemeHtmlEditor
            label="Fußzeile"
            :value="theme.footerHtml"
            :min-height="120"
            @input="(v) => onUpdate('footerHtml', v)"
          />

          <v-divider class="my-3" />

          <div class="text-subtitle-2 mb-2">Spezifische Optionen</div>

          <!-- genericMailTemplate -->
          <template v-if="templateType === 'genericMailTemplate'">
            <v-text-field
              label="Wrapper-Breite (px)"
              type="number"
              :value="optVal('wrapperWidth', 600)"
              outlined
              dense
              hide-details
              class="mb-2"
              @input="(v) => onOptionUpdate('wrapperWidth', Number(v))"
            />
            <v-switch
              label="Wrapper-Schatten"
              :input-value="optVal('wrapperShadow', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('wrapperShadow', !!v)"
            />
            <v-text-field
              label="Logo Max-Breite (px)"
              type="number"
              :value="optVal('logoMaxWidth', 200)"
              outlined
              dense
              hide-details
              class="mt-2"
              @input="(v) => onOptionUpdate('logoMaxWidth', Number(v))"
            />
          </template>

          <!-- receiptTemplate -->
          <template v-if="templateType === 'receiptTemplate'">
            <v-text-field
              label="Titel"
              :value="optVal('title', 'Ihr Zahlungsbeleg')"
              outlined
              dense
              hide-details
              class="mb-2"
              @input="(v) => onOptionUpdate('title', v)"
            />
            <v-switch
              label="Empfänger-Adresse rechtsbündig"
              :input-value="optVal('showRecipientTopRight', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('showRecipientTopRight', !!v)"
            />
          </template>

          <!-- invoiceTemplate -->
          <template v-if="templateType === 'invoiceTemplate'">
            <v-text-field
              label="Stadt"
              :value="optVal('city', '')"
              outlined
              dense
              hide-details
              class="mb-2"
              @input="(v) => onOptionUpdate('city', v)"
            />
            <v-textarea
              label="Begrüßungstext"
              :value="optVal('greeting', '')"
              outlined
              dense
              rows="2"
              auto-grow
              hide-details
              class="mb-2"
              @input="(v) => onOptionUpdate('greeting', v)"
            />
            <v-switch
              label="Zahlungsziel-Hinweis anzeigen"
              :input-value="optVal('showPaymentDeadline', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('showPaymentDeadline', !!v)"
            />
            <v-switch
              label="Bankverbindung anzeigen"
              :input-value="optVal('showBankDetails', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('showBankDetails', !!v)"
            />
          </template>

          <!-- cancellationTemplate -->
          <template v-if="templateType === 'cancellationTemplate'">
            <v-text-field
              label="Titel"
              :value="optVal('title', 'Stornorechnung')"
              outlined
              dense
              hide-details
              class="mb-2"
              @input="(v) => onOptionUpdate('title', v)"
            />
            <v-switch
              label="Bankverbindung für Rückfragen anzeigen"
              :input-value="optVal('showBankDetails', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('showBankDetails', !!v)"
            />
            <v-switch
              label="Erstattungsblock anzeigen"
              :input-value="optVal('showRefundBlock', true)"
              dense
              hide-details
              @change="(v) => onOptionUpdate('showRefundBlock', !!v)"
            />
          </template>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card outlined>
          <v-toolbar dense flat color="grey lighten-4">
            <v-toolbar-title class="text-caption">
              Live-Vorschau
            </v-toolbar-title>
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
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { PRESETS, FONT_OPTIONS } from "./themeDefaults.js";
import { renderThemeToHtml } from "./render/renderThemeToHtml.js";
import { getSampleDataForContext } from "@/components/Mail/templateVariables.js";
import MailThemeHtmlEditor from "./MailThemeHtmlEditor.vue";

const SAMPLE_CONTEXT_MAP = {
  genericMailTemplate: "genericMail",
  receiptTemplate: "receipt",
  invoiceTemplate: "invoice",
  cancellationTemplate: "cancellation",
};

export default {
  name: "ThemeWizardForm",
  components: { MailThemeHtmlEditor },
  props: {
    theme: { type: Object, required: true },
    templateType: { type: String, required: true },
  },
  data: () => ({
    presets: PRESETS,
    fonts: FONT_OPTIONS,
    previewKey: 0,
    handlebarsLib: null,
  }),
  computed: {
    sampleData() {
      return getSampleDataForContext(SAMPLE_CONTEXT_MAP[this.templateType]);
    },
    htmlPreview() {
      return renderThemeToHtml(this.theme, this.templateType);
    },
  },
  watch: {
    htmlPreview() {
      this.$nextTick(() => this.updatePreview());
    },
  },
  methods: {
    optVal(key, fallback) {
      const opts = this.theme.options || {};
      return opts[key] !== undefined ? opts[key] : fallback;
    },
    onUpdate(key, value) {
      this.$emit("update", { ...this.theme, [key]: value });
    },
    onOptionUpdate(key, value) {
      this.$emit("update", {
        ...this.theme,
        options: { ...(this.theme.options || {}), [key]: value },
      });
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
    async updatePreview() {
      const iframe = this.$refs.previewIframe;
      if (!iframe || !iframe.contentWindow) return;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      let html = this.htmlPreview;
      try {
        const hb = await this.ensureHandlebars();
        if (hb) {
          html = hb.compile(html)(this.sampleData);
        }
      } catch (e) {
        // ignore preview errors; show raw
      }
      iframe.style.height = "0px";
      doc.open();
      doc.write(html);
      doc.close();
      this.$nextTick(() => {
        try {
          const body = doc.body;
          const h = Math.max(body.scrollHeight, body.offsetHeight, 400);
          iframe.style.height = h + 16 + "px";
        } catch (_) {
          iframe.style.height = "500px";
        }
      });
    },
  },
};
</script>

<style scoped>
.preview-iframe {
  width: 100%;
  border: 0;
  background: white;
  min-height: 500px;
}
</style>

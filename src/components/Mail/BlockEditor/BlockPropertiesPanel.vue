<template>
  <div class="properties-panel">
    <div v-if="!selectedBlock" class="empty-state">
      <v-icon color="grey lighten-1">mdi-cursor-default-click-outline</v-icon>
      <div class="text-caption grey--text mt-2">
        Wähle einen Block aus, um Eigenschaften zu bearbeiten.
      </div>
    </div>

    <template v-else>
      <div class="d-flex align-center mb-3">
        <v-icon small class="mr-2">{{ blockIcon }}</v-icon>
        <span class="text-subtitle-2">{{ blockLabel }}</span>
      </div>

      <!-- Row -->
      <div v-if="selectedBlock.type === 'row'">
        <v-text-field
          label="Hintergrundfarbe"
          :value="selectedBlock.background || ''"
          placeholder="#ffffff oder leer"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('background', v)"
        />
        <v-text-field
          label="Vertikales Padding (px)"
          type="number"
          :value="selectedBlock.paddingY || 0"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('paddingY', Number(v))"
        />
      </div>

      <!-- Text -->
      <div v-if="selectedBlock.type === 'text'">
        <v-select
          :items="alignOptions"
          label="Ausrichtung"
          :value="selectedBlock.align || 'left'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('align', v)"
        />
        <v-select
          :items="fontSizeOptions"
          label="Schriftgröße"
          :value="selectedBlock.fontSize || 'M'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('fontSize', v)"
        />
        <v-text-field
          label="Textfarbe"
          :value="selectedBlock.color || ''"
          placeholder="#222222"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('color', v)"
        />
        <v-text-field
          label="Hintergrundfarbe"
          :value="selectedBlock.background || ''"
          placeholder="leer"
          dense
          outlined
          hide-details
          @input="(v) => onUpdate('background', v)"
        />
      </div>

      <!-- Heading -->
      <div v-if="selectedBlock.type === 'heading'">
        <v-select
          :items="[1, 2, 3]"
          label="Ebene (H1/H2/H3)"
          :value="selectedBlock.level || 1"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('level', Number(v))"
        />
        <v-select
          :items="alignOptions"
          label="Ausrichtung"
          :value="selectedBlock.align || 'left'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('align', v)"
        />
        <v-text-field
          label="Textfarbe"
          :value="selectedBlock.color || ''"
          dense
          outlined
          hide-details
          @input="(v) => onUpdate('color', v)"
        />
      </div>

      <!-- Image -->
      <div v-if="selectedBlock.type === 'image'">
        <v-text-field
          label="Bild-URL"
          :value="selectedBlock.src || ''"
          placeholder="https://..."
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('src', v)"
        />
        <v-alert
          v-if="selectedBlock.src && selectedBlock.src.startsWith('http://')"
          type="warning"
          text
          dense
          class="text-caption"
        >
          Unsichere Verbindung (http). Bevorzugt https verwenden.
        </v-alert>
        <v-text-field
          label="Alt-Text"
          :value="selectedBlock.alt || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('alt', v)"
        />
        <v-text-field
          label="Breite (px)"
          type="number"
          :value="selectedBlock.width || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('width', v ? Number(v) : null)"
        />
        <v-select
          :items="alignOptions"
          label="Ausrichtung"
          :value="selectedBlock.align || 'center'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('align', v)"
        />
        <v-text-field
          label="Link-Ziel (optional)"
          :value="selectedBlock.link || ''"
          placeholder="https://..."
          dense
          outlined
          hide-details
          @input="(v) => onUpdate('link', v)"
        />
      </div>

      <!-- Button -->
      <div v-if="selectedBlock.type === 'button'">
        <v-text-field
          label="Beschriftung"
          :value="selectedBlock.label || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('label', v)"
        />
        <v-text-field
          label="Link-Ziel"
          :value="selectedBlock.href || ''"
          placeholder="https://… oder mailto:…"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('href', v)"
        />
        <v-btn
          small
          text
          color="primary"
          class="mb-2 px-0"
          @click="mailtoDialogOpen = true"
        >
          <v-icon small left>mdi-email-outline</v-icon>
          E-Mail-Link…
        </v-btn>
        <v-text-field
          label="Hintergrundfarbe"
          :value="selectedBlock.bg || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('bg', v)"
        />
        <v-text-field
          label="Textfarbe"
          :value="selectedBlock.color || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('color', v)"
        />
        <v-select
          :items="alignOptions"
          label="Ausrichtung"
          :value="selectedBlock.align || 'center'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('align', v)"
        />
        <v-row>
          <v-col cols="6">
            <v-text-field
              label="Padding X"
              type="number"
              :value="selectedBlock.paddingX ?? 20"
              dense
              outlined
              hide-details
              @input="(v) => onUpdate('paddingX', Number(v))"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Padding Y"
              type="number"
              :value="selectedBlock.paddingY ?? 12"
              dense
              outlined
              hide-details
              @input="(v) => onUpdate('paddingY', Number(v))"
            />
          </v-col>
        </v-row>
        <v-text-field
          label="Eckenradius (px)"
          type="number"
          :value="selectedBlock.radius ?? 4"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('radius', Number(v))"
        />
        <v-switch
          label="Volle Breite"
          :input-value="!!selectedBlock.fullWidth"
          dense
          hide-details
          @change="(v) => onUpdate('fullWidth', !!v)"
        />

        <v-alert
          type="info"
          text
          dense
          class="mt-2 text-caption"
        >
          Hinweis: Zahlungs- und Stornierungs-Buttons werden vom Server automatisch eingefügt.
        </v-alert>
      </div>

      <!-- Divider -->
      <div v-if="selectedBlock.type === 'divider'">
        <v-text-field
          label="Farbe"
          :value="selectedBlock.color || '#dddddd'"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('color', v)"
        />
        <v-select
          :items="[1, 2, 4]"
          label="Dicke (px)"
          :value="selectedBlock.thickness || 1"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('thickness', Number(v))"
        />
        <v-select
          :items="[{text:'durchgezogen',value:'solid'},{text:'gestrichelt',value:'dashed'}]"
          label="Stil"
          :value="selectedBlock.style || 'solid'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('style', v)"
        />
        <v-text-field
          label="Padding Y"
          type="number"
          :value="selectedBlock.paddingY ?? 12"
          dense
          outlined
          hide-details
          @input="(v) => onUpdate('paddingY', Number(v))"
        />
      </div>

      <!-- Spacer -->
      <div v-if="selectedBlock.type === 'spacer'">
        <v-select
          :items="[4, 8, 16, 24, 32, 48, 64]"
          label="Höhe (px)"
          :value="selectedBlock.height || 16"
          dense
          outlined
          hide-details
          @change="(v) => onUpdate('height', Number(v))"
        />
      </div>

      <!-- Callout -->
      <div v-if="selectedBlock.type === 'callout'">
        <v-select
          :items="[
            { text: 'Information', value: 'info' },
            { text: 'Erfolg', value: 'success' },
            { text: 'Warnung', value: 'warning' },
          ]"
          label="Variante"
          :value="selectedBlock.variant || 'info'"
          dense
          outlined
          hide-details
          class="mb-2"
          @change="(v) => onUpdate('variant', v)"
        />
        <v-text-field
          label="Titel (optional)"
          :value="selectedBlock.title || ''"
          dense
          outlined
          hide-details
          @input="(v) => onUpdate('title', v)"
        />
      </div>

      <!-- Quote -->
      <div v-if="selectedBlock.type === 'quote'">
        <v-text-field
          label="Quelle (cite)"
          :value="selectedBlock.cite || ''"
          dense
          outlined
          hide-details
          class="mb-2"
          @input="(v) => onUpdate('cite', v)"
        />
        <v-select
          :items="alignOptions"
          label="Ausrichtung"
          :value="selectedBlock.align || 'left'"
          dense
          outlined
          hide-details
          @change="(v) => onUpdate('align', v)"
        />
      </div>

      <!-- List -->
      <div v-if="selectedBlock.type === 'list'">
        <v-switch
          label="Geordnete Liste (1. 2. 3.)"
          :input-value="!!selectedBlock.ordered"
          dense
          hide-details
          @change="(v) => onUpdate('ordered', !!v)"
        />
      </div>
    </template>

    <MailtoLinkDialog
      :open="mailtoDialogOpen"
      :variables="variables"
      :initial-href="mailtoDialogHref"
      :show-link-text="false"
      @close="mailtoDialogOpen = false"
      @apply="onApplyMailto"
    />
  </div>
</template>

<script>
import { BLOCK_PALETTE } from "./blockFactory.js";
import MailtoLinkDialog from "./MailtoLinkDialog.vue";
import { SUPPORT_EMAIL_MAILTO } from "@/components/Mail/templateVariables.js";

export default {
  name: "BlockPropertiesPanel",
  components: { MailtoLinkDialog },
  props: {
    selectedBlock: { type: Object, default: null },
    variables: { type: Array, default: () => [] },
  },
  data: () => ({
    mailtoDialogOpen: false,
    alignOptions: [
      { text: "Links", value: "left" },
      { text: "Zentriert", value: "center" },
      { text: "Rechts", value: "right" },
    ],
    fontSizeOptions: [
      { text: "Klein", value: "S" },
      { text: "Mittel", value: "M" },
      { text: "Groß", value: "L" },
    ],
  }),
  computed: {
    blockIcon() {
      if (!this.selectedBlock) return "";
      if (this.selectedBlock.type === "row") return "mdi-view-column";
      const entry = BLOCK_PALETTE.find(
        (b) => b.type === this.selectedBlock.type
      );
      return entry ? entry.icon : "mdi-cube-outline";
    },
    blockLabel() {
      if (!this.selectedBlock) return "";
      if (this.selectedBlock.type === "row") return "Reihe";
      const entry = BLOCK_PALETTE.find(
        (b) => b.type === this.selectedBlock.type
      );
      return entry ? entry.label : this.selectedBlock.type;
    },
    mailtoDialogHref() {
      const href = (this.selectedBlock && this.selectedBlock.href) || "";
      if (/^mailto:/i.test(href)) return href;
      return SUPPORT_EMAIL_MAILTO;
    },
  },
  methods: {
    onUpdate(key, value) {
      this.$emit("update", { ...this.selectedBlock, [key]: value });
    },
    onApplyMailto({ href }) {
      this.onUpdate("href", href);
    },
  },
};
</script>

<style scoped>
.properties-panel {
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  min-height: 400px;
}
.empty-state {
  text-align: center;
  padding: 40px 12px;
}
</style>

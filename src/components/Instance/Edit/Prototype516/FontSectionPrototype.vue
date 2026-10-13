<template>
  <!-- PROTOTYPE (ECCdigital/tickets#516): drei Varianten des Abschnitts
       „Schrift“ im Tab „Portal“, umschaltbar per `?variant=A|B|C`. Die
       Schrift wird nicht gespeichert; Speichern übernimmt sie nur im Speicher. -->
  <SubSection
    class="mt-7"
    title="Schrift"
    icon="mdi-format-font"
    description="Wählen Sie die Schrift für alle Texte des Portals: die Systemschrift des Geräts, eine freie Schrift aus der Liste oder eine eigene Schriftdatei."
    no-margin
  >
    <FontVariantA v-if="variant === 'A'" />
    <FontVariantB v-else-if="variant === 'B'" />
    <FontVariantC
      v-else
      :colors="colors"
      :portal-name="portalName"
    />

    <v-alert
      v-if="justSaved"
      type="info"
      text
      dense
      class="text-body-2 mt-3 mb-0"
    >
      Gespeichert. Das Portal zeigt „{{ savedLabel }}“ ab dem nächsten Aufruf
      einer Seite. Wer das Portal gerade offen hat, sieht die Schrift erst nach
      dem Neuladen.
    </v-alert>

    <div class="proto-state mt-3">
      <div>
        <b>PROTOTYP</b> Variante {{ variant }} · ungespeichert:
        {{ dirty ? "ja" : "nein" }}
      </div>
      <div>branding.font (Entwurf) = {{ json(store.draft) }}</div>
      <div>branding.font (gespeichert) = {{ json(store.saved) }}</div>
      <div v-if="licenseKeys.length">
        Lizenz bestätigt für Medien: {{ licenseKeys.join(", ") }}
      </div>
    </div>

    <PrototypeSwitcher
      :variants="['A', 'B', 'C']"
      :names="{ A: 'Auswahlfeld', B: 'Schriftmuster', C: 'Vorschau daneben' }"
    />
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import PrototypeSwitcher from "@/components/commons/PrototypeSwitcher.vue";
import FontVariantA from "./FontVariantA.vue";
import FontVariantB from "./FontVariantB.vue";
import FontVariantC from "./FontVariantC.vue";
import { fontLabel, isDirty, store } from "./fontPrototype";

export default {
  name: "FontSectionPrototype",
  components: {
    SubSection,
    PrototypeSwitcher,
    FontVariantA,
    FontVariantB,
    FontVariantC,
  },
  props: {
    colors: { type: Object, default: () => ({}) },
    portalName: { type: String, default: "" },
  },
  data() {
    return { store };
  },
  computed: {
    variant() {
      const v = this.$route.query.variant;
      return ["A", "B", "C"].includes(v) ? v : "A";
    },
    dirty() {
      return isDirty();
    },
    justSaved() {
      return !!store.lastSavedAt && !this.dirty;
    },
    savedLabel() {
      return fontLabel(store.saved);
    },
    licenseKeys() {
      return Object.keys(store.licenseConfirmed);
    },
  },
  methods: {
    json(v) {
      return JSON.stringify(v);
    },
  },
};
</script>

<style scoped>
.proto-state {
  font: 11px/1.5 monospace;
  padding: 6px 10px;
  border: 1px dashed #ff00aa;
  border-radius: 4px;
  color: #a0006c;
  word-break: break-all;
}
</style>

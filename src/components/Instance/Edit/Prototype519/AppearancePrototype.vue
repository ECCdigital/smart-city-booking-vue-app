<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): drei Varianten der Einstellungen des
       Erscheinungsbilds im Tab „Portal“, umschaltbar per `?variant=A|B|C`.
       Sie ersetzen hier die Abschnitte „Theme“ und „Logo & Favicon“. Die neuen
       Felder werden nicht gespeichert; Speichern übernimmt sie nur im Speicher. -->
  <div>
    <component
      :is="`AppearanceVariant${variant}`"
      :branding="branding"
      :logo="logo"
      :favicon="favicon"
      :portal-name="portalName"
      @update="$emit('update')"
      @set-image="(name, value) => $emit('set-image', name, value)"
    />

    <v-alert v-if="justSaved" type="info" text dense class="text-body-2 mt-4 mb-0">
      Gespeichert. Das Portal zeigt die neuen Farben und Logos ab dem nächsten
      Aufruf einer Seite.
    </v-alert>

    <div class="proto-state mt-4">
      <div>
        <b>PROTOTYP #519</b> Variante {{ variant }} · ungespeichert:
        {{ dirty ? "ja" : "nein" }} · Mediathek echt, die neuen Felder nur im
        Speicher
      </div>
      <div>branding (neu, Entwurf) = {{ json(summary(store.draft)) }}</div>
      <div>branding (neu, gespeichert) = {{ json(summary(store.saved)) }}</div>
    </div>

    <PrototypeSwitcher :variants="['A', 'B', 'C']" :names="names" />
  </div>
</template>

<script>
import PrototypeSwitcher from "@/components/commons/PrototypeSwitcher.vue";
import AppearanceVariantA from "./AppearanceVariantA.vue";
import AppearanceVariantB from "./AppearanceVariantB.vue";
import AppearanceVariantC from "./AppearanceVariantC.vue";
import { isDirty, store } from "./appearancePrototype";

export default {
  name: "AppearancePrototype",
  components: {
    PrototypeSwitcher,
    AppearanceVariantA,
    AppearanceVariantB,
    AppearanceVariantC,
  },
  props: {
    branding: { type: Object, required: true },
    logo: { type: Object, default: null },
    favicon: { type: Object, default: null },
    portalName: { type: String, default: "" },
  },
  data() {
    return {
      store,
      names: {
        A: "Wie heute, ergänzt",
        B: "Nach Bereichen der Seite",
        C: "Vorschau daneben",
      },
    };
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
  },
  methods: {
    json(v) {
      return JSON.stringify(v);
    },
    summary(d) {
      return {
        accent: d.accent,
        header: d.header,
        logoDark: d.logoDark && d.logoDark.mediaId,
        loginLogoSize: d.loginLogoSize,
        footerLogos: d.footerLogos.map((l) => ({
          image: l.image && l.image.mediaId,
          size: l.size,
          link: l.link || null,
          imageDark: (l.imageDark && l.imageDark.mediaId) || null,
        })),
      };
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

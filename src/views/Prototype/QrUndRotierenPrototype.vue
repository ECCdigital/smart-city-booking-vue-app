<script>
/**
 * PROTOTYPE — QR-Codes und Rotieren für Tür und Fächer
 * (ECCdigital/tickets#1094). Throwaway, never merged.
 *
 * Three variants on the rows of tickets#1093 (Variante A), switchable with
 * `?variant=` (A-C, bottom bar or ← →):
 *
 *   A  Direkt drucken: Tür lädt das PDF sofort, Anlage öffnet eine schlanke
 *      Liste der Fächer, Warnung nach QR-Scan abgestuft
 *   B  Ein QR-Dialog für alles: Vorschau, PDF groß, SVG/PNG leise,
 *      Ersetzen im selben Dialog, Menü nur Löschen
 *   C  Aufkleber im Blick: Panel mit A4-Seite oder Etikettenbogen, Häkchen
 *      vor jedem Rotieren, Marke „Aufkleber tauschen“ bis gedruckt
 *
 *   /prototype/qr-und-rotieren?variant=B
 *
 * The dashed bar opens each case directly. Runs without a backend;
 * switching variant resets the stub data.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import VariantA from "@/prototype/qr-und-rotieren/variants/VariantA.vue";
import VariantB from "@/prototype/qr-und-rotieren/variants/VariantB.vue";
import VariantC from "@/prototype/qr-und-rotieren/variants/VariantC.vue";
import { store, prototypeBus } from "@/prototype/zugangspunkte-fuehrung/data";
import { loadQr, isAnlage } from "@/prototype/qr-und-rotieren/qr";

const VARIANTS = [
  { key: "A", name: "Direkt drucken", component: VariantA },
  { key: "B", name: "Ein QR-Dialog für alles", component: VariantB },
  { key: "C", name: "Aufkleber im Blick", component: VariantC },
];

const CASES = [
  { label: "Tür mit QR-Scan", row: "Rathaus Haupteingang" },
  { label: "Tür ohne QR-Scan", row: "Rathaus Seiteneingang" },
  { label: "festes Fach", row: "Schlüsselfach Hausmeister" },
  {
    label: "Anlage mit QR-Scan, 6 Fächer",
    row: "Schließfachanlage Bürgerbüro",
  },
  { label: "Anlage ohne QR-Scan, 12 Fächer", row: "Schließfachanlage Rathaus" },
];

export default {
  name: "QrUndRotierenPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0 };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    cases() {
      return CASES;
    },
    variantKey() {
      const q = this.$route.query.variant;
      return VARIANTS.some((v) => v.key === q) ? q : "A";
    },
    variant() {
      return VARIANTS.find((v) => v.key === this.variantKey);
    },
  },
  watch: {
    variantKey: {
      immediate: true,
      handler() {
        this.reset();
      },
    },
  },
  methods: {
    onVariant(key) {
      this.$router
        .replace({ query: { ...this.$route.query, variant: key } })
        .catch(() => {});
    },
    reset() {
      loadQr();
      this.resets++;
    },
    rowOf(c) {
      return store.accessPoints.find((r) => r.label === c.row);
    },
    openQr(c) {
      this.$refs.variant.onQr(this.rowOf(c));
    },
    openRotate(c) {
      const row = this.rowOf(c);
      this.$refs.variant.onMore(row, {
        key: isAnlage(row) ? "rotate-all" : "rotate",
        text: "Rotieren …",
      });
    },
    onStub(text) {
      this.snackText = text;
      this.snackbar = false;
      this.$nextTick(() => (this.snackbar = true));
    },
  },
  mounted() {
    prototypeBus.$on("stub", this.onStub);
  },
  beforeDestroy() {
    prototypeBus.$off("stub", this.onStub);
  },
};
</script>

<template>
  <AdminLayout hide-page-title>
    <div class="prototype-banner mb-4">
      <v-icon color="white" class="mr-3">mdi-flask-outline</v-icon>
      <div class="flex-grow-1">
        <strong>PROTOTYP: QR-Codes und Rotieren (tickets#1094).</strong>
        Wegwerfcode auf <code>prototype/1094-qr-und-rotieren</code>, auf den
        Zeilen aus #1093, mit Testdaten, ohne Backend. Die QR-Codes sind nur
        Muster, nicht scanbar. Varianten: Leiste unten oder ← →.
      </div>
    </div>

    <div class="case-bar mb-6">
      <span class="text-body-2 mr-2">Fall direkt öffnen</span>
      <div v-for="c in cases" :key="c.row" class="case">
        <span class="case__label">{{ c.label }}</span>
        <v-btn x-small text @click="openQr(c)">QR-Code</v-btn>
        <v-btn x-small text color="error" @click="openRotate(c)"
          >Rotieren</v-btn
        >
      </div>
      <v-spacer />
      <v-btn small text @click="reset">
        <v-icon left small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
    </div>

    <BaseSection
      title="Zugangspunkte"
      icon="mdi-door-closed-lock"
      hint="Anbieter, Türen und Schließfachanlagen dieses Mandanten."
    >
      <component
        :is="variant.component"
        ref="variant"
        :key="`${variantKey}-${resets}`"
      />
    </BaseSection>

    <v-snackbar v-model="snackbar" timeout="4000" color="grey darken-4" top>
      <v-icon left small color="amber">mdi-flask-outline</v-icon>
      {{ snackText }}
    </v-snackbar>

    <PrototypeVariantBar
      :variants="variants"
      :current="variantKey"
      @change="onVariant"
    />
  </AdminLayout>
</template>

<style scoped>
.prototype-banner {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  background: repeating-linear-gradient(
    45deg,
    #1b1b1f,
    #1b1b1f 12px,
    #26262c 12px,
    #26262c 24px
  );
  color: #fff;
  font-size: 13px;
}

.prototype-banner code {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.case-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 8px 12px;
  border: 1px dashed #9e9e9e;
  border-radius: 8px;
}

.case {
  display: flex;
  align-items: center;
  padding-left: 8px;
  border-left: 1px solid #e0e0e0;
}

.case__label {
  font-size: 12px;
  margin-right: 2px;
}
</style>

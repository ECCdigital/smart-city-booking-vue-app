<script>
/**
 * PROTOTYPE — Rückfragen mit Folgen: Löschen eines Zugangspunkts und Fächer
 * mit Buchungen (ECCdigital/tickets#1095). Throwaway, never merged.
 *
 * Three variants on the rows of tickets#1093 (Variante A), switchable with
 * `?variant=` (A-C, bottom bar or ← →):
 *
 *   A  Kurz gesagt: schmaler Dialog, ein Satz je Folge, Namen eingeklappt;
 *      Fächer fragen beim Speichern nach
 *   B  Am Ort: Löschen als Zeile unter der Zeile, Folgen der Fächer am Fach
 *      und unter dem Raster, ohne Rückfrage; ohne Fach bleibt eine Marke
 *   C  Wer merkt es?: Dialog nach Betroffenen mit Häkchen bei laufenden
 *      Zugängen; Fächer fragen beim Abwählen am Fach, mit Ziel je Buchung
 *
 *   /prototype/rueckfragen-mit-folgen?variant=B
 *
 * The dashed bar opens each case directly. Runs without a backend;
 * switching variant resets the stub data.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import VariantA from "@/prototype/rueckfragen-mit-folgen/variants/VariantA.vue";
import VariantB from "@/prototype/rueckfragen-mit-folgen/variants/VariantB.vue";
import VariantC from "@/prototype/rueckfragen-mit-folgen/variants/VariantC.vue";
import { store, prototypeBus } from "@/prototype/zugangspunkte-fuehrung/data";
import {
  folgen,
  loadFolgen,
  PRESETS,
} from "@/prototype/rueckfragen-mit-folgen/folgen";

const VARIANTS = [
  { key: "A", name: "Kurz gesagt", component: VariantA },
  { key: "B", name: "Am Ort", component: VariantB },
  { key: "C", name: "Wer merkt es?", component: VariantC },
];

const DELETE_CASES = [
  { label: "ohne Folgen", row: "Makerspace Werkstatttür" },
  { label: "nur Buchungsobjekt", row: "Rathaus Seiteneingang" },
  { label: "2 laufende", row: "Rathaus Haupteingang" },
  { label: "14 Mieten", row: "Fahrradboxen Bahnhof Nord" },
  { label: "Schließfachanlage", row: "Schließfachanlage Bürgerbüro" },
];

const ANLAGE = "Schließfachanlage Bürgerbüro";

export default {
  name: "RueckfragenMitFolgenPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0, folgen };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    deleteCases() {
      return DELETE_CASES;
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
      loadFolgen();
      this.resets++;
    },
    rowOf(label) {
      return store.accessPoints.find((r) => r.label === label);
    },
    openDelete(c) {
      const row = this.rowOf(c.row);
      if (!row) return this.onStub(`„${c.row}“ ist schon gelöscht.`);
      this.$refs.variant.onMore(row, { key: "delete", text: "Löschen …" });
    },
    openEdit(preset) {
      const row = this.rowOf(ANLAGE);
      if (!row) return this.onStub(`„${ANLAGE}“ ist schon gelöscht.`);
      this.$refs.variant.onEdit(row, preset ? PRESETS[preset](row) : null);
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
        <strong>PROTOTYP: Rückfragen mit Folgen (tickets#1095).</strong>
        Wegwerfcode auf <code>prototype/1095-rueckfragen-mit-folgen</code>, auf
        den Zeilen aus #1093, mit Testdaten, ohne Backend. Löschen über „…“,
        Fächer über Bearbeiten der Schließfachanlage Bürgerbüro. Varianten:
        Leiste unten oder ← →.
      </div>
    </div>

    <div class="case-bar mb-2">
      <span class="text-body-2 mr-2">Löschen</span>
      <v-btn
        v-for="c in deleteCases"
        :key="c.row"
        x-small
        text
        color="error"
        :title="c.row"
        @click="openDelete(c)"
      >
        {{ c.label }}
      </v-btn>
      <v-divider vertical class="mx-2" />
      <v-switch
        v-model="folgen.slow"
        dense
        hide-details
        class="mt-0 mr-3"
        label="Prüfung dauert"
      />
      <v-switch
        v-model="folgen.unreadable"
        dense
        hide-details
        class="mt-0"
        label="Buchungen nicht abrufbar"
      />
    </div>
    <div class="case-bar mb-6">
      <span class="text-body-2 mr-2">Fächer</span>
      <v-btn x-small text @click="openEdit(null)">Anlage bearbeiten</v-btn>
      <v-btn x-small text @click="openEdit('zwei')"
        >A3 und A4 abgewählt</v-btn
      >
      <v-btn x-small text @click="openEdit('eng')"
        >nur A2 bleibt (kein Fach frei)</v-btn
      >
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
  gap: 4px 8px;
  padding: 6px 12px;
  border: 1px dashed #9e9e9e;
  border-radius: 8px;
}
</style>

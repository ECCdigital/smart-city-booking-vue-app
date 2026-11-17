<script>
/**
 * PROTOTYPE — Fächer der Schließfachanlage: welche und wie viele
 * (ECCdigital/tickets#1159). Throwaway, never merged.
 *
 * Three ways for the Verwaltung to understand which and how many Fächer its
 * Open Locker Anlage needs, switchable with `?variant=` (A-C, bottom bar or
 * ← →):
 *
 *   A  Beispiel im Dialog: Einsatzfälle als Beispiele, Buchungsobjekt im
 *      Dialog, neben den Fächern was die Anzahl daraus macht
 *   B  Vom Buchungsobjekt her: was liegt im Fach, wie viele zur selben Zeit
 *      (= Anzahl), welche Fächer; die Anlage entsteht nebenbei
 *   C  Anzahl aus den Fächern: nur Fächer wählen, die Anzahl des
 *      Buchungsobjekts folgt aus den Fächern in Betrieb
 *
 *   /prototype/faecher-der-anlage?variant=B&fall=fahrrad
 *
 * The dashed bar picks the case. Runs without a backend; switching variant
 * or case resets the stub data.
 */
import AdminLayout from "@/layouts/Admin.vue";
import PrototypeVariantBar from "@/prototype/faecher-der-anlage/PrototypeVariantBar.vue";
import VariantA from "@/prototype/faecher-der-anlage/variants/VariantA.vue";
import VariantB from "@/prototype/faecher-der-anlage/variants/VariantB.vue";
import VariantC from "@/prototype/faecher-der-anlage/variants/VariantC.vue";
import { CASES } from "@/prototype/faecher-der-anlage/data";

const VARIANTS = [
  { key: "A", name: "Beispiel im Dialog", component: VariantA },
  { key: "B", name: "Vom Buchungsobjekt her", component: VariantB },
  { key: "C", name: "Anzahl aus den Fächern", component: VariantC },
];

export default {
  name: "FaecherDerAnlagePrototype",
  components: { AdminLayout, PrototypeVariantBar },
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
    caseKey() {
      const q = this.$route.query.fall;
      return CASES.some((c) => c.key === q) ? q : CASES[0].key;
    },
    scenario() {
      return CASES.find((c) => c.key === this.caseKey);
    },
  },
  methods: {
    setQuery(patch) {
      this.$router
        .replace({ query: { ...this.$route.query, ...patch } })
        .catch(() => {});
    },
    onVariant(key) {
      this.setQuery({ variant: key });
    },
    onStub(text) {
      this.snackText = text;
      this.snackbar = false;
      this.$nextTick(() => (this.snackbar = true));
    },
  },
};
</script>

<template>
  <AdminLayout hide-page-title>
    <div class="prototype-banner mb-4">
      <v-icon color="white" class="mr-3">mdi-flask-outline</v-icon>
      <div class="flex-grow-1">
        <strong
          >PROTOTYP: Welche und wie viele Fächer braucht die Anlage?
          (tickets#1159).</strong
        >
        Wegwerfcode auf <code>prototype/1159-faecher-der-anlage</code>, mit
        Testdaten, ohne Backend. Das feste Fach gibt es nicht mehr. Fall: Leiste
        darunter. Varianten: Leiste unten oder ← →. Fächer anklicken, das
        Werkzeug am Fach setzt es außer Betrieb.
      </div>
    </div>

    <div class="case-bar mb-6">
      <span class="text-body-2 mr-2">Fall</span>
      <v-btn
        v-for="c in cases"
        :key="c.key"
        x-small
        :text="c.key !== caseKey"
        :color="c.key === caseKey ? 'primary' : ''"
        depressed
        @click="setQuery({ fall: c.key })"
      >
        <v-icon x-small left>{{ c.icon }}</v-icon>
        {{ c.label }}
        <span class="ml-1 text--secondary" style="text-transform: none">
          · Anzahl {{ c.bookable.amount || "∞" }}
        </span>
      </v-btn>
      <v-spacer />
      <v-btn small text @click="resets++">
        <v-icon left small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
    </div>

    <component
      :is="variant.component"
      :key="`${variantKey}-${caseKey}-${resets}`"
      :scenario="scenario"
      @stub="onStub"
    />

    <div style="height: 96px" />

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

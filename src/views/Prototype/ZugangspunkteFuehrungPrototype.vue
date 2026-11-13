<script>
/**
 * PROTOTYPE — Führung durch die Ersteinrichtung der Seite Zugangspunkte
 * (ECCdigital/tickets#1084). Throwaway, never merged.
 *
 * Three variants of the page skeleton on one route, switchable with
 * `?variant=` (A-C, bottom bar or ← →), each in four states of the
 * Ersteinrichtung, switchable with `?stand=`:
 *
 *   /prototype/zugangspunkte-fuehrung?variant=A&stand=neu
 *   …&stand=verbunden | mitten | eingerichtet
 *
 * Runs without a backend: everything is stubbed in
 * `src/prototype/zugangspunkte-fuehrung/data.js`. Actions change only that
 * in-memory store; switching the Stand resets it.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import VariantA from "@/prototype/zugangspunkte-fuehrung/variants/VariantA.vue";
import VariantB from "@/prototype/zugangspunkte-fuehrung/variants/VariantB.vue";
import VariantC from "@/prototype/zugangspunkte-fuehrung/variants/VariantC.vue";
import {
  SCENARIOS,
  loadScenario,
  prototypeBus,
} from "@/prototype/zugangspunkte-fuehrung/data";

const VARIANTS = [
  { key: "A", name: "Zwei Reiter mit Wegweisern", component: VariantA },
  { key: "B", name: "Geführte Einrichtung in Schritten", component: VariantB },
  { key: "C", name: "Eine Seite je Schließsystem", component: VariantC },
];

export default {
  name: "ZugangspunkteFuehrungPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0 };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    scenarios() {
      return SCENARIOS;
    },
    variantKey() {
      const q = this.$route.query.variant;
      return VARIANTS.some((v) => v.key === q) ? q : "A";
    },
    variant() {
      return VARIANTS.find((v) => v.key === this.variantKey);
    },
    standKey() {
      const q = this.$route.query.stand;
      return SCENARIOS.some((s) => s.key === q) ? q : "neu";
    },
    stand: {
      get() {
        return this.standKey;
      },
      set(key) {
        this.replaceQuery({ stand: key });
      },
    },
    standHint() {
      return SCENARIOS.find((s) => s.key === this.standKey).hint;
    },
  },
  watch: {
    standKey: {
      immediate: true,
      handler(key) {
        loadScenario(key);
        this.resets++;
      },
    },
    variantKey() {
      // Each variant starts from the same Stand, untouched by the last one.
      loadScenario(this.standKey);
      this.resets++;
    },
  },
  methods: {
    replaceQuery(patch) {
      const query = { ...this.$route.query, ...patch };
      this.$router.replace({ query }).catch(() => {});
    },
    onVariant(key) {
      this.replaceQuery({ variant: key });
    },
    reset() {
      loadScenario(this.standKey);
      this.resets++;
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
        <strong
          >PROTOTYP: Führung durch die Ersteinrichtung (tickets#1084).</strong
        >
        Wegwerfcode auf <code>prototype/1084-zugangspunkte-fuehrung</code>, mit
        Testdaten, ohne Backend. Varianten: Leiste unten oder ← →. Der Stand
        setzt die Testdaten zurück.
      </div>
    </div>

    <div class="stand-bar mb-6">
      <span class="text-body-2 mr-3">Stand der Einrichtung</span>
      <v-btn-toggle v-model="stand" mandatory dense color="primary">
        <v-btn
          v-for="s in scenarios"
          :key="s.key"
          :value="s.key"
          small
          style="text-transform: none"
        >
          {{ s.label }}
        </v-btn>
      </v-btn-toggle>
      <span class="text-caption text--secondary ml-3">{{ standHint }}</span>
      <v-spacer />
      <v-btn small text @click="reset">
        <v-icon left small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
    </div>

    <BaseSection
      title="Zutritt & Schließsysteme"
      icon="mdi-door-closed-lock"
      hint="Schließsysteme, Türen und Anlagen dieses Mandanten."
    >
      <component
        :is="variant.component"
        :key="`${variantKey}-${standKey}-${resets}`"
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

.stand-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
  padding: 8px 12px;
  border: 1px dashed #9e9e9e;
  border-radius: 8px;
}
</style>

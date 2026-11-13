<script>
/**
 * PROTOTYPE — Zeilen im Abschnitt eines Anbieters, Menü „…“, Suche und Filter
 * über mehrere Abschnitte (ECCdigital/tickets#1093). Throwaway, never merged.
 *
 * Three variants on the page of tickets#1084 (Variante C), switchable with
 * `?variant=` (A-C, bottom bar or ← →):
 *
 *   A  Schlanke Zeile, Abweichungen als Marke, Seltenes im Menü „…“
 *   B  Tabelle je Abschnitt, Spalten je Anbieter, Filterleiste, Blättern
 *   C  Zeile klappt auf, kein Menü, Suche erst ab 15 Zugangspunkten
 *
 *   /prototype/zeilen-je-anbieter?variant=A&stand=viele&aus=1
 *
 * The head of each Abschnitt is the same in all three (`SectionHead.vue`).
 * The dashed bar sets the Stand and whether Salto KS is switched off. Runs
 * without a backend; switching variant or Stand resets the stub data.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import VariantA from "@/prototype/zeilen-je-anbieter/variants/VariantA.vue";
import VariantB from "@/prototype/zeilen-je-anbieter/variants/VariantB.vue";
import VariantC from "@/prototype/zeilen-je-anbieter/variants/VariantC.vue";
import { prototypeBus } from "@/prototype/zugangspunkte-fuehrung/data";
import { STANDS, loadRows } from "@/prototype/zeilen-je-anbieter/rows";

const VARIANTS = [
  { key: "A", name: "Schlanke Zeile, Seltenes im Menü", component: VariantA },
  { key: "B", name: "Tabelle je Abschnitt", component: VariantB },
  { key: "C", name: "Zeile klappt auf, kein Menü", component: VariantC },
];

export default {
  name: "ZeilenJeAnbieterPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0 };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    stands() {
      return STANDS;
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
      return STANDS.some((s) => s.key === q) ? q : "wenige";
    },
    stand: {
      get() {
        return this.standKey;
      },
      set(key) {
        this.replaceQuery({ stand: key });
      },
    },
    paused: {
      get() {
        return this.$route.query.aus === "1";
      },
      set(v) {
        this.replaceQuery({ aus: v ? "1" : undefined });
      },
    },
    standHint() {
      return STANDS.find((s) => s.key === this.standKey).hint;
    },
  },
  watch: {
    standKey: {
      immediate: true,
      handler() {
        this.reset();
      },
    },
    paused() {
      this.reset();
    },
    variantKey() {
      this.reset();
    },
  },
  methods: {
    replaceQuery(patch) {
      const query = { ...this.$route.query, ...patch };
      Object.keys(query).forEach(
        (k) => query[k] === undefined && delete query[k]
      );
      this.$router.replace({ query }).catch(() => {});
    },
    onVariant(key) {
      this.replaceQuery({ variant: key });
    },
    reset() {
      loadRows(this.standKey, { paused: this.paused });
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
          >PROTOTYP: Zeilen je Anbieter, Menü, Suche und Filter
          (tickets#1093).</strong
        >
        Wegwerfcode auf <code>prototype/1093-zeilen-je-schliesssystem</code>,
        auf der Seite aus #1084, mit Testdaten, ohne Backend. Varianten: Leiste
        unten oder ← →. Der Kopf je Anbieter ist in allen drei gleich, der
        Streifen „Stand der Einrichtung“ ist hier weggelassen.
      </div>
    </div>

    <div class="stand-bar mb-6">
      <span class="text-body-2 mr-3">Stand</span>
      <v-btn-toggle v-model="stand" mandatory dense color="primary">
        <v-btn
          v-for="s in stands"
          :key="s.key"
          :value="s.key"
          small
          style="text-transform: none"
        >
          {{ s.label }}
        </v-btn>
      </v-btn-toggle>
      <v-checkbox
        v-model="paused"
        dense
        hide-details
        class="ml-6 mt-0 pt-0"
        label="Salto KS ausgeschaltet"
      />
      <v-spacer />
      <v-btn small text @click="reset">
        <v-icon left small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
      <div class="stand-hint text-caption text--secondary">{{ standHint }}</div>
    </div>

    <BaseSection
      title="Zugangspunkte"
      icon="mdi-door-closed-lock"
      hint="Anbieter, Türen und Schließfachanlagen dieses Mandanten."
    >
      <component
        :is="variant.component"
        :key="`${variantKey}-${standKey}-${paused}-${resets}`"
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

.stand-hint {
  flex-basis: 100%;
}
</style>

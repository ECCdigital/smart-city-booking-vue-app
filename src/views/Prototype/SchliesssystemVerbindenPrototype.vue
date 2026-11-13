<script>
/**
 * PROTOTYPE — Schließsystem verbinden und seine Zugangsdaten ändern, ohne
 * Reiter „Schließsysteme“ (ECCdigital/tickets#1087). Throwaway, never merged.
 *
 * Three variants on the page of tickets#1084 (Variante C), switchable with
 * `?variant=` (A-C, bottom bar or ← →):
 *
 *   A  Ein Dialog, Verbinden prüft und speichert
 *   B  Im Abschnitt aufklappen, Testen und Speichern getrennt
 *   C  Eigene Seite je Schließsystem, Verbinden in Schritten
 *
 *   /prototype/schliesssystem-verbinden?variant=A&stand=mitten
 *
 * The form per Anbieter is the same in all three (`ProviderForm.vue`). The
 * dashed bar sets the Stand and whether the stubbed Verbindungstest succeeds.
 * Runs without a backend; switching variant or Stand resets the stub data.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import VariantA from "@/prototype/schliesssystem-verbinden/variants/VariantA.vue";
import VariantB from "@/prototype/schliesssystem-verbinden/variants/VariantB.vue";
import VariantC from "@/prototype/schliesssystem-verbinden/variants/VariantC.vue";
import {
  SCENARIOS,
  loadScenario,
  prototypeBus,
} from "@/prototype/zugangspunkte-fuehrung/data";
import {
  conn,
  seedConnections,
} from "@/prototype/schliesssystem-verbinden/connections";

const VARIANTS = [
  {
    key: "A",
    name: "Dialog, Verbinden prüft und speichert",
    component: VariantA,
  },
  {
    key: "B",
    name: "Im Abschnitt, Testen und Speichern getrennt",
    component: VariantB,
  },
  { key: "C", name: "Eigene Seite je Schließsystem", component: VariantC },
];

const STANDS = ["neu", "mitten", "alle", "eingerichtet"];

export default {
  name: "SchliesssystemVerbindenPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0 };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    scenarios() {
      return SCENARIOS.filter((s) => STANDS.includes(s.key));
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
      return STANDS.includes(q) ? q : "mitten";
    },
    stand: {
      get() {
        return this.standKey;
      },
      set(key) {
        this.replaceQuery({ stand: key, system: undefined, teil: undefined });
      },
    },
    standHint() {
      return SCENARIOS.find((s) => s.key === this.standKey).hint;
    },
    outcome: {
      get() {
        return conn.outcome;
      },
      set(v) {
        conn.outcome = v;
      },
    },
  },
  watch: {
    standKey: {
      immediate: true,
      handler() {
        this.reset();
      },
    },
    variantKey() {
      this.reset();
    },
  },
  methods: {
    replaceQuery(patch) {
      const query = { ...this.$route.query, ...patch };
      this.$router.replace({ query }).catch(() => {});
    },
    onVariant(key) {
      this.replaceQuery({ variant: key, system: undefined, teil: undefined });
    },
    reset() {
      loadScenario(this.standKey);
      seedConnections();
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
          >PROTOTYP: Schließsystem verbinden und ändern (tickets#1087).</strong
        >
        Wegwerfcode auf <code>prototype/1087-schliesssystem-verbinden</code>,
        auf der Seite aus #1084, mit Testdaten, ohne Backend. Varianten: Leiste
        unten oder ← →. Das Formular je Anbieter ist in allen drei gleich.
      </div>
    </div>

    <div class="stand-bar mb-6">
      <span class="text-body-2 mr-3">Stand</span>
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
      <span class="text-body-2 ml-6 mr-3">Verbindungstest</span>
      <v-btn-toggle v-model="outcome" mandatory dense>
        <v-btn value="ok" small style="text-transform: none">
          <v-icon left small color="success">mdi-check</v-icon>gelingt
        </v-btn>
        <v-btn value="fail" small style="text-transform: none">
          <v-icon left small color="error">mdi-close</v-icon>scheitert
        </v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-btn small text @click="reset">
        <v-icon left small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
      <div class="stand-hint text-caption text--secondary">{{ standHint }}</div>
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

.stand-hint {
  flex-basis: 100%;
}
</style>

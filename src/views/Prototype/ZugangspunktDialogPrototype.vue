<script>
/**
 * PROTOTYPE — Dialog zum Anlegen und Bearbeiten eines Zugangspunkts
 * (ECCdigital/tickets#1085). Throwaway, never merged.
 *
 * Three variants of the dialog, switchable with `?variant=` (A-C, bottom bar
 * or ← →), each opened from the page of tickets#1084 (Variante C, one section
 * per Schließsystem), so the Anbieter is settled before the dialog opens:
 *
 *   /prototype/zugangspunkt-dialog?variant=A
 *
 * The dashed bar opens each case directly. Runs without a backend; saving
 * changes only the in-memory store, switching the variant resets it.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/zugangspunkte-fuehrung/PrototypeVariantBar.vue";
import HostPage from "@/prototype/zugangspunkt-dialog/HostPage.vue";
import DialogA from "@/prototype/zugangspunkt-dialog/variants/DialogA.vue";
import DialogB from "@/prototype/zugangspunkt-dialog/variants/DialogB.vue";
import DialogC from "@/prototype/zugangspunkt-dialog/variants/DialogC.vue";
import {
  loadScenario,
  prototypeBus,
  store,
  provider,
} from "@/prototype/zugangspunkte-fuehrung/data";

const VARIANTS = [
  { key: "A", name: "Ein Dialog, nur das Nötige", component: DialogA },
  { key: "B", name: "Schritte, Bearbeiten mit Themen", component: DialogB },
  { key: "C", name: "Übernehmen, Details im Seitenpanel", component: DialogC },
];

const CREATE_CASES = [
  { provider: "nuki", text: "Nuki: Tür" },
  { provider: "salto-ks", text: "Salto KS: Tür" },
  { provider: "open-locker", text: "Open Locker" },
  { provider: "ifbs", text: "iFBS: Anlage" },
  { provider: "pareva", text: "Pareva: Anlage" },
];

export default {
  name: "ZugangspunktDialogPrototype",
  components: { AdminLayout, BaseSection, HostPage, PrototypeVariantBar },
  data() {
    return { snackbar: false, snackText: "", resets: 0 };
  },
  computed: {
    variants() {
      return VARIANTS;
    },
    createCases() {
      return CREATE_CASES;
    },
    editCases() {
      return store.accessPoints.map((ap) => ({
        ap,
        text: `${provider(ap.provider)?.name}: ${ap.label}`,
      }));
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
        loadScenario("alle");
        this.resets++;
      },
    },
  },
  methods: {
    onVariant(key) {
      const query = { ...this.$route.query, variant: key };
      this.$router.replace({ query }).catch(() => {});
    },
    reset() {
      loadScenario("alle");
      this.resets++;
    },
    openCreate(id) {
      this.$refs.host.openCreate(id);
    },
    openEdit(ap) {
      this.$refs.host.edit(ap);
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
          >PROTOTYP: Dialog zum Anlegen und Bearbeiten (tickets#1085).</strong
        >
        Wegwerfcode auf <code>prototype/1085-zugangspunkt-dialog</code>, auf der
        Seite aus #1084, mit Testdaten, ohne Backend. Varianten: Leiste unten
        oder ← →. Die Karte beim Standort bleibt wie heute und ist hier nur ein
        Textfeld.
      </div>
    </div>

    <div class="case-bar mb-6">
      <span class="text-body-2 mr-2">Anlegen:</span>
      <v-btn
        v-for="c in createCases"
        :key="c.provider"
        x-small
        outlined
        class="mr-1 mb-1"
        style="text-transform: none"
        @click="openCreate(c.provider)"
      >
        {{ c.text }}
      </v-btn>
      <span class="text-body-2 ml-3 mr-2">Bearbeiten:</span>
      <v-btn
        v-for="c in editCases"
        :key="c.ap.id"
        x-small
        text
        class="mr-1 mb-1"
        style="text-transform: none"
        @click="openEdit(c.ap)"
      >
        {{ c.text }}
      </v-btn>
      <v-spacer />
      <v-btn x-small text @click="reset">
        <v-icon left x-small>mdi-restore</v-icon>
        Zurücksetzen
      </v-btn>
    </div>

    <BaseSection
      title="Zutritt & Schließsysteme"
      icon="mdi-door-closed-lock"
      hint="Schließsysteme, Türen und Anlagen dieses Mandanten."
    >
      <HostPage
        ref="host"
        :key="`${variantKey}-${resets}`"
        :dialog="variant.component"
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
  padding: 8px 12px;
  border: 1px dashed #9e9e9e;
  border-radius: 8px;
}
</style>

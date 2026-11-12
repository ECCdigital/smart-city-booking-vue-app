<script>
/**
 * PROTOTYPE — QR-Code je Fach (ECCdigital/tickets#1049). Throwaway, never merged.
 *
 * Two views, switchable with `?view=` and `?variant=`:
 *
 *   /prototype/qr-je-fach?view=admin&variant=A   where the actions sit (A-D)
 *   /prototype/qr-je-fach?view=sheet&variant=B   the Sammel-PDF (A-C)
 *
 * Runs without a backend: everything is stubbed in
 * `src/prototype/qr-je-fach/data.js`. Nothing here writes.
 */
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import PrototypeVariantBar from "@/prototype/qr-je-fach/PrototypeVariantBar.vue";
import VariantA from "@/prototype/qr-je-fach/variants/VariantA.vue";
import VariantB from "@/prototype/qr-je-fach/variants/VariantB.vue";
import VariantC from "@/prototype/qr-je-fach/variants/VariantC.vue";
import VariantD from "@/prototype/qr-je-fach/variants/VariantD.vue";
import SheetView from "@/prototype/qr-je-fach/variants/SheetView.vue";
import { initialAccessPoints, prototypeBus } from "@/prototype/qr-je-fach/data";
import { LAYOUTS } from "@/prototype/qr-je-fach/sheets";

const VIEWS = [
  {
    key: "admin",
    label: "1 · Zugangspunkte",
    icon: "mdi-door-closed-lock",
    question:
      "Wo stehen Download und Rotation je Fach, wo „alle drucken“ und „alle rotieren“, wie warnt die Rotation aller, und wo steht der Schalter „QR-Scan erforderlich“ der Anlage? Öffnen Sie die Zeile „Quartiersschrank Gaarden“.",
    variants: [
      { key: "A", name: "Alles im Zeilenmenü", component: VariantA },
      { key: "B", name: "Am Fach im Dialog der Anlage", component: VariantB },
      { key: "C", name: "Eigener Dialog „QR-Codes“", component: VariantC },
      { key: "D", name: "Anlage klappt in der Liste auf", component: VariantD },
    ],
  },
  {
    key: "sheet",
    label: "2 · Sammel-PDF",
    icon: "mdi-file-pdf-box",
    question:
      "Wie sieht das Sammel-PDF aus: Größe, Anordnung und Beschriftung der Etiketten, passend als Aufkleber am Fach?",
    variants: LAYOUTS.map((l) => ({ key: l.key, name: l.name })),
  },
];

export default {
  name: "QrJeFachPrototype",
  components: { AdminLayout, BaseSection, PrototypeVariantBar, SheetView },
  data() {
    return {
      items: initialAccessPoints(),
      snackbar: false,
      snackText: "",
    };
  },
  computed: {
    views() {
      return VIEWS;
    },
    viewKey() {
      const requested = this.$route.query.view;
      return VIEWS.some((v) => v.key === requested) ? requested : VIEWS[0].key;
    },
    view() {
      return VIEWS.find((v) => v.key === this.viewKey);
    },
    variantKey() {
      const requested = this.$route.query.variant;
      return this.view.variants.some((v) => v.key === requested)
        ? requested
        : this.view.variants[0].key;
    },
    variant() {
      return this.view.variants.find((v) => v.key === this.variantKey);
    },
    anlage() {
      return this.items.find((i) => i.hasQr);
    },
    tabIndex: {
      get() {
        return VIEWS.findIndex((v) => v.key === this.viewKey);
      },
      set(index) {
        const next = VIEWS[index];
        if (!next || next.key === this.viewKey) return;
        this.replaceQuery({ view: next.key, variant: "A" });
      },
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
      <v-icon color="white" class="mr-2">mdi-flask-outline</v-icon>
      <div>
        <strong>PROTOTYP — QR-Code je Fach (tickets#1049).</strong>
        Wegwerfcode auf <code>prototype/1049-qr-je-fach</code>, mit Stub-Daten,
        ohne Backend. Nichts hiervon wird gemerged. Varianten wechseln: Leiste
        unten oder ← →.
      </div>
    </div>

    <v-tabs v-model="tabIndex" color="primary" class="mb-4">
      <v-tab v-for="v in views" :key="v.key" style="text-transform: none">
        <v-icon left small>{{ v.icon }}</v-icon>
        {{ v.label }}
      </v-tab>
    </v-tabs>

    <v-alert dense text color="primary" class="mb-6">
      <div class="text-caption font-weight-bold">FRAGE DIESER ANSICHT</div>
      {{ view.question }}
    </v-alert>

    <BaseSection
      v-if="viewKey === 'admin'"
      title="Zugangspunkte"
      icon="mdi-door-closed-lock"
      hint="Türen und Schließfachanlagen dieses Mandanten."
    >
      <component :is="variant.component" :key="variantKey" :items="items" />
    </BaseSection>

    <SheetView v-else :anlage="anlage" :layout-key="variantKey" />

    <v-snackbar v-model="snackbar" timeout="3500" color="grey darken-4" top>
      <v-icon left small color="amber">mdi-flask-outline</v-icon>
      {{ snackText }}
    </v-snackbar>

    <PrototypeVariantBar
      :variants="view.variants"
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
</style>

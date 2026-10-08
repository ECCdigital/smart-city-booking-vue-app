<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     Three variants of one basics component for the editor's tab „Allgemein“
     and the flow's step „Identität“, switchable via `?variant=A|B|C` on the
     existing bookable routes. `?variant=0` shows today's component. -->
<template>
  <div>
    <component
      :is="current.comp"
      :bookable="bookable"
      :is-new="isNew"
      @update:bookable="$emit('update:bookable', $event)"
    />
    <PrototypeSwitcher :variants="variants" :current="variantKey" />
  </div>
</template>

<script>
import BasicsVariantA from "./BasicsVariantA.vue";
import BasicsVariantB from "./BasicsVariantB.vue";
import BasicsVariantC from "./BasicsVariantC.vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";
import BookableEditGeneral from "@/components/Bookable/Edit/BookableEditGeneral.vue";
import BookableFlowIdentity from "@/components/Bookable/Flow/BookableFlowIdentity.vue";
import { isFlowMode } from "@/utils/bookableFlow";

export default {
  name: "BookableBasicsPrototype",
  components: { PrototypeSwitcher },
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
  computed: {
    flow() {
      return isFlowMode({
        bookableId: this.$route.query.id,
        mode: this.$route.query.mode,
      });
    },
    variants() {
      return [
        { key: "A", name: "Karten des Editors", comp: BasicsVariantA },
        { key: "B", name: "Feldliste des Ablaufs", comp: BasicsVariantB },
        { key: "C", name: "Neu mit Katalog-Vorschau", comp: BasicsVariantC },
        {
          key: "0",
          name: "Heute",
          comp: this.flow ? BookableFlowIdentity : BookableEditGeneral,
        },
      ];
    },
    variantKey() {
      const key = String(this.$route.query.variant || "A").toUpperCase();
      return this.variants.some((v) => v.key === key) ? key : "A";
    },
    current() {
      return this.variants.find((v) => v.key === this.variantKey);
    },
  },
};
</script>

<!-- PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
     Three variants of one component for price, Anzahl and Höchstmenge je
     Buchung, in the editor's tab „Preise & Kapazität“ and the flow's steps
     „Preis“ and „Anzahl & Kapazität“, switchable via `?variant=A|B|C`
     (`0` = today's components) on the existing bookable routes; the names
     via `?namen=E|A|N` (key N). The rules are the same in every variant
     (priceShared.js); only the form differs. The panel „Daten“ shows what
     lands on the bookable and what the check would report. -->
<template>
  <div class="p343">
    <template v-if="variantKey === '0'">
      <component
        :is="comp"
        v-for="comp in todayComps"
        :key="comp.name"
        :bookable="bookable"
        @update:bookable="$emit('update:bookable', $event)"
      />
    </template>

    <template v-else-if="flow">
      <div :class="{ 'p343-panel': part === 'amount' }">
        <component
          :is="current.comp"
          :bookable="bookable"
          :part="part"
          :naming="naming"
          flow
          @update:bookable="$emit('update:bookable', $event)"
        />
      </div>
    </template>

    <template v-else>
      <v-card
        v-for="p in ['price', 'amount']"
        :key="p"
        outlined
        class="mb-4 section-card"
      >
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">
            {{ p === "price" ? "mdi-cash" : "mdi-layers-outline" }}
          </v-icon>
          <span class="text-h6 font-weight-bold">
            {{ p === "price" ? naming.priceSection : naming.capacitySection }}
          </span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <component
            :is="current.comp"
            :bookable="bookable"
            :part="p"
            :naming="naming"
            @update:bookable="$emit('update:bookable', $event)"
          />
        </v-card-text>
      </v-card>
    </template>

    <details class="p343-state">
      <summary>Daten und Prüfung (Prototyp)</summary>
      <pre>{{ stateDump }}</pre>
    </details>

    <PrototypeSwitcher
      :variants="variants"
      :current="variantKey"
      :namings="namingList"
      :naming="namingKey"
    />
  </div>
</template>

<script>
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableFlowPrice from "@/components/Bookable/Flow/BookableFlowPrice.vue";
import BookableFlowAmount from "@/components/Bookable/Flow/BookableFlowAmount.vue";
import { isFlowMode } from "@/utils/bookableFlow";
import PriceVariantA from "./PriceVariantA.vue";
import PriceVariantB from "./PriceVariantB.vue";
import PriceVariantC from "./PriceVariantC.vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";
import { NAMINGS, priceIssues, priceModeOf } from "./priceShared";

export default {
  name: "PricePrototype",
  components: { PrototypeSwitcher },
  inheritAttrs: false,
  props: {
    bookable: { type: Object, required: true },
    /** In the flow: `price` or `amount`, as the step; the editor shows both. */
    part: { type: String, default: "price" },
  },
  computed: {
    flow() {
      return isFlowMode({
        bookableId: this.$route.query.id,
        mode: this.$route.query.mode,
      });
    },
    todayComps() {
      if (!this.flow) return [BookableEditPrice];
      return [this.part === "amount" ? BookableFlowAmount : BookableFlowPrice];
    },
    variants() {
      return [
        { key: "A", name: "Formular des Editors", comp: PriceVariantA },
        { key: "B", name: "Fragen des Ablaufs", comp: PriceVariantB },
        { key: "C", name: "Neu: Satz mit Beispielrechnung", comp: PriceVariantC },
        { key: "0", name: "Heute", comp: null },
      ];
    },
    variantKey() {
      const key = String(this.$route.query.variant || "A").toUpperCase();
      return this.variants.some((v) => v.key === key) ? key : "A";
    },
    current() {
      return this.variants.find((v) => v.key === this.variantKey);
    },
    namingList() {
      return Object.keys(NAMINGS).map((key) => ({
        key,
        name: NAMINGS[key].name,
      }));
    },
    namingKey() {
      const key = String(this.$route.query.namen || "N").toUpperCase();
      return NAMINGS[key] ? key : "N";
    },
    naming() {
      return NAMINGS[this.namingKey];
    },
    stateDump() {
      const b = this.bookable;
      return JSON.stringify(
        {
          priceModeOf: priceModeOf(b),
          priceType: b.priceType,
          priceCategories: b.priceCategories,
          priceValueAddedTax: b.priceValueAddedTax,
          enableCoupons: b.enableCoupons,
          amount: b.amount,
          maxAmountPerBooking: b.maxAmountPerBooking,
          issues: priceIssues(b),
        },
        null,
        2
      );
    },
  },
};
</script>

<!-- Plain, prefixed: the variants share these in both modes. -->
<style>
.p343-panel {
  padding: var(--scb-space-5);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}
.p343-field {
  margin-bottom: var(--scb-space-5);
}
.p343-question {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.p343-hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
.p343-note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}
.p343-note--warning {
  background-color: var(--scb-warning-tint);
  border: 1px solid var(--v-warning-base);
}
.p343-error {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}
.p343-rule {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}
.p343-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-3);
}
.p343-state {
  margin: var(--scb-space-5) 0 var(--scb-space-8);
  font-size: 12px;
  color: var(--scb-text-muted);
}
.p343-state summary {
  cursor: pointer;
}
.p343-state pre {
  max-height: 320px;
  overflow: auto;
  padding: var(--scb-space-3);
  background: var(--scb-surface-tint);
  border-radius: var(--scb-radius-control);
}
</style>

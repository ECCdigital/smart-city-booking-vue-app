<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): was die Farben in der Storefront
       tragen (#512): Primär Knopf und Preis, Sekundär Auswahl, Akzent Badge,
       Streifen und Kategorie-Kreis. Ohne Akzent die Rückfälle von heute. -->
  <div class="proto-bits" :class="`proto-bits--${mode}`">
    <div v-if="show.includes('category')" class="proto-bits__category">
      <span class="proto-bits__circle" :style="pair(accentOr(primary))">
        <v-icon x-small :color="contrast(accentOr(primary))">mdi-soccer</v-icon>
      </span>
      <span>Sport</span>
    </div>
    <div v-if="show.includes('card')" class="proto-bits__card">
      <div class="proto-bits__stripe" :style="{ background: accentOr(primary) }" />
      <div class="proto-bits__card-body">
        <div class="d-flex align-center">
          <b>Turnhalle Nord</b>
          <span class="proto-bits__badge ml-2" :style="pair(accentOr(primary))">
            Raum
          </span>
          <span class="proto-bits__badge ml-1" :style="pair(accentOr(secondary))">
            Pauschal
          </span>
        </div>
        <div class="d-flex align-center mt-1">
          <span class="proto-bits__price" :style="{ color: primary }">
            ab 12,50 €
          </span>
          <span class="proto-bits__button ml-auto" :style="pair(primary)">
            Buchen
          </span>
        </div>
      </div>
    </div>
    <div v-if="show.includes('selection')" class="proto-bits__chips">
      <span class="proto-bits__chip" :style="pair(secondary)">Heute</span>
      <span class="proto-bits__chip proto-bits__chip--off">Morgen</span>
    </div>
  </div>
</template>

<script>
import { contrastOf } from "./appearancePrototype";

export default {
  name: "ProtoStorefrontBits",
  props: {
    colors: { type: Object, default: () => ({}) },
    accent: { type: String, default: null },
    mode: { type: String, default: "light" },
    show: { type: Array, default: () => ["category", "card", "selection"] },
  },
  computed: {
    primary() {
      return this.colors.primary || "#1976d2";
    },
    secondary() {
      return this.colors.secondary || "#26a69a";
    },
  },
  methods: {
    accentOr(fallback) {
      return this.accent || fallback;
    },
    contrast(color) {
      return contrastOf(color);
    },
    pair(color) {
      return { background: color, color: contrastOf(color) };
    },
  },
};
</script>

<style scoped>
.proto-bits {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
}

.proto-bits--light {
  background: #f9fafb;
  color: #111827;
}

.proto-bits--dark {
  background: #030712;
  color: #f3f4f6;
}

.proto-bits__category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.proto-bits__circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.proto-bits__card {
  display: flex;
  min-width: 190px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(127, 127, 127, 0.25);
}

.proto-bits--light .proto-bits__card {
  background: #ffffff;
}

.proto-bits--dark .proto-bits__card {
  background: #111827;
}

.proto-bits__stripe {
  width: 4px;
}

.proto-bits__card-body {
  padding: 6px 8px;
  flex: 1;
}

.proto-bits__badge {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
}

.proto-bits__price {
  font-weight: 700;
}

.proto-bits__button {
  padding: 1px 8px;
  border-radius: 4px;
}

.proto-bits__chips {
  display: flex;
  gap: 4px;
}

.proto-bits__chip {
  padding: 1px 8px;
  border-radius: 999px;
}

.proto-bits__chip--off {
  border: 1px solid rgba(127, 127, 127, 0.4);
}
</style>

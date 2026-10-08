<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     Three variants of one component for Berechtigung, Anmeldepflicht and
     Rabatte, in the editor's tab „Berechtigungen“ and the flow's step
     „Berechtigung“, switchable via `?variant=A|B|C` (`0` = today's
     components) on the existing bookable routes; the names via
     `?namen=E|A|N` (key N). The rules are the same in every variant
     (permShared.js); only the form differs. The panel „Daten“ shows what
     lands on the bookable, what the check would report, and sets test cases. -->
<template>
  <div class="p344">
    <template v-if="variantKey === '0'">
      <component
        :is="todayComp"
        :bookable="bookable"
        @update:bookable="$emit('update:bookable', $event)"
      />
    </template>

    <template v-else-if="flow">
      <component
        :is="current.comp"
        :key="variantKey"
        :bookable="bookable"
        :naming="naming"
        flow
        @update:bookable="$emit('update:bookable', $event)"
      />
    </template>

    <template v-else>
      <v-card outlined class="mb-4 section-card">
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">mdi-account-lock-outline</v-icon>
          <span class="text-h6 font-weight-bold">{{ naming.section }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <component
            :is="current.comp"
            :key="variantKey"
            :bookable="bookable"
            :naming="naming"
            @update:bookable="$emit('update:bookable', $event)"
          />
        </v-card-text>
      </v-card>
      <p class="p344-note mb-4">
        Serienbuchungen und Stornierungsrichtlinie stehen heute auch in diesem
        Tab. Wohin sie gehören, entscheidet die Klärung zu den Bereichen ohne
        Schritt (#346); im Prototyp fehlen sie.
      </p>
    </template>

    <details class="p344-state" open>
      <summary>Daten und Prüfung (Prototyp)</summary>
      <div class="p344-cases">
        <span>Testfall:</span>
        <v-btn
          v-for="c in cases"
          :key="c.key"
          x-small
          outlined
          @click="setCase(c)"
        >
          {{ c.label }}
        </v-btn>
      </div>
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
import _ from "lodash";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";
import BookableFlowPermission from "@/components/Bookable/Flow/BookableFlowPermission.vue";
import { isFlowMode } from "@/utils/bookableFlow";
import PermVariantA from "./PermVariantA.vue";
import PermVariantB from "./PermVariantB.vue";
import PermVariantC from "./PermVariantC.vue";
import PrototypeSwitcher from "./PrototypeSwitcher.vue";
import {
  NAMINGS,
  accessOf,
  discountsUsed,
  listsWithoutLogin,
  paid,
  permissionIssues,
} from "./permShared";

export default {
  name: "PermPrototype",
  components: { PrototypeSwitcher, BookableEditPermissions, BookableFlowPermission },
  inheritAttrs: false,
  props: {
    bookable: { type: Object, required: true },
  },
  computed: {
    flow() {
      return isFlowMode({
        bookableId: this.$route.query.id,
        mode: this.$route.query.mode,
      });
    },
    todayComp() {
      return this.flow ? "BookableFlowPermission" : "BookableEditPermissions";
    },
    variants() {
      return [
        { key: "A", name: "Formular des Editors", comp: PermVariantA },
        { key: "B", name: "Fragen des Ablaufs", comp: PermVariantB },
        { key: "C", name: "Neu: eine Liste mit Sonderregeln", comp: PermVariantC },
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
    cases() {
      return [
        {
          key: "open",
          label: "Offen, ohne Rabatte",
          set: (b) => {
            b.requiresLogin = false;
            b.permittedUsers = [];
            b.permittedRoles = [];
            b.bookingDiscounts = { users: [], roles: [] };
          },
        },
        {
          key: "legacy",
          label: "Bestand: Rolle ohne Anmeldepflicht",
          set: (b) => {
            b.requiresLogin = false;
            b.permittedUsers = [];
            b.permittedRoles = ["prototype-unbekannte-rolle"];
          },
        },
        {
          key: "free-discount",
          label: "Kostenfrei mit Rabatt",
          set: (b) => {
            (b.priceCategories || []).forEach((c) => (c.priceEur = 0));
            b.bookingDiscounts = {
              users: [],
              roles: [{ roleId: "prototype-unbekannte-rolle", discountPercent: 50 }],
            };
          },
        },
        {
          key: "paid",
          label: "Preis 20 €",
          set: (b) => {
            if (!b.priceCategories?.length)
              b.priceCategories = [{ priceEur: 20, fixedPrice: false }];
            b.priceCategories[0].priceEur = 20;
          },
        },
      ];
    },
    stateDump() {
      const b = this.bookable;
      return JSON.stringify(
        {
          accessOf: accessOf(b),
          requiresLogin: b.requiresLogin,
          permittedRoles: b.permittedRoles,
          permittedUsers: b.permittedUsers,
          bookingDiscounts: b.bookingDiscounts,
          paid: paid(b),
          discountsUsed: discountsUsed(b),
          "normalizeBookable setzt requiresLogin": listsWithoutLogin(b),
          issues: permissionIssues(b),
        },
        null,
        2
      );
    },
  },
  methods: {
    setCase(c) {
      const next = _.cloneDeep(this.bookable);
      c.set(next);
      this.$emit("update:bookable", next);
    },
  },
};
</script>

<!-- Plain, prefixed: the variants share these in both modes. -->
<style>
.p344-field {
  margin-bottom: var(--scb-space-5);
}
.p344-question {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.p344-hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
.p344-note {
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}
.p344-rule {
  margin-top: var(--scb-space-5);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}
.p344-discounts {
  margin-bottom: var(--scb-space-4);
}
.p344-discounts__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
}
.p344-row {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
  margin-bottom: var(--scb-space-2);
}
.p344-row__name {
  flex: 1 1 auto;
}
.p344-row__percent {
  flex: 0 0 120px;
}
.p344-cases {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
  margin: var(--scb-space-2) 0;
}
.p344-state {
  margin: var(--scb-space-5) 0 var(--scb-space-8);
  font-size: 12px;
  color: var(--scb-text-muted);
}
.p344-state summary {
  cursor: pointer;
}
.p344-state pre {
  max-height: 320px;
  overflow: auto;
  padding: var(--scb-space-3);
  background: var(--scb-surface-tint);
  border-radius: var(--scb-radius-control);
}
</style>

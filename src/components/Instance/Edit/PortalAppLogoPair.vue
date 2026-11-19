<template>
  <div class="portal-app-logo-pair">
    <div
      v-for="mode in modes"
      :key="mode"
      class="portal-app-logo-tile"
      :class="`portal-app-logo-tile--${mode}`"
      :data-mode="mode"
    >
      <span class="text-caption">{{ tileLabel(mode) }}</span>
      <PortalAppLogo
        :logo="logo"
        :logo-dark="logoDark"
        :mode="mode"
        :height="height"
      />
    </div>
  </div>
</template>

<script>
import PortalAppLogo from "@/components/Instance/Edit/PortalAppLogo.vue";

const TILE_LABELS = Object.freeze({
  light: "Hell",
  dark: "Dunkel",
  inverted: "Dunkel · invertiert",
});

/**
 * The App-Logo as two tiles, light and dark, the way the portal shows it: in
 * dark mode its variant, or the logo inverted without one. The tab „Portal“
 * shows it under the App-Logo, the Hero Editor in an image Block that
 * follows the App-Logo.
 */
export default {
  name: "PortalAppLogoPair",
  components: { PortalAppLogo },
  props: {
    // The reference of the App-Logo, or its legacy address.
    logo: { type: [Object, String], default: null },
    logoDark: { type: Object, default: null },
    height: { type: Number, default: 44 },
  },
  data() {
    return { modes: ["light", "dark"] };
  },
  methods: {
    tileLabel(mode) {
      if (mode === "light") {
        return TILE_LABELS.light;
      }
      return this.logoDark ? TILE_LABELS.dark : TILE_LABELS.inverted;
    },
  },
};
</script>

<style scoped>
.portal-app-logo-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--scb-space-3);
}

/* The tile wraps its label above the logo where the column is narrow, as in
   the Hero Editor. */
.portal-app-logo-tile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-3);
  min-width: 0;
  padding: 10px 14px;
  border-radius: 6px;
  min-height: 64px;
}

/* Literal colours on purpose: the tiles mimic the portal's light and dark
   pages and must not follow the admin UI's own theme. */
.portal-app-logo-tile--light {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.portal-app-logo-tile--dark {
  background: #101828;
  color: #d1d5db;
}
</style>

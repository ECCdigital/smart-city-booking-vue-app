<template>
  <div
    class="portal-header-bar"
    :class="`portal-header-bar--${mode}`"
    :data-mode="mode"
    :style="{ background: colors.bar, color: colors.contrast }"
  >
    <PortalAppLogo
      :logo="logo"
      :logo-dark="logoDark"
      :mode="mode"
      :height="18"
    />
    <span class="portal-header-bar__nav">
      <span
        class="portal-header-bar__tab"
        data-part="tab-active"
        :style="{ background: colors.active, color: colors.activeContrast }"
      >
        Angebote
        <span
          class="portal-header-bar__stripe"
          data-part="tab-stripe"
          :style="{ background: colors.stripe }"
        />
      </span>
      <span class="portal-header-bar__tab">Veranstaltungen</span>
    </span>
  </div>
</template>

<script>
import PortalAppLogo from "@/components/Instance/Edit/PortalAppLogo.vue";
import { headerColors } from "@/utils/brandingContrast";

/**
 * A small header bar of the storefront in one colour mode, drawn from the
 * values of the form: the App-Logo and the navigation with its active tab, in
 * the colours the storefront's Theme-CSS gives the chosen header.
 */
export default {
  name: "PortalHeaderBar",
  components: { PortalAppLogo },
  props: {
    header: { type: String, required: true },
    // The colours of the branding (`theme.colors`).
    themeColors: { type: Object, required: true },
    mode: {
      type: String,
      default: "light",
      validator: (value) => ["light", "dark"].includes(value),
    },
    logo: { type: [Object, String], default: null },
    logoDark: { type: Object, default: null },
  },
  computed: {
    colors() {
      return headerColors(this.header, this.themeColors, this.mode);
    },
  },
};
</script>

<style scoped>
.portal-header-bar {
  display: flex;
  align-items: stretch;
  gap: var(--scb-space-2);
  padding: 0 0 0 10px;
  border-radius: 6px;
  overflow: hidden;
  font-size: var(--scb-font-size-caption);
  min-height: 34px;
}

.portal-header-bar > .portal-app-logo {
  align-self: center;
}

/* Literal colour on purpose: the bar mimics the portal's light page, where a
   white bar needs its line to stand out from the white card. */
.portal-header-bar--light {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.portal-header-bar__nav {
  margin-left: auto;
  display: flex;
}

/* As the storefront's tab: the full height of the bar, the stripe on top. */
.portal-header-bar__tab {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 var(--scb-space-2);
  white-space: nowrap;
}

.portal-header-bar__stripe {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  opacity: 0.4;
}
</style>

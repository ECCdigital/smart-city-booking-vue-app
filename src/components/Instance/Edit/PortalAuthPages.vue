<template>
  <SubSection
    class="mt-7"
    title="Anmeldeseiten"
    icon="mdi-login"
    description="Login, Registrieren, Passwort vergessen und E-Mail bestätigen. Logo und Portalname stehen oben in der Karte."
    no-margin
  >
    <v-row align="center">
      <v-col cols="12" md="4">
        <div class="text-caption text--secondary mb-1">Größe des Logos</div>
        <v-radio-group
          :value="size"
          class="mt-0"
          hide-details
          @change="setSize"
        >
          <v-radio
            v-for="option in sizes"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </v-radio-group>
        <div class="text-caption text--secondary mt-2">
          Auf dem Telefon höchstens M.
        </div>
      </v-col>
      <v-col cols="12" md="8" class="d-flex portal-auth-pages__previews">
        <div
          v-for="mode in modes"
          :key="mode.value"
          class="portal-login-preview"
          :class="`portal-login-preview--${mode.value}`"
          :data-mode="mode.value"
          :style="backdropStyle"
        >
          <span class="portal-login-preview__label">{{ mode.label }}</span>
          <div class="portal-login-preview__card">
            <div v-if="logo" class="portal-login-preview__logo">
              <PortalAppLogo
                :logo="logo"
                :logo-dark="branding.logoDark"
                :mode="mode.value"
                :height="logoHeight"
                width="100%"
              />
            </div>
            <div class="portal-login-preview__name">
              {{ portalName || "Portal" }}
            </div>
            <div class="portal-login-preview__title">Anmelden</div>
            <div class="portal-login-preview__field" />
            <div class="portal-login-preview__field" />
            <div class="portal-login-preview__button" :style="buttonStyle">
              Anmelden
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import PortalAppLogo from "@/components/Instance/Edit/PortalAppLogo.vue";
import { brandingImage } from "@/utils/instanceBranding";
import { contrastOf, STOREFRONT_COLORS } from "@/utils/brandingContrast";

// The heights of the logo in the storefront's login card
// (`branding.authLogoSize`). S is what every portal showed before.
const AUTH_LOGO_SIZES = Object.freeze([
  { value: "sm", px: 56, label: "S · 56 px (wie heute)" },
  { value: "md", px: 96, label: "M · 96 px" },
  { value: "lg", px: 160, label: "L · 160 px" },
]);
const DEFAULT_SIZE = "sm";

// The card is drawn at half its size, so light and dark fit the column.
const PREVIEW_SCALE = 0.5;

const MODES = Object.freeze([
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
]);

/**
 * The section „Anmeldeseiten“ of the Portal tab: the height of the logo in the
 * login card, and beside it that card in light and dark as the storefront
 * draws it, with logo and Portal Name on top. In dark the logo is the variant
 * for dark or, without one, the logo inverted. It changes the branding only
 * through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalAuthPages",
  components: { SubSection, PortalAppLogo },
  props: {
    branding: { type: Object, required: true },
    // The name of the catalog, as the form holds it.
    portalName: { type: String, default: "" },
  },
  data() {
    return {
      sizes: AUTH_LOGO_SIZES,
      modes: MODES,
    };
  },
  computed: {
    // A size the UI does not know reads as the default, as in the storefront.
    size() {
      const size = this.branding.authLogoSize;
      return AUTH_LOGO_SIZES.some((option) => option.value === size)
        ? size
        : DEFAULT_SIZE;
    },
    logoHeight() {
      const option = AUTH_LOGO_SIZES.find((item) => item.value === this.size);
      return Math.round(option.px * PREVIEW_SCALE);
    },
    logo() {
      return brandingImage(this.branding, "logo");
    },
    colors() {
      return (this.branding.theme && this.branding.theme.colors) || {};
    },
    // The Background behind the card is the Hero's; the theme's colours stand
    // in for it.
    backdropStyle() {
      const primary = this.colors.primary || STOREFRONT_COLORS.primary;
      const secondary = this.colors.secondary || STOREFRONT_COLORS.secondary;
      return {
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
      };
    },
    buttonStyle() {
      const primary = this.colors.primary || STOREFRONT_COLORS.primary;
      return { background: primary, color: contrastOf(primary) };
    },
  },
  methods: {
    setSize(value) {
      this.$emit("patch", { authLogoSize: value });
    },
  },
};
</script>

<style scoped>
.portal-auth-pages__previews {
  gap: var(--scb-space-2);
}

.portal-login-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--scb-space-1);
  padding: var(--scb-space-2) var(--scb-space-3) var(--scb-space-3);
  border-radius: var(--scb-radius-surface);
}

.portal-login-preview__label {
  align-self: flex-start;
  font-size: var(--scb-font-size-xs);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* Literal colours on purpose: the cards mimic the portal's light and dark
   login card and must not follow the admin UI's own theme. */
.portal-login-preview__card {
  width: 170px;
  max-width: 100%;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.portal-login-preview--light .portal-login-preview__card {
  background: #ffffff;
  color: #111827;
}

.portal-login-preview--dark .portal-login-preview__card {
  background: #111827;
  color: #ffffff;
}

.portal-login-preview__logo {
  width: 100%;
}

.portal-login-preview__name {
  font-weight: 700;
  font-size: 12px;
}

.portal-login-preview__title {
  font-size: 10px;
  opacity: 0.7;
}

.portal-login-preview__field {
  width: 100%;
  height: 12px;
  border-radius: 3px;
  background: rgba(127, 127, 127, 0.25);
}

.portal-login-preview__button {
  width: 100%;
  text-align: center;
  font-size: 10px;
  border-radius: 3px;
  padding: 2px 0;
}
</style>

<template>
  <MediaReferenceImage
    v-if="logo"
    :reference="reference"
    :scope="mediaScope"
    size="sm"
    lazy-size="thumb"
    :height="height"
    :width="height * 3.5"
    contain
    class="portal-app-logo"
    :class="{ 'portal-app-logo--inverted': inverted }"
  />
  <span
    v-else
    class="portal-app-logo portal-app-logo--empty"
    :style="{ height: `${height}px`, width: `${height * 2}px` }"
  >
    Logo
  </span>
</template>

<script>
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";

/**
 * The App-Logo as the storefront shows it in one colour mode: in dark mode
 * the variant for dark mode where there is one, otherwise the logo inverted.
 * Without an App-Logo a dashed placeholder holds its place.
 */
export default {
  name: "PortalAppLogo",
  components: { MediaReferenceImage },
  props: {
    // The reference of the App-Logo, or its legacy address.
    logo: { type: [Object, String], default: null },
    logoDark: { type: Object, default: null },
    mode: { type: String, default: "light" },
    height: { type: Number, default: 32 },
  },
  data() {
    return { mediaScope: MEDIA_SCOPE.INSTANCE };
  },
  computed: {
    dark() {
      return this.mode === "dark";
    },
    reference() {
      return this.dark && this.logoDark ? this.logoDark : this.logo;
    },
    inverted() {
      return this.dark && !this.logoDark;
    },
  },
};
</script>

<style scoped>
.portal-app-logo {
  flex: 0 0 auto;
}

/* As the storefront inverts an App-Logo without variant in dark mode
   (`dark:invert dark:hue-rotate-180`), so its hues stay. */
.portal-app-logo--inverted {
  filter: invert(1) hue-rotate(180deg);
}

.portal-app-logo--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed currentColor;
  border-radius: 4px;
  font-size: 10px;
  opacity: 0.6;
}
</style>

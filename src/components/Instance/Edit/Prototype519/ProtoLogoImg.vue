<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): ein öffentliches Medium als <img>
       in seinem natürlichen Seitenverhältnis, Höhe fest, Breite bis 3,5 × Höhe. -->
  <img
    v-if="src"
    :src="src"
    alt=""
    class="proto-logo-img"
    :class="{ 'proto-logo-img--invert': invert }"
    :style="{ height: `${height}px`, maxWidth: `${height * 3.5}px` }"
  />
  <span
    v-else
    class="proto-logo-img proto-logo-img--empty"
    :style="{ height: `${height}px`, width: `${height * 2}px` }"
  >
    Logo
  </span>
</template>

<script>
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";

export default {
  name: "ProtoLogoImg",
  props: {
    reference: { type: Object, default: null },
    height: { type: Number, default: 40 },
    invert: { type: Boolean, default: false },
  },
  computed: {
    src() {
      const ref = this.reference;
      if (!ref) return null;
      if (ref.mediaId) {
        return ApiMediaService.getMediaFileUrl(
          MEDIA_SCOPE.INSTANCE,
          ref.mediaId,
          "sm"
        );
      }
      return ref.url || null;
    },
  },
};
</script>

<style scoped>
.proto-logo-img {
  display: block;
  object-fit: contain;
  width: auto;
}

.proto-logo-img--invert {
  filter: invert(1) hue-rotate(180deg);
}

.proto-logo-img--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed currentColor;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0.6;
}
</style>

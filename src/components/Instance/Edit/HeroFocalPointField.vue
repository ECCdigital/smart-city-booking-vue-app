<template>
  <div class="hero-focal-point">
    <div class="text-caption text--secondary mb-1">Bildmittelpunkt</div>

    <div class="d-flex align-center">
      <div
        ref="surface"
        class="hero-focal-point__surface"
        title="Klicken, um den Bildmittelpunkt zu setzen"
        @click="onClick"
      >
        <MediaReferenceImage
          :reference="reference"
          :scope="scope"
          size="sm"
          lazy-size="thumb"
          :aspect-ratio="16 / 9"
          rounded
        />
        <span class="hero-focal-point__crosshair" :style="crosshairStyle" />
      </div>

      <div class="hero-focal-point__values ml-3 text-caption text--secondary">
        <div>Horizontal: {{ point.x }} %</div>
        <div>Vertikal: {{ point.y }} %</div>
      </div>
    </div>

    <p class="text--secondary text-caption mt-1 mb-0">
      Dieser Punkt bleibt sichtbar, wenn das Bild beschnitten wird.
    </p>
  </div>
</template>

<script>
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import { heroFocalPoint, heroFocalPointOf } from "@/utils/heroBackground";

/**
 * The focal point of the Background image: the thumbnail with a crosshair on
 * it, set by clicking into the picture (hero layout spec §8).
 *
 * There is no numeric input beside it on purpose — a percentage pair is not
 * how anyone thinks about "keep the tower visible". The two values are shown
 * so that the click stays checkable, and because the contract stores whole
 * percentages.
 */
export default {
  name: "HeroFocalPointField",
  components: { MediaReferenceImage },
  props: {
    /** The media reference of the Background image. */
    reference: { type: Object, default: null },
    /** The focal point as the Background holds it. */
    value: { type: Object, default: null },
    scope: { type: String, default: MEDIA_SCOPE.INSTANCE },
  },
  computed: {
    point() {
      return heroFocalPointOf(this.value);
    },
    crosshairStyle() {
      return { left: `${this.point.x}%`, top: `${this.point.y}%` };
    },
  },
  methods: {
    onClick(event) {
      const rect = this.$refs.surface.getBoundingClientRect();

      this.$emit(
        "input",
        heroFocalPoint(
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          { width: rect.width, height: rect.height }
        )
      );
    },
  },
};
</script>

<style scoped>
.hero-focal-point__surface {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  cursor: crosshair;
  overflow: hidden;
  border-radius: 4px;
}

.hero-focal-point__values {
  flex: 0 0 auto;
}

/* The crosshair sits on the point itself, so it has to be centred on it and
   must not swallow the click that moves it. */
.hero-focal-point__crosshair {
  position: absolute;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
</style>

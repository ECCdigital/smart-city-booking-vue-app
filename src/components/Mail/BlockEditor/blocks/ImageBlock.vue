<template>
  <div
    class="image-block"
    :class="{ selected }"
    :style="{ textAlign: block.align || 'left' }"
  >
    <div v-if="!block.src" class="placeholder">
      <v-icon large color="grey lighten-1">mdi-image-outline</v-icon>
      <div class="text-caption grey--text mt-1">
        Bild-URL im Eigenschaften-Panel angeben.
      </div>
    </div>
    <img
      v-else
      :src="block.src"
      :alt="block.alt || ''"
      :width="block.width || undefined"
      :style="imgStyle"
      @error="imgError = true"
    />
    <div v-if="imgError" class="error--text text-caption mt-1">
      Bild konnte nicht geladen werden. URL prüfen.
    </div>
  </div>
</template>

<script>
export default {
  name: "ImageBlock",
  props: {
    block: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  data: () => ({ imgError: false }),
  computed: {
    imgStyle() {
      return {
        maxWidth: "100%",
        height: "auto",
        display: this.block.align === "center" ? "inline-block" : "block",
      };
    },
  },
  watch: {
    "block.src"() {
      this.imgError = false;
    },
  },
};
</script>

<style scoped>
.image-block {
  padding: 6px;
  border-radius: 4px;
  background: white;
  min-height: 60px;
}
.image-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.placeholder {
  text-align: center;
  padding: 16px;
  border: 2px dashed #ddd;
  border-radius: 4px;
}
</style>

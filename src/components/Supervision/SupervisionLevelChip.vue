<template>
  <v-chip
    :small="!xSmall"
    :x-small="xSmall"
    label
    outlined
    :color="color"
    data-test="supervision-level"
  >
    {{ label }}
  </v-chip>
</template>

<script>
import { levelColor, levelLabelKey } from "@/utils/supervision";

/**
 * The supervision level of a tenant; a missing level reads as free, one
 * without a name shows as stored.
 */
export default {
  name: "SupervisionLevelChip",
  props: {
    level: { type: String, default: null },
    /** The badge beside a name in a list row, a size down from the chip. */
    xSmall: { type: Boolean, default: false },
  },
  computed: {
    color() {
      return levelColor(this.level);
    },
    label() {
      const key = levelLabelKey(this.level);
      return key ? this.$t(key) : this.level;
    },
  },
};
</script>

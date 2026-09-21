<template>
  <v-chip small label outlined :color="color" data-test="supervision-level">
    {{ $t(labelKey) }}
  </v-chip>
</template>

<script>
import { levelColor, levelLabelKey } from "@/utils/supervision";

/** The supervision level of a tenant; a missing level reads as free. */
export default {
  name: "SupervisionLevelChip",
  props: {
    level: { type: String, default: null },
  },
  computed: {
    color() {
      return levelColor(this.level);
    },
    labelKey() {
      return levelLabelKey(this.level);
    },
  },
};
</script>

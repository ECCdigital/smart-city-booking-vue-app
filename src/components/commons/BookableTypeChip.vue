<script>
import { getTypeColor, getTypeIcon, getTypeText } from "@/utils/bookables.js";

export default {
  name: "BookableTypeChip",
  props: {
    type: {
      type: String,
      required: true,
    },
  },
  methods: {
    getTypeIcon,
    getTypeText,
    getTypeColor,
  },
};
</script>

<template>
  <v-chip x-small outlined :color="getTypeColor(type)" class="mr-2">
    <v-icon left x-small>
      {{ getTypeIcon(type) }}
    </v-icon>
    {{ getTypeText(type) }}
  </v-chip>
</template>

<style scoped></style>

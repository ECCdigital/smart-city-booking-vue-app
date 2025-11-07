<template>
  <v-card flat class="mb-6">
    <v-card-title class="py-3">
      <div class="d-flex align-center">
        <v-icon v-if="icon" class="mr-2" color="primary">{{ icon }}</v-icon>
        <span class="text-h6">{{ title }}</span>
        <v-spacer />
        <slot name="actions" />
      </div>
    </v-card-title>
    <v-divider />
    <v-card-subtitle v-if="hint" class="">
      <v-icon left small color="info">mdi-information-outline</v-icon>
      {{ hint }}
    </v-card-subtitle>
    <v-card-text class="">
      <slot />
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "BaseSection",
  props: {
    title: String,
    icon: String,
    hint: String,
  },
};
</script>

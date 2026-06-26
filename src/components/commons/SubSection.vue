<template>
  <div :class="{ 'mt-6': !noMargin }">
    <div class="d-flex align-center mb-2">
      <v-icon v-if="icon" small class="mr-2" color="grey">
        {{ icon }}
      </v-icon>
      <span class="text-subtitle-1 font-weight-medium">{{ title }}</span>
      <v-spacer />
      <slot name="actions" />
    </div>
    <p v-if="description" class="text--secondary text-body-2 mb-3">
      {{ description }}
    </p>
    <slot />
  </div>
</template>

<script>
export default {
  name: "SubSection",
  props: {
    title: { type: String, required: true },
    icon: { type: String, default: null },
    description: { type: String, default: null },
    noMargin: { type: Boolean, default: false },
  },
};
</script>

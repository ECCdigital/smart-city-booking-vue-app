<template>
  <v-card outlined class="app-dialog-section">
    <v-card-subtitle v-if="title" class="app-dialog-section__title">
      {{ title }}
    </v-card-subtitle>
    <div class="app-dialog-section__body">
      <slot />
    </div>
  </v-card>
</template>

<script>
/**
 * A part of a dialog's body in its own outlined card with a quiet title, as
 * „Basisinformationen“ is in the member details of „Mitglieder“.
 */
export default {
  name: "AppDialogSection",
  props: {
    title: {
      type: String,
      default: "",
    },
  },
};
</script>

<style scoped>
.app-dialog-section {
  margin-bottom: var(--scb-space-4);
}

.app-dialog-section__title {
  padding: var(--scb-space-3) var(--scb-space-4) 0 !important;
}

.app-dialog-section__body {
  padding: var(--scb-space-2) var(--scb-space-4) var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
}

.app-dialog-section__body > :last-child {
  margin-bottom: 0;
}
</style>

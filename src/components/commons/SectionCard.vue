<script>
/**
 * A card of an editing page: the header strip with icon and title
 * (section-card.scss), an optional short explanation, then the content. The
 * bookable editor frames its areas with it (`BookableEditTab`), the event
 * editor its cards (`components/Events/Edit`).
 */
export default {
  name: "SectionCard",
  props: {
    // The element id, the anchor the navigation scrolls to.
    id: { type: String, default: null },
    icon: { type: String, required: true },
    title: { type: String, required: true },
    // One sentence under the strip: what the card is for.
    hint: { type: String, default: "" },
    // A word at the right of the strip, such as „Optional“.
    badge: { type: String, default: "" },
  },
};
</script>

<template>
  <v-card :id="id" class="mb-6 section-card" outlined>
    <v-card-title class="section-header pa-4">
      <v-icon class="mr-2">{{ icon }}</v-icon>
      <span class="text-h6 font-weight-bold">{{ title }}</span>
      <span v-if="badge" class="section-card__badge">{{ badge }}</span>
    </v-card-title>
    <v-divider />
    <v-card-text class="pa-4">
      <p v-if="hint" class="section-card__hint">
        <v-icon small color="primary">mdi-information-outline</v-icon>
        <span>{{ hint }}</span>
      </p>
      <slot />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.section-card {
  scroll-margin-top: var(--scb-space-4);
}

.section-card__badge {
  margin-left: auto;
  font-size: var(--scb-font-size-xs);
  font-weight: normal;
  color: var(--scb-text-muted);
}

.section-card__hint {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
  margin: 0 0 var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>

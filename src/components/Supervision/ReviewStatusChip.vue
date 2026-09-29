<template>
  <v-chip
    v-if="badge"
    x-small
    label
    outlined
    :color="badge.color"
    data-test="review-badge"
  >
    {{ $t(badge.labelKey) }}
  </v-chip>
</template>

<script>
import { reviewBadge } from "@/utils/offerReview";

/**
 * The review status (glossary "Prüfstatus") of an offer in a list, where it
 * matters: under every level but free, for an event that is over as well. A
 * free tenant's cards stay quiet.
 */
export default {
  name: "ReviewStatusChip",
  props: {
    review: { type: Object, default: null },
    supervisionLevel: { type: String, default: null },
  },
  computed: {
    badge() {
      return reviewBadge(this.review, this.supervisionLevel);
    },
  },
};
</script>

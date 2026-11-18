<script>
import OfferReviewPanel from "@/components/Supervision/OfferReviewPanel.vue";
import eventEditing from "@/mixins/eventEditing";
import { publicationWishHintKey } from "@/utils/offerReview";
import { OFFER_TYPES } from "@/utils/supervision";

/**
 * The band over the event editing page, as the bookable editor's
 * „Veröffentlichung“: who can find the event, the switch and what it does,
 * and the review status beside it.
 */
export default {
  name: "EventEditPublication",
  components: { OfferReviewPanel },
  mixins: [eventEditing],
  props: {
    // Whether the event may be listed: the tenant's limit of public events.
    allowPublic: { type: Boolean, default: true },
    review: { type: Object, default: null },
    supervisionLevel: { type: String, default: null },
    tenantId: { type: String, default: null },
  },
  data() {
    return { offerType: OFFER_TYPES.EVENT };
  },
  computed: {
    wishHint() {
      return publicationWishHintKey(this.supervisionLevel);
    },
  },
};
</script>

<template>
  <section class="event-publication" data-test="event-publication">
    <!-- On the simple page its card „Sichtbarkeit“ asks it. -->
    <h3 v-if="!simple" class="event-publication__question">
      {{ $t("bookable.publication.question") }}
    </h3>
    <v-switch
      :input-value="isPublic"
      :disabled="!allowPublic && !isPublic"
      hide-details
      color="primary"
      class="mt-0 pt-0"
      data-test="event-public"
      @change="update(null, 'isPublic', $event === true)"
    >
      <template #label>
        <div>
          <div class="font-weight-medium">
            {{ $t("bookable.publication.public.label") }}
          </div>
          <div class="text-caption text--secondary">
            {{ $t("bookable.publication.public.hint") }}
          </div>
        </div>
      </template>
    </v-switch>
    <p class="event-publication__effect">
      <v-icon small>mdi-information-outline</v-icon>
      <span>
        {{
          isPublic
            ? $t("event.edit.publication.effect.public")
            : $t("event.edit.publication.effect.hidden")
        }}
        <template v-if="!allowPublic && !isPublic">
          {{ $t("event.edit.publication.limit") }}
        </template>
        <template v-if="wishHint">{{ $t(wishHint) }}</template>
      </span>
    </p>
    <OfferReviewPanel
      :tenant-id="tenantId"
      :offer-type="offerType"
      :offer-id="form.id"
      :review="review"
      :is-public="isPublic"
      :supervision-level="supervisionLevel"
      :show-effect="false"
      @update:review="$emit('update:review', $event)"
    />
  </section>
</template>

<style scoped>
.event-publication {
  display: grid;
  gap: var(--scb-space-3);
}

.event-publication__question {
  margin: 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}

.event-publication__effect {
  display: flex;
  gap: var(--scb-space-2);
  align-items: flex-start;
  margin: 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.event-publication__effect .v-icon {
  color: inherit;
}
</style>

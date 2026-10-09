<template>
  <section class="publication" data-test="publication">
    <h3 class="publication__question" data-test="publication-question">
      {{ $t("bookable.publication.question") }}
    </h3>

    <div class="publication__switches">
      <v-switch
        :input-value="bookable.isBookable === true"
        :label="$t('bookable.publication.bookable.label')"
        hide-details
        color="primary"
        class="publication__switch"
        data-test="publication-bookable"
        data-field="isBookable"
        @change="patch({ isBookable: $event === true })"
      >
        <template v-slot:label>
          <div>
            <div class="font-weight-medium">
              {{ $t("bookable.publication.bookable.label") }}
            </div>
            <div class="text-caption text--secondary">
              {{ $t("bookable.publication.bookable.hint") }}
            </div>
          </div>
        </template>
      </v-switch>
      <v-switch
        :input-value="bookable.isPublic === true"
        :label="$t('bookable.publication.public.label')"
        hide-details
        color="primary"
        class="publication__switch"
        data-test="publication-public"
        data-field="isPublic"
        @change="patch({ isPublic: $event === true })"
      >
        <template v-slot:label>
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
    </div>

    <p class="publication__effect" data-test="publication-effect">
      <v-icon small color="primary" class="publication__effect-icon">
        mdi-information-outline
      </v-icon>
      <span>{{ $t(effectKey) }}</span>
    </p>

    <p
      v-if="submits"
      class="publication__note publication__note--submits"
      data-test="publication-submits"
    >
      {{ $t("bookable.publication.submits-on-save") }}
    </p>
    <p
      v-if="publicationWishHint"
      class="publication__note"
      data-test="publication-wish-hint"
    >
      {{ $t(publicationWishHint) }}
    </p>

    <OfferReviewPanel
      class="publication__review"
      :tenant-id="bookable.tenantId"
      :offer-type="offerType"
      :offer-id="bookable.id"
      :review="bookable.review"
      :is-public="bookable.isPublic === true"
      :supervision-level="level"
      :show-effect="false"
      :show-unsaved="!submits"
      @update:review="patch({ review: $event })"
    />
  </section>
</template>

<script>
import OfferReviewPanel from "@/components/Supervision/OfferReviewPanel.vue";
import bookableEditing from "@/mixins/bookableEditing";
import { publicationWishHintKey } from "@/utils/offerReview";
import {
  publicationEffectKey,
  submitsOnSave,
} from "@/utils/bookablePublication";
import { OFFER_TYPES } from "@/utils/supervision";

/**
 * „Veröffentlichung“ (ECCdigital/tickets#362): who can find the bookable
 * and who can book it. Two independent switches, „Buchbar“ and „Im Katalog
 * listen“, so every combination - „nur per Direktlink buchbar“ too - can be
 * set; beneath them always one line of what follows (`publicationEffectKey`).
 * Under supervision the Prüfstatus, the hint on the Veröffentlichungswunsch
 * and, while saving submits the offer, that it will.
 *
 * The same component in both modes: in the status band of the editing page
 * and as the flow's last step. The review is the backend's alone and never
 * part of a save; a new one goes up as a patch like any field, and the
 * unsaved-changes check ignores it.
 */
export default {
  name: "BookableEditPublication",
  components: { OfferReviewPanel },
  mixins: [bookableEditing],
  props: {
    /** The tenant's Aufsichtsstufe; unknown reads as free. */
    level: { type: String, default: null },
  },
  data() {
    return { offerType: OFFER_TYPES.BOOKABLE };
  },
  computed: {
    effectKey() {
      return publicationEffectKey(this.bookable, this.level);
    },
    submits() {
      return submitsOnSave(this.bookable, this.level);
    },
    publicationWishHint() {
      return publicationWishHintKey(this.level);
    },
  },
};
</script>

<style scoped>
.publication__question {
  margin: 0 0 var(--scb-space-2);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.publication__switches {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--scb-space-6);
}

.publication__switch {
  flex: 1 1 220px;
  max-width: 360px;
  margin-top: var(--scb-space-1);
  padding-top: 0;
}

/* The line that follows from the switches: the one sentence to read. */
.publication__effect {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
  margin: var(--scb-space-3) 0 0;
  padding: var(--scb-space-2) var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.publication__effect-icon {
  margin-top: 2px;
}

.publication__note {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.publication__note--submits {
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text);
}

.publication__review {
  margin-top: var(--scb-space-3);
}
</style>

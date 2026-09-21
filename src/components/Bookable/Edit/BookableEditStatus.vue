<script>
import { mapGetters } from "vuex";
import OfferReviewPanel from "@/components/Supervision/OfferReviewPanel.vue";
import { publicationWishHintKey } from "@/utils/offerReview";
import { OFFER_TYPES } from "@/utils/supervision";

export default {
  name: "BookableEditStatus",
  components: { OfferReviewPanel },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return { offerType: OFFER_TYPES.BOOKABLE };
  },
  computed: {
    ...mapGetters({
      supervisionLevel: "tenants/currentSupervisionLevel",
    }),
    publicationWishHint() {
      return publicationWishHintKey(this.supervisionLevel);
    },
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    manualApproval: {
      get() {
        return !this.model.autoCommitBooking;
      },
      set(value) {
        this.model.autoCommitBooking = !value;
      },
    },
  },
  methods: {
    /**
     * The review is the backend's alone and never part of a save, so it goes
     * straight into the bookable - the unsaved edits around it stay.
     */
    onReviewUpdated(review) {
      this.$set(this.bookable, "review", review);
    },
  },
};
</script>

<template>
  <v-sheet
    class="mb-4 px-4 py-2 d-flex flex-wrap align-center status-indicator"
    rounded
  >
    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap mr-6">
          <v-switch
            v-model="model.isBookable"
            :label="$t('bookable.edit.status.bookable.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="model.isBookable">
                mdi-calendar-check
              </v-icon>
              <v-icon color="grey" v-else>mdi-calendar-remove</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.bookable.tooltip") }}</span>
    </v-tooltip>

    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap mr-6">
          <v-switch
            v-model="model.isPublic"
            :label="$t('bookable.edit.status.public.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="bookable.isPublic">mdi-eye</v-icon>
              <v-icon color="grey" v-else>mdi-eye-off</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.public.tooltip") }}</span>
    </v-tooltip>

    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap">
          <v-switch
            v-model="manualApproval"
            :label="$t('bookable.edit.status.manualApproval.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="manualApproval">
                mdi-account-check
              </v-icon>
              <v-icon color="grey" v-else>mdi-check-circle-outline</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.manualApproval.tooltip") }}</span>
    </v-tooltip>

    <div class="status-review">
      <p
        v-if="publicationWishHint"
        class="text-caption text--secondary mt-2 mb-0"
        data-test="publication-wish-hint"
      >
        <v-icon small class="mr-1">mdi-information-outline</v-icon>
        {{ $t(publicationWishHint) }}
      </p>
      <OfferReviewPanel
        class="mt-2"
        :tenant-id="bookable.tenantId"
        :offer-type="offerType"
        :offer-id="bookable.id"
        :review="bookable.review"
        :is-public="bookable.isPublic === true"
        :supervision-level="supervisionLevel"
        @update:review="onReviewUpdated"
      />
    </div>
  </v-sheet>
</template>

<style scoped>
.status-indicator {
  transition: transform var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
  background-color: var(--scb-surface-raised) !important;
}

.status-switch-wrap {
  display: inline-flex;
}

/* Its own row below the switches of the flex-wrapping sheet. */
.status-review {
  flex-basis: 100%;
}
</style>

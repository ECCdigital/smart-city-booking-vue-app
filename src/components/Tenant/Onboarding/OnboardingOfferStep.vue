<template>
  <v-form @submit.prevent="submit" data-test="offer-step">
    <!-- What is offered -->
    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-cube-outline</v-icon>
        <span>{{ $t("tenant.onboarding.offer.section-offer") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <p class="onboarding-step__lead">
          {{ $t("tenant.onboarding.offer.intro") }}
        </p>
        <v-row dense>
          <v-col cols="12" md="5">
            <v-select
              v-model="form.type"
              :items="typeItems"
              :label="$t('tenant.onboarding.offer.type')"
              :error-messages="errorOf('type')"
              outlined
              dense
              data-test="offer-type"
            />
          </v-col>
          <v-col cols="12" md="7">
            <v-text-field
              v-model="form.title"
              :label="$t('tenant.onboarding.offer.name')"
              :error-messages="errorOf('title')"
              outlined
              dense
              data-test="offer-title"
            />
          </v-col>
        </v-row>
        <Tiptap
          v-model="form.description"
          :label="$t('tenant.onboarding.offer.description')"
          :min-height="120"
        />
        <div class="booking-caption booking-caption--spaced">
          {{ $t("tenant.onboarding.offer.image") }}
        </div>
        <MediaReferenceList v-model="form.images" />
      </v-card-text>
    </v-card>

    <!-- How it is booked: the amount as a counter, the confirmation as a choice -->
    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-book-outline</v-icon>
        <span>{{ $t("tenant.onboarding.offer.booking") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="offer-amount" data-test="offer-amount">
          <div class="offer-amount__text">
            <div class="offer-amount__title">
              {{ $t("tenant.onboarding.offer.amount") }}
            </div>
            <div class="offer-amount__hint">
              {{ $t("tenant.onboarding.offer.amount-hint") }}
            </div>
          </div>
          <div class="offer-amount__counter">
            <v-btn
              icon
              small
              outlined
              :disabled="Number(form.amount) <= 0"
              :aria-label="$t('tenant.onboarding.offer.amount-less')"
              data-test="offer-amount-less"
              @click="stepAmount(-1)"
            >
              <v-icon small>mdi-minus</v-icon>
            </v-btn>
            <input
              v-if="!unlimited"
              v-model.number="form.amount"
              type="number"
              min="0"
              step="1"
              class="offer-amount__input"
              :class="{ 'offer-amount__input--invalid': errors.amount }"
              :aria-label="$t('tenant.onboarding.offer.amount')"
              data-test="offer-amount-input"
            />
            <span
              v-else
              class="offer-amount__input offer-amount__input--unlimited"
              data-test="offer-amount-unlimited"
            >
              <v-icon small>mdi-infinity</v-icon>
            </span>
            <v-btn
              icon
              small
              outlined
              :aria-label="$t('tenant.onboarding.offer.amount-more')"
              data-test="offer-amount-more"
              @click="stepAmount(1)"
            >
              <v-icon small>mdi-plus</v-icon>
            </v-btn>
          </div>
        </div>
        <p v-if="errors.amount" class="choice-tiles__error error--text">
          {{ errorOf("amount")[0] }}
        </p>
        <button
          type="button"
          class="offer-amount__toggle"
          data-test="offer-amount-toggle-unlimited"
          @click="toggleUnlimited"
        >
          {{
            unlimited
              ? $t("tenant.onboarding.offer.amount-limit")
              : $t("tenant.onboarding.offer.amount-unlimited")
          }}
        </button>

        <div class="booking-caption booking-caption--spaced">
          {{ $t("tenant.onboarding.offer.confirmation") }}
        </div>
        <p class="onboarding-step__fine">
          {{ $t("tenant.onboarding.offer.confirmation-hint") }}
        </p>
        <OnboardingChoiceTiles
          v-model="form.confirmation"
          :options="confirmationOptions"
          :label="$t('tenant.onboarding.offer.confirmation')"
          test-id="offer-confirmation"
        />
      </v-card-text>
    </v-card>

    <!-- The price: a deliberate choice -->
    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-cash-multiple</v-icon>
        <span>{{ $t("tenant.onboarding.offer.price-legend") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <OnboardingChoiceTiles
          v-model="form.priceChoice"
          :options="priceOptions"
          :label="$t('tenant.onboarding.offer.price-legend')"
          :error="errorOf('priceChoice')[0]"
          test-id="offer-price-choice"
        />
        <div
          v-if="form.priceChoice === 'paid'"
          class="onboarding-step__follow-up"
          data-test="offer-paid-fields"
        >
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.price"
                :label="$t('tenant.onboarding.offer.price')"
                :error-messages="errorOf('price')"
                suffix="€"
                outlined
                dense
                data-test="offer-price"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.priceType"
                :items="priceTypeItems"
                :label="$t('tenant.onboarding.offer.price-type')"
                outlined
                dense
              />
            </v-col>
          </v-row>
          <p class="onboarding-step__fine">
            {{ $t("tenant.onboarding.offer.price-hint") }}
          </p>
          <v-alert
            type="info"
            text
            dense
            class="mb-0"
            data-test="offer-payment-hint"
          >
            {{ $t("tenant.onboarding.offer.payment-hint") }}
          </v-alert>
        </div>
      </v-card-text>
    </v-card>

    <!-- The availability: a deliberate choice -->
    <v-card outlined class="section-card onboarding-step__card">
      <v-card-title class="section-header">
        <v-icon>mdi-clock-outline</v-icon>
        <span>{{ $t("tenant.onboarding.offer.availability-legend") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <OnboardingChoiceTiles
          v-model="form.availability"
          :options="availabilityOptions"
          :label="$t('tenant.onboarding.offer.availability-legend')"
          :error="errorOf('availability')[0]"
          test-id="offer-availability"
        />
        <div
          v-if="form.availability === 'hours'"
          class="onboarding-step__follow-up"
          data-test="offer-hours-fields"
        >
          <p class="onboarding-step__fine">
            {{ $t("tenant.onboarding.offer.hours-hint") }}
          </p>
          <v-chip-group
            v-model="form.weekdays"
            multiple
            column
            active-class="primary"
          >
            <v-chip
              v-for="day in weekdays"
              :key="day.id"
              :value="day.id"
              small
              filter
            >
              {{ day.short }}
            </v-chip>
          </v-chip-group>
          <v-row dense>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.startTime"
                :label="$t('tenant.onboarding.offer.start-time')"
                type="time"
                outlined
                dense
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="form.endTime"
                :label="$t('tenant.onboarding.offer.end-time')"
                type="time"
                outlined
                dense
                hide-details
              />
            </v-col>
          </v-row>
          <p
            v-if="errors.openingHours"
            class="error--text text-caption mt-2 mb-0"
            data-test="offer-hours-error"
          >
            {{ errorOf("openingHours")[0] }}
          </p>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="saveFailed" type="error" text dense>
      {{ $t("tenant.onboarding.offer.save-failed") }}
    </v-alert>

    <div class="onboarding-actions">
      <v-btn text @click="$emit('back')" data-test="offer-back">
        <v-icon left small>mdi-arrow-left</v-icon>
        {{ $t("tenant.onboarding.back") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        type="submit"
        :loading="inProgress"
        data-test="offer-submit"
      >
        {{ $t("tenant.onboarding.offer.submit") }}
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
      <p class="onboarding-actions__note">
        {{ $t("tenant.onboarding.offer.unsaved-hint") }}
      </p>
    </div>
  </v-form>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import { getTypeText } from "@/utils/bookables";
import {
  OFFER_PRICE_TYPES,
  OFFER_BOOKABLE_TYPES,
  OFFER_WEEKDAYS,
  emptyOfferForm,
  offerFormFromBookable,
  validateOfferForm,
} from "@/utils/tenantOnboarding";

/**
 * Step 2: the first bookable, in four section cards. The amount is a
 * counter and the confirmation a preselected tile pair (manual); price and
 * availability carry no preselection for a new bookable - they are tiles the
 * user has to pick - and show what is stored for a resumed one (supervision
 * spec §9). The first bookable is time-related; the wizard does not offer to
 * change that (`form.schedule` stays what the bookable stores).
 */
export default {
  name: "OnboardingOfferStep",
  components: { Tiptap, MediaReferenceList, OnboardingChoiceTiles },
  props: {
    bookable: { type: Object, default: null },
    inProgress: { type: Boolean, default: false },
    saveFailed: { type: Boolean, default: false },
  },
  data() {
    return {
      form: this.bookable
        ? offerFormFromBookable(this.bookable)
        : emptyOfferForm(),
      errors: {},
      weekdays: OFFER_WEEKDAYS,
    };
  },
  computed: {
    /** `0` is the unlimited amount, as the bookable editor reads it. */
    unlimited() {
      return Number(this.form.amount) === 0;
    },
    typeItems() {
      return OFFER_BOOKABLE_TYPES.map((type) => ({
        value: type,
        text: getTypeText(type),
      }));
    },
    confirmationOptions() {
      return ["manual", "auto"].map((value) => ({
        value,
        label: this.$t(`tenant.onboarding.offer.confirmation-${value}`),
        description: this.$t(
          `tenant.onboarding.offer.confirmation-${value}-hint`
        ),
      }));
    },
    priceTypeItems() {
      return OFFER_PRICE_TYPES.map((value) => ({
        value,
        text: this.$t(`tenant.onboarding.offer.price-types.${value}`),
      }));
    },
    priceOptions() {
      return ["free", "paid"].map((value) => ({
        value,
        label: this.$t(`tenant.onboarding.offer.price-${value}`),
        description: this.$t(`tenant.onboarding.offer.price-${value}-hint`),
      }));
    },
    availabilityOptions() {
      return ["always", "hours"].map((value) => ({
        value,
        label: this.$t(`tenant.onboarding.offer.availability-${value}`),
        description: this.$t(
          `tenant.onboarding.offer.availability-${value}-hint`
        ),
      }));
    },
  },
  methods: {
    /** The counter's buttons; the field itself still takes any typed number. */
    stepAmount(delta) {
      const current = Number(this.form.amount) || 0;
      this.form.amount = Math.max(0, current + delta);
    },
    toggleUnlimited() {
      this.form.amount = this.unlimited ? 1 : 0;
    },
    errorOf(field) {
      return this.errors[field]
        ? [this.$t(`tenant.onboarding.offer.errors.${this.errors[field]}`)]
        : [];
    },
    submit() {
      this.errors = validateOfferForm(this.form);
      if (Object.keys(this.errors).length > 0) return;
      this.$emit("submit", { ...this.form });
    },
  },
};
</script>

<style>
/* The amount: what it means on the left, a counter on the right, as a
   hairline row of the booking pages. */
.onboarding-page .offer-amount {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-4);
}

.onboarding-page .offer-amount__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.onboarding-page .offer-amount__hint {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  max-width: 44ch;
}

.onboarding-page .offer-amount__counter {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
}

.onboarding-page .offer-amount__input {
  width: 56px;
  height: 36px;
  text-align: center;
  font: inherit;
  font-size: 1.125rem;
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  -moz-appearance: textfield;
}

.onboarding-page .offer-amount__input::-webkit-outer-spin-button,
.onboarding-page .offer-amount__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.onboarding-page .offer-amount__input:focus-visible {
  outline: none;
  border-color: var(--v-primary-base);
  box-shadow: 0 0 0 1px var(--v-primary-base);
}

.onboarding-page .offer-amount__input--invalid {
  border-color: var(--v-error-base);
}

.onboarding-page .offer-amount__input--unlimited {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--scb-selected-tint-faint);
  border-color: var(--v-primary-base);
}

/* The way to and from "unlimited": a quiet text link under the counter. */
.onboarding-page .offer-amount__toggle {
  display: block;
  margin: var(--scb-space-2) 0 0 auto;
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  font-size: var(--scb-font-size-xs);
  color: var(--v-primary-base);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.onboarding-page .offer-amount__toggle:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
  border-radius: 2px;
}

.onboarding-page .offer-amount + .choice-tiles__error {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-xs);
}

/* $scb-bp-xs of tokens.scss */
@media (max-width: 599px) {
  .onboarding-page .offer-amount {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* What a chosen tile asks next, set off from the tiles by a hairline. */
.onboarding-page .onboarding-step__follow-up {
  margin-top: var(--scb-space-4);
  padding-top: var(--scb-space-4);
  border-top: 1px solid var(--scb-rule);
}
</style>

<template>
  <v-form @submit.prevent="submit" data-test="offer-step">
    <h2 class="text-h5 mb-1">{{ $t("tenant.onboarding.offer.title") }}</h2>
    <p class="text--secondary">{{ $t("tenant.onboarding.offer.intro") }}</p>

    <v-row>
      <v-col cols="12" md="5">
        <v-select
          v-model="form.type"
          :items="typeItems"
          :label="$t('tenant.onboarding.offer.type')"
          :error-messages="errorOf('type')"
          background-color="accent"
          filled
          dense
          data-test="offer-type"
        />
      </v-col>
      <v-col cols="12" md="7">
        <v-text-field
          v-model="form.title"
          :label="$t('tenant.onboarding.offer.name')"
          :error-messages="errorOf('title')"
          background-color="accent"
          filled
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
    <h4 class="text-subtitle-2 mt-4 mb-2">
      {{ $t("tenant.onboarding.offer.image") }}
    </h4>
    <MediaReferenceList v-model="form.images" />

    <h3 class="text-h6 mt-6 mb-2">
      {{ $t("tenant.onboarding.offer.booking") }}
    </h3>
    <v-row>
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="form.amount"
          :label="$t('tenant.onboarding.offer.amount')"
          :error-messages="errorOf('amount')"
          type="number"
          min="1"
          step="1"
          background-color="accent"
          filled
          dense
          data-test="offer-amount"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="form.confirmation"
          :items="confirmationItems"
          :label="$t('tenant.onboarding.offer.confirmation')"
          background-color="accent"
          filled
          dense
          data-test="offer-confirmation"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="form.schedule"
          :items="scheduleItems"
          :label="$t('tenant.onboarding.offer.schedule')"
          background-color="accent"
          filled
          dense
          data-test="offer-schedule"
        />
      </v-col>
    </v-row>
    <p class="text-caption text--secondary">
      {{ $t("tenant.onboarding.offer.amount-hint") }}
    </p>

    <h3 class="text-h6 mt-4">
      {{ $t("tenant.onboarding.offer.price-legend") }}
    </h3>
    <p v-if="stored" class="text-caption text--secondary mb-0">
      {{
        $t("tenant.onboarding.offer.stored", {
          value: $t(`tenant.onboarding.offer.price-${stored.priceChoice}`),
        })
      }}
    </p>
    <v-radio-group
      v-model="form.priceChoice"
      :error-messages="errorOf('priceChoice')"
      row
      data-test="offer-price-choice"
    >
      <v-radio
        :label="$t('tenant.onboarding.offer.price-free')"
        value="free"
        data-test="offer-price-free"
      />
      <v-radio
        :label="$t('tenant.onboarding.offer.price-paid')"
        value="paid"
        data-test="offer-price-paid"
      />
    </v-radio-group>
    <div v-if="form.priceChoice === 'paid'" data-test="offer-paid-fields">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.price"
            :label="$t('tenant.onboarding.offer.price')"
            :error-messages="errorOf('price')"
            suffix="€"
            background-color="accent"
            filled
            dense
            data-test="offer-price"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="form.priceType"
            :items="priceTypeItems"
            :label="$t('tenant.onboarding.offer.price-type')"
            background-color="accent"
            filled
            dense
          />
        </v-col>
      </v-row>
      <p class="text-caption text--secondary">
        {{ $t("tenant.onboarding.offer.price-hint") }}
      </p>
      <v-alert type="info" text dense data-test="offer-payment-hint">
        {{ $t("tenant.onboarding.offer.payment-hint") }}
      </v-alert>
    </div>

    <h3 class="text-h6 mt-4">
      {{ $t("tenant.onboarding.offer.availability-legend") }}
    </h3>
    <p v-if="stored" class="text-caption text--secondary mb-0">
      {{
        $t("tenant.onboarding.offer.stored", {
          value: $t(
            `tenant.onboarding.offer.availability-${stored.availability}`
          ),
        })
      }}
    </p>
    <v-radio-group
      v-model="form.availability"
      :error-messages="errorOf('availability')"
      row
      data-test="offer-availability"
    >
      <v-radio
        :label="$t('tenant.onboarding.offer.availability-always')"
        value="always"
        data-test="offer-availability-always"
      />
      <v-radio
        :label="$t('tenant.onboarding.offer.availability-hours')"
        value="hours"
        data-test="offer-availability-hours"
      />
    </v-radio-group>
    <p class="text-caption text--secondary">
      {{ $t("tenant.onboarding.offer.availability-hint") }}
    </p>
    <div v-if="form.availability === 'hours'" data-test="offer-hours-fields">
      <p class="text-caption text--secondary">
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
      <v-row>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="form.startTime"
            :label="$t('tenant.onboarding.offer.start-time')"
            type="time"
            background-color="accent"
            filled
            dense
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="form.endTime"
            :label="$t('tenant.onboarding.offer.end-time')"
            type="time"
            background-color="accent"
            filled
            dense
          />
        </v-col>
      </v-row>
      <p
        v-if="errors.openingHours"
        class="error--text text-caption"
        data-test="offer-hours-error"
      >
        {{ errorOf("openingHours")[0] }}
      </p>
    </div>

    <v-alert v-if="saveFailed" type="error" text dense class="mt-4">
      {{ $t("tenant.onboarding.offer.save-failed") }}
    </v-alert>

    <div class="d-flex flex-wrap mt-6" style="gap: 12px">
      <v-btn
        color="primary"
        type="submit"
        :loading="inProgress"
        data-test="offer-submit"
      >
        {{ $t("tenant.onboarding.offer.submit") }}
      </v-btn>
      <v-btn outlined @click="$emit('exit')">
        {{ $t("tenant.onboarding.exit") }}
      </v-btn>
    </div>
    <p class="text-caption text--secondary mt-2">
      {{ $t("tenant.onboarding.offer.unsaved-hint") }}
    </p>
  </v-form>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import { getTypeText } from "@/utils/bookables";
import {
  OFFER_PRICE_TYPES,
  OFFER_BOOKABLE_TYPES,
  OFFER_WEEKDAYS,
  emptyOfferForm,
  offerFormFromBookable,
  storedChoices,
  validateOfferForm,
} from "@/utils/tenantOnboarding";

/**
 * Step 2: the first bookable. Booking type, amount and confirmation are
 * visible defaults; price and availability carry no preselection and are
 * asked again when a stored bookable is resumed (supervision spec §9).
 */
export default {
  name: "OnboardingOfferStep",
  components: { Tiptap, MediaReferenceList },
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
    stored() {
      return this.bookable ? storedChoices(this.bookable) : null;
    },
    typeItems() {
      return OFFER_BOOKABLE_TYPES.map((type) => ({
        value: type,
        text: getTypeText(type),
      }));
    },
    confirmationItems() {
      return ["manual", "auto"].map((value) => ({
        value,
        text: this.$t(`tenant.onboarding.offer.confirmation-${value}`),
      }));
    },
    scheduleItems() {
      return ["period", "none"].map((value) => ({
        value,
        text: this.$t(`tenant.onboarding.offer.schedule-${value}`),
      }));
    },
    priceTypeItems() {
      return OFFER_PRICE_TYPES.map((value) => ({
        value,
        text: this.$t(`tenant.onboarding.offer.price-types.${value}`),
      }));
    },
  },
  methods: {
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

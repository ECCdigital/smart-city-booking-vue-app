<template>
  <v-container class="customer-proofs d-flex justify-center">
    <v-card class="customer-proofs__card pa-6" data-test="customer-proofs">
      <v-img :src="appLogo" max-width="150" class="mb-4 mx-auto" />
      <h1 class="text-h5 font-weight-bold mb-4">
        {{ $t("customer-proofs.title") }}
      </h1>

      <div
        v-if="loading"
        class="d-flex flex-column align-center py-6"
        data-test="customer-proofs-loading"
      >
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-4 mb-0">{{ $t("customer-proofs.loading") }}</p>
      </div>

      <v-alert
        v-else-if="refusal"
        type="error"
        text
        icon="mdi-link-variant-off"
        class="mb-0"
        data-test="customer-proofs-refusal"
      >
        <div class="font-weight-bold">
          {{ $t(`customer-proofs.link.${refusal}.title`) }}
        </div>
        <div>{{ $t(`customer-proofs.link.${refusal}.text`) }}</div>
        <v-btn
          v-if="refusal === 'error'"
          small
          outlined
          color="error"
          class="mt-3"
          @click="load"
        >
          {{ $t("customer-proofs.link.error.retry") }}
        </v-btn>
      </v-alert>

      <template v-else-if="bookings.length">
        <i18n path="customer-proofs.intro" tag="p" class="text-body-2">
          <template #name>
            <strong>{{ tenant.name }}</strong>
          </template>
        </i18n>
        <p
          v-if="bookings.length > 1"
          class="text-body-2"
          data-test="customer-proofs-series"
        >
          {{ $t("customer-proofs.series", { count: bookings.length }) }}
        </p>

        <div v-if="series" class="customer-proofs__fields">
          <div
            class="customer-proofs__booking"
            data-test="customer-proofs-booking"
          >
            <div
              v-if="offerTitlesOf(bookings[0])"
              class="text-subtitle-1 font-weight-bold"
            >
              {{ offerTitlesOf(bookings[0]) }}
            </div>
            <div
              v-for="(booking, index) in bookings"
              :key="booking.id"
              class="text-body-2"
            >
              {{ memberOf(booking, index) }} ·
              {{ $t("customer-proofs.booking", { id: booking.id }) }}
            </div>
          </div>
          <p v-if="!seriesFields.length" class="mb-0">
            {{ $t("customer-proofs.none") }}
          </p>
          <CustomerProofSeriesField
            v-for="entry in seriesFields"
            :key="entry.fieldId"
            :entries="entry.entries"
            :tenant-id="target.tenantId"
            :link="link"
            :tenant-name="tenant.name"
            @changed="refresh"
          />
        </div>

        <div v-else class="customer-proofs__bookings">
          <section
            v-for="booking in bookings"
            :key="booking.id"
            data-test="customer-proofs-entry"
          >
            <div
              class="customer-proofs__booking mb-3"
              data-test="customer-proofs-booking"
            >
              <div
                v-if="offerTitlesOf(booking)"
                class="text-subtitle-1 font-weight-bold"
              >
                {{ offerTitlesOf(booking) }}
              </div>
              <div class="text-body-2">
                {{ $t("customer-proofs.booking", { id: booking.id }) }}
              </div>
              <div
                v-if="timeRangeOf(booking)"
                class="text-body-2 text--secondary"
              >
                {{ timeRangeOf(booking) }}
              </div>
            </div>

            <p v-if="!fieldsOf(booking).length" class="mb-0">
              {{ $t("customer-proofs.none") }}
            </p>
            <div v-else class="customer-proofs__fields">
              <CustomerProofField
                v-for="field in fieldsOf(booking)"
                :key="field.fieldId"
                :field="field"
                :target="targetOf(booking)"
                :link="link"
                :tenant-name="tenant.name"
                @state="onState(booking.id, $event)"
              />
            </div>
          </section>
        </div>
      </template>
    </v-card>
  </v-container>
</template>

<script>
import CustomerProofField from "@/components/Booking/CustomerProofField.vue";
import CustomerProofSeriesField from "@/components/Booking/CustomerProofSeriesField.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import FormatService from "@/services/FormatService";
import {
  customerProofLinkRefusalOf,
  customerUploadLinkTarget,
} from "@/utils/customerUploads";

const one = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * The page „Nachweise einreichen“ for an instance without a storefront: the
 * mails link every customer here with the signed link of the booking
 * (`?link=…&field=…`), without a sign-in, as for the cancellation request.
 * The link of a series opens all its bookings: as in the checkout of a
 * series one card per upload field, its dates below, and a file goes to
 * the dates chosen for it.
 * The customer hands proofs in, replaces and deletes them until they are
 * checked, and hands in anew after a rejection - until the booking ends.
 * The link is the key to the booking: the page sends no referrer and asks
 * search engines to keep away.
 */
export default {
  name: "CustomerProofs",
  components: { CustomerProofField, CustomerProofSeriesField },
  data() {
    return {
      loading: true,
      refusal: null,
      tenant: { id: "", name: "" },
      bookings: [],
      addedMeta: [],
    };
  },
  computed: {
    appLogo() {
      return process.env.BASE_URL + "/app-logo.png";
    },
    link() {
      return one(this.$route.query.link) ?? "";
    },
    targetFieldId() {
      return one(this.$route.query.field) ?? null;
    },
    target() {
      return customerUploadLinkTarget(this.link);
    },
    series() {
      return this.bookings.length > 1;
    },
    /**
     * The upload fields of a series, in the order they first come: each
     * with the dates that ask for it, `{ booking, field, member }`.
     */
    seriesFields() {
      const byField = new Map();
      this.bookings.forEach((booking, index) => {
        for (const field of this.fieldsOf(booking)) {
          if (!byField.has(field.fieldId)) byField.set(field.fieldId, []);
          byField.get(field.fieldId).push({
            booking,
            field,
            member: this.memberOf(booking, index),
          });
        }
      });
      return [...byField].map(([fieldId, entries]) => ({ fieldId, entries }));
    },
  },
  created() {
    this.addMeta("referrer", "no-referrer");
    this.addMeta("robots", "noindex, nofollow");
    this.load();
  },
  beforeDestroy() {
    this.addedMeta.forEach((element) => element.remove());
  },
  methods: {
    fieldsOf(booking) {
      return booking.customerUploadState?.fields ?? [];
    },
    offerTitlesOf(booking) {
      return (booking.bookableItems ?? [])
        .map((item) => item._bookableUsed?.title)
        .filter(Boolean)
        .join(", ");
    },
    timeRangeOf({ timeBegin, timeEnd }) {
      if (!timeBegin) return "";
      const begin = FormatService.dateTime(timeBegin);
      return timeEnd ? `${begin} – ${FormatService.dateTime(timeEnd)}` : begin;
    },
    /** A date of the series, as „Termin 2 · 18.11.26, 14:00“. */
    memberOf(booking, index) {
      return this.$t("customer-proofs.member", {
        n: index + 1,
        date: booking.timeBegin
          ? FormatService.dateTime(booking.timeBegin)
          : "",
      });
    },
    /** Where the fields of `booking` hand in: the tenant of the link. */
    targetOf(booking) {
      return { tenantId: this.target.tenantId, bookingId: booking.id };
    },
    addMeta(name, content) {
      const element = document.createElement("meta");
      element.name = name;
      element.content = content;
      document.head.appendChild(element);
      this.addedMeta.push(element);
    },
    async load() {
      this.refusal = null;
      if (!this.target) {
        this.refusal = "invalid";
        this.loading = false;
        return;
      }
      this.loading = true;
      try {
        const response = await ApiBookingService.readCustomerUploadsByLink(
          this.target,
          this.link
        );
        this.tenant = response.data?.tenant ?? { id: "", name: "" };
        this.bookings = response.data?.bookings ?? [];
      } catch (error) {
        this.refusal = customerProofLinkRefusalOf(error?.response?.data?.code);
      } finally {
        this.loading = false;
      }
      if (this.bookings.length) this.$nextTick(this.revealTarget);
    },
    /** The bookings read anew after a change, the page staying as it is. */
    async refresh() {
      try {
        const response = await ApiBookingService.readCustomerUploadsByLink(
          this.target,
          this.link
        );
        this.bookings = response.data?.bookings ?? this.bookings;
      } catch (error) {
        this.refusal = customerProofLinkRefusalOf(error?.response?.data?.code);
      }
    },
    /** The field the mail named, of the link's booking, comes into view. */
    revealTarget() {
      if (!this.targetFieldId) return;
      document
        .getElementById(
          `proof-field-${this.bookings[0].id}-${this.targetFieldId}`
        )
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    },
    onState(bookingId, customerUploadState) {
      if (!customerUploadState) return;
      this.bookings = this.bookings.map((booking) =>
        booking.id === bookingId ? { ...booking, customerUploadState } : booking
      );
    },
  },
};
</script>

<style scoped>
.customer-proofs {
  min-height: 100vh;
  align-items: center;
}

.customer-proofs__card {
  width: 100%;
  border-radius: var(--scb-radius-popover) !important;
  max-width: 720px;
}

.customer-proofs__booking {
  padding: var(--scb-space-3) var(--scb-space-4);
  background-color: var(--scb-hover-tint);
  border-radius: var(--scb-radius-control);
}

.customer-proofs__bookings {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-6);
}

.customer-proofs__fields {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-3);
}
</style>

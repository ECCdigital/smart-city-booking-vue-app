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

      <template v-else-if="booking">
        <i18n path="customer-proofs.intro" tag="p" class="text-body-2">
          <template #name>
            <strong>{{ tenant.name }}</strong>
          </template>
        </i18n>

        <div
          class="customer-proofs__booking mb-4"
          data-test="customer-proofs-booking"
        >
          <div v-if="offerTitles" class="text-subtitle-1 font-weight-bold">
            {{ offerTitles }}
          </div>
          <div class="text-body-2">
            {{ $t("customer-proofs.booking", { id: booking.id }) }}
          </div>
          <div v-if="timeRange" class="text-body-2 text--secondary">
            {{ timeRange }}
          </div>
        </div>

        <p v-if="!fields.length" class="mb-0">
          {{ $t("customer-proofs.none") }}
        </p>
        <div v-else class="customer-proofs__fields">
          <CustomerProofField
            v-for="field in fields"
            :key="field.fieldId"
            :field="field"
            :target="target"
            :link="link"
            :tenant-name="tenant.name"
            @state="onState"
          />
        </div>
      </template>
    </v-card>
  </v-container>
</template>

<script>
import CustomerProofField from "@/components/Booking/CustomerProofField.vue";
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
 * The customer hands proofs in, replaces and deletes them until they are
 * checked, and hands in anew after a rejection - until the booking ends.
 * The link is the key to the booking: the page sends no referrer and asks
 * search engines to keep away.
 */
export default {
  name: "CustomerProofs",
  components: { CustomerProofField },
  data() {
    return {
      loading: true,
      refusal: null,
      tenant: { id: "", name: "" },
      booking: null,
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
    fields() {
      return this.booking?.customerUploadState?.fields ?? [];
    },
    offerTitles() {
      return (this.booking?.bookableItems ?? [])
        .map((item) => item._bookableUsed?.title)
        .filter(Boolean)
        .join(", ");
    },
    timeRange() {
      const { timeBegin, timeEnd } = this.booking ?? {};
      if (!timeBegin) return "";
      const begin = FormatService.dateTime(timeBegin);
      return timeEnd ? `${begin} – ${FormatService.dateTime(timeEnd)}` : begin;
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
        this.booking = response.data?.booking ?? null;
      } catch (error) {
        this.refusal = customerProofLinkRefusalOf(error?.response?.data?.code);
      } finally {
        this.loading = false;
      }
      if (this.booking) this.$nextTick(this.revealTarget);
    },
    /** The field the mail named comes into view. */
    revealTarget() {
      if (!this.targetFieldId) return;
      document
        .getElementById(`proof-field-${this.targetFieldId}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    },
    onState(customerUploadState) {
      if (!customerUploadState || !this.booking) return;
      this.booking = { ...this.booking, customerUploadState };
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

.customer-proofs__fields {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-3);
}
</style>

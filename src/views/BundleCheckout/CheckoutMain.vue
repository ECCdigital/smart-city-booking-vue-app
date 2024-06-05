<template>
  <div>
    <v-container>
      <div v-if="preventBooking === false">
        <v-stepper alt-labels elevation="0" class="mb-10" v-model="step">
          <v-stepper-header>
            <v-stepper-step step="1" :complete="step > 1">
              Buchungszeitraum
            </v-stepper-step>
            <v-divider></v-divider>
            <v-stepper-step step="2" :complete="step > 2">
              Ergänzungen
            </v-stepper-step>
            <v-divider></v-divider>
            <v-stepper-step step="3" :complete="step > 3">
              Anmeldung
            </v-stepper-step>
            <v-divider></v-divider>
            <v-stepper-step step="4" :complete="step > 4">
              Kontaktdaten
            </v-stepper-step>
            <v-divider></v-divider>
            <v-stepper-step step="5"> Zusammenfassung </v-stepper-step>
          </v-stepper-header>
        </v-stepper>

        <v-row>
          <v-col v-if="step < 5" class="col-md-7">
            <checkout-time-selector
              v-if="!loading && step === 1 && leadItem.bookable"
              :lead-item="leadItem"
              :subsequent-items="subsequentItems"
              :time-begin="timeBegin"
              :time-end="timeEnd"
              :amount="leadItem.amount"
              @booking-time-selected="setBookingTime"
              @submit="nextPage"
            ></checkout-time-selector>
            <additional-bookables
              v-if="step === 2 && leadItem.bookable"
              :lead-item="leadItem"
              :subsequent-items="subsequentItems"
              :time-begin="timeBegin"
              :time-end="timeEnd"
              @item-selected="addSubsequentItem"
              @back="previousPage()"
              @submit="nextPage()"
            ></additional-bookables>
            <checkout-signin
              v-if="step === 3"
              :tenant="tenant"
              :me="me"
              @back="previousPage()"
              @submit="nextPage()"
              @update-me="fetchMe()"
            ></checkout-signin>
            <checkout-contact-details
              v-if="leadItem.bookable && step === 4"
              :me="me"
              :lead-item="leadItem"
              :contact-details="contactDetails"
              @back="previousPage()"
              @submit="nextPage()"
            ></checkout-contact-details>
            <checkout-agreements
              v-if="leadItem.bookable && step === 4 && leadItem.bookable.attachments.length > 0"
              ref="checkoutAgreements"
              :agreements="leadItem.bookable.attachments"
            ></checkout-agreements>
          </v-col>
          <v-col class="col-md">
            <checkout-quick-summary
              v-if="!loading"
              :lead-item="leadItem"
              :subsequent-items="subsequentItems"
              :time-begin="timeBegin"
              :time-end="timeEnd"
              :contact-details="contactDetails"
              :tenant="tenant"
              :coupon="coupon"
              :trace="trace"
              :final-check="step === 5"
              :me="me"
              @back="previousPage()"
              @validate-items="validateItems()"
              @redeem-coupon="redeemCoupon"
              @remove-coupon="removeCoupon"
            ></checkout-quick-summary>
          </v-col>
        </v-row>
      </div>
      <div v-else>
        Leider ist die von Ihnen gewünschten Buchung nicht möglich. Bitte
        versuchen Sie es erneut oder wenden Sie sich an unsere
        Ansprechpartner*innen.
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiBookablesService from "@/services/api/ApiBookablesService";

import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import CheckoutTimeSelector from "@/views/BundleCheckout/CheckoutTimeSelector.vue";
import AdditionalBookables from "@/views/BundleCheckout/AdditionalBookables.vue";
import CheckoutSignin from "@/views/BundleCheckout/CheckoutSignin.vue";
import CheckoutContactDetails from "@/views/BundleCheckout/CheckoutContactDetails.vue";
import ApiCouponService from "@/services/api/ApiCouponService";
import CheckoutAgreements from "@/views/BundleCheckout/CheckoutAgreements.vue";

export default {
  name: "CheckoutMain",

  components: {
    CheckoutAgreements,
    CheckoutSignin,
    AdditionalBookables,
    CheckoutQuickSummary,
    CheckoutTimeSelector,
    CheckoutContactDetails,
  },

  data() {
    return {
      loading: true,
      trace: false,

      // If true, the booking procedure will be prevented. This is used to stop booking procedure in case of any errors.
      preventBooking: false,

      // The current page of the checkout procedure
      step: 1,

      // The user currently logged in
      me: null,

      // The tenant of the booking procedure
      tenant: null,

      // The leading bookable item of this bundle. The leading item determines the checkout procedure.
      leadItem: {
        bookableId: null,
        amount: null,
        bookable: null,
        valid: null,
        regularPriceEur: null,
        userPriceEur: null,
      },

      // A list of items subsequently added to the bundle. Those items have to fit the checkout procedure determined by
      // the leading item.
      subsequentItems: [],

      // Time range of the booking
      timeBegin: null,
      timeEnd: null,

      // All bookings of bookable items in this bundle
      itemBookings: [],

      // Contact Details for the booking
      contactDetails: {
        name: null,
        company: null,
        mail: null,
        phone: null,
        street: null,
        zipCode: null,
        location: null,
        comment: null,
      },

      // If the user enters a coupon code, this coupon will be stored here.
      coupon: null,
    };
  },

  async mounted() {
    this.trace = this.$route.query.trace === "true";
    this.tenant = this.$route.query.tenant;
    this.leadItem.bookableId = this.$route.query.id;
    this.leadItem.amount = parseInt(this.$route.query.amount || 1);

    await this.fetchMe();
    await this.fetchLeadBookable();
    await this.fetchSubsequentBookables();
    await this.validateItems();

    this.step = this.minimumPageNumber;

    this.loading = false;
  },

  methods: {
    async fetchMe() {
      try {
        const { data } = await ApiAuthService.me(this.tenant, true);
        this.me = data;
        this.contactDetails.mail = this.me.id;
        this.contactDetails.name = this.me.firstName + " " + this.me.lastName;
        this.contactDetails.phone = this.me.phone;
        this.contactDetails.street = this.me.address;
        this.contactDetails.zipCode = this.me.zipCode;
        this.contactDetails.location = this.me.city;
      } catch (error) {
        console.log(error);
        this.me = null;
        this.contactDetails.mail = null;
        this.contactDetails.name = null;
        this.contactDetails.phone = null;
        this.contactDetails.street = null;
        this.contactDetails.zipCode = null;
        this.contactDetails.location = null;
      }
    },

    async fetchLeadBookable() {
      try {
        const response = await ApiBookablesService.getBookable(
          this.leadItem.bookableId,
          this.tenant
        );

        if (response.data.id) {
          this.leadItem.bookable = response.data;
        } else {
          this.preventBooking = true;
        }
      } catch (error) {
        console.log(error);
        this.leadItem.bookable = null;
        this.preventBooking = true;
      }
    },

    async fetchSubsequentBookables() {
      try {
        for (const bookableItem of this.subsequentItems) {
          const { data } = await ApiBookablesService.getBookable(
            bookableItem.bookableId,
            this.tenant
          );

          bookableItem.bookable = data;
        }
      } catch (error) {
        console.log(error);
        this.subsequentItems.forEach((item) => (item.bookable = null));
      }
    },

    async validateItems() {
      for (let item of [this.leadItem, ...this.subsequentItems]) {
        if (
          (item.bookable.isScheduleRelated ||
            item.bookable.isTimePeriodRelated ||
            item.bookable.isLongRange) &&
          (this.timeBegin == null || this.timeEnd == null)
        ) {
          item.valid = null;
        } else {
          try {
            const response = await ApiCheckoutService.validateCheckoutItem(
              this.tenant,
              item,
              this.timeBegin,
              this.timeEnd,
              this.coupon?.id
            );

            if (response.status === 200) {
              item.regularPriceEur = response.data.regularPriceEur;
              item.userPriceEur = response.data.userPriceEur;
              item.valid = true;
              delete item.error;
            }
          } catch (error) {
            item.regularPriceEur = null;
            item.userPriceEur = null;
            item.valid = false;
            item.error = error.response.data;
            console.log(error);
          }
        }
      }
    },

    async addSubsequentItem(item) {
      const { data } = await ApiBookablesService.getBookable(
        item.bookableId,
        this.tenant
      );

      const bookableItem = {
        ...item,
        bookable: data,
        regularPriceEur: null,
        userPriceEur: null,
      };

      this.subsequentItems.push(bookableItem);
      await this.validateItems();
    },

    async setBookingTime(event) {
      this.timeBegin = event.begin;
      this.timeEnd = event.end;
      await this.validateItems();
    },

    nextPage() {
      if (this.step < 5) {
        this.step++;
      }

      // Step over additional objects, if there are none
      if (
        this.step === 2 &&
        this.leadItem.bookable.checkoutBookableIds.length === 0
      ) {
        this.step++;
      }
    },

    previousPage() {
      if (this.step > this.minimumPageNumber) {
        this.step--;
      }
    },

    async redeemCoupon(code) {
      try {
        const coupon = await ApiCouponService.getCoupon(this.tenant, code);
        this.coupon = coupon.data;
      } catch (e) {
        if (e.response.status === 404) {
          this.coupon = null;
        }
      } finally {
        await this.validateItems();
      }
    },

    async removeCoupon() {
      this.coupon = null;
      await this.validateItems();
    },
  },

  computed: {
    minimumPageNumber() {
      if (
        this.leadItem.bookable.isScheduleRelated ||
        this.leadItem.bookable.isTimePeriodRelated ||
        this.leadItem.bookable.isLongRange
      ) {
        return 1;
      } else if (this.leadItem.bookable.checkoutBookableIds.length > 0) {
        return 2;
      } else {
        return 3;
      }
    },
  },
};
</script>

<style scoped></style>

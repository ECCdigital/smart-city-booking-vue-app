<template>
  <div>
    <v-container>
      <div v-if="!preventBooking">
        <v-stepper alt-labels elevation="0" class="mb-10" v-model="step">
          <v-stepper-header>
            <template v-for="(step, index) in steps">
              <v-stepper-step
                :key="`step-${index}`"
                :complete="stepComplete(index)"
                :step="index + 1"
                :rules="step.rules"
              >
                {{ step.title }}
              </v-stepper-step>
              <v-divider
                v-if="index < steps.length - 1"
                :key="index"
              ></v-divider>
            </template>
          </v-stepper-header>
        </v-stepper>

        <v-row>
          <v-col
            v-if="step < steps.length"
            :class="leadItem.bookable ? 'col-md-7' : 'col-md'"
          >
            <component
              :is="steps[step - 1].component"
              v-if="!loading"
              v-bind="steps[step - 1].props"
              v-on="steps[step - 1].events"
            ></component>
          </v-col>
          <v-col v-if="leadItem.bookable" class="col-md">
            <checkout-quick-summary
              v-if="!loading && leadItem.bookable"
              :lead-item="leadItem"
              :subsequent-items="subsequentItems"
              :time-begin="timeBegin"
              :time-end="timeEnd"
              :contact-details="contactDetails"
              :tenant="tenant"
              :coupon="coupon"
              :selected-payment-app="selectedPaymentApp"
              :trace="trace"
              :final-check="step === steps.length"
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
import CheckoutNoPermission from "@/views/BundleCheckout/CheckoutNoPermission.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import CheckoutPaymentMethod from "@/views/BundleCheckout/CheckoutPaymentMethod.vue";

export default {
  name: "CheckoutMain",

  components: {
    CheckoutPaymentMethod,
    CheckoutSignin,
    AdditionalBookables,
    CheckoutQuickSummary,
    CheckoutTimeSelector,
    CheckoutContactDetails,
    CheckoutNoPermission,
  },

  data() {
    return {
      loading: true,
      trace: false,
      preventBooking: false,
      loginRequired: false,
      bookingPermission: true,
      step: 1,
      me: null,
      tenant: null,
      leadItem: {
        bookableId: null,
        amount: null,
        bookable: null,
        valid: null,
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      },
      subsequentItems: [],
      timeBegin: null,
      timeEnd: null,
      itemBookings: [],
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
      coupon: null,

      activePaymentApps: [],
      selectedPaymentApp: null,
    };
  },

  async mounted() {
    this.resetState();
    this.trace = this.$route.query.trace === "true";
    this.tenant = this.$route.query.tenant;
    this.leadItem.bookableId = this.$route.query.id;
    this.leadItem.amount = parseInt(this.$route.query.amount || 1);
    await this.init();
  },

  methods: {
    async init() {
      await this.fetchMe();
      await this.fetchLeadBookable();
      await this.fetchSubsequentBookables();
      await this.validateItems();
      await this.fetchActivePaymentApps();
      this.loading = false;
    },

    resetState() {
      this.loading = true;
      this.leadItem = {
        bookableId: null,
        amount: null,
        bookable: null,
        valid: null,
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      };
      this.subsequentItems = [];
      this.timeBegin = null;
      this.timeEnd = null;
      this.itemBookings = [];
      this.contactDetails = {
        name: null,
        company: null,
        mail: null,
        phone: null,
        street: null,
        zipCode: null,
        location: null,
        comment: null,
      };
      this.coupon = null;
    },

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
          this.preventBooking = false;

          if (
            this.leadItem.bookable.permittedRoles?.length > 0 ||
            this.leadItem.bookable.permittedUsers?.length > 0
          ) {
            this.loginRequired = true;
          }
        } else {
          this.preventBooking = true;
          this.loginRequired = false;
        }
      } catch (error) {
        this.loginRequired = error.response.status === 401;
        this.bookingPermission = error.response.status !== 403;
        if (!this.bookingPermission) {
          this.step = 1;
        }
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
        this.subsequentItems.forEach((item) => (item.bookable = null));
      }
    },

    async validateItems() {
      for (let item of [this.leadItem, ...this.subsequentItems]) {
        if (
          (item.bookable?.isScheduleRelated ||
            item.bookable?.isTimePeriodRelated ||
            item.bookable?.isLongRange) &&
          (this.timeBegin == null || this.timeEnd == null)
        ) {
          item.valid = null;
          delete item.error;
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
              item.regularGrossPriceEur = response.data.regularGrossPriceEur;
              item.userGrossPriceEur = response.data.userGrossPriceEur;
              item.valid = true;
              delete item.error;
            }
          } catch (error) {
            item.regularPriceEur = null;
            item.userPriceEur = null;
            item.regurlarGroosPriceEur = null;
            item.userGrossPriceEur = null;

            item.valid = false;
            item.error = error.response.data;
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
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
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
      //TODO: set step to length
      console.log(this.steps.length);
      if (this.step < 5) {
        this.step++;
      }
    },

    previousPage() {
      if (this.step > 1) {
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

    stepComplete(index) {
      return this.step > index + 1;
    },

    async fetchActivePaymentApps() {
      try {
        const response = await ApiTenantService.getTenantActivePaymentApps(
          this.tenant
        );
        this.activePaymentApps = response.data;

        if (this.activePaymentApps.length === 1) {
          this.selectedPaymentApp = this.activePaymentApps[0].id;
        }
      } catch (error) {
        console.log("Error while fetching active payment apps");
      }
    },
    setPaymentApp(app) {
      this.selectedPaymentApp = app;
      this.nextPage();
    },
  },

  computed: {
    steps() {
      const permissionStep = {
        title: "Berechtigung",
        rules: [() => false],
        component: "checkout-no-permission",
        props: {
          tenant: this.tenant,
        },
        events: {
          "sign-out": this.init,
        },
      };

      const loginStep = {
        title: "Anmeldung",
        component: "checkout-signin",
        props: {
          tenant: this.tenant,
          me: this.me,
        },
        events: {
          "update-me": this.fetchMe,
          submit: this.nextPage,
          back: this.previousPage,
        },
      };

      const loginRequiredStep = {
        title: "Anmeldung",
        component: "checkout-signin",
        props: {
          tenant: this.tenant,
          me: this.me,
          "show-back": false,
          "show-submit-guest": false,
        },
        events: {
          "update-me": this.init,
          submit: this.nextPage,
        },
      };

      const contactDetailsStep = {
        title: "Kontaktdaten",
        component: "checkout-contact-details",
        props: {
          me: this.me,
          leadItem: this.leadItem,
          contactDetails: this.contactDetails,
        },
        events: {
          back: this.previousPage,
          submit: this.nextPage,
        },
      };

      const timeSelectorStep = {
        title: "Buchungszeitraum",
        component: "checkout-time-selector",
        props: {
          leadItem: this.leadItem,
          subsequentItems: this.subsequentItems,
          timeBegin: this.timeBegin,
          timeEnd: this.timeEnd,
          amount: this.leadItem.amount,
        },
        events: {
          "booking-time-selected": this.setBookingTime,
          submit: this.nextPage,
          back: this.previousPage,
        },
      };

      const additionalBookableOptions = {
        title: "Ergänzungen",
        component: "additional-bookables",
        props: {
          leadItem: this.leadItem,
          subsequentItems: this.subsequentItems,
          timeBegin: this.timeBegin,
          timeEnd: this.timeEnd,
        },
        events: {
          "item-selected": this.addSubsequentItem,
          back: this.previousPage,
          submit: this.nextPage,
        },
      };

      const paymentStep = {
        title: "Zahlungsmethode",
        component: "checkout-payment-method",
        props: {
          activePaymentApps: this.activePaymentApps,
        },
        events: {
          back: this.previousPage,
          submit: this.setPaymentApp,
        },
      };

      let stepsToReturn = [];

      if (!this.bookingPermission) {
        stepsToReturn.push(permissionStep);
      }

      if (this.loginRequired || !this.bookingPermission) {
        stepsToReturn.push(loginRequiredStep);
      }

      if (
        this.leadItem.bookable?.isScheduleRelated ||
        this.leadItem.bookable?.isTimePeriodRelated ||
        this.leadItem.bookable?.isLongRange
      ) {
        stepsToReturn.push(timeSelectorStep);
      }

      if (this.leadItem.bookable?.checkoutBookableIds?.length > 0) {
        stepsToReturn.push(additionalBookableOptions);
      }

      if (!this.loginRequired && this.bookingPermission) {
        stepsToReturn.push(loginStep);
      }

      stepsToReturn.push(contactDetailsStep);

      if (
        this.activePaymentApps.length > 1 &&
        this.leadItem.bookable &&
        (this.leadItem.bookable.priceEur > 0 || this.leadItem.userPriceEur > 0)
      ) {
        stepsToReturn.push(paymentStep);
      }

      stepsToReturn.push({
        title: "Zusammenfassung",
      });

      return stepsToReturn;
    },
  },
};
</script>

<style scoped></style>

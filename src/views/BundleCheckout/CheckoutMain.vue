<template>
  <div>
    <v-container>
      <div>
        <v-stepper
          v-if="!preventBooking && steps.length > 0"
          alt-labels
          elevation="0"
          class="mb-10"
          v-model="step"
        >
          <v-stepper-header>
            <template v-for="(_step, index) in steps">
              <v-stepper-step
                :key="`step-${index}`"
                :complete="stepComplete(index)"
                :step="index + 1"
                :rules="step.rules"
              >
                {{ _step.title }}
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
            :class="
              leadItem.bookable && !preventBooking ? 'col-md-7' : 'col-md'
            "
          >
            <component
              :is="steps[step - 1].component"
              v-if="!loading"
              v-bind="steps[step - 1].props"
              v-on="steps[step - 1].events"
            ></component>
          </v-col>
          <v-col v-if="leadItem.bookable && !preventBooking" class="col-md">
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
import CheckoutPaymentProvider from "@/views/BundleCheckout/CheckoutPaymentProvider.vue";
import CheckoutAmountSelector from "@/views/BundleCheckout/CheckoutAmountSelector.vue";
import { mapActions, mapGetters } from "vuex";

export default {
  name: "CheckoutMain",

  components: {
    CheckoutPaymentProvider,
    CheckoutSignin,
    AdditionalBookables,
    CheckoutQuickSummary,
    CheckoutTimeSelector,
    CheckoutContactDetails,
    CheckoutNoPermission,
    CheckoutAmountSelector,
  },

  data() {
    return {
      steps: [],
      loading: true,
      trace: false,
      preventBooking: false,
      loginRequired: false,
      bookingPermission: true,
      step: null,
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
    await this.fetchTenant();
  },

  methods: {
    ...mapActions({
      updateTenant: "tenants/update",
    }),
    async init() {
      await this.fetchMe();
      await this.getCheckoutPermissions();
      await this.fetchLeadBookable();
      await this.fetchSubsequentBookables();
      await this.validateItems();
      await this.fetchActivePaymentApps();
      this.steps = this.createSteps();
      this.step = 1;
      this.loading = false;
    },

    createSteps() {
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
          tenantId: this.tenant,
          me: this.me,
          "show-back": false,
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
          tenantId: this.tenant,
          me: this.me,
          "show-back": false,
          "show-submit-guest": false,
        },
        events: {
          "update-me": this.init,
          login: this.init,
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
          "show-back": false,
        },
        events: {
          "booking-time-selected": this.setBookingTime,
          submit: this.nextPage,
          back: this.previousPage,
        },
      };

      const amountStep = {
        title: "Anzahl",
        component: "checkout-amount-selector",
        props: {
          leadItem: this.leadItem,
          subsequentItems: this.subsequentItems,
          maxSquares: this.leadItem.bookable.amount,
        },
        events: {
          back: this.previousPage,
          submit: this.nextPage,
          "validate-items": this.validateItems,
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
        component: "checkout-payment-provider",
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
        timeSelectorStep.props["show-back"] = true;
      }

      if (!this.loginRequired && this.bookingPermission) {
        timeSelectorStep.props["show-back"] = false;
      }

      if (
        this.leadItem.bookable?.isScheduleRelated ||
        this.leadItem.bookable?.isTimePeriodRelated ||
        this.leadItem.bookable?.isLongRange
      ) {
        stepsToReturn.push(timeSelectorStep);
      }

      if (this.leadItem.bookable.priceType === "per-square-meter") {
        stepsToReturn.push(amountStep);
      }

      if (this.leadItem.bookable?.checkoutBookableIds?.length > 0) {
        stepsToReturn.push(additionalBookableOptions);
      }

      stepsToReturn.push(contactDetailsStep);

      if (
        this.activePaymentApps.length > 1 &&
        this.leadItem.bookable &&
        (this.leadItem.bookable.priceCategories.some((pC) => pC.priceEur > 0) ||
          this.leadItem.userPriceEur > 0)
      ) {
        stepsToReturn.push(paymentStep);
      }

      stepsToReturn.push({
        title: "Zusammenfassung",
      });

      return stepsToReturn;
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
        const { data } = await ApiAuthService.me(true);
        this.me = data.user;
        this.contactDetails.mail = this.me.id;
        this.contactDetails.name = this.me.firstName + " " + this.me.lastName;
        this.contactDetails.phone = this.me.phone;
        this.contactDetails.street = this.me.address;
        this.contactDetails.zipCode = this.me.zipCode;
        this.contactDetails.location = this.me.city;
        this.contactDetails.company = this.me.company;
      } catch (error) {
        this.me = null;
        this.contactDetails.mail = null;
        this.contactDetails.name = null;
        this.contactDetails.phone = null;
        this.contactDetails.street = null;
        this.contactDetails.zipCode = null;
        this.contactDetails.location = null;
        this.contactDetails.company = null;
      }
    },

    async getCheckoutPermissions() {
      try {
        await ApiCheckoutService.getCheckoutPermissions(
          this.tenant,
          this.leadItem.bookableId
        );
        this.preventBooking = false;
      } catch (error) {
        this.preventBooking = true;
        this.loginRequired = error.response.status === 401;
        this.bookingPermission = error.response.status !== 403;
      }
    },

    async fetchLeadBookable() {
      try {
        const response = await ApiBookablesService.getPublicBookable(
          this.leadItem.bookableId,
          this.tenant
        );

        if (response.data.id) {
          this.leadItem.bookable = response.data;
          if (
            this.leadItem.bookable.permittedRoles?.length > 0 ||
            this.leadItem.bookable.permittedUsers?.length > 0
          ) {
            this.loginRequired = true;
          }
        }
      } catch (error) {
        this.leadItem.bookable = null;
      }
    },

    async fetchSubsequentBookables() {
      try {
        for (const bookableItem of this.subsequentItems) {
          const { data } = await ApiBookablesService.getPublicBookable(
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
      const { data } = await ApiBookablesService.getPublicBookable(
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

      if (this.subsequentItems.find((i) => i.bookableId === item.bookableId)) {
        return;
      }

      this.subsequentItems.push(bookableItem);
      await this.validateItems();
    },

    async setBookingTime(event) {
      this.timeBegin = event.begin;
      this.timeEnd = event.end;
      await this.validateItems();
    },

    nextPage() {
      if (this.step < this.steps.length) {
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

    async fetchTenant() {
      try {
        const response = await ApiTenantService.getTenant(this.tenant);
        await this.updateTenant(response.data);
      } catch (error) {
        console.log("Error while fetching tenant");
      }
    },
  },

  watch: {
    async user() {
      try {
        await this.fetchMe();
        await this.validateItems();
      } catch (error) {
        this.me = null;
      }
    },
  },

  computed: {
    ...mapGetters({
      user: "user/getUser",
    }),
  },
};
</script>

<style scoped></style>

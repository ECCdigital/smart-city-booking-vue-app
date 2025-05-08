<template>
  <div>
    <v-container>
      <div>
        <v-stepper
          v-if="steps.length > 0"
          v-model="currentStep"
          alt-labels
          elevation="0"
          class="mb-10"
        >
          <v-stepper-header>
            <template v-for="(_step, index) in steps">
              <v-stepper-step
                v-if="currentStep"
                :key="`step-${index}`"
                :complete="stepComplete(index)"
                :step="index + 1"
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
          <v-col>
            <component
              :is="steps[currentStep - 1]?.component"
              v-bind="steps[currentStep - 1]?.props"
              v-on="steps[currentStep - 1]?.events"
            ></component>
          </v-col>
        </v-row>
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiTenantService from "@/services/api/ApiTenantService";
import CheckoutContactDetails from "@/views/BundleCheckout/CheckoutContactDetails.vue";
import CheckoutPaymentProvider from "@/views/BundleCheckout/CheckoutPaymentProvider.vue";
import CheckoutSeriesBooking from "@/views/BundleCheckout/CheckoutSeriesBooking.vue";
import CheckoutGroupBookingSummary from "@/views/BundleCheckout/CheckoutGroupBookingSummary.vue";
import { mapGetters } from "vuex";
import ApiCouponService from "@/services/api/ApiCouponService";

export default {
  name: "CheckoutGroupBooking",
  components: {
    CheckoutContactDetails,
    CheckoutPaymentProvider,
    CheckoutSeriesBooking,
    CheckoutGroupBookingSummary: CheckoutGroupBookingSummary,
  },
  data() {
    return {
      currentStep: 1,
      isSubmitting: false,
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
      tenantId: null,
      bookingAttempts: [],
      me: null,
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
      activePaymentApps: [],
      selectedPaymentApp: null,

      coupon: null,

      // First booking data
      dateBeginModel: null,
      dateEndModel: null,
      timeBeginModel: null,
      timeEndModel: null,

      // Series booking data
      startDateMenu: false,
      endDateMenu: false,
      seriesStartDate: null,
      seriesEndDate: null,
      seriesFrequency: "weekly",
      frequencyOptions: [{ text: "Wöchentlich", value: "weekly" }],

      headers: [
        { text: "Startzeit", value: "timeBegin" },
        { text: "Endzeit", value: "timeEnd" },
        { text: "Preis", value: "price" },
        { text: "Buchbar", value: "valid" },
        { text: "Aktionen", value: "actions", sortable: false },
      ],
    };
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
    }),
    steps() {
      return this.createSteps();
    },
  },
  methods: {
    createSteps() {
      const seriesBookingStep = {
        title: "Serie erstellen",
        component: CheckoutSeriesBooking,
        props: {
          leadItem: this.leadItem,
          bookingAttempts: this.bookingAttempts,
          dateBeginModel: this.dateBeginModel,
          dateEndModel: this.dateEndModel,
          timeBeginModel: this.timeBeginModel,
          timeEndModel: this.timeEndModel,
          firstBookingDate: this.seriesStartDate,
        },
        events: {
          back: this.backToSingleBooking,
          "generate-series-bookings": this.generateSeriesBookings,
          "remove-booking-attempt": this.removeBookingAttempt,
          "validate-and-continue": this.validateAndContinue,
          "change-booking-time": this.changeBookingTime,
        },
      };

      const contactDetailsStep = {
        title: "Kontaktdaten",
        component: CheckoutContactDetails,
        props: {
          leadItem: this.leadItem,
          me: this.me,
          contactDetails: this.contactDetails,
        },
        events: {
          back: () => (this.currentStep--),
          submit: () => (this.currentStep++),
        },
      };

      const paymentStep = {
        title: "Zahlungsmethode",
        component: CheckoutPaymentProvider,
        props: {
          activePaymentApps: this.activePaymentApps,
        },
        events: {
          back: () => (this.currentStep--),
          submit: this.setPaymentApp,
        },
      };

      const summaryStep = {
        title: "Zusammenfassung",
        component: CheckoutGroupBookingSummary,
        props: {
          bookingAttempts: this.bookingAttempts,
          contactDetails: this.contactDetails,
          activePaymentApps: this.activePaymentApps,
          selectedPaymentApp: this.selectedPaymentApp,
          isSubmitting: this.isSubmitting,
          coupon: this.coupon,
        },
        events: {
          back: () => (this.currentStep--),
          "perform-checkout": this.performGroupCheckout,
          "redeem-coupon": this.redeemCoupon,
          "remove-coupon": this.removeCoupon,
        },
      };

      const steps = [seriesBookingStep, contactDetailsStep];

      if (this.activePaymentApps.length > 1) {
        steps.push(paymentStep);
      }

      steps.push(summaryStep);

      return steps;
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
        await this.validateItems(this.bookingAttempts);
      }
    },

    async removeCoupon() {
      this.coupon = null;
      await this.validateItems(this.bookingAttempts);
    },

    stepComplete(index) {
      return this.currentStep > index + 1;
    },

    backToSingleBooking() {
      this.$router.push({
        name: "checkout",
        query: {
          id: this.leadItem.bookableId,
          tenant: this.tenantId,
        },
      });
    },

    async generateSeriesBookings(data) {
      this.bookingAttempts = [];

      this.seriesStartDate = data.seriesStartDate;
      this.seriesEndDate = data.seriesEndDate;
      this.seriesFrequency = data.seriesFrequency;

      const startDate = new Date(this.seriesStartDate);
      const endDate = new Date(this.seriesEndDate);

      // Add the first booking
      const firstBookingDate = new Date(this.seriesStartDate);
      const [firstHours, firstMinutes] = this.timeBeginModel
        .split(":")
        .map(Number);
      const [endHours, endMinutes] = this.timeEndModel.split(":").map(Number);

      const firstTimeBegin = new Date(this.dateBeginModel);
      firstTimeBegin.setHours(firstHours, firstMinutes, 0, 0);

      const firstTimeEnd = new Date(this.dateEndModel);
      firstTimeEnd.setHours(endHours, endMinutes, 0, 0);

      const attempts = [];

      const firstBookingAttempt = {
        bookableItems: [{ ...this.leadItem }],
        timeBegin: firstTimeBegin.getTime(),
        timeEnd: firstTimeEnd.getTime(),
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      };

      attempts.push(firstBookingAttempt);

      // Generate dates based on frequency
      const dates = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Skip the first booking date if it's in the series range
        if (currentDate.toDateString() !== firstBookingDate.toDateString()) {
          dates.push(new Date(currentDate));
        }

        // Add days based on frequency
        if (this.seriesFrequency === "weekly") {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
      // Calculate the date offset
      const dateOffset =
        new Date(this.dateEndModel).getDate() -
        new Date(this.dateBeginModel).getDate();

      for (const date of dates) {
        const timeBegin = new Date(date);
        timeBegin.setHours(firstHours, firstMinutes, 0, 0);

        const timeEnd = new Date(date);
        timeEnd.setDate(timeEnd.getDate() + dateOffset);
        timeEnd.setHours(endHours, endMinutes, 0, 0);

        const bookingAttempt = {
          bookableItems: [{ ...this.leadItem }],
          timeBegin: timeBegin.getTime(),
          timeEnd: timeEnd.getTime(),
          regularPriceEur: null,
          userPriceEur: null,
          regularGrossPriceEur: null,
          userGrossPriceEur: null,
        };
        attempts.push(bookingAttempt);
      }
      await this.validateItems(attempts);
      this.bookingAttempts = attempts;
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
      }
    },

    async fetchLeadBookable() {
      try {
        const response = await ApiBookablesService.getPublicBookable(
          this.leadItem.bookableId,
          this.tenantId
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

    async fetchActivePaymentApps() {
      try {
        const response = await ApiTenantService.getTenantActivePaymentApps(
          this.tenantId
        );
        this.activePaymentApps = response.data;

        if (this.activePaymentApps.length === 1) {
          this.selectedPaymentApp = this.activePaymentApps[0].id;
        }
      } catch (error) {
        console.log("Error while fetching active payment apps");
      }
    },

    removeBookingAttempt(index) {
      this.bookingAttempts.splice(index, 1);
    },

    async validateAndContinue() {
      await this.validateItems(this.bookingAttempts);

      const allValid = this.bookingAttempts.every((attempt) =>
        attempt.bookableItems.every((item) => item.valid)
      );

      if (allValid) {
        this.currentStep++;
      }
    },

    setPaymentApp(app) {
      this.selectedPaymentApp = app;
      this.currentStep++;
    },

    async validateItems(bookingAttempts) {
      for (const bookingAttempt of bookingAttempts) {
        for (const item of bookingAttempt.bookableItems) {
          if (
            (item.bookable?.isScheduleRelated ||
              item.bookable?.isTimePeriodRelated ||
              item.bookable?.isLongRange) &&
            (bookingAttempt.timeBegin == null || bookingAttempt.timeEnd == null)
          ) {
            item.valid = null;
            delete item.error;
          } else {
            try {
              const response = await ApiCheckoutService.validateCheckoutItem(
                this.tenantId,
                item,
                bookingAttempt.timeBegin,
                bookingAttempt.timeEnd,
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
              item.regularGrossPriceEur = null;
              item.userGrossPriceEur = null;

              item.valid = false;
              item.error = error.response.data;
            }
          }
        }

        bookingAttempt.valid = bookingAttempt.bookableItems.every(
          (item) => item.valid
        );
        bookingAttempt.regularPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.regularPriceEur || 0),
          0
        );
        bookingAttempt.userPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.userPriceEur || 0),
          0
        );
        bookingAttempt.regularGrossPriceEur =
          bookingAttempt.bookableItems.reduce(
            (sum, item) => sum + (item.regularGrossPriceEur || 0),
            0
          );
        bookingAttempt.userGrossPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.userGrossPriceEur || 0),
          0
        );
        bookingAttempt.error = bookingAttempt.bookableItems.reduce(
          (acc, item) => {
            if (item.error) {
              acc.push(item.error);
            }
            return acc;
          },
          []
        );
      }
    },

    async performGroupCheckout() {
      this.isSubmitting = true;
      try {
        const response = await ApiCheckoutService.groupCheckout(
          this.tenantId,
          {
            contactData: this.contactDetails,
            bookingAttempts: this.bookingAttempts,
            paymentProvider: this.selectedPaymentApp,
          },
          false
        );

        if (response.status === 200) {
          await this.$router.push({
            path: "/checkout/status",
            query: {
              ids: response.data.bookingIds.join(","),
              tenant: this.tenantId,
            },
          });
        } else {
          throw new Error("Checkout service failed");
        }
      } catch (error) {
        console.error("Error during checkout:", error);
      } finally {
        this.isSubmitting = false;
      }
    },
    async changeBookingTime(data) {
      const { timeBegin, timeEnd } = data;
      this.setBookingTime(timeBegin, timeEnd);
      this.bookingAttempts = [];

      await this.$router.push({
        name: "checkout-group-booking",
        query: {
          id: this.leadItem.bookableId,
          tenant: this.tenantId,
          timeBegin: timeBegin,
          timeEnd: timeEnd,
        },
      });
    },
    setBookingTime(timestampBegin, timestampEnd) {
      const timeBegin = new Date(parseInt(timestampBegin));
      const timeEnd = new Date(parseInt(timestampEnd));

      this.dateBeginModel = timeBegin.toISOString().split("T")[0];
      this.dateEndModel = timeEnd.toISOString().split("T")[0];

      this.timeBeginModel = timeBegin.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      this.timeEndModel = timeEnd.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },

  async mounted() {
    this.tenantId = this.$route.query.tenant;
    this.leadItem.bookableId = this.$route.query.id;
    this.leadItem.amount = parseInt(this.$route.query.amount || 1);

    await this.fetchLeadBookable();
    await this.fetchMe();
    await this.fetchActivePaymentApps();

    if (this.$route.query.timeBegin && this.$route.query.timeEnd) {
      this.setBookingTime(
        this.$route.query.timeBegin,
        this.$route.query.timeEnd
      );
    }

    if (this.dateBeginModel) {
      this.seriesStartDate = this.dateBeginModel;
    } else {
      this.seriesStartDate = new Date().toISOString().split("T")[0];
    }

    const endDate = new Date(this.seriesStartDate);
    endDate.setMonth(endDate.getMonth() + 1);
    this.seriesEndDate = endDate.toISOString().split("T")[0];

    this.bookingAttempts = [];
  },
};
</script>

<style scoped></style>

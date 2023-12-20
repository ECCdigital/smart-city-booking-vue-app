<template>
  <v-container>
    <div v-if="bookable?.id && bookable?.isBookable && bookable?.isPublic">
      <v-stepper alt-labels elevation="0" class="mb-10" v-model="step">
        <v-stepper-header>
          <v-stepper-step step="1" :complete="step > 1">
            Verfügbarkeit
          </v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step step="2" :complete="step > 2">
            Anmeldung
          </v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step step="3" :complete="step > 3">
            Buchungsdetails
          </v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step step="4" :complete="step == 4">
            Zahlung
          </v-stepper-step>
        </v-stepper-header>
      </v-stepper>

      <v-row>
        <v-col class="col-12 col-md-7  order-1 order-md-0">
          <CheckoutValidation v-if="step === 1 && !bookable.isScheduleRelated && !bookable.isTimePeriodRelated && !bookable.isOpeningHoursRelated" :bookingAttempt="bookingAttempt" :bookable="bookable" @submit="nextPage"></CheckoutValidation>
          <CheckoutValidationScheduleRelated v-if="step === 1 && bookable.isScheduleRelated || step === 1 && bookable.isTimePeriodRelated" :bookable="bookable" :bookingAttempt="bookingAttempt" :bookings="bookings" @submit="nextPage"></CheckoutValidationScheduleRelated>
          <CheckoutSignin v-if="step === 2" :bookable="bookable" :me="me" @updateMe="fetchMe" @submit="nextPage" @back="previousPage"></CheckoutSignin>
          <CheckoutContactDetails v-if="step === 3" :bookingAttempt="bookingAttempt" :bookable="bookable" :is-submitting="isSubmitting" @submit="checkout" @back="previousPage"></CheckoutContactDetails>
        </v-col>
        <v-col class="col-12 col-md-5 order-0 order-md-1 ">
          <CheckoutDetails v-if="bookable?.id" :bookable="bookable" :bookingAttempt="bookingAttempt" :freeBooking="hasPermissionToFreeBooking" @redeemCoupon="validateCoupon"></CheckoutDetails>
        </v-col>
      </v-row>
    </div>
    <div v-else-if="bookable?.id && !bookable?.isBookable">
      <v-alert type="warning" text>
        Das von Ihnen gewählte Buchungsobjekt ist nicht buchbar.
      </v-alert>
    </div>
    <div v-else-if="bookable?.id && !bookable?.isPublic">
      <v-alert type="warning" text>
        Das von Ihnen gewählte Buchungsobjekt ist nicht verfügbar.
      </v-alert>
    </div>
    <div v-else>
      <v-alert type="warning" text>
        Das von Ihnen gewählte Buchungsobjekt existiert nicht.
      </v-alert>
    </div>
  </v-container>
</template>

<script>
import CheckoutValidation from "@/views/MultiCheckout/CheckoutValidation";
import CheckoutValidationScheduleRelated from "@/views/MultiCheckout/CheckoutValidationScheduleRelated";
import CheckoutDetails from "@/views/MultiCheckout/CheckoutDetails";
import CheckoutSignin from "@/views/MultiCheckout/CheckoutSignin";
import CheckoutContactDetails from "@/views/MultiCheckout/CheckoutContactDetails";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import ApiUserService from "@/services/api/ApiUsersService";
import ApiPaymentService from "@/services/api/ApiPaymentService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCouponService from "@/services/api/ApiCouponService";

export default {
  name: "MultiCheckout",
  components: {
    CheckoutValidation,
    CheckoutValidationScheduleRelated,
    CheckoutDetails,
    CheckoutSignin,
    CheckoutContactDetails
  },

  data() {
    return {
      isSubmitting: false,
      step: 1,
      inBookableId: null,
      inBookableTenant: null,
      bookable: null,
      bookingAttempt: {
        tenant: null,
        timeBegin: null,
        timeEnd: null,
        bookableIds: [],
        coupon: null,
        name: null,
        company: null,
        mail: null,
        phone: null,
        street: null,
        zipCode: null,
        location: null,
        comment: null,
      },
      bookings: [],
      me: null,
    };
  },

  computed: {
    totalPrice() {
      if (this.hasPermissionToFreeBooking) {
        return 0;
      }

      let price = this.calculateBookablePrice(this.bookable, this.bookingAttempt.timeBegin, this.bookingAttempt.timeEnd);

      if (this.bookable._populated?.relatedBookables) {
        this.bookable._populated.relatedBookables.forEach(rb => {
          price += this.calculateBookablePrice(rb, this.bookingAttempt.timeBegin, this.bookingAttempt.timeEnd);
        });
      }

      return price;
    },

    hasPermissionToFreeBooking() {
      return this.me?.permissions?.freeBookings === true;
    }
  },

  methods: {
    nextPage() {
      this.step++;
    },

    previousPage() {
      this.step--;
    },

    fetchBookable() {
      ApiBookablesService.getBookable(
        this.inBookableId,
        this.inBookableTenant,
        true
      ).then((response) => {
        this.bookable = response.data;

        this.bookingAttempt.tenant = this.bookable.tenant;
        this.bookingAttempt.bookableIds.push(this.bookable.id);
      });
    },

    fetchRelatedBookings() {
      ApiBookingService.getRelatedBookings(this.inBookableId, this.inBookableTenant, true, true, true).then(
        (response) => {
          this.bookings = response.data;
        }
      );
    },

    async validateCoupon(code) {
      try {
        const coupon = await ApiCouponService.getCoupon(this.bookingAttempt.tenant, code)
        this.bookingAttempt.coupon = coupon.data;
      } catch (e) {
        if (e.response.status === 404) {
          this.bookingAttempt.coupon = null;
        }
      }
    },

    fetchMe() {
      ApiAuthService.me(this.inBookableTenant, true).then((response) => {
        this.me = response.data;
        this.bookingAttempt.assignedUserId = this.me.id;
        this.bookingAttempt.mail = this.me.id;
        this.bookingAttempt.name = this.me.displayName;
      }).catch(() => {
        this.me = null;
        this.bookingAttempt.assignedUserId = null;
      });
    },

    calculateBookablePrice(bookable, timeBegin, timeEnd) {
      return CheckoutUtils.calculateBookablePrice(bookable, timeBegin, timeEnd);
    },

    checkout() {
      this.isSubmitting = true;
      ApiBookingService.checkoutBooking(this.bookingAttempt, false, this.inBookableTenant).then((response) => {
        if (response.status === 201) {
          this.isSubmitting = false;
          const booking = response.data;

          if (this.totalPrice > 0 && this.bookable.autoCommitBooking) {
            ApiPaymentService.payments(booking.id, this.inBookableTenant).then((res) => {
              const paymentUrl = res.data?.paymentUrl
              if (paymentUrl) {
                window.location.href = paymentUrl
              }
            })
          }
          else {
            this.$router.push({path: "/checkout/status", query: { id : booking.id, tenant: booking.tenant }})
          }
        }
        this.isSubmitting = false;
      }).catch((err) => {
        this.isSubmitting = false;
        console.log(err);
      });
    }
  },

  mounted() {
    this.inBookableId = this.$route.query.id;
    this.inBookableTenant = this.$route.query.tenant;
    this.fetchMe();
    this.fetchBookable();
    this.fetchRelatedBookings();
  },

};
</script>

<style scoped></style>

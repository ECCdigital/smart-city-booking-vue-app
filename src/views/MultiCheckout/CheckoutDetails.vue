<template>
  <div>
    <v-card outlined class="rounded-sm">
      <v-card-text>
        <h2 class="mb-7">Ihre Buchung</h2>

        <v-row no-gutters>
          <v-col>
            <p class="mb-0 font-weight-bold">
              {{ bookable.title }}
            </p>
            <small
              v-if="bookable.isScheduleRelated || bookable.isTimePeriodRelated"
            >
              Von {{ dateToLocaleString(bookingAttempt.timeBegin) }} bis
              {{ dateToLocaleString(bookingAttempt.timeEnd) }}
            </small>
          </v-col>
          <v-col class="col-auto font-weight-bold">
            {{
              formatCurrency(
                calculateBookablePrice(
                  bookable,
                  bookingAttempt.timeBegin,
                  bookingAttempt.timeEnd
                )
              )
            }}
            <span
              v-if="
                (bookable.isScheduleRelated || bookable.isTimePeriodRelated) &&
                (!bookingAttempt.timeBegin || !bookingAttempt.timeEnd) &&
                totalPrice > 0
              "
              >(Buchungszeitraum wählen)</span
            >
          </v-col>
        </v-row>
        <v-row no-gutters v-if="bookingAttempt.coupon">
          <v-col>
            <small>
              <p class="mb-0 font-weight-bold">Gutschein</p>
              <span>
                {{ bookingAttempt.coupon.description }}
              </span>
            </small>
          </v-col>
          <v-col class="col-auto font-weight-bold">
            -{{ bookingAttempt.coupon.discount }}
            {{ bookingAttempt.coupon.type === "percentage" ? "%" : "€" }}
          </v-col>
        </v-row>

        <v-divider class="mt-5 mb-3"></v-divider>
        <v-row no-gutters>
          <v-col class="font-weight-bold"> Gesamt </v-col>
          <v-col class="col-auto font-weight-bold">
            {{ formatCurrency(totalPrice) }}
          </v-col>
        </v-row>
        <div class="text-right" v-if="freeBooking">
          <small>Sie sind für kostenfreie Buchungen berechtigt.</small>
        </div>
      </v-card-text>
      <v-divider class="mt-5"></v-divider>
      <v-expansion-panels flat>
        <v-expansion-panel>
          <v-expansion-panel-header class="px-4 font-weight-bold">
            Gutschein einlösen
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-row>
              <v-col cols="8">
                <v-text-field
                  v-model="giftCode"
                  placeholder="Gutscheincode"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-btn
                  block
                  large
                  outlined
                  @click="redeemCoupon"
                  :disabled="!!bookingAttempt.coupon"
                >
                  Gutschein einlösen
                </v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>
  </div>
</template>

<script>
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";

export default {
  name: "CheckoutDetails",

  props: ["bookable", "bookingAttempt", "freeBooking"],

  data() {
    return {
      giftCode: null,
    };
  },

  methods: {
    calculateBookablePrice(bookable, timeBegin, timeEnd) {
      return CheckoutUtils.calculateBookablePrice(
        bookable,
        timeBegin,
        timeEnd,
        this.bookingAttempt.coupon
      );
    },

    formatCurrency: function (value) {
      return CheckoutUtils.formatCurrency(value);
    },

    formatDateTime: function (value) {
      return CheckoutUtils.formatDateTime(value);
    },

    dateToLocaleString: function (value) {
      return CheckoutUtils.dateToLocaleString(value);
    },
    redeemCoupon() {
      this.$emit("redeemCoupon", this.giftCode);
      this.giftCode = null;
    },
  },

  computed: {
    totalPrice() {
      if (this.freeBooking) {
        return 0;
      }

      let price = this.calculateBookablePrice(
        this.bookable,
        this.bookingAttempt.timeBegin,
        this.bookingAttempt.timeEnd
      );

      return price;
    },

    totalTax() {
      // if totalPrice is number, calculate tax
      if (typeof this.totalPrice === "number") {
        return this.totalPrice * 0.19;
      }
      return null;
    },
  },
};
</script>

<style scoped></style>

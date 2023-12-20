<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
    </div>

    <h1>Zusammenfassung</h1>
    <p>
      Bitte prüfen Sie Ihre Buchung und stellen Sie sicher, dass alle Daten korrekt
      sind.
    </p>

    <h2 class="mt-10 mb-2">Kontaktdaten</h2>
    <v-divider class="mb-6"></v-divider>
    <v-row>
      <v-col class="col-2 font-weight-bold text-right"> Name: </v-col>
      <v-col>
        {{ contactDetails.name }}
      </v-col>
    </v-row>
    <v-row>
      <v-col class="col-2 font-weight-bold text-right"> Firma: </v-col>
      <v-col>
        {{ contactDetails.company }}
      </v-col>
    </v-row>
    <v-row>
      <v-col class="col-2 font-weight-bold text-right"> E-Mail-Adresse: </v-col>
      <v-col>
        {{ contactDetails.mail }}
      </v-col>
    </v-row>
    <v-row>
      <v-col class="col-2 font-weight-bold text-right"> Telefon: </v-col>
      <v-col>
        {{ contactDetails.phone }}
      </v-col>
    </v-row>
    <v-row>
      <v-col class="col-2 font-weight-bold text-right"> Adresse: </v-col>
      <v-col>
        {{ contactDetails.street }}<br />
        {{ contactDetails.zipCode }}, {{ contactDetails.location }}
      </v-col>
    </v-row>

    <h2 class="mt-10 mb-2">Buchungsobjekte</h2>
    <v-divider class="mb-6"></v-divider>
    <v-row>
      <v-col class="col-6"> Name </v-col>
      <v-col class="text-right"> Anzahl </v-col>
      <v-col class="text-right"> Preis </v-col>
    </v-row>
    <v-row v-for="(item, index) in [leadItem, ...subsequentItems]" :key="index">
      <v-col v-if="item.bookable" class="col-6"> {{ item.bookable.title }} </v-col>
      <v-col v-if="item.bookable" class="text-right"> {{ item.amount }} </v-col>
      <v-col v-if="item.bookable" class="text-right">
        {{
          formatCurrency(
            calculateBookablePrice(
              item.bookable,
              item.amount,
              timeBegin,
              timeEnd,
              coupon
            )
          )
        }}
      </v-col>
    </v-row>
    <v-row>
      <v-col></v-col>
      <v-col>
        {{ formatCurrency(totalPrice) }}
      </v-col>
    </v-row>
  </div>
</template>

<script>
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";

export default {
  name: "BookingSummary",

  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    subsequentItems: {
      type: Array,
    },
    timeBegin: {
      type: Number,
    },
    timeEnd: {
      type: Number,
    },
    contactDetails: {
      type: Object,
    },
    coupon: {
      type: Object,
    },
  },

  data() {
    return {};
  },

  methods: {
    back() {
      this.$emit("back");
    },

    submit() {
      this.$emit("submit");
    },

    dateToLocaleString: function (value) {
      return CheckoutUtils.dateToLocaleString(value);
    },

    formatCurrency: function (value) {
      return CheckoutUtils.formatCurrency(value);
    },

    calculateBookablePrice(bookable, amount, timeBegin, timeEnd, coupon) {
      return CheckoutUtils.calculateBookablePrice(
        bookable,
        amount,
        timeBegin,
        timeEnd,
        coupon
      );
    },
  },
  computed: {
    totalPrice() {
      let price = 0;
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        price += CheckoutUtils.calculateBookablePrice(
          item.bookable,
          item.amount,
          this.timeBegin,
          this.timeEnd,
          this.coupon
        );
      }

      return price;
    },

    allItemsValid() {
      return (
        this.leadItem.valid &&
        this.subsequentItems.every(
          (item) => item.valid === true || item.valid === null
        )
      );
    },

    isAutoCommit() {
      return (
        this.leadItem.bookable.autoCommitBooking &&
        this.subsequentItems.every((item) => item.bookable.autoCommitBooking)
      );
    },

    bookingDuration() {
      return CheckoutUtils.bookingDuration(this.timeBegin, this.timeEnd);
    },
  },

  async mounted() {},
};
</script>

<style scoped></style>

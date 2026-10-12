<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn v-if="showBack" outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="isNextButtonDisabled"
        color="primary"
        class="px-10"
        small
        @click="submit"
      >
        Weiter
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
    <h2>Anzahl</h2>
    <p>Bitte wählen Sie die Anzahl an Quadratmetern, die Sie buchen möchten.</p>
    <p class="text-caption amount-limit" v-if="amountLimit.perBooking">
      {{
        $t("checkout.amountLimit.perBookingCaption", {
          max: maxSquares,
          unit: unit,
        })
      }}
    </p>
    <p class="text-caption amount-limit" v-else-if="maxSquares">
      Maximal verfügbar:
      {{ maxSquares }}
    </p>
    <v-row class="mt-5" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card outlined class="rounded-sm">
          <v-card-text class="text-center">
            <!-- Textfeld mit Minus/Plus-Buttons -->
            <v-text-field
              class="mb-3 mt-3"
              type="number"
              suffix="m²"
              outlined
              filled
              dense
              hide-details="auto"
              :value="leadItem.amount"
              @change="setItemAmount($event)"
              :rules="squareMeterRules"
              :error-messages="squareMeterErrors"
            >
              <template v-slot:prepend>
                <v-btn icon x-small @click="decreaseItemAmount()">
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
              </template>
              <template v-slot:append-outer>
                <v-btn icon x-small @click="increaseItemAmount()">
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { amountUnit, bookingAmountLimit } from "@/utils/bookingAmountLimit";

export default {
  name: "CheckoutAmountSelector",
  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    showBack: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    isNextButtonDisabled() {
      return !this.leadItem.valid;
    },
    // The stricter of the capacity and the Höchstmenge je Buchung; null when
    // neither limits the booking.
    amountLimit() {
      return bookingAmountLimit(this.leadItem.bookable);
    },
    maxSquares() {
      return this.amountLimit.max;
    },
    unit() {
      return amountUnit(this.leadItem.bookable);
    },
    squareMeterRules() {
      return [
        (value) =>
          value && value > 0 ? true : "Bitte einen Wert > 0 eingeben",
        (value) => {
          if (this.maxSquares === null || value <= this.maxSquares) {
            return true;
          }
          if (this.amountLimit.perBooking) {
            return this.$t("checkout.amountLimit.perBooking", {
              title: this.leadItem.bookable?.title,
              max: this.maxSquares,
              unit: this.unit,
            });
          }
          return `Maximal sind ${this.maxSquares} Quadratmeter möglich`;
        },
      ];
    },
    squareMeterErrors() {
      return this.squareMeterRules
        .map((rule) =>
          typeof rule === "function" ? rule(this.leadItem.amount) : true
        )
        .filter((result) => result !== true);
    },
  },
  methods: {
    submit() {
      this.$emit("submit");
    },
    back() {
      this.$emit("back");
    },
    setItemAmount(amount) {
      this.leadItem.amount = amount;
    },
    decreaseItemAmount() {
      if (this.leadItem.amount > 1) {
        this.leadItem.amount--;
      }
    },
    increaseItemAmount() {
      if (this.leadItem.amount < this.maxSquares || this.maxSquares === null) {
        this.leadItem.amount++;
      }
    },
  },
  watch: {
    "leadItem.amount": {
      handler() {
        this.$emit("validate-items");
      },
      immediate: true,
    },
  },
};
</script>

<style scoped></style>

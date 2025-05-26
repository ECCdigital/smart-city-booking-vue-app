<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
    </div>

    <v-card outlined class="rounded-sm mb-5">
      <v-card-text>
        <h2 class="mb-7">Ihre Kontaktdaten</h2>

        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> Name: </v-col>
          <v-col> {{ contactDetails.name }} </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> Firma: </v-col>
          <v-col> {{ contactDetails.company }} </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> Adresse: </v-col>
          <v-col>
            {{ contactDetails.street }}<br />
            {{ contactDetails.zipCode }}
            {{ contactDetails.location }}</v-col
          >
        </v-row>
        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> E-Mail-Adresse: </v-col>
          <v-col>
            {{ contactDetails.mail }}
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> Telefon: </v-col>
          <v-col>
            {{ contactDetails.phone }}
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col class="font-weight-bold col-md-2"> Hinweise: </v-col>
          <v-col>
            {{ contactDetails.comment }}
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card outlined class="rounded-sm mb-5">
      <v-card-text>
        <h2 class="mb-7">Ihre Buchungen</h2>

        <v-simple-table class="rounded-sm">
          <template v-slot:default>
            <thead class="rounded-sm">
              <tr>
                <th>Zeitraum</th>
                <th>Details / Artikel:</th>
                <th class="text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(attempt, index) in bookingAttempts">
                <tr :key="index">
                  <td>
                    <span v-if="attempt.timeBegin && attempt.timeEnd">
                      {{ formatDateTime(attempt.timeBegin) }} –
                      {{ formatDateTime(attempt.timeEnd) }}
                    </span>
                  </td>
                  <td>
                    <div
                      v-for="(bookableItem, itemIndex) in attempt.bookableItems"
                      :key="itemIndex"
                    >
                      <div v-if="bookableItem.valid">
                        {{ bookableItem.bookable?.title }} ×{{
                          bookableItem.amount || 1
                        }}
                        ({{ formatCurrency(bookableItem.userPriceEur) }})
                      </div>
                      <div v-else-if="bookableItem.error" class="red--text">
                        Fehler: {{ bookableItem.error }}
                      </div>
                    </div>
                  </td>
                  <td class="text-right">
                    <span
                      class="text-decoration-line-through"
                      v-if="
                        getAttemptRegularPrice(attempt) >
                        getAttemptTotalPrice(attempt)
                      "
                    >
                      <small>{{
                        formatCurrency(getAttemptRegularPrice(attempt))
                      }}</small>
                    </span>
                    {{ formatCurrency(getAttemptTotalPrice(attempt)) }}
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr v-if="totalPriceOff > 0">
                <td colspan="2" class="text-right">Ihr Rabatt</td>
                <td colspan="2" class="text-right">
                  - {{ formatCurrency(totalPriceOff) }}
                </td>
              </tr>
              <tr>
                <td colspan="2" class="text-right font-weight-bold">
                  Gesamt (netto)
                </td>
                <td class="text-right font-weight-bold">
                  {{ formatCurrency(totalPrice) }}
                </td>
              </tr>
              <tr v-if="hasValueAddedTax">
                <td colspan="2" class="text-right">zzgl. MwSt.</td>
                <td class="text-right">
                  {{ formatCurrency(totalGrossPrice - totalPrice) }}
                </td>
              </tr>
              <tr>
                <td colspan="2" class="text-right font-weight-bold">
                  Gesamt (brutto)
                </td>
                <td class="text-right font-weight-bold">
                  {{ formatCurrency(totalGrossPrice) }}
                </td>
              </tr>
            </tfoot>
          </template>
        </v-simple-table>
      </v-card-text>
    </v-card>

    <v-card-text v-if="!!coupon">
      <v-row no-gutters>
        <v-col class="col font-weight-bold">
          Gutschein: {{ coupon.description }}
          <v-btn text x-small color="primary" class="ml-2" @click="removeCoupon"
            >Entfernen</v-btn
          >
        </v-col>
        <v-col class="col-auto">
          - {{ coupon.discount }}
          {{ coupon.type === "percentage" ? "%" : "€" }}
        </v-col>
      </v-row>
    </v-card-text>

    <v-alert
        v-if="couponError"
        type="error"
        border="left"
        class="mt-5"
        elevation="2"
        icon="mdi-alert-circle"
    >
      <template v-slot:default>
        {{ couponError }}
      </template>
    </v-alert>

    <v-expansion-panels flat v-if="!coupon">
      <v-expansion-panel>
        <v-expansion-panel-header>
          Gutschein einlösen
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-text-field
            v-model="couponCode"
            placeholder="Gutscheincode"
            @keyup.enter="redeemCoupon"
          ></v-text-field>

          <div class="d-flex">
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              elevation="0"
              @click="redeemCoupon"
              :disabled="!!this.coupon"
              >Einlösen</v-btn
            >
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-card class="mt-5 rounded-sm" outlined v-if="!isAutoCommit">
      <v-card-text>
        <strong>Manuelle Freigabe Ihrer Buchung:</strong> Diese Buchung enthält
        Objekte, die manuell freigegeben werden müssen. Sie können die Buchung
        jetzt abschließen und wir werden Sie per E-Mail benachrichtigen, sobald
        die Buchung freigegeben wurde.
      </v-card-text>
    </v-card>

    <div class="d-flex mt-5">
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        large
        @click="performCheckout"
        :loading="isSubmitting"
        :disabled="!allItemsValid"
        block
      >
        <span v-if="isAutoCommit">Buchung abschließen</span>
        <span v-else>Buchungsanfrage senden</span>
      </v-btn>
    </div>
  </div>
</template>

<script>
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";

export default {
  name: "CheckoutSummary",
  props: {
    bookingAttempts: {
      type: Array,
      required: true,
    },
    contactDetails: {
      type: Object,
      required: true,
    },
    activePaymentApps: {
      type: Array,
      required: true,
    },
    selectedPaymentApp: {
      type: String,
      default: null,
    },
    isSubmitting: {
      type: Boolean,
      default: false,
    },
    coupon: {
      type: Object,
    },
    couponError: {
      type: String,
    },
  },
  data() {
    return {
      couponCode: "",
    };
  },
  methods: {
    formatDateTime(timestamp) {
      return checkoutUtils.dateToLocaleString(timestamp);
    },
    formatCurrency(value) {
      return checkoutUtils.formatCurrency(value);
    },
    getSelectedPaymentAppTitle() {
      const app = this.activePaymentApps.find(
        (app) => app.id === this.selectedPaymentApp
      );
      return app ? app.title : "";
    },
    performCheckout() {
      this.$emit("perform-checkout");
    },
    back() {
      this.$emit("back");
    },
    getAttemptTotalPrice(attempt) {
      let price = 0;
      if (attempt.bookableItems) {
        for (const item of attempt.bookableItems) {
          if (item.valid && item.userPriceEur) {
            price += item.userPriceEur;
          }
        }
      }
      return price;
    },
    getAttemptRegularPrice(attempt) {
      let price = 0;
      if (attempt.bookableItems) {
        for (const item of attempt.bookableItems) {
          if (item.valid && item.regularPriceEur) {
            price += item.regularPriceEur;
          }
        }
      }
      return price;
    },
    redeemCoupon() {
      this.$emit("redeem-coupon", this.couponCode);
      this.couponCode = null;
    },
    removeCoupon() {
      this.$emit("remove-coupon");
    },
  },
  computed: {
    totalPrice() {
      let price = 0;
      for (const attempt of this.bookingAttempts) {
        price += attempt.userPriceEur || 0;
      }
      return price;
    },
    totalGrossPrice() {
      let price = 0;
      for (const attempt of this.bookingAttempts) {
        price += attempt.userGrossPriceEur || 0;
      }
      return price;
    },
    hasValueAddedTax() {
      for (const attempt of this.bookingAttempts) {
        if (attempt.bookableItems) {
          for (const item of attempt.bookableItems) {
            if (
              item.bookable &&
              item.bookable.priceValueAddedTax &&
              item.bookable.priceValueAddedTax > 0
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    isAutoCommit() {
      return this.bookingAttempts.every((attempt) =>
        attempt.bookableItems.every((item) => item.bookable.autoCommitBooking)
      );
    },
    allItemsValid() {
      return this.bookingAttempts.every((attempt) =>
        attempt.bookableItems.every((item) => item.valid)
      );
    },
    totalPriceOff() {
      let off = 0;
      for (const item of this.bookingAttempts) {
        if (item.regularPriceEur > item.userPriceEur) {
          off += item.regularPriceEur - item.userPriceEur;
        }
      }
      return off;
    },
  },
};
</script>
<style scoped>
.theme--light.v-data-table thead th {
  background-color: transparent !important;
  &:first-child {
    border-radius: 0 0 0 0;
  }
  &:last-child {
    border-radius: 0 0 0 0;
  }
}
.theme--dark.v-data-table thead th {
  background-color: transparent !important;
  &:first-child {
    border-radius: 0 0 0 0;
  }
  &:last-child {
    border-radius: 0 0 0 0;
  }
}

.v-data-table table tr:last-child:hover td:first-child {
  border-bottom-left-radius: 0 !important;
}

.v-data-table table tr:last-child:hover td:last-child {
  border-bottom-right-radius: 0 !important;
}
</style>

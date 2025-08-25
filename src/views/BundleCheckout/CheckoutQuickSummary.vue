<template>
  <div>
    <v-btn outlined small class="mb-5" @click="back" v-if="finalCheck">
      <v-icon left small>mdi-arrow-left</v-icon>
      Zurück
    </v-btn>

    <v-card v-if="finalCheck" outlined class="rounded-sm mb-5">
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

    <v-card outlined class="rounded-sm" :loading="validating">
      <v-card-text>
        <h2 class="mb-7">Ihre Buchung</h2>

        <div
          v-if="
            leadItem.bookable.isScheduleRelated ||
            leadItem.bookable.isTimePeriodRelated ||
            leadItem.bookable.isLongRange
          "
        >
          <h3 class="mb-1 mt-5">Zeitraum</h3>
          <v-divider class="mb-3"></v-divider>
          <v-row no-gutters>
            <v-col class="font-weight-bold col-md-2"> Beginn: </v-col>
            <v-col class="text-right">
              {{ dateToLocaleString(timeBegin) }}
            </v-col>
          </v-row>
          <v-row no-gutters>
            <v-col class="font-weight-bold col-md-2"> Ende: </v-col>
            <v-col class="text-right">
              {{ dateToLocaleString(timeEnd) }}
            </v-col>
          </v-row>

          <v-row no-gutters>
            <v-col class="font-weight-bold col-md-2"> Dauer: </v-col>
            <v-col class="text-right" v-if="leadItem.bookable.isLongRange">
              {{ bookingDurationLongRange }}
            </v-col>
            <v-col
              class="text-right"
              v-else-if="!leadItem.bookable.isLongRange"
            >
              {{ bookingDuration }}
            </v-col>
          </v-row>
        </div>

        <h3 class="mb-1 mt-5">Buchungsobjekte</h3>
        <v-divider class="mb-3"></v-divider>
        <v-row no-gutters>
          <v-col class="col-6"><small>Name</small></v-col>
          <v-col class="col-4 text-center"><small>Anzahl</small></v-col>
          <v-col class="col-2 text-right"><small>Preis</small></v-col>
        </v-row>
        <v-row
          v-for="item in [leadItem, ...subsequentItems]"
          :class="item.valid === false ? 'red--text' : ''"
          class="mt-2"
          no-gutters
        >
          <v-col class="col-6">
            <v-icon v-if="item.valid === false" color="red" small
              >mdi-exclamation</v-icon
            >
            <span class="font-weight-bold">{{ item.bookable.title }}</span>
            <span v-if="item.valid === null" class="font-italic">
              (Prüfen...)
            </span>
          </v-col>
          <v-col class="col-4">
            <v-text-field
              class="centered-input"
              dense
              flat
              hide-details
              :suffix="
                item.bookable.priceType === 'per-square-meter' ? 'm²' : ''
              "
              :value="item.amount"
              @change="setItemAmount(item.bookableId, $event)"
              :disabled="item.mandatory"
            >
              <template v-slot:prepend>
                <v-btn
                  icon
                  x-small
                  @click="decreaseItemAmount(item)"
                  :disabled="item.mandatory"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
              </template>

              <template v-slot:append-outer>
                <v-btn
                  icon
                  x-small
                  @click="increaseItemAmount(item)"
                  :disabled="item.mandatory"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
          <v-col class="text-right">
            <span
              class="text-decoration-line-through"
              v-if="item.regularPriceEur > item.userPriceEur"
            >
              <small>{{ formatCurrency(item.regularPriceEur) }}</small>
            </span>
            {{ formatCurrency(item.userPriceEur) }}
          </v-col>
          <v-col v-if="!item.valid" class="col-12 red--text">
            <small>
              {{ item.error }}
            </small>
          </v-col>
        </v-row>

        <v-divider class="mt-7 mb-3"></v-divider>

        <v-row no-gutters v-if="totalPriceOff > 0" class="">
          <v-col class="font-weight-bold"> Ihr Rabatt </v-col>
          <v-col class="text-right col-md-3 font-weight-bold">
            - {{ formatCurrency(totalPriceOff) }}
          </v-col>
        </v-row>
        <v-row no-gutters v-if="hasValueAddedTax">
          <v-col class="font-weight-bold"> Gesamt (netto): </v-col>
          <v-col class="text-right col-md-3 font-weight-bold">
            <span v-if="allItemsValid">{{ formatCurrency(totalPrice) }}</span>
          </v-col>
        </v-row>
        <v-row no-gutters v-if="hasValueAddedTax">
          <v-col> zzgl. MwSt: </v-col>
          <v-col class="text-right col-md-3">
            <span v-if="allItemsValid">{{
              formatCurrency(totalGrossPrice - totalPrice)
            }}</span>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="font-weight-bold"> Gesamt: </v-col>
          <v-col
            class="text-right col-md-3 font-weight-bold"
            style="font-size: large"
          >
            <span v-if="allItemsValid">{{
              formatCurrency(totalGrossPrice)
            }}</span>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider class="mt-5"></v-divider>
      <v-card-text v-if="!!coupon">
        <v-row no-gutters>
          <v-col class="col font-weight-bold">
            Gutschein: {{ coupon.description }}
            <v-btn
              text
              x-small
              color="primary"
              class="ml-2"
              @click="removeCoupon"
              >Entfernen</v-btn
            >
          </v-col>
          <v-col class="col-auto">
            - {{ coupon.discount }}
            {{ coupon.type === "percentage" ? "%" : "€" }}
          </v-col>
        </v-row>
      </v-card-text>
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
    </v-card>

    <v-card
      class="mt-5 rounded-sm"
      :color="$vuetify.theme.dark ? 'red' : 'red lighten-4'"
      outlined
      v-if="allItemsValid === false"
    >
      <v-card-text>
        <strong>Buchung nicht möglich:</strong> Leider können Sie die Buchung
        nicht abschließen, da einige Buchungsobjekte nicht verfügbar sind. Bitte
        überprüfen Sie Ihre Buchung und versuchen Sie es erneut.
      </v-card-text>
    </v-card>

    <v-card class="mt-5 rounded-sm" outlined v-if="freeBookingAllowed">
      <v-card-text>
        <strong>Kostenfreie Buchung</strong> Sie sind berechtigt, diese Buchung
        kostenfrei abzuschließen. Wenn Sie dennoch eine kostenpflichtige Buchung
        wünschen, können Sie dies tun, indem Sie den Schalter unten aktivieren.

        <v-switch
          v-model="bookWithPrice"
          @change="setBookWithPrice($event)"
          label="Kostenpflichtig buchen"
          class="mt-4"
        >
        </v-switch>
      </v-card-text>
    </v-card>

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
        v-if="finalCheck"
        color="primary"
        large
        @click="checkout()"
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
import CheckoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import ApiPaymentService from "@/services/api/ApiPaymentService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";

export default {
  name: "CheckoutQuickSummary",

  props: {
    trace: {
      type: Boolean,
    },
    finalCheck: {
      type: Boolean,
      default: false,
    },
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
    tenant: {
      type: String,
    },
    coupon: {
      type: Object,
    },
    me: {
      type: Object,
    },
    selectedPaymentApp: {
      type: String,
    },
    freeBookingAllowed: {
      type: Boolean,
      default: false,
    },
    initialBookWithPrice: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      validating: false,
      isSubmitting: false,
      couponCode: null,
      bookWithPrice: this.initialBookWithPrice,
    };
  },

  methods: {
    setBookWithPrice(value) {
      this.bookWithPrice = value;
      this.$emit("update:initialBookWithPrice", value);
      this.$emit("set-book-with-price", value);
    },

    dateToLocaleString: function (value) {
      return CheckoutUtils.dateToLocaleString(value);
    },
    formatCurrency: function (value) {
      if (isNaN(value)) {
        return "-,--";
      }

      return CheckoutUtils.formatCurrency(value);
    },
    setAmountOfMandatoryItems(item) {
      const mandatoryItemIds = item.bookable.checkoutBookableIds
        .filter((cb) => cb.mandatory)
        .map((cb) => cb.bookableId);
      if (mandatoryItemIds.length > 0) {
        for (const mandatoryItemId of mandatoryItemIds) {
          const mandatoryItem = this.subsequentItems.find(
            (item) => item.bookableId === mandatoryItemId
          );
          if (mandatoryItem) {
            mandatoryItem.amount = item.amount;
          }
        }
      }
    },

    setItemAmount(bookableId, amount) {
      const item = [this.leadItem, ...this.subsequentItems].find(
        (item) => item.bookableId === bookableId
      );
      if (item) {
        item.amount = amount;
        this.setAmountOfMandatoryItems(item);
      }

      this.$emit("validate-items");
    },

    increaseItemAmount(item) {
      item.amount++;
      this.setAmountOfMandatoryItems(item);

      this.$emit("validate-items");
    },
    decreaseItemAmount(item) {
      if (item.amount > 1) {
        item.amount--;
        this.setAmountOfMandatoryItems(item);
      } else {
        const index = this.subsequentItems.indexOf(item);
        if (index > -1) {
          this.subsequentItems.splice(index, 1);
        }
      }

      this.$emit("validate-items");
    },
    submit() {
      this.$emit("submit");
    },

    back() {
      this.$emit("back");
    },

    compileBooking() {
      const bookableItems = [this.leadItem, ...this.subsequentItems].map(
        (item) => {
          return {
            bookableId: item.bookableId,
            amount: item.amount,
          };
        }
      );

      return {
        timeBegin: this.timeBegin,
        timeEnd: this.timeEnd,
        bookableItems: bookableItems,
        couponCode: this.coupon?.id,
        name: this.contactDetails.name,
        company: this.contactDetails.company,
        street: this.contactDetails.street,
        zipCode: this.contactDetails.zipCode,
        location: this.contactDetails.location,
        mail: this.contactDetails.mail,
        phone: this.contactDetails.phone,
        comment: this.contactDetails.comment,
        paymentProvider: this.selectedPaymentApp,
        attachmentStatus: [this.leadItem, ...this.subsequentItems].flatMap(
          (item) =>
            item.bookable.attachments.map((attachment) => {
              return {
                id: attachment.id,
                bookableId: item.bookableId,
                accepted: attachment.accepted,
              };
            })
        ),
      };
    },

    async checkout() {
      this.isSubmitting = true;

      try {
        const checkoutResponse = await this.performCheckout();
        if (
          checkoutResponse.data.isCommitted === true &&
          checkoutResponse.data.isPayed === false
        ) {
          const paymentResponse = await this.processPayment(
            checkoutResponse.data
          );
          await this.handlePaymentOutcome(paymentResponse);
        } else {
          await this.routeToStatus(checkoutResponse.data);
        }
      } catch (error) {
        console.error("Checkout process failed:", error.message);
      } finally {
        this.isSubmitting = false;
      }
    },

    async performCheckout() {
      const response = await ApiCheckoutService.checkout(
        this.tenant,
        this.compileBooking(),
        false
      );
      if (response.status !== 200) throw new Error("Checkout service failed");
      return response;
    },

    async processPayment(booking) {
      const response = await ApiPaymentService.payments(
        booking.id,
        booking.tenantId
      );
      if (response.status !== 200) throw new Error("Payment processing failed");
      return response;
    },

    async handlePaymentOutcome(paymentResponse) {
      const finalBooking = paymentResponse.data.bookings[0];

      if (finalBooking?.totalPrice <= 0 || !finalBooking?.isCommitted) {
        await this.routeToStatus(finalBooking);
        return;
      }

      switch (finalBooking.paymentProvider) {
        case "giroCockpit": {
          const paymentUrl = paymentResponse.data?.paymentData[0]?.url;
          if (paymentUrl) {
            window.location.href = paymentUrl;
          }
          break;
        }
        case "pmPayment": {
          const paymentUrl = paymentResponse.data?.paymentData[0]?.url;
          if (paymentUrl) {
            window.location.href = paymentUrl;
          }
          break;
        }
        case "invoice":
          await this.routeToStatus(finalBooking, finalBooking.paymentProvider);
          break;
        default:
          await this.routeToStatus(finalBooking);
          break;
      }
    },

    async routeToStatus(booking, paymentProvider = null) {
      await this.$router.push({
        path: "/checkout/status",
        query: {
          id: booking.id,
          tenant: booking.tenantId,
          paymentProvider: paymentProvider,
        },
      });
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
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        price += item.userPriceEur;
      }

      return price;
    },

    totalGrossPrice() {
      let price = 0;
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        price += item.userGrossPriceEur;
      }

      return price;
    },

    totalPriceOff() {
      let off = 0;
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        if (item.regularPriceEur > item.userPriceEur) {
          off += item.regularPriceEur - item.userPriceEur;
        }
      }
      return off;
    },

    totalGrossPriceOff() {
      let off = 0;
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        if (item.regularGrossPriceEur > item.userGrossPriceEur) {
          off += item.regularGrossPriceEur - item.userGrossPriceEur;
        }
      }

      return off;
    },

    hasValueAddedTax() {
      for (const item of [this.leadItem, ...this.subsequentItems]) {
        if (
          item.bookable.priceValueAddedTax &&
          item.bookable.priceValueAddedTax > 0
        ) {
          return true;
        }
      }

      return false;
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

    bookingDurationLongRange() {
      return CheckoutUtils.bookingDurationLongRange(
        this.timeBegin,
        this.timeEnd
      );
    },
  },
};
</script>

<style>
.centered-input .v-text-field__slot input {
  text-align: center;
}
</style>

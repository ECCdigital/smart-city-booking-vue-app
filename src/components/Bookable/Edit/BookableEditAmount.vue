<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-text-field
        background-color="accent"
        filled
        dense
        label="Verfügbare Anzahl"
        :hint="!bookable.amount ? 'Anzahl ist unbegrenzt!' : ''"
        :persistent-hint="!bookable.amount"
        data-test="price-amount"
        :value="bookable.amount"
        @input="patch({ amount: $event })"
        :disabled="handlesMaxAmount"
        :suffix="amountSuffix"
      />
    </v-col>

    <!-- Not the provider's to decide: its maximum and this one both apply,
         so the field stays open while it handles maxAmount. -->
    <v-col cols="12" md="6">
      <v-text-field
        class="max-amount-per-booking"
        background-color="accent"
        filled
        dense
        type="number"
        min="1"
        step="1"
        :label="$t('bookable.edit.maxAmountPerBooking.label')"
        :hint="
          maxAmountPerBookingUnlimited
            ? $t('bookable.edit.maxAmountPerBooking.unlimited')
            : ''
        "
        :persistent-hint="maxAmountPerBookingUnlimited"
        :value="bookable.maxAmountPerBooking"
        :rules="fieldRules.maxAmountPerBooking"
        :suffix="amountSuffix"
        @input="setMaxAmountPerBooking"
      />
    </v-col>
  </v-row>
</template>

<script>
import bookableEditing from "@/mixins/bookableEditing";
import { handlesCapability } from "@/utils/bookableExternalProviders";
import { amountUnit } from "@/utils/bookingAmountLimit";

/**
 * The card „Anzahl“ of „Preise & Kapazität“: the fields the price tab had for
 * the Anzahl and the Höchstmenge je Buchung, until the questions of the step
 * „Anzahl & Kapazität“ take their place (ECCdigital/tickets#359).
 */
export default {
  name: "BookableEditAmount",
  mixins: [bookableEditing],
  computed: {
    handlesMaxAmount() {
      return handlesCapability(this.bookable, "maxAmount");
    },
    amountSuffix() {
      return amountUnit(this.bookable);
    },
    maxAmountPerBookingUnlimited() {
      return this.bookable.maxAmountPerBooking == null;
    },
  },
  methods: {
    /** Empty is unlimited and saved as null; a number stays a number. */
    setMaxAmountPerBooking(value) {
      if (value === "" || value == null) {
        this.patch({ maxAmountPerBooking: null });
        return;
      }
      const number = parseFloat(value);
      this.patch({
        maxAmountPerBooking: Number.isNaN(number) ? value : number,
      });
    },
  },
};
</script>

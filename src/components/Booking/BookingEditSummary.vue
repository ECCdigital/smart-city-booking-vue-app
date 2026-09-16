<template>
  <v-card outlined class="booking-summary section-card">
    <v-card-title class="section-header">
      <v-icon>mdi-clipboard-text-outline</v-icon>
      <span>Zusammenfassung</span>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <div
        v-for="item in bookableItems"
        :key="item.bookableId"
        class="summary-item mb-2"
      >
        <div class="font-weight-medium text-body-2">
          {{ item._bookableUsed?.title || item.bookableId }}
        </div>
        <div class="caption text--secondary">
          Menge: {{ item.amount }}
          <span v-if="itemPriceLabel(item)"> · {{ itemPriceLabel(item) }}</span>
        </div>
        <div
          v-if="validationFor(item.bookableId)"
          class="caption mt-1"
          :class="validationTextClass(item.bookableId)"
        >
          <v-icon x-small left>{{
            validationChipIcon(item.bookableId)
          }}</v-icon>
          {{ validationFor(item.bookableId).message }}
        </div>
      </div>

      <div v-if="!bookableItems.length" class="caption text--secondary mb-2">
        Noch kein Buchungsobjekt gewählt
      </div>

      <v-divider class="my-3" />

      <div class="caption text--secondary mb-3">
        <v-icon x-small class="mr-1">mdi-calendar-range</v-icon>
        {{ formattedPeriod }}
      </div>

      <template v-if="customFields.length">
        <div class="text-caption text--secondary mb-1">Zusatzfelder</div>
        <div
          v-for="field in customFields"
          :key="field.id"
          class="d-flex align-center justify-space-between caption mb-1"
        >
          <span class="text-truncate mr-2">{{ field.caption }}</span>
          <span :class="fieldStatus(field).textClass">
            {{ fieldStatus(field).label }}
          </span>
        </div>
        <v-divider class="my-3" />
      </template>

      <div class="d-flex justify-space-between align-center">
        <span class="text-body-2">Preis (netto)</span>
        <span class="font-weight-bold">{{ formatPrice(totalPriceEur) }} €</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import {
  getCustomFieldValue,
  isCheckoutRequiredField,
} from "@/utils/bookingCustomFields";

export default {
  name: "BookingEditSummary",
  props: {
    bookableItems: { type: Array, default: () => [] },
    formattedPeriod: { type: String, default: "—" },
    customFields: { type: Array, default: () => [] },
    customFieldValues: { type: Array, default: () => [] },
    itemValidations: { type: Object, default: () => ({}) },
    totalPriceEur: { type: Number, default: 0 },
    isCreateMode: { type: Boolean, default: true },
    getItemPriceLabel: { type: Function, default: null },
  },
  methods: {
    validationFor(bookableId) {
      return this.itemValidations[bookableId] || null;
    },
    validationTextClass(bookableId) {
      const v = this.validationFor(bookableId);
      if (!v) return "";
      if (v.status === "ok") return "success--text";
      if (v.status === "warning") return "warning--text";
      return "text--secondary";
    },
    validationChipIcon(bookableId) {
      const v = this.validationFor(bookableId);
      if (!v) return "mdi-help-circle-outline";
      if (v.status === "loading") return "mdi-loading";
      if (v.status === "ok") return "mdi-check-circle";
      return "mdi-alert";
    },
    itemPriceLabel(item) {
      if (this.getItemPriceLabel) {
        return this.getItemPriceLabel(item);
      }
      return null;
    },
    isRequired(field) {
      return isCheckoutRequiredField(field);
    },
    fieldStatus(field) {
      const val = getCustomFieldValue(this.customFieldValues, field.id);
      const filled = val !== null && val !== undefined && val !== "";
      if (filled) return { label: "OK", textClass: "success--text" };
      if (this.isRequired(field)) {
        return { label: "Pflicht", textClass: "error--text" };
      }
      return { label: "—", textClass: "text--secondary" };
    },
    formatPrice(value) {
      if (value == null || Number.isNaN(value)) return "0,00";
      return Number(value).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
  },
};
</script>

<style scoped>
.booking-summary {
  position: sticky;
  top: 12px;
}
</style>

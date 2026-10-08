// PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
// What every variant shares: the props, patch/apply after #340 and the rules
// of priceShared.js as computed properties. Only the template differs.

import _ from "lodash";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import {
  PRICE_TYPES,
  VAT_RATES,
  applyPriceMode,
  applyPriceType,
  couponsOn,
  euro,
  handlesExternalAmount,
  handlesExternalPricing,
  isUnlimited,
  offersCoupons,
  offersFixedPrice,
  offersMax,
  offersTiers,
  priceIssues,
  priceModeOf,
  toNumber,
  unitOf,
  warnsAboutAmount,
} from "./priceShared";

export default {
  mixins: [bookableExpertMode],
  props: {
    bookable: { type: Object, required: true },
    part: { type: String, default: "price" },
    naming: { type: Object, required: true },
    flow: { type: Boolean, default: false },
  },
  data() {
    // Transient, after the rule in priceShared.js: held only while the data
    // cannot tell it (Ein Preis at 0 €, Staffelpreise with one category).
    return { chosenMode: null, VAT_RATES };
  },
  computed: {
    external() {
      return handlesExternalPricing(this.bookable);
    },
    externalAmount() {
      return handlesExternalAmount(this.bookable);
    },
    derivedMode() {
      return priceModeOf(this.bookable);
    },
    mode() {
      const derived = this.derivedMode;
      if (this.chosenMode === "simple" && derived === "free") return "simple";
      if (this.chosenMode === "tiers" && derived === "simple") return "tiers";
      return derived;
    },
    modeOptions() {
      const modes = ["free", "simple"];
      if (offersTiers(this.bookable, this.expertMode)) modes.push("tiers");
      return modes.map((value) => ({ value, label: this.naming.modes[value] }));
    },
    priceTypeOptions() {
      return PRICE_TYPES.map((value) => ({
        value,
        label: this.naming.priceTypes[value],
      }));
    },
    first() {
      return this.bookable.priceCategories?.[0] || {};
    },
    price() {
      return toNumber(this.first.priceEur);
    },
    showsFixed() {
      return offersFixedPrice(this.bookable);
    },
    fixedLabel() {
      return this.naming.fixed[this.bookable.priceType || "per-item"];
    },
    vatRate() {
      return toNumber(this.bookable.priceValueAddedTax);
    },
    gross() {
      return this.price * (1 + this.vatRate / 100);
    },
    showsCoupons() {
      return offersCoupons(this.bookable, this.expertMode);
    },
    coupons() {
      return couponsOn(this.bookable);
    },
    unlimited() {
      return isUnlimited(this.bookable.amount);
    },
    amount() {
      return toNumber(this.bookable.amount) || 1;
    },
    maxUnlimited() {
      return isUnlimited(this.bookable.maxAmountPerBooking);
    },
    max() {
      return toNumber(this.bookable.maxAmountPerBooking) || 1;
    },
    showsMax() {
      return offersMax(this.bookable);
    },
    warns() {
      return warnsAboutAmount(this.bookable);
    },
    unit() {
      return unitOf(this.bookable);
    },
    issues() {
      return priceIssues(this.bookable);
    },
  },
  methods: {
    euro,
    patch(changes) {
      this.$emit("update:bookable", { ...this.bookable, ...changes });
    },
    apply(change) {
      const next = _.cloneDeep(this.bookable);
      change(next);
      this.$emit("update:bookable", next);
    },
    setMode(mode) {
      this.chosenMode = mode;
      this.apply((next) => applyPriceMode(next, mode));
    },
    setPriceType(type) {
      this.apply((next) => applyPriceType(next, type));
    },
    setCategory(changes) {
      this.apply((next) => {
        next.priceCategories[0] = { ...next.priceCategories[0], ...changes };
      });
    },
    setPrice(value) {
      // Kept as typed so an empty field can be reported, as the backend
      // requires a number.
      this.setCategory({ priceEur: value === "" ? "" : toNumber(value) });
    },
    setVat(rate) {
      this.patch({ priceValueAddedTax: rate === "" ? 0 : toNumber(rate) });
    },
    setUnlimited(unlimited) {
      this.patch({ amount: unlimited ? null : 1 });
    },
    setAmount(value) {
      if (value === "" || value == null) return this.patch({ amount: null });
      this.patch({ amount: Math.max(1, Math.floor(toNumber(value)) || 1) });
    },
    setMaxUnlimited(unlimited) {
      this.patch({ maxAmountPerBooking: unlimited ? null : 1 });
    },
    setMax(value) {
      if (value === "" || value == null)
        return this.patch({ maxAmountPerBooking: null });
      this.patch({
        maxAmountPerBooking: Math.max(1, Math.floor(toNumber(value)) || 1),
      });
    },
  },
};

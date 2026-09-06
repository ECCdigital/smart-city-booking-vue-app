import ApiBookablesService from "@/services/api/ApiBookablesService";
import {
  externalPriceTiers,
  externalServiceFee,
  hasExternalPrices,
} from "@/utils/externalPriceCategories";

/**
 * What an external provider charges for a bookable, for the two screens that
 * show it: the bookable card and the pricing tab of the editor.
 *
 * The prices come from `GET /:tenant/bookables/:id/prices` - the categories
 * the checkout itself prices with, so what a screen shows and what a booking
 * pays cannot disagree. That route is a public one: it answers only for a
 * bookable that is stored and publicly visible, which is why the caller asks
 * {@link externalPricesUnavailableKey} before it reads.
 *
 * Reading and saying what a failure means are kept apart on purpose: the
 * failure reaches the caller, which knows whether its screen has room for a
 * message or only for silence.
 */
export default {
  data() {
    return {
      externalPrices: null,
      isLoadingPrices: false,
    };
  },
  computed: {
    hasExternalPriceData() {
      return hasExternalPrices(this.externalPrices);
    },
    externalPriceTiers() {
      return externalPriceTiers(this.externalPrices);
    },
    externalServiceFee() {
      return externalServiceFee(this.externalPrices);
    },
  },
  methods: {
    /**
     * Why the prices route cannot answer for this bookable yet.
     *
     * @param {Object} bookable The bookable to be priced
     * @returns {string|null} An i18n key naming the reason, or `null` when
     *   the route can be asked
     */
    externalPricesUnavailableKey(bookable) {
      if (!bookable?.id || !bookable?.tenantId) {
        return "bookable.externalPrice.notSaved";
      }
      if (bookable.isPublic !== true) {
        return "bookable.externalPrice.notPublic";
      }
      return null;
    },
    /**
     * Reads the provider's prices for the bookable into `externalPrices`.
     *
     * @param {Object} bookable The bookable to be priced
     * @returns {Promise<Error|null>} The failure, so the caller can name it
     *   on its own screen - `null` when the prices were read
     */
    async loadExternalPrices(bookable) {
      this.isLoadingPrices = true;
      try {
        const response = await ApiBookablesService.getBookablePrices(
          bookable.id,
          bookable.tenantId
        );
        this.externalPrices = Array.isArray(response.data)
          ? response.data
          : null;
        return null;
      } catch (error) {
        console.error(
          `Could not read the external prices of bookable ${bookable?.id}`,
          error
        );
        this.externalPrices = null;
        return error;
      } finally {
        this.isLoadingPrices = false;
      }
    },
  },
};

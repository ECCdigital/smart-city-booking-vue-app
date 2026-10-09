import ApiBookablesService from "@/services/api/ApiBookablesService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";

/**
 * The tenant's other bookables, to pick from in Zusatzobjekte and Hierarchie.
 * Loaded once on mount. A denial empties the picker and is named beside it
 * (`bookablesForbidden`) - these are areas of a form, not dialogs, so nothing
 * pops up.
 */
export default {
  data() {
    return {
      bookables: [],
      bookablesForbidden: false,
    };
  },
  computed: {
    /** What can be picked: every bookable but the one edited. */
    bookablesWithoutSelf() {
      return this.bookables.filter((other) => other.id !== this.bookable.id);
    },
  },
  methods: {
    async fetchBookables() {
      this.bookablesForbidden = false;
      try {
        const result = await ApiBookablesService.getBookables();
        this.bookables = result?.data || [];
      } catch (error) {
        this.bookables = [];
        this.bookablesForbidden = isForbiddenError(error);
        if (!this.bookablesForbidden) console.error(error);
      }
    },
  },
  mounted() {
    this.fetchBookables();
  },
};

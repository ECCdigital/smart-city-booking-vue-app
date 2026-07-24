/**
 * Injects expert-mode state from BookableEdit.
 * Defaults to enabled when the provider is missing (e.g. isolated use).
 */
export default {
  inject: {
    bookableExpertMode: {
      default: () => ({ enabled: true }),
    },
  },
  computed: {
    expertMode() {
      return this.bookableExpertMode?.enabled !== false;
    },
  },
};

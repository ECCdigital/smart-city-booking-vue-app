import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

/**
 * A list that is paged and filtered on the server. Its loads overlap (filter,
 * page, reload), so the answer asked for last wins: an older answer arriving
 * late changes nothing, neither the rows nor the loading state.
 *
 * The component keeps page, filters and the request; it hands
 * {@link loadPaged} a function answering `{ items, total }`.
 */
export default {
  data() {
    return {
      items: [],
      total: 0,
      loading: false,
      errorMessage: "",
      latestRun: null,
    };
  },
  methods: {
    /**
     * @param {() => Promise<{items: Array, total: number}>} fetchPage
     * @param {string} failedKey Translation key naming a failed load, used
     *   where the backend's answer carries no readable text of its own.
     */
    async loadPaged(fetchPage, failedKey) {
      const run = (this.latestRun = {});
      this.loading = true;
      this.errorMessage = "";
      try {
        const result = await fetchPage();
        if (run !== this.latestRun) return;
        this.items = result?.items || [];
        this.total = result?.total || 0;
      } catch (error) {
        console.error(error);
        if (run !== this.latestRun) return;
        this.items = [];
        this.total = 0;
        this.errorMessage = getApiErrorMessage(error, this.$t(failedKey));
      } finally {
        if (run === this.latestRun) this.loading = false;
      }
    },
  },
};

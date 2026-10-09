import Vue from "vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";

/**
 * The access points of the bookable's tenant, read once for the editing page:
 * `BookableEdit` provides one list as `bookableAccessPoints`, and every part
 * that needs it - the assignment in Schließsysteme, the settings of
 * ParkraumService, the fields the provider takes over - reads the same list.
 * A component outside `BookableEdit` gets a list of its own.
 *
 * `load(tenantId)` reads the list unless it is read or being read for that
 * tenant; `{ force: true }` reads it again. A failure leaves the list empty
 * and keeps the error for the part that reports it.
 *
 * @param {Array<Object>} [list] Access points already known, e.g. in a spec
 * @returns {{ list: Array<Object>, loading: boolean, error: ?Error,
 *   tenantId: ?string, load: function(string, Object=): Promise<void> }}
 */
export function createTenantAccessPoints(list = null) {
  let pending = null;
  const state = Vue.observable({
    tenantId: null,
    list: list || [],
    loaded: list !== null,
    loading: false,
    error: null,
  });

  state.load = (tenantId, { force = false } = {}) => {
    if (!tenantId) return Promise.resolve();
    const known =
      state.tenantId === tenantId || (state.loaded && !state.tenantId);
    if (!force && known && (pending || state.loaded)) {
      return pending || Promise.resolve();
    }
    state.tenantId = tenantId;
    state.loading = true;
    state.error = null;
    const request = ApiAccessPointService.getAccessPoints(tenantId)
      .then((response) => {
        if (pending !== request) return;
        state.list = response.data || [];
      })
      .catch((error) => {
        if (pending !== request) return;
        console.error(
          `Could not read the access points of tenant ${tenantId}`,
          error
        );
        state.list = [];
        state.error = error;
      })
      .finally(() => {
        if (pending !== request) return;
        pending = null;
        state.loaded = true;
        state.loading = false;
      });
    pending = request;
    return request;
  };

  return state;
}

import store from "@/store";
import PersistenceService from "@/services/PersistenceService";

const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("user") || null,
};

const mutations = {
  UPDATE(state, user) {
    state.data = user;
    PersistenceService.writeToLocalStorage("user", user);
  },
  DELETE(state) {
    state.data = null;
    PersistenceService.removeFromLocalStorage("user");
  },
};

const actions = {
  update({ commit }, user) {
    commit("UPDATE", user);
  },
  delete({ commit }) {
    commit("DELETE");
  },
  reset({ commit }) {
    commit("DELETE");
  },
};

const getters = {
  getUser: (state) => state.data?.user,
  isLoggedIn: () => !_.isNil(state.data?.user),
  // Whether the reach of the signed-in user is known at all.
  permissionsLoaded: (state) => !!state.data?.permissions,
  // The counterpart of `isAuthorized`, for callers that take something away
  // from the user: `isAuthorized` answers `false` both for "not permitted"
  // and for "not loaded yet", and only the first of those may be acted on.
  isDenied: (state, getters) => (ifce) =>
    getters.permissionsLoaded && !getters.isAuthorized(ifce),
  isAuthorized: (state) => (ifce) => {
    if (state.data && state.data.permissions) {
      if (state.data.permissions.instanceOwner) return true;
      const t = store.getters["tenants/currentTenantId"];
      const adIfces = state.data.permissions.tenants?.find(
        (p) => p.tenantId === t
      );
      if (!adIfces) return false;
      return adIfces.adminInterfaces.includes(ifce);
    }
    return false;
  },
  allowToCreateTenants: (state) => {
    if (state.data && state.data.permissions) {
      return state.data.permissions.allowCreateTenant;
    }
    return false;
  },
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

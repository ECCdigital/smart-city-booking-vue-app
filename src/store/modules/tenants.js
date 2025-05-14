import PersistenceService from "@/services/PersistenceService";
const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("tenant") || null,
  tenants: PersistenceService.getFromLocalStorage("tenants") || null,
  currentTenantId:
    PersistenceService.getFromLocalStorage("currentTenantId") || null,
};

const mutations = {
  UPDATE(state, tenant) {
    state.data = tenant;
    PersistenceService.writeToLocalStorage("tenant", tenant);
  },
  DELETE(state) {
    state.data = null;
    state.tenants = null;
    state.currentTenantId = null;
    PersistenceService.removeFromLocalStorage("tenant");
    PersistenceService.removeFromLocalStorage("tenants");
    PersistenceService.removeFromLocalStorage("currentTenantId");
  },
  SET_TENANTS(state, tenants) {
    state.tenants = tenants;
    PersistenceService.writeToLocalStorage("tenants", tenants);
  },
  SELECT(state, tenant) {
    state.currentTenantId = tenant;
    PersistenceService.writeToLocalStorage("currentTenantId", tenant);
  },
  REPLACE(state, tenant) {
    const index = state.tenants.findIndex((t) => t.id === tenant.id);
    if (index !== -1) {
      state.tenants.splice(index, 1, tenant);
    }
  },
};

const actions = {
  update({ commit }, tenant) {
    commit("UPDATE", tenant);
  },
  delete({ commit }) {
    commit("DELETE");
  },
  setTenants({ commit }, tenants) {
    commit("SET_TENANTS", tenants);
  },
  select({ commit }, tenant) {
    commit("SELECT", tenant);
  },
  replace({ commit }, tenant) {
    commit("REPLACE", tenant);
  },
  reset({ commit }) {
    commit("DELETE");
  }
};

const getters = {
  tenants: (state) => state.tenants,
  currentTenantId: (state) => state.currentTenantId,
  currentTenant: (state) => {
    return state.tenants?.find((t) => t.id === state.currentTenantId);
  },
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

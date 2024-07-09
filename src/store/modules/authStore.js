const namespaced = true;
import PersistenceService from "@/services/PersistenceService";

const state = {
  tenant: PersistenceService.getFromLocalStorage("authStore")?.tenant || null,
}

const mutations = {
  UPDATE(state, tenant) {
    state.tenant = tenant;
    PersistenceService.writeToLocalStorage("authStore", {tenant: tenant});
  },
};

const actions = {
  update({ commit }, tenant) {
    commit("UPDATE", tenant);
  },
};

const getters = {
  tenant: (state) => state.tenant,
};


export default {
  state,
  namespaced,
  mutations,
  actions,
  getters,
}

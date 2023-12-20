import PersistenceService from "@/services/PersistenceService";
const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("tenant") || null,
};

const mutations = {
  UPDATE(state, tenant) {
    state.data = tenant;
    PersistenceService.writeToLocalStorage("tenant", tenant);
  },
  DELETE(state) {
    state.data = null;
    PersistenceService.removeFromLocalStorage("tenant");
  },
};

const actions = {
  update({ commit }, tenant) {
    commit("UPDATE", tenant);
  },
  delete({ commit }) {
    commit("DELETE");
  },
};

const getters = {
  tenant: (state) => state.data
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

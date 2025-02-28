import PersistenceService from "@/services/PersistenceService";
const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("instance") || null,
};

const mutations = {
  UPDATE(state, instance) {
    state.data = instance;
    PersistenceService.writeToLocalStorage("instance", instance);
  },
  DELETE(state) {
    state.data = null;
    PersistenceService.removeFromLocalStorage("instance");
  },
};

const actions = {
  update({ commit }, instance) {
    commit("UPDATE", instance);
  },
  delete({ commit }) {
    commit("DELETE");
  },
  reset({ commit }) {
    commit("DELETE");
  }
};

const getters = {
  instance: (state) => state.data,
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

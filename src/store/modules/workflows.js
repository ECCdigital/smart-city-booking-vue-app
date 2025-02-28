import PersistenceService from "@/services/PersistenceService";
const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("workflows") || null,
}

const mutations = {
  UPDATE(state, workflows) {
    state.data = workflows;
    PersistenceService.writeToLocalStorage("workflows", workflows);
  },
  DELETE(state) {
    state.data = null;
    PersistenceService.removeFromLocalStorage("workflows");
  },
}

const actions = {
  update({ commit }, workflows) {
    commit("UPDATE", workflows);
  },
  delete({ commit }) {
    commit("DELETE");
  },
  reset({ commit }) {
    commit("DELETE");
  }
}

const getters = {
  workflows: (state) => state.data,
}

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

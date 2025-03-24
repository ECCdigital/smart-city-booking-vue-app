const namespaced = true;
import PersistenceService from "@/services/PersistenceService";

const state = {
  nextUrl: PersistenceService.getFromLocalStorage("authStore")?.nextUrl || null,
};

const mutations = {
  SET_NEXT_URL(state, nextUrl) {
    state.nextUrl = nextUrl;
    const existingData = PersistenceService.getFromLocalStorage("authStore") || {};
    existingData.nextUrl = nextUrl;
    PersistenceService.writeToLocalStorage("authStore", existingData);
  },
};

const actions = {
  setNextUrl({ commit }, nextUrl) {
    commit("SET_NEXT_URL", nextUrl);
  },
  getNextUrl({ state }) {
    return state.nextUrl;
  }
};

const getters = {
  nextUrl: (state) => state.nextUrl,
};

export default {
  state,
  namespaced,
  mutations,
  actions,
  getters,
};

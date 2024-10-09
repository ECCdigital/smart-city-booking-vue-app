const namespaced = true;
import PersistenceService from "@/services/PersistenceService";

const state = {
  tenant: PersistenceService.getFromLocalStorage("authStore")?.tenant || null,
  nextUrl: PersistenceService.getFromLocalStorage("authStore")?.nextUrl || null,
};

const mutations = {
  UPDATE(state, tenant) {
    state.tenant = tenant;
    const existingData = PersistenceService.getFromLocalStorage("authStore") || {};
    existingData.tenant = tenant;
    PersistenceService.writeToLocalStorage("authStore", existingData);
  },
  SET_NEXT_URL(state, nextUrl) {
    state.nextUrl = nextUrl;
    const existingData = PersistenceService.getFromLocalStorage("authStore") || {};
    existingData.nextUrl = nextUrl;
    PersistenceService.writeToLocalStorage("authStore", existingData);
  },
};

const actions = {
  update({ commit }, tenant) {
    commit("UPDATE", tenant);
  },
  setNextUrl({ commit }, nextUrl) {
    commit("SET_NEXT_URL", nextUrl);
  },
  getNextUrl({ state }) {
    return state.nextUrl;
  }
};

const getters = {
  tenant: (state) => state.tenant,
  nextUrl: (state) => state.nextUrl,
};

export default {
  state,
  namespaced,
  mutations,
  actions,
  getters,
};

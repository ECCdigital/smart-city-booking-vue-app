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
};

const getters = {
  user: (state) => state.data,
  tenant: (state) => state.data.tenant,
  isLoggedIn: () => !_.isNil(state.data),
  isAuthorized: (state) => (ifce) => {
    if (
      state.data &&
      state.data.permissions &&
      state.data.permissions.adminInterfaces
    ) {
      return state.data.permissions.adminInterfaces.includes(ifce);
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

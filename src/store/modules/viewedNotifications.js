import PersistenceService from "@/services/PersistenceService";

const namespaced = true;

const state = {
  viewedIds: PersistenceService.getFromLocalStorage("viewedNotifications") || [],
};

const mutations = {
  ADD_VIEWED_NOTIFICATION(state, notificationId) {
    if (!state.viewedIds.includes(notificationId)) {
      state.viewedIds.push(notificationId);
      PersistenceService.writeToLocalStorage("viewedNotifications", state.viewedIds);
    }
  },
  RESET(state) {
    state.viewedIds = [];
    PersistenceService.removeFromLocalStorage("viewedNotifications");
  },
};

const actions = {
  markAsViewed({ commit }, notificationId) {
    commit("ADD_VIEWED_NOTIFICATION", notificationId);
  },
  reset({ commit }) {
    commit("RESET");
  }
};

const getters = {
  isViewed: (state) => (notificationId) => {
    return state.viewedIds.includes(notificationId);
  },
  viewedIds: (state) => state.viewedIds,
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

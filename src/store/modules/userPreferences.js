const state = {
  skipStatusChangeConfirmations: {},
};

const mutations = {
  SET_SKIP_STATUS_CONFIRMATION(state, { statusKey, skip }) {
    state.skipStatusChangeConfirmations = {
      ...state.skipStatusChangeConfirmations,
      [statusKey]: skip,
    };
  },
};

const actions = {
  setSkipStatusConfirmation({ commit }, { statusKey, skip }) {
    commit("SET_SKIP_STATUS_CONFIRMATION", { statusKey, skip });

    localStorage.setItem(
      "skipStatusChangeConfirmations",
      JSON.stringify(state.skipStatusChangeConfirmations)
    );
  },

  loadSkipStatusConfirmations({ commit }) {
    const saved = localStorage.getItem("skipStatusChangeConfirmations");
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        Object.entries(preferences).forEach(([statusKey, skip]) => {
          commit("SET_SKIP_STATUS_CONFIRMATION", { statusKey, skip });
        });
      } catch (error) {
        console.error("Failed to parse skipStatusChangeConfirmations from localStorage:", error);
      }
    }
  },
};

const getters = {
  shouldSkipStatusConfirmation: (state) => (statusKey) => {
    return state.skipStatusChangeConfirmations[statusKey] || false;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};

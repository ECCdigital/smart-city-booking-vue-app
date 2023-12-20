const namespaced = true;

const state = {
  collection: [],
};

let toastId = 1;

const mutations = {
  PUSH(state, toast) {
    state.collection.push({
      ...toast,
      id: toastId++,
    });
  },
  DELETE(state, toastId) {
    state.collection = state.collection.filter(
      toast => toast.id !== toastId,
    );
  },
};

const actions = {
  add({ commit }, toast) {
    if (toast) {
      commit("PUSH", toast);

      if (toast.timeout !== -1) {
        setTimeout(() => {
          commit("DELETE", toast);
        }, toast.timeout);
      }
    }
  },
  remove({ commit }, toastId) {
    commit("DELETE", toastId);
  },
};

const getters = {
  all: state => state.collection,
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

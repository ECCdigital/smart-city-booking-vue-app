const namespaced = true;

const state = {
  queue: [],
};

const mutations = {
  START(state, name) {
    if (!state.queue.includes(name)) {
      state.queue.push(name);
    }
  },
  STOP(state, name) {
    if (state.queue.includes(name)) {
      state.queue = state.queue.filter(item => item !== name);
    }
  },
};

const actions = {
  start({ commit }, name) {
    commit("START", name);
  },
  stop({ commit }, name) {
    commit("STOP", name);
  },
};

const getters = {
  isLoading: state => !_.isEmpty(state.queue),
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};

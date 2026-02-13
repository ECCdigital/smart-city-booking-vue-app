const namespaced = true;

let nextId = 1;

const state = {
  collection: [],
  timers: {},
};

const mutations = {
  PUSH(state, toast) {
    state.collection.push(toast);
  },
  DELETE(state, id) {
    state.collection = state.collection.filter((toast) => toast.id !== id);
  },
  SET_TIMER(state, { id, timerId, remainingTime, startTime }) {
    state.timers[id] = { timerId, remainingTime, startTime };
  },
  CLEAR_TIMER(state, id) {
    if (state.timers[id]?.timerId) {
      clearTimeout(state.timers[id].timerId);
    }
    delete state.timers[id];
  },
  UPDATE_REMAINING_TIME(state, { id, remainingTime }) {
    if (state.timers[id]) {
      state.timers[id].remainingTime = remainingTime;
      state.timers[id].timerId = null;
      state.timers[id].startTime = null;
    }
  },
};

const actions = {
  add({ commit, dispatch }, toast) {
    if (!toast) return;

    const id = nextId++;
    const timeout = toast.timeout ?? 5000;

    commit("PUSH", { ...toast, id });

    if (timeout > 0) {
      dispatch("startTimer", { id, timeout });
    }
  },

  startTimer({ commit }, { id, timeout }) {
    const startTime = Date.now();
    const timerId = setTimeout(() => {
      commit("DELETE", id);
      commit("CLEAR_TIMER", id);
    }, timeout);

    commit("SET_TIMER", {
      id,
      timerId,
      remainingTime: timeout,
      startTime,
    });
  },

  pause({ commit, state }, id) {
    const timer = state.timers[id];
    if (!timer || !timer.timerId) return;

    const elapsed = Date.now() - timer.startTime;
    const remainingTime = Math.max(0, timer.remainingTime - elapsed);

    clearTimeout(timer.timerId);

    commit("UPDATE_REMAINING_TIME", { id, remainingTime });
  },

  resume({ dispatch, state }, id) {
    const timer = state.timers[id];

    if (!timer) return;

    if (timer.timerId !== null) return;

    const { remainingTime } = timer;

    if (remainingTime <= 0) {
      dispatch("remove", id);
      return;
    }

    dispatch("startTimer", { id, timeout: remainingTime });
  },

  remove({ commit }, id) {
    commit("CLEAR_TIMER", id);
    commit("DELETE", id);
  },
};

const getters = {
  all: (state) => state.collection,
};

export default {
  namespaced,
  state,
  mutations,
  actions,
  getters,
};

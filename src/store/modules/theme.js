import PersistenceService from "@/services/PersistenceService";

const THEME_STORAGE_KEY = "darkMode";

export default {
  namespaced: true,
  state: {
    isDarkMode: PersistenceService.getFromLocalStorage(THEME_STORAGE_KEY) || false
  },
  getters: {
    isDarkMode: state => state.isDarkMode
  },
  mutations: {
    SET_DARK_MODE(state, isDarkMode) {
      state.isDarkMode = isDarkMode;
    }
  },
  actions: {
    toggleDarkMode({ commit, state }) {
      const newDarkModeValue = !state.isDarkMode;
      commit("SET_DARK_MODE", newDarkModeValue);
      PersistenceService.writeToLocalStorage(THEME_STORAGE_KEY, newDarkModeValue);
      return newDarkModeValue;
    },
    initDarkMode({ commit, state }) {
      // This action is used to initialize the dark mode from localStorage
      const savedDarkMode = PersistenceService.getFromLocalStorage(THEME_STORAGE_KEY);
      if (savedDarkMode !== undefined) {
        commit("SET_DARK_MODE", savedDarkMode);
      }
      return state.isDarkMode;
    },
    reset({ commit }) {
      // Reset to default (light mode)
      commit("SET_DARK_MODE", false);
      PersistenceService.removeFromLocalStorage(THEME_STORAGE_KEY);
    }
  }
};

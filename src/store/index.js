import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import tenants from "./modules/tenants";
import toasts from "./modules/toasts";
import events from "./modules/events";
import bookables from "./modules/bookables";
import loading from "./modules/loading";
import instance from "./modules/instance";
import authStore from "@/store/modules/authStore";
import theme from "./modules/theme";
import userPreferences from "./modules/userPreferences";
import viewedNotifications from "./modules/viewedNotifications";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    user,
    tenants,
    toasts,
    events,
    bookables,
    loading,
    instance,
    authStore,
    theme,
    userPreferences,
    viewedNotifications
  },
  actions: {
    reset({ dispatch }) {
      dispatch("user/reset");
      dispatch("tenants/reset");
      dispatch("toasts/reset");
      dispatch("events/reset");
      dispatch("bookables/reset");
      dispatch("loading/reset");
      dispatch("instance/reset");
      dispatch("authStore/reset");
      dispatch("theme/reset");
      dispatch("viewedNotifications/reset");
    }
  }
});

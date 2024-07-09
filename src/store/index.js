import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import tenants from "./modules/tenants";
import toasts from "./modules/toasts";
import events from "./modules/events";
import bookables from "./modules/bookables";
import loading from "./modules/loading";
import authStore from "./modules/authStore";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    user,
    tenants,
    toasts,
    events,
    bookables,
    loading,
    authStore,
  },
});

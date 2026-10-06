import { afterEach } from "vitest";
import Vue from "vue";
import Vuetify from "vuetify";
import Vuex from "vuex";
import { destroyMountedComponents } from "./support/mount";

// Vuetify and Vuex have to be installed on the Vue constructor that renders
// the component, so it happens once here instead of in every spec.
Vue.use(Vuetify);
Vue.use(Vuex);
Vue.config.productionTip = false;
Vue.config.devtools = false;

afterEach(() => {
  destroyMountedComponents();
});

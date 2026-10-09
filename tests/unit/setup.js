import { afterEach } from "vitest";
import Vue from "vue";
import Vuetify from "vuetify";
import Vuex from "vuex";
import { destroyMountedComponents } from "./support/mount";
import { takeMissingKeys } from "./support/missingKeys";

// Vuetify and Vuex have to be installed on the Vue constructor that renders
// the component, so it happens once here instead of in every spec.
Vue.use(Vuetify);
Vue.use(Vuex);
Vue.config.productionTip = false;
Vue.config.devtools = false;

afterEach(() => {
  destroyMountedComponents();
  // A key the catalogue lacks fails the spec that asked for it.
  const missing = [...new Set(takeMissingKeys())];
  if (missing.length) {
    throw new Error(`Missing in the catalogue: ${missing.join(", ")}`);
  }
});

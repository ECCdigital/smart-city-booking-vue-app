import Vuetify from "vuetify";
import { mount } from "@vue/test-utils";
import i18n from "@/language/index";

const mountedWrappers = new Set();

let appContainer = null;

/**
 * Overlay components (v-dialog, v-menu, v-tooltip) detach into the element
 * marked with `data-app` and warn when it is missing.
 */
function appRoot() {
  if (!appContainer) {
    appContainer = document.createElement("div");
    appContainer.setAttribute("data-app", "true");
    document.body.appendChild(appContainer);
  }
  return appContainer;
}

/**
 * Every mount gets its own host element inside the `data-app` container, so
 * that overlays render the way they do in the app and the DOM of one spec
 * cannot leak into the next.
 */
function createHost() {
  const host = document.createElement("div");
  appRoot().appendChild(host);
  return host;
}

/**
 * Mounts a component with a fresh Vuetify instance, attached to the document.
 * Vuetify and Vuex are installed on Vue once by `tests/unit/setup.js`; each
 * mount still needs its own framework instance so that theme and breakpoint
 * state does not leak between specs.
 *
 * Pass a `new Vuex.Store(...)` through `options.store` when a component needs
 * one.
 *
 * The app's single i18n instance is handed to every mount, so that `$t` in a
 * template resolves against the real German catalogue - a spec that asserts on
 * UI copy then fails when the key is missing, instead of rendering the key.
 */
export function mountComponent(component, options = {}) {
  const wrapper = mount(component, {
    vuetify: new Vuetify(),
    i18n,
    attachTo: createHost(),
    ...options,
  });
  mountedWrappers.add(wrapper);
  return wrapper;
}

/** Called from the global `afterEach`; specs do not need to clean up. */
export function destroyMountedComponents() {
  mountedWrappers.forEach((wrapper) => wrapper.destroy());
  mountedWrappers.clear();
}

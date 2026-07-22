import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import axios from "axios";
import i18n from "./language/index";
import VueAxios from "vue-axios";
import vuetify from "@/plugins/vuetify";
import ApiClientService from "./services/api/ApiClientService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import { isBffAuthMode } from "@/services/auth/authMode";
import {
  endAdminSession,
  isAdminLoginPath,
  subscribeSessionEnded,
} from "@/services/auth/sessionSync";
import "vuetify/dist/vuetify.min.css";
import { mapActions } from "vuex";
import VueTheMask from "vue-the-mask";

import "@/scss/main.scss";
import FormatService from "@/services/FormatService";

window._ = require("lodash");
window.ApiClient = ApiClientService;

Vue.config.productionTip = false;
Vue.use(VueAxios, axios);
Vue.use(VueTheMask);

Vue.filter("currency", (number, currency, locale) => {
  return FormatService.currency(number, currency, locale);
});

Vue.filter("date", (date, dateStyle, locale) => {
  if (!_.isNil(date)) {
    return FormatService.date(date, dateStyle, locale);
  }
  return date;
});

Vue.filter("time", (time, timeStyle, locale) => {
  return FormatService.time(time, timeStyle, locale);
});

function isSilentSsoEnabled() {
  return process.env.VUE_APP_SILENT_SSO_ENABLED === "true";
}

async function bootstrap() {
  try {
    const instanceData = await ApiInstanceService.getPublicInstance();
    await store.dispatch("instance/update", instanceData);
  } catch (error) {
    console.error("Failed to load instance:", error);
  }

  const isLoginRoute = isAdminLoginPath();

  if (isBffAuthMode()) {
    if (!isLoginRoute) {
      const restoreResult = await restoreBffSession();
      // Silent SSO only for cold visits — not after an expired/invalid cookie session
      if (
        restoreResult === "none" &&
        isSilentSsoEnabled() &&
        isKeycloakActive()
      ) {
        maybeStartBffSilentSso();
      }
    }
  } else {
    const authType = localStorage.getItem("authType");

    if (authType === "keycloak" && !isLoginRoute) {
      await restoreKeycloakSession();
    } else if (
      !isLoginRoute &&
      !ApiAuthService.isAuthenticated() &&
      isSilentSsoEnabled()
    ) {
      await trySilentSsoCheck();
    }

    if (isLoginRoute) {
      localStorage.removeItem("authType");
    }
  }
}

/**
 * @returns {Promise<"ok"|"ended"|"none">}
 * - ok: cookie session valid
 * - ended: redirected to login
 * - none: no session (public cold visit)
 */
async function restoreBffSession() {
  try {
    const response = await ApiAuthService.me();
    if (response?.data) {
      await store.dispatch("user/update", response.data);
      return "ok";
    }
  } catch {
    // invalid / missing cookies — interceptor may already have redirected
  }

  ApiClientService.clearTokens();
  try {
    await store.dispatch("user/delete");
  } catch {
    // ignore
  }

  // Protected entry (e.g. /dashboard) without a valid cookie → login
  if (!isAdminLoginPath() && pathLikelyRequiresAuth(window.location.pathname)) {
    await endAdminSession({ redirect: true });
    return "ended";
  }

  return "none";
}

/** Strip router publicPath / BASE_URL so public-route checks match app paths. */
function stripBasePath(pathname = "") {
  const path = pathname || "";
  const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
  if (base && base !== "/" && path.startsWith(base)) {
    const stripped = path.slice(base.length);
    if (!stripped) return "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }
  return path;
}

/** Paths that must not force a login redirect when cookies are absent. */
function pathLikelyRequiresAuth(pathname = "") {
  const path = stripBasePath(pathname);
  const publicPatterns = [
    /^\/login(?:\/|$)/,
    /^\/booking\/verify/,
    /^\/auth\/card/,
    /^\/password/,
    /^\/register/,
    /^\/sso\//,
  ];
  if (publicPatterns.some((re) => re.test(path))) {
    return false;
  }
  // "/" home and all admin app routes expect auth when opened directly
  return true;
}

function isKeycloakActive() {
  const instance = store.getters["instance/instance"];
  return (instance?.applications || []).some(
    (app) => app.id === "keycloak" && app.active
  );
}

function maybeStartBffSilentSso() {
  if (sessionStorage.getItem("bffSilentSsoChecked") === "1") return;
  sessionStorage.setItem("bffSilentSsoChecked", "1");
  const redirect = window.location.pathname + window.location.search;
  ApiAuthService.startSilentSso(redirect);
}

async function restoreKeycloakSession() {
  const instance = store.getters["instance/instance"];
  const ssoConfig = instance?.applications?.find(
    (app) => app.id === "keycloak" && app.active
  );

  if (!ssoConfig) {
    localStorage.removeItem("authType");
    ApiClientService.clearTokens();
    return;
  }

  ApiClientService.setKeycloakRestoring(true);

  try {
    const result = await ApiAuthService.silentSsoCheck(ssoConfig);
    if (result) {
      await store.dispatch("user/update", {
        user: result.user,
        permissions: result.permissions,
      });
    } else {
      localStorage.removeItem("authType");
      ApiClientService.clearTokens();
    }
  } catch (error) {
    console.warn(
      "Keycloak session restore failed, continuing without SSO:",
      error
    );
    localStorage.removeItem("authType");
    ApiClientService.clearTokens();
  } finally {
    ApiClientService.setKeycloakRestoring(false);
  }
}

async function trySilentSsoCheck() {
  const instance = store.getters["instance/instance"];
  const ssoConfig = instance?.applications?.find(
    (app) => app.id === "keycloak" && app.active
  );

  if (!ssoConfig) return;

  try {
    const result = await Promise.race([
      ApiAuthService.silentSsoCheck(ssoConfig),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SSO check timeout")), 5000)
      ),
    ]);
    if (result) {
      await store.dispatch("user/update", {
        user: result.user,
        permissions: result.permissions,
      });
    }
  } catch (error) {
    console.warn(
      "Bootstrap: Silent SSO check failed, continuing without SSO:",
      error
    );
  }
}

function setupBffSessionWatch() {
  if (!isBffAuthMode()) return;

  let checking = false;

  const forceEnd = () => {
    endAdminSession({ redirect: true });
  };

  const hasClientSession = () =>
    ApiAuthService.isAuthenticated() || !!store.getters["user/getUser"];

  const revalidate = async () => {
    if (checking) return;
    if (isAdminLoginPath()) return;
    if (!hasClientSession()) return;

    checking = true;
    try {
      await ApiAuthService.me();
    } catch (error) {
      if (error?.response?.status === 401) {
        forceEnd();
      }
    } finally {
      checking = false;
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      revalidate();
    }
  });
  window.addEventListener("focus", revalidate);

  // Catch cookie deletion / expiry while the tab stays open
  const pollMs = 15000;
  setInterval(revalidate, pollMs);

  subscribeSessionEnded(forceEnd);
}

bootstrap()
  .catch((error) => {
    console.error("Bootstrap failed, mounting app anyway:", error);
  })
  .then(() => {
    setupBffSessionWatch();

    new Vue({
      router,
      store,
      i18n,
      vuetify,
      render: (h) => h(App),

      created() {
        this.initializeTheme();
      },
      mounted() {
        this.loadUsersnap();
      },
      methods: {
        ...mapActions({
          initDarkMode: "theme/initDarkMode",
        }),
        loadUsersnap() {
          window.onUsersnapLoad = function (api) {
            api.init();
          };
          const script = document.createElement("script");
          script.defer = true;
          script.src = `https://widget.usersnap.com/load/${process.env.VUE_APP_USERSNAP_API_KEY}?onload=onUsersnapLoad`;
          document.getElementsByTagName("head")[0].appendChild(script);
        },
        initializeTheme() {
          this.initDarkMode().then((isDarkMode) => {
            this.$vuetify.theme.dark = isDarkMode;
          });
        },
      },
    }).$mount("#app");
  });

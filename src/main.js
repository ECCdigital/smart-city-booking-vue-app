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

async function bootstrap() {
  try {
    const instanceData = await ApiInstanceService.getPublicInstance();
    await store.dispatch("instance/update", instanceData);
  } catch (error) {
    console.error("Failed to load instance:", error);
  }

  const authType = localStorage.getItem("authType");
  const isLoginRoute = window.location.pathname.startsWith("/login");

  if (authType === "keycloak" && !isLoginRoute) {
    await restoreKeycloakSession();
  } else if (!isLoginRoute && !ApiAuthService.isAuthenticated()) {
    await trySilentSsoCheck();
  }

  if (isLoginRoute) {
    localStorage.removeItem("authType");
  }
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
    const result = await ApiAuthService.silentSsoCheck(ssoConfig);
    if (result) {
      await store.dispatch("user/update", {
        user: result.user,
        permissions: result.permissions,
      });
    }
  } catch (error) {
    console.debug("Bootstrap: Silent SSO check failed:", error);
  }
}

bootstrap().then(() => {
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

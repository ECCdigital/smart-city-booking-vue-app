import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import axios from "axios";
import i18n from "./language/index";
import VueAxios from "vue-axios"
import vuetify from "@/plugins/vuetify";
import PersistenceService from "@/services/PersistenceService";
import ApiClientService from "./services/api/ApiClientService";
import "vuetify/dist/vuetify.min.css"
import { mapActions } from "vuex";

import "@/scss/main.scss";
import FormatService from "@/services/FormatService";

/* Extend the window object to access lodash everywhere with _. instead of this._. */
window._ = require("lodash");

/* Set API Client */
window.ApiClient = ApiClientService;

Vue.config.productionTip = false;

Vue.use(VueAxios, axios);

Vue.filter("currency", (number, currency, locale) => {
  return FormatService.currency(number, currency, locale);
})

Vue.filter("date", (date, dateStyle, locale) => {
  if (!_.isNil(date)) {
    return FormatService.date(date, dateStyle, locale);
  }

  return date;
})

Vue.filter("time", (time, timeStyle, locale) => {
  return FormatService.time(time, timeStyle, locale);
})

new Vue({
  router,
  store,
  i18n,
  vuetify,
  render: (h) => h(App),

  created() {
    this.initializeApp();
    this.initializeTheme();
  },
  mounted() {
    this.loadUsersnap();
  },
  methods: {
    ...mapActions({
      updateUser: "user/update",
      deleteUser: "user/delete",
      initDarkMode: "theme/initDarkMode",
    }),
    initializeApp() {
      const userName = PersistenceService.getFromLocalStorage("user");
      if (userName) {
        this.updateUser(userName)
          .catch(() => {
            console.log("error");
          });
      } else {
        this.deleteUser()
      }
    },
    loadUsersnap() {
      window.onUsersnapLoad = function(api) {
        api.init();
      };
      const script = document.createElement("script");
      script.defer = true;
      script.src = `https://widget.usersnap.com/load/${process.env.VUE_APP_USERSNAP_API_KEY}?onload=onUsersnapLoad`;
      document.getElementsByTagName("head")[0].appendChild(script);
    },
    initializeTheme() {
      // Initialize dark mode from localStorage
      this.initDarkMode().then(isDarkMode => {
        this.$vuetify.theme.dark = isDarkMode;
      });
    },
  },
}).$mount("#app");

import "@mdi/font/css/materialdesignicons.css"

import Vue from "vue"
import Vuetify from "vuetify/lib/framework";

Vue.use(Vuetify)

const vuetify = new Vuetify({
  treeShake: true,
  customVariables: ["~/src/scss/variables.scss"],
  icons: {
    iconfont: "mdi",
  },
  options: {
    customProperties: true,
  },
  theme: {
    options: {
      customProperties: true,
    },
    themes: {
      light: {
        primary: process.env.VUE_APP_PRIMARY_COLOR || "#0099DB",
        secondary: process.env.VUE_APP_SECONDARY_COLOR  || "#FFCC00",
        accent:  process.env.VUE_APP_ACCENT_COLOR || "#e5f5fc",
        error: process.env.VUE_APP_ERROR_COLOR || "#FF5252",
        info: process.env.VUE_APP_INFO_COLOR || "#2196F3",
        success: process.env.VUE_APP_SUCCESS_COLOR || "#4CAF50",
        warning: process.env.VUE_APP_WARNING_COLOR || "#FB8C00",
        body: process.env.VUE_APP_BODY_COLOR || "#707070",
        darkgrey: process.env.VUE_APP_DARKGREY_COLOR || "#3b3b3b"
      },
      dark: {
        primary: process.env.VUE_APP_PRIMARY_COLOR_DARK || "#0099DB",
        secondary: process.env.VUE_APP_SECONDARY_COLOR_DARK || "#FFCC00",
        accent: process.env.VUE_APP_ACCENT_COLOR_DARK || "#282828",
        error: process.env.VUE_APP_ERROR_COLOR_DARK || "#FF5252",
        info: process.env.VUE_APP_INFO_COLOR_DARK ||"#2196F3",
        success: process.env.VUE_APP_SUCCESS_COLOR_DARK || "#4CAF50",
        warning: process.env.VUE_APP_WARNING_COLOR_DARK || "#FB8C00",
        darkgrey: process.env.VUE_APP_DARKGREY_COLOR_DARK || "#f5f5f5"
      },
    },
  },
})

export default vuetify

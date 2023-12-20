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
    themes: {
      light: {
        primary: "#0099DB",
        secondary: "#FFCC00",
        accent: "#e5f5fc",
        error: "#FF5252",
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FB8C00",
        body: "#707070",
        darkgrey: "#3b3b3b"
      },
      dark: {
        primary: "#0099DB",
        secondary: "#FFCC00",
        accent: "#282828",
        error: "#FF5252",
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FB8C00",
        darkgrey: "#f5f5f5"
      },
    },
  },
})

export default vuetify

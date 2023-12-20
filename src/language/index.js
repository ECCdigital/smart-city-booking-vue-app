import Vue from "vue";
import VueI18n from "vue-i18n";
import de from "./de/translations.json";

const locale = "de";
const messages = {
  de: de,
}

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale,
  fallbackLocale: locale,
  messages,
});

i18n.supportedLanguages = ["de"];

export default i18n;

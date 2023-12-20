import i18n from "../language/index";

export default {
  createToast(key, type, timeout = 4000) {
    return {
      title: i18n.t(`${key}.title`),
      message: i18n.t(`${key}.message`),
      type: type,
      timeout: timeout
    }
  },
};

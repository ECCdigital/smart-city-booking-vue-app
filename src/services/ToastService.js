import i18n from "../language/index";

export default {
  createToast(key, type, timeout = 5000) {
    return {
      title: i18n.t(`${key}.title`),
      message: i18n.t(`${key}.message`),
      type: type,
      timeout: timeout,
    };
  },
  createBookingValidationToast(detail, timeout = 5000) {
    const key = `booking.validation.${detail.field}.${detail.code}`;
    const fallback = "booking.validation.fallback";

    const title = i18n.te(`${key}.title`)
      ? i18n.t(`${key}.title`, detail.params)
      : i18n.t(`${fallback}.title`);

    const message = i18n.te(`${key}.message`)
      ? i18n.t(`${key}.message`, detail.params)
      : i18n.t(`${fallback}.message`);

    return {
      title,
      message,
      type: "error",
      timeout,
    };
  },
};

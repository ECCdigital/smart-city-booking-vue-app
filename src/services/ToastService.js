import i18n from "../language/index";
import { bookingValidationText } from "@/services/api/apiErrorMessage";

export default {
  createToast(key, type, timeout = 5000, params) {
    return {
      title: i18n.t(`${key}.title`, params),
      message: i18n.t(`${key}.message`, params),
      type: type,
      timeout: timeout,
    };
  },
  createBookingValidationToast(detail, timeout = 5000) {
    const fallback = "booking.validation.fallback";

    const title =
      bookingValidationText(detail, "title") ?? i18n.t(`${fallback}.title`);
    const message =
      bookingValidationText(detail, "message") ?? i18n.t(`${fallback}.message`);

    return {
      title,
      message,
      type: "error",
      timeout,
    };
  },
};

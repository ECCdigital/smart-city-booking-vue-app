import i18n from "@/language/index";

function getReason(data) {
  if (!data) {
    return null;
  }
  if (typeof data === "string") {
    return data;
  }
  return data.reason || data.error || null;
}

function resolveCheckoutMessageKey(reason) {
  if (!reason) {
    return null;
  }

  const candidates = [reason, `checkout.${reason}`, `checkout.error.${reason}`];
  for (const key of candidates) {
    if (i18n.te(`${key}.message`)) {
      return key;
    }
  }

  return null;
}

export function formatCheckoutValidationError(data) {
  const reason = getReason(data);
  const messageKey = resolveCheckoutMessageKey(reason);

  if (messageKey) {
    return i18n.t(`${messageKey}.message`);
  }

  if (typeof data?.error === "string" && !data.error.startsWith("checkout.")) {
    return data.error;
  }

  if (typeof data?.debugMessage === "string") {
    return data.debugMessage;
  }

  return i18n.t("checkout.error.unexpected.message");
}

/**
 * Whether the backend refused a completion for want of a sign-in:
 * its 401 `checkout.login_required`, or the 401 of
 * a session that ended on the way and could not be renewed.
 */
export function isLoginRefusal(error) {
  return error?.response?.status === 401;
}

export const LOGIN_REQUIRED_TOAST_KEY = "checkout.login_required";

/**
 * Whether the backend refused a begin in the past,
 * a refusal of the self-booking alone: the staff books backwards.
 */
export function isTimeInPastRefusal(data) {
  return getReason(data) === "checkout.time_in_past";
}

export function getCheckoutErrorToastKey(data) {
  const reason = getReason(data);
  const messageKey = resolveCheckoutMessageKey(reason);

  if (messageKey) {
    return messageKey;
  }

  return "checkout.error.unexpected";
}

/**
 * The group checkout refuses an offer it cannot find with a bare
 * `404 "Bookable not found"`, without a reason code.
 */
export function getGroupCheckoutErrorToastKey(error) {
  if (error?.response?.status === 404) {
    return "checkout.bookable_not_found";
  }
  return getCheckoutErrorToastKey(error?.response?.data);
}

export function getBlockPeriodUnavailableLabel(reason) {
  const key = `checkout.block_period.unavailable.${reason}`;
  if (i18n.te(key)) {
    return i18n.t(key);
  }
  return i18n.t("checkout.block_period.unavailable.default");
}

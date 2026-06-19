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

  if (i18n.te(`${reason}.message`)) {
    return reason;
  }

  const nestedKey = `checkout.error.${reason}`;
  if (i18n.te(`${nestedKey}.message`)) {
    return nestedKey;
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

export function getCheckoutErrorToastKey(data) {
  const reason = getReason(data);
  const messageKey = resolveCheckoutMessageKey(reason);

  if (messageKey) {
    return messageKey;
  }

  return "checkout.error.unexpected";
}

export function getBlockPeriodUnavailableLabel(reason) {
  const key = `checkout.block_period.unavailable.${reason}`;
  if (i18n.te(key)) {
    return i18n.t(key);
  }
  return i18n.t("checkout.block_period.unavailable.default");
}

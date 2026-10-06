import i18n from "@/language/index";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

const FIELD_LABEL_PREFIX = "accessPoint.management.fields";
const RULE_LABEL_PREFIX = "accessPoint.management.ruleTypes";
const CODE_LABEL_PREFIX = "accessPoint.management.errors.codes";
const OPEN_ACTION_LABEL_PREFIX = "accessPoint.management.openActions";

/**
 * Translate a value the API named - a field, a rule type, a validation code.
 * Unknown values fall back to the raw value: a name the admin can quote is
 * better than an empty spot. A key that resolves to a group of keys rather
 * than a sentence - `fields.config`, which holds the name of `config.openAction` -
 * counts as unknown for the same reason.
 */
function translateOrRaw(prefix, value) {
  const key = `${prefix}.${value}`;
  if (!i18n.te(key)) return value;
  const translated = i18n.t(key);
  return typeof translated === "string" ? translated : value;
}

/**
 * A rule was switched on although the access point does not carry what the
 * rule needs - the one error of the management API that is meaningless as a
 * raw payload, because the fix is always "fill in the listed fields first".
 */
function formatPrecondition(detail) {
  const requires = Array.isArray(detail.params?.requires)
    ? detail.params.requires
    : [];

  return i18n.t("accessPoint.management.errors.preconditionFailed", {
    rule: translateOrRaw(RULE_LABEL_PREFIX, detail.params?.ruleType),
    requires: requires
      .map((field) => translateOrRaw(FIELD_LABEL_PREFIX, field))
      .join(", "),
  });
}

/**
 * A bookable references an access point the tenant does not have - a door
 * that was deleted while the editor was open. The raw payload only carries the
 * id, so the message has to say what the id means and how to get rid of it.
 */
function formatUnknownAccessPoint(detail) {
  return i18n.t("accessPoint.management.errors.unknownAccessPoint", {
    id: detail.params?.accessPointId,
  });
}

/**
 * The Öffnungsart was saved against a lock that cannot carry it out - a device
 * swapped behind a door that keeps its configuration. The raw payload names
 * the codes only, so the message translates both what was asked for and what
 * the lock can do; the list is there to pick from, not to act on.
 */
function formatUnsupportedOpenAction(detail) {
  const supported = Array.isArray(detail.params?.supportedOpenActions)
    ? detail.params.supportedOpenActions
    : [];

  const openAction = translateOrRaw(
    OPEN_ACTION_LABEL_PREFIX,
    detail.params?.openAction
  );

  // A backend that names no alternative - it always knows at least
  // "Automatisch" - leaves the sentence at what it does say.
  if (supported.length === 0) {
    return i18n.t(
      "accessPoint.management.errors.unsupportedOpenActionWithoutList",
      { openAction }
    );
  }

  return i18n.t("accessPoint.management.errors.unsupportedOpenAction", {
    openAction,
    supportedOpenActions: supported
      .map((value) => translateOrRaw(OPEN_ACTION_LABEL_PREFIX, value))
      .join(", "),
  });
}

function formatDetail(detail) {
  if (detail.code === "precondition_failed") {
    return formatPrecondition(detail);
  }

  if (detail.code === "unknown_access_point") {
    return formatUnknownAccessPoint(detail);
  }

  if (detail.code === "unsupported_open_action") {
    return formatUnsupportedOpenAction(detail);
  }

  return i18n.t("accessPoint.management.errors.fieldInvalid", {
    field: translateOrRaw(FIELD_LABEL_PREFIX, detail.field),
    reason: translateOrRaw(CODE_LABEL_PREFIX, detail.code),
  });
}

/** Every fault of a detail list as one sentence. */
function formatDetails(details) {
  return details.map((detail) => formatDetail(detail)).join(" ");
}

/**
 * Turn an error of the access point management API into a sentence an admin
 * can act on.
 *
 * @param {Object} error The rejected axios error
 * @param {Object} [options] `fallbackKey` for errors without a known shape
 * @returns {string} A message ready to be shown
 */
export function formatAccessPointErrorMessage(
  error,
  {
    fallbackKey = "accessPoint.management.errors.generic",
    forbiddenKey = "accessPoint.management.errors.forbidden",
  } = {}
) {
  const response = error?.response;
  const status = response?.status;
  const details = response?.data?.details;

  if (Array.isArray(details) && details.length > 0) {
    return formatDetails(details);
  }

  // Since 4.3.x a record outside the caller's reach answers 404 instead of
  // 403, on purpose: the existence of a foreign record must not leak. A 404
  // therefore means "gone" *or* "not yours" and the message may claim neither
  // - least of all the reload it used to ask for, which fixes neither case.
  if (status === 404) {
    return i18n.t("accessPoint.management.errors.notFoundOrForbidden");
  }

  // A denial keeps the caller's own sentence; every caller has one today, and
  // `forbiddenKey: null` hands the 403 to the central reader instead.
  if (forbiddenKey && status === 403) {
    return i18n.t(forbiddenKey);
  }

  // Every status this helper does not own goes to the central reader, which
  // owns the status-to-message table - the 403 `code` map today, the BFF's own
  // status for a stale CSRF token once that lands. That is what lets a new
  // status arrive here without a third status check being added.
  //
  // 400 is not handed over: the bad request of this API is a detail list
  // (above), and its `message` is the bare token `validation_failed`, which
  // the branches below drop on purpose in favour of the caller's sentence.
  if (status !== 400) {
    const central = getApiErrorMessage(error, null);
    if (central) {
      return central;
    }
  }

  // Endpoints outside the access point API answer a bad request with a bare
  // string instead of a detail list; that string is already the message.
  if (typeof response?.data === "string" && response.data) {
    return response.data;
  }

  // A blob response body (QR download) carries no readable message.
  const message = response?.data?.message;
  if (
    typeof message === "string" &&
    message &&
    message !== "validation_failed"
  ) {
    return message;
  }

  return i18n.t(fallbackKey);
}

/**
 * A failed save, split between one field and the rest of the form. A bad
 * request names the field it refused, and a form that edits that field in a
 * control of its own shows the fault there rather than in the alert below it -
 * while everything else, another field or a provider that did not answer,
 * stays one sentence for that alert.
 *
 * @param {Object} error The rejected axios error
 * @param {string} field The JSON path of the field with a control of its own,
 *   as the API names it (e.g. "config.openAction")
 * @param {Object} [options] Passed on for errors without a detail list
 * @returns {{fieldMessage: string, message: string}} What to show at the field
 *   and what to show in the alert; either may be empty
 */
export function splitAccessPointFieldError(error, field, options) {
  const response = error?.response;
  const details =
    response?.status === 400 && Array.isArray(response.data?.details)
      ? response.data.details
      : [];
  const atField = details.filter((detail) => detail.field === field);
  const elsewhere = details.filter((detail) => detail.field !== field);

  if (elsewhere.length === 0 && atField.length > 0) {
    return { fieldMessage: formatDetails(atField), message: "" };
  }
  return {
    fieldMessage: formatDetails(atField),
    message:
      elsewhere.length > 0
        ? formatDetails(elsewhere)
        : formatAccessPointErrorMessage(error, options),
  };
}

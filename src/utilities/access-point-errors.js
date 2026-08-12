import i18n from "@/language/index";

const FIELD_LABEL_PREFIX = "accessPoint.management.fields";
const RULE_LABEL_PREFIX = "accessPoint.management.ruleTypes";
const CODE_LABEL_PREFIX = "accessPoint.management.errors.codes";

/**
 * Translate a value the API named - a field, a rule type, a validation code.
 * Unknown values fall back to the raw value: a name the admin can quote is
 * better than an empty spot.
 */
function translateOrRaw(prefix, value) {
  const key = `${prefix}.${value}`;
  return i18n.te(key) ? i18n.t(key) : value;
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

function formatDetail(detail) {
  if (detail.code === "precondition_failed") {
    return formatPrecondition(detail);
  }

  return i18n.t("accessPoint.management.errors.fieldInvalid", {
    field: translateOrRaw(FIELD_LABEL_PREFIX, detail.field),
    reason: translateOrRaw(CODE_LABEL_PREFIX, detail.code),
  });
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
  { fallbackKey = "accessPoint.management.errors.generic" } = {}
) {
  const response = error?.response;
  const details = response?.data?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details.map((detail) => formatDetail(detail)).join(" ");
  }

  if (response?.status === 403) {
    return i18n.t("accessPoint.management.errors.forbidden");
  }

  if (response?.status === 404) {
    return i18n.t("accessPoint.management.errors.notFound");
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

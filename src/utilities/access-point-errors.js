const FIELD_LABEL_PREFIX = "accessPoint.management.fields";
const RULE_LABEL_PREFIX = "accessPoint.management.ruleTypes";
const CODE_LABEL_PREFIX = "accessPoint.management.errors.codes";

function translateField(field, translate) {
  const key = `${FIELD_LABEL_PREFIX}.${field}`;
  const label = translate(key);
  return label === key ? field : label;
}

function translateRuleType(ruleType, translate) {
  const key = `${RULE_LABEL_PREFIX}.${ruleType}`;
  const label = translate(key);
  return label === key ? ruleType : label;
}

/**
 * A rule was switched on although the access point does not carry what the
 * rule needs - the one error of the management API that is meaningless as a
 * raw payload, because the fix is always "fill in the listed fields first".
 */
function formatPrecondition(detail, translate) {
  const requires = Array.isArray(detail.params?.requires)
    ? detail.params.requires
    : [];

  return translate("accessPoint.management.errors.preconditionFailed", {
    rule: translateRuleType(detail.params?.ruleType, translate),
    requires: requires
      .map((field) => translateField(field, translate))
      .join(", "),
  });
}

function formatDetail(detail, translate) {
  if (detail.code === "precondition_failed") {
    return formatPrecondition(detail, translate);
  }

  const codeKey = `${CODE_LABEL_PREFIX}.${detail.code}`;
  const reason = translate(codeKey);

  return translate("accessPoint.management.errors.fieldInvalid", {
    field: translateField(detail.field, translate),
    reason: reason === codeKey ? detail.code : reason,
  });
}

/**
 * Turn an error of the access point management API into a sentence an admin
 * can act on.
 *
 * @param {Object} error The rejected axios error
 * @param {Function} translate `$t` of the calling component
 * @param {Object} [options] `fallbackKey` for errors without a known shape
 * @returns {string} A message ready to be shown
 */
export function formatAccessPointErrorMessage(
  error,
  translate,
  { fallbackKey = "accessPoint.management.errors.generic" } = {}
) {
  const response = error?.response;
  const details = response?.data?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details.map((detail) => formatDetail(detail, translate)).join(" ");
  }

  if (response?.status === 403) {
    return translate("accessPoint.management.errors.forbidden");
  }

  if (response?.status === 404) {
    return translate("accessPoint.management.errors.notFound");
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

  return translate(fallbackKey);
}

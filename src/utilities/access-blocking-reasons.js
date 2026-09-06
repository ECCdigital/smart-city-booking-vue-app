/**
 * Why an access point stays shut, in the vocabulary of the backend
 * (`access-blocking-reasons.js` there). Mirrored as constants so a typo does
 * not silently fall into "unknown" - and so this UI can name a reason itself
 * where it knows one before asking.
 *
 * `locker_not_ready` is deliberately absent: the backend dropped it from its
 * enum in 4.3.x, so it can no longer arrive.
 */
export const ACCESS_BLOCKING_REASON = Object.freeze({
  REJECTED: "rejected",
  NOT_COMMITTED: "not_committed",
  PAYMENT_REQUIRED: "payment_required",
  AUTHORIZATION_REVOKED: "authorization_revoked",
  OUTSIDE_ACCESS_WINDOW: "outside_access_window",
  NOT_PROVISIONED: "not_provisioned",
  NO_REMOTE_ACCESS: "no_remote_access",
  EVIDENCE_MISSING: "evidence_missing",
  EVIDENCE_INVALID: "evidence_invalid",
  EVIDENCE_RULE_UNAVAILABLE: "evidence_rule_unavailable",
});

const ACCESS_BLOCKING_REASON_KEYS = Object.freeze(
  Object.values(ACCESS_BLOCKING_REASON)
);

/**
 * The failure classes a provider error is reduced to before it leaves the
 * server (`AccessOpenError`): something the administration has to put right,
 * or something that may work again in a few minutes. The provider's own
 * detail stays in the audit log.
 */
const OPEN_FAILURE = Object.freeze({
  CONFIGURATION: "configuration",
  TEMPORARY: "temporary",
});

const OPEN_FAILURE_CLASSES = Object.freeze(Object.values(OPEN_FAILURE));

const UNKNOWN_REASON_KEY = "accessPoint.blockingReasons.unknown";

/**
 * The message for a refusal the access decision made.
 *
 * @param {string[]} blockingReasons The reasons, most important first
 * @param {(key: string) => string} translate Translator, usually `$t`
 * @param {Object} [options]
 * @param {string} [options.fallbackKey] What to say when no reason was given
 * @returns {string} The translated message
 */
export function formatBlockingReasonMessage(
  blockingReasons,
  translate,
  { fallbackKey = "accessPoint.open.error.message" } = {}
) {
  const primary = Array.isArray(blockingReasons) ? blockingReasons[0] : null;
  if (!primary) {
    return translate(fallbackKey);
  }

  const reasonKey = `accessPoint.blockingReasons.${primary}`;
  if (ACCESS_BLOCKING_REASON_KEYS.includes(primary)) {
    return translate(reasonKey);
  }

  return translate(UNKNOWN_REASON_KEY);
}

/**
 * The message for an open that came back refused. Both refusals travel on
 * HTTP 200 in the `data` of a soft failure and are told apart by which field
 * is set: `blockingReasons` where the access decision said no, `openFailure`
 * where the decision passed and the provider then failed.
 *
 * @param {Object} refusal The `data` of the soft failure
 * @param {string[]} [refusal.blockingReasons] Reasons of the decision
 * @param {string} [refusal.openFailure] Failure class of the provider
 * @param {(key: string) => string} translate Translator, usually `$t`
 * @param {Object} [options] As of {@link formatBlockingReasonMessage}
 * @returns {string} The translated message
 */
export function formatOpenRefusalMessage(refusal, translate, options = {}) {
  const openFailure = refusal?.openFailure;

  if (openFailure) {
    return translate(
      OPEN_FAILURE_CLASSES.includes(openFailure)
        ? `accessPoint.openFailure.${openFailure}`
        : UNKNOWN_REASON_KEY
    );
  }

  return formatBlockingReasonMessage(
    refusal?.blockingReasons,
    translate,
    options
  );
}

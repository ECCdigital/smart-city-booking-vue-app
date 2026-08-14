/**
 * Der Grund, den ein Client selbst benennen muss: Er weiß vor jedem Aufruf,
 * dass er keinen Nachweis mitschicken kann. Als Konstante, damit ein Vertipper
 * nicht stillschweigend in "unknown" fällt.
 */
export const EVIDENCE_MISSING_BLOCKING_REASON = "evidence_missing";

const ACCESS_BLOCKING_REASON_KEYS = Object.freeze([
  "rejected",
  "not_committed",
  "payment_required",
  "authorization_revoked",
  "outside_access_window",
  "not_provisioned",
  "locker_not_ready",
  "no_remote_access",
  EVIDENCE_MISSING_BLOCKING_REASON,
  "evidence_invalid",
  "evidence_rule_unavailable",
]);

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

  return translate("accessPoint.blockingReasons.unknown");
}

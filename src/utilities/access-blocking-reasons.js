const ACCESS_BLOCKING_REASON_KEYS = Object.freeze([
  "rejected",
  "not_committed",
  "payment_required",
  "authorization_revoked",
  "outside_access_window",
  "not_provisioned",
  "locker_not_ready",
  "no_remote_access",
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

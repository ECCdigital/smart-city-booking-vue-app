import i18n from "@/language/index";

/**
 * The suspension of a user (glossary „Sperre (eines Users)“,
 * ECCdigital/tickets#624): what the card „Sperre“, its dialog and the list
 * of users read from `user.isSuspended` and `user.suspension`.
 */

/** The origin of a suspension; one stored without a record is by hand. */
function originOf(user) {
  return user?.suspension?.origin || "manual";
}

/** The origin of a user's suspension in words, "" for an active account. */
export function suspensionOriginLabel(user) {
  if (!user?.isSuspended) return "";
  return i18n.t(`user.suspension.origin.${originOf(user)}`);
}

/**
 * The state of the card „Sperre“: who suspended when, or only „Gesperrt
 * von Hand“ for a suspension stored without those details.
 */
export function suspensionStatusText(user) {
  if (!user?.isSuspended) return i18n.t("user.suspension.status.active");
  const { suspendedAt, suspendedBy } = user.suspension || {};
  const origin = suspensionOriginLabel(user);
  if (!suspendedAt || !suspendedBy) {
    return i18n.t("user.suspension.status.suspended", { origin });
  }
  return i18n.t("user.suspension.status.suspended-with-record", {
    origin,
    date: new Date(suspendedAt).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    by: suspendedBy,
  });
}

/** The reason of the suspension for its own line on the card, "" without one. */
export function suspensionReasonText(user) {
  const reason = user?.isSuspended && user.suspension?.reason;
  return reason ? i18n.t("user.suspension.status.reason", { reason }) : "";
}

/**
 * The table of consequences in the dialog: what ends with the suspension
 * and what stays, with the counts of the preview.
 *
 * @param {{bookings: number, memberships: number}} preview
 * @returns {{label: string, ends: boolean, stays: string|null}[]}
 */
export function suspensionConsequences({ bookings, memberships }) {
  const row = (key, ends, values) => ({
    label: values
      ? i18n.tc(
          `user.suspension.consequences.${key}.label`,
          values.count,
          values
        )
      : i18n.t(`user.suspension.consequences.${key}.label`),
    ends,
    stays: ends ? null : i18n.t(`user.suspension.consequences.${key}.stays`),
  });
  return [
    row("admin-sign-in", true),
    row("catalog-sign-in", true),
    row("sessions", true),
    row("guest-booking", false),
    row("registration", false),
    row("bookings", false, { count: bookings }),
    row("memberships", false, { count: memberships }),
  ];
}

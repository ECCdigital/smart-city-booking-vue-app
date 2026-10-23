import i18n from "@/language/index";

/**
 * The suspension of a user (glossary „Sperre (eines Users)“):
 * what the card „Sperre“, its dialog and the list
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
 * The state of the card „Sperre“: who suspended when, by hand or by which
 * blacklist entry, or only „Gesperrt von Hand“ for a suspension stored
 * without those details.
 */
export function suspensionStatusText(user) {
  if (!user?.isSuspended) return i18n.t("user.suspension.status.active");
  const { suspendedAt, suspendedBy } = user.suspension || {};
  const origin = suspensionOriginLabel(user);
  if (!suspendedAt || !suspendedBy) {
    return i18n.t("user.suspension.status.suspended", { origin });
  }
  const date = new Date(suspendedAt).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // A blacklist entry names itself.
  const entry = user.suspension.blacklistEntry?.value;
  if (entry) {
    return i18n.t("user.suspension.status.suspended-by-blacklist", {
      entry,
      date,
      by: suspendedBy,
    });
  }
  return i18n.t("user.suspension.status.suspended-with-record", {
    origin,
    date,
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
 * and what stays, with the counts of the preview. With the address on the
 * blacklist guest bookings and registration end too.
 *
 * @param {{bookings: number, memberships: number}} preview
 * @param {{blacklisted?: boolean}} [options]
 * @returns {{label: string, ends: boolean, stays: string|null}[]}
 */
export function suspensionConsequences(
  { bookings, memberships },
  { blacklisted = false } = {}
) {
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
    row("guest-booking", blacklisted),
    row("registration", blacklisted),
    row("bookings", false, { count: bookings }),
    row("memberships", false, { count: memberships }),
  ];
}

/** The hint below the checkbox „auch auf die Blacklist“, following it. */
export function suspensionBlacklistHint(blacklisted) {
  return i18n.t(
    `user.suspension.suspend.blacklist-hint.${blacklisted ? "on" : "off"}`
  );
}

/**
 * Whether the user's address is on the blacklist, from `blacklistMatch` of
 * the user answers: by an exact entry, by its
 * domain or not at all.
 */
export function blacklistMatchText(user) {
  const match = user?.blacklistMatch;
  if (!match) return i18n.t("user.suspension.blacklist.none");
  if (match.kind === "domain") {
    return i18n.t("user.suspension.blacklist.domain", { entry: match.value });
  }
  return i18n.t("user.suspension.blacklist.address");
}

/**
 * What the suspension settles, for its dialog: per
 * reporting tenant the open reports and the tenant owners who then get a
 * mail, from `openReports` of the preview.
 *
 * @param {{tenantId: string, tenantName: string, reports: number, owners: string[]}[]} [openReports]
 * @returns {{tenantId: string, text: string, owners: string}[]}
 */
export function suspensionReportNotes(openReports) {
  return (openReports || []).map(
    ({ tenantId, tenantName, reports, owners }) => ({
      tenantId,
      text: i18n.tc("user.suspension.suspend.reports", reports, {
        count: reports,
        tenant: tenantName,
      }),
      owners: owners?.length
        ? i18n.t("user.suspension.suspend.reports-owners", {
            owners: owners.join(", "),
          })
        : i18n.t("user.suspension.suspend.reports-no-owners"),
    })
  );
}

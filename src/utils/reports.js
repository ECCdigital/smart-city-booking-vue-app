/**
 * The reports to the instance (glossary „Meldung (eines Users oder einer
 * Adresse)“) as the review queue shows the open
 * ones: one group per reported user or address,
 * the reports of different tenants apart within it, the one waiting
 * longest first. And as the tenant lists its own, with their standing.
 */
import { addressesOf, parseBlacklistValue } from "@/utils/blacklist";

/** The status of a report as the backend names it. */
export const REPORT_STATUS = Object.freeze({
  OPEN: "open",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
  // A report about an address settled with a blacklist entry.
  BLACKLISTED: "blacklisted",
  WITHDRAWN: "withdrawn",
});

/**
 * The reasons of a report in order: the first, then those added to it.
 *
 * @param {Object} report
 * @returns {{reason: string, reportedBy: string, reportedAt: number, bookingId: string|null}[]}
 */
export function reportReasons(report) {
  return [report, ...(report.additions || [])].map(
    ({ reason, reportedBy, reportedAt, bookingId }) => ({
      reason,
      reportedBy,
      reportedAt,
      bookingId: bookingId ?? null,
    })
  );
}

/**
 * Groups the open reports by the reported user or address: `userId` for
 * a user, `address` for the address of a guest,
 * the other one `null`; `key` tells the groups apart.
 *
 * @param {Object[]} reports The answer of `GET /api/instances/reports`
 * @returns {{key: string, userId: string|null, address: string|null, name: string, suspended: boolean, since: number, reports: Object[]}[]}
 */
export function groupOpenReports(reports) {
  const groups = new Map();
  const open = (reports || [])
    .filter((report) => report.status === REPORT_STATUS.OPEN)
    .sort((a, b) => a.reportedAt - b.reportedAt);
  for (const report of open) {
    const address = report.targetUserId ? null : report.targetAddress ?? null;
    const key = address ? `address:${address}` : `user:${report.targetUserId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        userId: address ? null : report.targetUserId,
        address,
        name: report.targetName || report.targetUserId || address,
        suspended: report.targetSuspended === true,
        since: report.reportedAt,
        reports: [],
      };
      groups.set(key, group);
    }
    group.reports.push(report);
  }
  return [...groups.values()];
}

/**
 * The addresses of a booking's `mail` a tenant may report:
 * each once, trimmed and in lower case as the
 * backend compares them, without what is no address.
 *
 * @param {*} mail One address or a list, as `mail` of a booking
 * @returns {string[]}
 */
export function reportableAddresses(mail) {
  const addresses = addressesOf(mail)
    .map(parseBlacklistValue)
    .filter((parsed) => parsed?.kind === "address")
    .map((parsed) => parsed.value);
  return [...new Set(addresses)];
}

/**
 * The blacklist entry that settles the reports about an address, as its
 * dialog offers it: the exact address or its
 * domain, and the reasons of the reports, each once, as the reason.
 *
 * @param {{address: string, reports: Object[]}} group A group of
 *   `groupOpenReports` about an address
 * @returns {{address: string, domain: string, reason: string}}
 */
export function blacklistDraftOf(group) {
  const reasons = group.reports.flatMap((report) =>
    reportReasons(report).map((entry) => entry.reason)
  );
  return {
    address: group.address,
    domain: group.address.slice(group.address.indexOf("@")),
    reason: [...new Set(reasons)].join("\n"),
  };
}

/**
 * The tenant's own reports as its list shows them: the open ones first,
 * then the newest. Each row names the standing of its report and whether
 * the tenant may still add to it or withdraw it, which only an open one
 * allows, and one about a tenant owner only to a tenant owner.
 *
 * @param {Object[]} reports The answer of `GET /api/tenants/:tenant/reports`
 * @param {{mayChangeOwnerReports?: boolean}} [options]
 * @returns {{report: Object, name: string, standing: string, editable: boolean, rejectionReason: string|null}[]}
 */
export function tenantReportRows(
  reports,
  { mayChangeOwnerReports = false } = {}
) {
  const isOpen = (report) => report.status === REPORT_STATUS.OPEN;
  return [...(reports || [])]
    .sort(
      (a, b) =>
        Number(isOpen(b)) - Number(isOpen(a)) || b.reportedAt - a.reportedAt
    )
    .map((report) => ({
      report,
      name: report.targetName || report.targetUserId || report.targetAddress,
      standing: report.status,
      editable:
        isOpen(report) &&
        (mayChangeOwnerReports || report.targetTenantOwner !== true),
      rejectionReason:
        report.status === REPORT_STATUS.REJECTED
          ? report.rejectionReason ?? null
          : null,
    }));
}

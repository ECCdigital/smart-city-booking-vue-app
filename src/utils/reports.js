/**
 * The reports to the instance (glossary „Meldung (eines Users oder einer
 * Adresse)“, ECCdigital/tickets#630) as the review queue shows the open
 * ones: one group per reported user, the reports of different tenants
 * apart within it, the user waiting longest first. And as the tenant
 * lists its own, with their standing (ECCdigital/tickets#631).
 */

/** The status of a report as the backend names it. */
export const REPORT_STATUS = Object.freeze({
  OPEN: "open",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
  // A report about an address settled with a blacklist entry
  // (ECCdigital/tickets#632).
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
 * Groups the open reports by the reported user.
 *
 * @param {Object[]} reports The answer of `GET /api/instances/reports`
 * @returns {{userId: string, name: string, suspended: boolean, since: number, reports: Object[]}[]}
 */
export function groupOpenReports(reports) {
  const groups = new Map();
  const open = (reports || [])
    .filter((report) => report.status === REPORT_STATUS.OPEN)
    .sort((a, b) => a.reportedAt - b.reportedAt);
  for (const report of open) {
    let group = groups.get(report.targetUserId);
    if (!group) {
      group = {
        userId: report.targetUserId,
        name: report.targetName || report.targetUserId,
        suspended: report.targetSuspended === true,
        since: report.reportedAt,
        reports: [],
      };
      groups.set(report.targetUserId, group);
    }
    group.reports.push(report);
  }
  return [...groups.values()];
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
      name: report.targetName || report.targetUserId,
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

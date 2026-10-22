import { describe, expect, it } from "vitest";
import {
  groupOpenReports,
  reportReasons,
  tenantReportRows,
} from "@/utils/reports";

/** The open reports (glossary „Meldung“, ECCdigital/tickets#630). */
const report = (fields) => ({
  tenantId: "stadt",
  tenantName: "Stadt Musterhausen",
  targetUserId: "erika@example.de",
  targetName: "Erika Muster",
  targetSuspended: false,
  reason: "Beleidigt",
  bookingId: null,
  reportedBy: "rolle@stadt.de",
  additions: [],
  status: "open",
  ...fields,
});

describe("groupOpenReports", () => {
  it("is empty without reports", () => {
    expect(groupOpenReports([])).toEqual([]);
    expect(groupOpenReports(null)).toEqual([]);
  });

  it("groups by user and keeps the reports of different tenants apart", () => {
    const groups = groupOpenReports([
      report({ id: "a", reportedAt: 1 }),
      report({
        id: "b",
        targetUserId: "max@example.de",
        targetName: "Max",
        reportedAt: 2,
      }),
      report({
        id: "c",
        tenantId: "verein",
        tenantName: "Verein",
        reportedAt: 3,
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      userId: "erika@example.de",
      name: "Erika Muster",
      suspended: false,
      since: 1,
    });
    expect(groups[0].reports.map((r) => r.id)).toEqual(["a", "c"]);
    expect(groups[1].reports.map((r) => r.id)).toEqual(["b"]);
  });

  it("puts the user waiting longest first, whatever order the reports come in", () => {
    const groups = groupOpenReports([
      report({ id: "late", targetUserId: "max@example.de", reportedAt: 9 }),
      report({ id: "early", reportedAt: 4 }),
    ]);

    expect(groups.map((group) => group.userId)).toEqual([
      "erika@example.de",
      "max@example.de",
    ]);
  });

  it("leaves out reports that are not open", () => {
    expect(
      groupOpenReports([report({ id: "x", status: "rejected", reportedAt: 1 })])
    ).toEqual([]);
  });

  it("names a user without a name by the address", () => {
    const [group] = groupOpenReports([
      report({ id: "a", targetName: "", reportedAt: 1 }),
    ]);

    expect(group.name).toBe("erika@example.de");
  });
});

describe("reportReasons", () => {
  it("names a report's reasons in order, the added ones after the first", () => {
    expect(
      reportReasons(
        report({
          id: "a",
          reportedAt: 1,
          bookingId: "B-1",
          additions: [
            { reason: "Wieder", reportedBy: "chef@stadt.de", reportedAt: 5 },
          ],
        })
      )
    ).toEqual([
      {
        reason: "Beleidigt",
        reportedBy: "rolle@stadt.de",
        reportedAt: 1,
        bookingId: "B-1",
      },
      {
        reason: "Wieder",
        reportedBy: "chef@stadt.de",
        reportedAt: 5,
        bookingId: null,
      },
    ]);
  });
});

describe("tenantReportRows (ECCdigital/tickets#631)", () => {
  it("is empty without reports", () => {
    expect(tenantReportRows([])).toEqual([]);
    expect(tenantReportRows(null)).toEqual([]);
  });

  it("puts the open reports first, then the newest", () => {
    const rows = tenantReportRows([
      report({ id: "old-open", reportedAt: 1 }),
      report({ id: "rejected", reportedAt: 5, status: "rejected" }),
      report({ id: "new-open", reportedAt: 3 }),
      report({ id: "withdrawn", reportedAt: 4, status: "withdrawn" }),
    ]);

    expect(rows.map((row) => row.report.id)).toEqual([
      "new-open",
      "old-open",
      "rejected",
      "withdrawn",
    ]);
  });

  it("names the standing of each status, and only an open report may change", () => {
    const rows = tenantReportRows([
      report({ id: "o", reportedAt: 5 }),
      report({ id: "s", reportedAt: 4, status: "suspended" }),
      report({ id: "b", reportedAt: 3, status: "blacklisted" }),
      report({
        id: "r",
        reportedAt: 2,
        status: "rejected",
        rejectionReason: "Kein Verstoß",
      }),
      report({ id: "w", reportedAt: 1, status: "withdrawn" }),
    ]);

    expect(
      rows.map(({ standing, editable, rejectionReason }) => ({
        standing,
        editable,
        rejectionReason,
      }))
    ).toEqual([
      { standing: "open", editable: true, rejectionReason: null },
      { standing: "suspended", editable: false, rejectionReason: null },
      { standing: "blacklisted", editable: false, rejectionReason: null },
      {
        standing: "rejected",
        editable: false,
        rejectionReason: "Kein Verstoß",
      },
      { standing: "withdrawn", editable: false, rejectionReason: null },
    ]);
  });

  it("leaves an open report about a tenant owner to the tenant owners", () => {
    const reports = [
      report({ id: "owner", reportedAt: 2, targetTenantOwner: true }),
      report({ id: "member", reportedAt: 1, targetTenantOwner: false }),
    ];

    const editable = (options) =>
      tenantReportRows(reports, options).map((row) => row.editable);

    expect(editable()).toEqual([false, true]);
    expect(editable({ mayChangeOwnerReports: true })).toEqual([true, true]);
  });

  it("names the target by its name, else by its id", () => {
    const [row] = tenantReportRows([
      report({ id: "x", reportedAt: 1, targetName: "" }),
    ]);

    expect(row.name).toBe("erika@example.de");
  });
});

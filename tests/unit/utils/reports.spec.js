import { describe, expect, it } from "vitest";
import { groupOpenReports, reportReasons } from "@/utils/reports";

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

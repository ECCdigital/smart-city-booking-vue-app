import { describe, expect, it } from "vitest";
import {
  blacklistMatchText,
  suspensionBlacklistHint,
  suspensionConsequences,
  suspensionOriginLabel,
  suspensionReasonText,
  suspensionReportNotes,
  suspensionStatusText,
} from "@/utils/userSuspension";

/** The suspension of a user (glossary „Sperre (eines Users)“). */
const SUSPENDED_AT = new Date(2026, 9, 21, 14, 5).getTime();

describe("suspensionStatusText", () => {
  it("names the time and the person of a suspension by hand", () => {
    expect(
      suspensionStatusText({
        isSuspended: true,
        suspension: {
          origin: "manual",
          reason: "Beleidigt Personal",
          suspendedAt: SUSPENDED_AT,
          suspendedBy: "admin@stadt.de",
        },
      })
    ).toBe("Gesperrt von Hand am 21.10.2026 von admin@stadt.de.");
  });

  it("names the entry, the time and the person of a suspension by the blacklist", () => {
    expect(
      suspensionStatusText({
        isSuspended: true,
        suspension: {
          origin: "blacklist",
          reason: "Wegwerfadressen",
          suspendedAt: SUSPENDED_AT,
          suspendedBy: "admin@stadt.de",
          blacklistEntry: { id: "e1", value: "@wegwerf.de" },
        },
      })
    ).toBe(
      "Gesperrt durch Blacklist-Eintrag „@wegwerf.de“ am 21.10.2026 von admin@stadt.de."
    );
  });

  it("reads a suspension without a record as by hand without details", () => {
    const text = "Gesperrt von Hand";
    expect(suspensionStatusText({ isSuspended: true, suspension: null })).toBe(
      text
    );
    expect(
      suspensionStatusText({
        isSuspended: true,
        suspension: {
          origin: "manual",
          reason: null,
          suspendedAt: null,
          suspendedBy: null,
        },
      })
    ).toBe(text);
  });

  it("reads an active account", () => {
    expect(suspensionStatusText({ isSuspended: false })).toBe(
      "Der Account ist aktiv."
    );
  });
});

/** The reason stands on a line of its own below the state of the card. */
describe("suspensionReasonText", () => {
  it("names the reason of a suspension", () => {
    expect(
      suspensionReasonText({
        isSuspended: true,
        suspension: { origin: "manual", reason: "Beleidigt Personal" },
      })
    ).toBe("Grund: Beleidigt Personal");
  });

  it.each([
    [{ isSuspended: true, suspension: null }],
    [{ isSuspended: true, suspension: { origin: "manual", reason: null } }],
    [{ isSuspended: false, suspension: null }],
  ])("is empty without a reason: %j", (user) => {
    expect(suspensionReasonText(user)).toBe("");
  });
});

describe("suspensionOriginLabel", () => {
  it.each([
    [{ isSuspended: true, suspension: { origin: "manual" } }, "von Hand"],
    [{ isSuspended: true, suspension: null }, "von Hand"],
    [{ isSuspended: true, suspension: { origin: "blacklist" } }, "Blacklist"],
    [{ isSuspended: false, suspension: null }, ""],
  ])("reads %j as „%s“", (user, label) => {
    expect(suspensionOriginLabel(user)).toBe(label);
  });
});

describe("suspensionConsequences", () => {
  it("lists what ends and what stays, with the counts of the preview", () => {
    expect(suspensionConsequences({ bookings: 3, memberships: 2 })).toEqual([
      { label: "Im Admin anmelden", ends: true, stays: null },
      {
        label: "Im Katalog anmelden (Passwort, SSO, Karte)",
        ends: true,
        stays: null,
      },
      { label: "Laufende Sitzungen", ends: true, stays: null },
      {
        label: "Als Gast mit dieser Adresse buchen",
        ends: false,
        stays: "weiter möglich",
      },
      {
        label: "Mit dieser Adresse neu registrieren",
        ends: false,
        stays: "kein neues Konto (Adresse belegt)",
      },
      {
        label: "3 bestehende Buchungen",
        ends: false,
        stays: "bleiben, Mandanten entscheiden",
      },
      {
        label: "Mitgliedschaften in 2 Mandanten",
        ends: false,
        stays: "bleiben, ruhen",
      },
    ]);
  });

  /** The checkbox „auch auf die Blacklist“ switches guest and registration. */
  it("ends guest bookings and registration with the address on the blacklist", () => {
    const rows = suspensionConsequences(
      { bookings: 3, memberships: 2 },
      { blacklisted: true }
    );
    expect(rows.slice(3, 5)).toEqual([
      {
        label: "Als Gast mit dieser Adresse buchen",
        ends: true,
        stays: null,
      },
      {
        label: "Mit dieser Adresse neu registrieren",
        ends: true,
        stays: null,
      },
    ]);
    expect(rows.slice(0, 3).every((row) => row.ends)).toBe(true);
    expect(rows.slice(5).some((row) => row.ends)).toBe(false);
  });

  it("leaves guest bookings and registration open without the blacklist", () => {
    const rows = suspensionConsequences(
      { bookings: 3, memberships: 2 },
      { blacklisted: false }
    );
    expect(rows.slice(3, 5).map((row) => [row.ends, row.stays])).toEqual([
      [false, "weiter möglich"],
      [false, "kein neues Konto (Adresse belegt)"],
    ]);
  });

  it("reads one booking and one membership in the singular", () => {
    const rows = suspensionConsequences({ bookings: 1, memberships: 1 });
    expect(rows[5].label).toBe("1 bestehende Buchung");
    expect(rows[6].label).toBe("Mitgliedschaft in 1 Mandanten");
  });
});

/** The hint below the checkbox follows it. */
describe("suspensionBlacklistHint", () => {
  it.each([
    [
      true,
      "Entfernen Sie das Häkchen, wenn die Sperre nur vorläufig ist (z.B. bis zur Klärung einer Meldung).",
    ],
    [
      false,
      "Ohne Blacklist kann mit dieser Adresse weiter als Gast gebucht werden.",
    ],
  ])("reads the checkbox %s", (blacklisted, hint) => {
    expect(suspensionBlacklistHint(blacklisted)).toBe(hint);
  });
});

/** Whether the address is on the blacklist, on the card „Sperre“. */
describe("blacklistMatchText", () => {
  it("names the exact entry", () => {
    expect(
      blacklistMatchText({
        blacklistMatch: { id: "e1", value: "max@firma.de", kind: "address" },
      })
    ).toBe("Die Adresse steht auf der Blacklist.");
  });

  it("names the domain entry that hits the address", () => {
    expect(
      blacklistMatchText({
        blacklistMatch: { id: "e2", value: "@wegwerf.de", kind: "domain" },
      })
    ).toBe(
      "Die Adresse steht über die Domain „@wegwerf.de“ auf der Blacklist."
    );
  });

  it.each([[{ blacklistMatch: null }], [{}]])(
    "says the address is not on the blacklist: %j",
    (user) => {
      expect(blacklistMatchText(user)).toBe(
        "Die Adresse steht nicht auf der Blacklist."
      );
    }
  );
});

describe("suspensionReportNotes", () => {
  it("names none without open reports", () => {
    expect(suspensionReportNotes(undefined)).toEqual([]);
    expect(suspensionReportNotes([])).toEqual([]);
  });

  it("names the reports of each tenant and the owners who get a mail", () => {
    expect(
      suspensionReportNotes([
        {
          tenantId: "stadt",
          tenantName: "Stadt Musterhausen",
          reports: 1,
          owners: ["chef@stadt.de", "vize@stadt.de"],
        },
        { tenantId: "verein", tenantName: "Verein", reports: 2, owners: [] },
      ])
    ).toEqual([
      {
        tenantId: "stadt",
        text: "Die Sperre erledigt die offene Meldung von Stadt Musterhausen.",
        owners:
          "Eine Mail mit dem Ergebnis geht an chef@stadt.de, vize@stadt.de.",
      },
      {
        tenantId: "verein",
        text: "Die Sperre erledigt 2 offene Meldungen von Verein.",
        owners: "Der Mandant hat keinen Besitzer, den eine Mail erreicht.",
      },
    ]);
  });
});

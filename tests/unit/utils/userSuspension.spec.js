import { describe, expect, it } from "vitest";
import {
  suspensionConsequences,
  suspensionOriginLabel,
  suspensionStatusText,
} from "@/utils/userSuspension";

/** The suspension of a user (glossary „Sperre (eines Users)“, ECCdigital/tickets#624). */
const SUSPENDED_AT = new Date(2026, 9, 21, 14, 5).getTime();

describe("suspensionStatusText", () => {
  it("names the time, the person and the reason of a suspension by hand", () => {
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
    ).toBe(
      "Gesperrt von Hand am 21.10.2026 von admin@stadt.de. Grund: Beleidigt Personal"
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

describe("suspensionOriginLabel", () => {
  it.each([
    [{ isSuspended: true, suspension: { origin: "manual" } }, "von Hand"],
    [{ isSuspended: true, suspension: null }, "von Hand"],
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

  it("reads one booking and one membership in the singular", () => {
    const rows = suspensionConsequences({ bookings: 1, memberships: 1 });
    expect(rows[5].label).toBe("1 bestehende Buchung");
    expect(rows[6].label).toBe("Mitgliedschaft in 1 Mandanten");
  });
});

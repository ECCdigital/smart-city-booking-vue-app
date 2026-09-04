import { describe, expect, it } from "vitest";
import {
  ACCESS_STATE,
  OPEN_PROGRESS,
  accessEntriesOf,
  accessState,
  accessStateChip,
  hasCapability,
  isRemotelyOperable,
  openBlockOf,
  openProgressOf,
} from "@/utilities/booking-access-points";
import { ACCESS_BLOCKING_REASON } from "@/utilities/access-blocking-reasons";

const door = (overrides = {}) => ({
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  isProvisioned: false,
  ...overrides,
});

const compartment = (overrides = {}) => ({
  id: "ap-locker:auth-1",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  compartment: "17",
  externalBookingId: "auth-1",
  isProvisioned: true,
  ...overrides,
});

describe("accessState", () => {
  it("reads a compartment without a grant as held", () => {
    expect(
      accessState(
        compartment({ externalBookingId: null, isProvisioned: false })
      )
    ).toBe(ACCESS_STATE.HELD);
  });

  it("reads a provisioned entry as granted", () => {
    expect(accessState(compartment())).toBe(ACCESS_STATE.GRANTED);
  });

  it("reads a compartment that carries a grant but is no longer provisioned as revoked", () => {
    expect(accessState(compartment({ isProvisioned: false }))).toBe(
      ACCESS_STATE.REVOKED
    );
  });

  it("reads a door, which never carries an external booking id, as held or granted", () => {
    expect(accessState(door())).toBe(ACCESS_STATE.HELD);
    expect(accessState(door({ isProvisioned: true }))).toBe(
      ACCESS_STATE.GRANTED
    );
  });
});

describe("accessStateChip", () => {
  it("names one translation key and one colour per state", () => {
    expect(accessStateChip(ACCESS_STATE.HELD).key).toBe(
      "accessPoint.booking.state.held"
    );
    expect(accessStateChip(ACCESS_STATE.GRANTED).color).toBe("success");
    expect(accessStateChip(ACCESS_STATE.REVOKED).color).toBe("error");
  });
});

describe("accessEntriesOf", () => {
  it("reads the entries out of the envelope the API answers with", () => {
    expect(accessEntriesOf({ success: true, data: [door()] })).toEqual([
      door(),
    ]);
  });

  it("reads a bare array as well", () => {
    expect(accessEntriesOf([door()])).toEqual([door()]);
  });

  it("answers an empty list for anything else", () => {
    expect(accessEntriesOf(undefined)).toEqual([]);
    expect(accessEntriesOf({ data: null })).toEqual([]);
  });

  it("puts compartments before doors", () => {
    const entries = accessEntriesOf({
      data: [door(), compartment(), door({ id: "ap-door-2" })],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      "ap-locker:auth-1",
      "ap-door",
      "ap-door-2",
    ]);
  });

  it("keeps the order the API gave within each kind", () => {
    const entries = accessEntriesOf({
      data: [
        compartment({ id: "c-1" }),
        compartment({ id: "c-2" }),
        door({ id: "d-1" }),
        door({ id: "d-2" }),
      ],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      "c-1",
      "c-2",
      "d-1",
      "d-2",
    ]);
  });
});

const HOUR = 60 * 60 * 1000;
const NOW = 1700000000000;

const operable = (overrides = {}) =>
  compartment({
    mode: "remote",
    capabilities: ["open"],
    validationRuleTypes: [],
    accessFrom: NOW - HOUR,
    accessTo: NOW + HOUR,
    ...overrides,
  });

describe("isRemotelyOperable", () => {
  it("is false where the provider declares no open, whatever the mode says", () => {
    expect(
      isRemotelyOperable(operable({ capabilities: [], mode: "both" }))
    ).toBe(false);
  });

  it("is false where the mode leaves no remote way in, though the provider could open", () => {
    expect(
      isRemotelyOperable(
        operable({ capabilities: ["open"], mode: "authorization" })
      )
    ).toBe(false);
  });

  it("is true where the provider can open and the mode allows it remotely", () => {
    expect(isRemotelyOperable(operable({ mode: "remote" }))).toBe(true);
    expect(isRemotelyOperable(operable({ mode: "both" }))).toBe(true);
  });

  it("does not read a missing declaration as permission", () => {
    expect(isRemotelyOperable({})).toBe(false);
    expect(isRemotelyOperable(undefined)).toBe(false);
  });
});

describe("hasCapability", () => {
  it("reads the capabilities of the projection, nothing else", () => {
    expect(hasCapability(operable({ capabilities: ["open"] }), "open")).toBe(
      true
    );
    expect(hasCapability(operable({ capabilities: ["open"] }), "close")).toBe(
      false
    );
    expect(hasCapability(undefined, "getStatus")).toBe(false);
  });
});

describe("openBlockOf", () => {
  it("finds nothing in the way of an operable entry", () => {
    expect(openBlockOf(operable(), { now: NOW })).toBe(null);
  });

  it("names the missing remote access first, before a window that is closed too", () => {
    expect(
      openBlockOf(
        operable({
          capabilities: [],
          accessFrom: NOW + HOUR,
          accessTo: NOW + 2 * HOUR,
        }),
        { now: NOW }
      )
    ).toBe(ACCESS_BLOCKING_REASON.NO_REMOTE_ACCESS);
  });

  it("names the closed window before and after it", () => {
    expect(
      openBlockOf(
        operable({ accessFrom: NOW + HOUR, accessTo: NOW + 2 * HOUR }),
        {
          now: NOW,
        }
      )
    ).toBe(ACCESS_BLOCKING_REASON.OUTSIDE_ACCESS_WINDOW);
    expect(
      openBlockOf(
        operable({ accessFrom: NOW - 2 * HOUR, accessTo: NOW - HOUR }),
        {
          now: NOW,
        }
      )
    ).toBe(ACCESS_BLOCKING_REASON.OUTSIDE_ACCESS_WINDOW);
  });

  it("leaves an entry that declares no window alone", () => {
    expect(
      openBlockOf(operable({ accessFrom: null, accessTo: null }), { now: NOW })
    ).toBe(null);
  });

  it("names the missing grant of a compartment, which has no other way in", () => {
    expect(
      openBlockOf(operable({ isProvisioned: false, externalBookingId: null }), {
        now: NOW,
      })
    ).toBe(ACCESS_BLOCKING_REASON.NOT_PROVISIONED);
  });

  it("names a withdrawn grant as withdrawn, not as missing", () => {
    expect(openBlockOf(operable({ isProvisioned: false }), { now: NOW })).toBe(
      ACCESS_BLOCKING_REASON.AUTHORIZATION_REVOKED
    );
  });

  it("does not hold the grant against a door that opens remotely anyway", () => {
    expect(
      openBlockOf(
        door({
          mode: "both",
          capabilities: ["open", "close", "getStatus"],
          isProvisioned: false,
          accessFrom: NOW - HOUR,
          accessTo: NOW + HOUR,
        }),
        { now: NOW }
      )
    ).toBe(null);
  });

  it("names the evidence this screen cannot send", () => {
    expect(
      openBlockOf(operable({ validationRuleTypes: ["qrScan"] }), { now: NOW })
    ).toBe(ACCESS_BLOCKING_REASON.EVIDENCE_MISSING);
  });
});

describe("openProgressOf", () => {
  it("reads a confirmed open as confirmed", () => {
    expect(openProgressOf({ confirmed: true })).toBe(OPEN_PROGRESS.CONFIRMED);
  });

  it("reads an open that is not confirmed yet as pending", () => {
    expect(openProgressOf({ confirmed: false })).toBe(OPEN_PROGRESS.PENDING);
  });

  it("does not read a poll that could not tell as pending", () => {
    expect(openProgressOf({ confirmed: null, errorCode: null })).toBe(
      OPEN_PROGRESS.UNKNOWN
    );
    expect(openProgressOf({})).toBe(OPEN_PROGRESS.UNKNOWN);
    expect(openProgressOf(undefined)).toBe(OPEN_PROGRESS.UNKNOWN);
  });
});

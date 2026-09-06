import { describe, expect, it } from "vitest";
import { bookingsWithLiveAccess } from "@/utilities/access-grants";

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

function booking(id, accessInfo, timeEnd = NOW + HOUR) {
  return { id, timeEnd, accessInfo };
}

function entry(overrides = {}) {
  return {
    accessPointId: "ap-1",
    accessPointType: "locker",
    isProvisioned: true,
    revokedAt: null,
    grant: { authorizationId: "auth-1" },
    ...overrides,
  };
}

/**
 * What "a booking that would lose its access" means, kept out of the dialog so
 * the rule can be read on its own. The fields are the ones `accessInfo` really
 * carries (`access-service.js` `_upsertAccessInfo`): a remote door is marked
 * provisioned without a grant object, so `isProvisioned` and not `revokedAt`
 * is the question - not the presence of `grant`.
 */
describe("bookingsWithLiveAccess", () => {
  it("names a booking with a granted, unrevoked entry at the access point", () => {
    const b = booking("b1", [entry()]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([b]);
  });

  it("ignores an entry at another access point", () => {
    const b = booking("b1", [entry({ accessPointId: "ap-2" })]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([]);
  });

  it("ignores a revoked entry", () => {
    const b = booking("b1", [entry({ revokedAt: NOW - HOUR })]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([]);
  });

  it("ignores an entry that is only held, not granted", () => {
    const b = booking("b1", [
      entry({ isProvisioned: false, grant: null, hold: { holdId: "h1" } }),
    ]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([]);
  });

  it("counts a provisioned remote door without a grant object", () => {
    const b = booking("b1", [
      entry({ accessPointType: "door", grant: undefined }),
    ]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([b]);
  });

  it("ignores a rejected booking, whatever its entry says", () => {
    const b = { ...booking("b1", [entry()]), isRejected: true };

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([]);
  });

  it("ignores a booking whose period has passed", () => {
    const b = booking("b1", [entry()], NOW - HOUR);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([]);
  });

  it("keeps a booking without an end time", () => {
    const b = booking("b1", [entry()], null);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([b]);
  });

  it("names a booking once, however many compartments it holds", () => {
    const b = booking("b1", [entry(), entry(), entry({ revokedAt: NOW })]);

    expect(bookingsWithLiveAccess([b], "ap-1", NOW)).toEqual([b]);
  });

  it("compares ids as text, as the two sides are stored", () => {
    const b = booking("b1", [entry({ accessPointId: 42 })]);

    expect(bookingsWithLiveAccess([b], "42", NOW)).toEqual([b]);
  });

  it("tolerates a booking without access info and an empty list", () => {
    expect(
      bookingsWithLiveAccess([booking("b1", undefined)], "ap-1", NOW)
    ).toEqual([]);
    expect(bookingsWithLiveAccess(null, "ap-1", NOW)).toEqual([]);
  });
});

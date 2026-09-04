import { describe, expect, it } from "vitest";
import {
  ACCESS_STATE,
  accessEntriesOf,
  accessState,
  accessStateChip,
} from "@/utilities/booking-access-points";

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

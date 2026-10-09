import { describe, expect, it } from "vitest";
import { normalizeBookable } from "@/utils/normalizeBookable";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("normalizeBookable", () => {
  it("reads an amount of 0 as unlimited and stores it as null", () => {
    expect(normalizeBookable({ amount: 0 }).amount).toBeNull();
  });

  it("keeps a limited amount as it is", () => {
    expect(normalizeBookable({ amount: 3 }).amount).toBe(3);
    expect(normalizeBookable({ amount: null }).amount).toBeNull();
  });

  it("requires a login where roles or people are named", () => {
    expect(
      normalizeBookable({ requiresLogin: false, permittedRoles: ["r1"] })
        .requiresLogin
    ).toBe(true);
    expect(
      normalizeBookable({ requiresLogin: false, permittedUsers: ["u1"] })
        .requiresLogin
    ).toBe(true);
  });

  it("leaves the login alone without named roles or people", () => {
    const normalized = normalizeBookable({
      requiresLogin: false,
      permittedRoles: [],
      permittedUsers: [],
    });

    expect(normalized.requiresLogin).toBe(false);
  });

  it("gives every Zeitraum without one an id and keeps the ids there are", () => {
    const { blockPeriods } = normalizeBookable({
      blockPeriods: [{ id: "bp-1", label: "Wochenende" }, { label: "Woche" }],
    });

    expect(blockPeriods[0].id).toBe("bp-1");
    expect(blockPeriods[1].id).toMatch(UUID);
  });

  it("gives a bookable without Zeiträume an empty list", () => {
    expect(normalizeBookable({}).blockPeriods).toEqual([]);
  });

  it("lets bookers cancel where no cancellation policy is stored", () => {
    expect(normalizeBookable({}).cancellationPolicy).toEqual({
      userCancellable: true,
    });
    expect(
      normalizeBookable({ cancellationPolicy: { userCancellable: false } })
        .cancellationPolicy
    ).toEqual({ userCancellable: false });
  });

  it("switches Serienbuchung off for Zeiträume, keeping its roles", () => {
    const normalized = normalizeBookable({
      isBlockPeriodRelated: true,
      groupBooking: { enabled: true, permittedRoles: ["r1"] },
    });

    expect(normalized.groupBooking).toEqual({
      enabled: false,
      permittedRoles: ["r1"],
    });
  });

  it("leaves Serienbuchung alone without Zeiträume", () => {
    const groupBooking = { enabled: true, permittedRoles: [] };

    expect(normalizeBookable({ groupBooking }).groupBooking).toEqual(
      groupBooking
    );
  });

  it("switches the lead time on where service hours are stored", () => {
    const normalized = normalizeBookable({
      isScheduleRelated: true,
      preparationLeadTimeMinutes: 60,
      serviceHours: [{ weekdays: [1], startTime: "08:00", endTime: "18:00" }],
    });

    expect(normalized.isLeadTimeRelated).toBe(true);
  });

  it("drops the buffer of a bookable without free choice of time", () => {
    const normalized = normalizeBookable({
      isTimePeriodRelated: true,
      isBufferRelated: true,
      bufferTimeAfterMinutes: 30,
    });

    expect(normalized).toMatchObject({
      isBufferRelated: false,
      bufferTimeAfterMinutes: null,
    });
  });

  it("turns the legacy free bookings into discounts", () => {
    const normalized = normalizeBookable({ freeBookingUsers: ["u1"] });

    expect(normalized.bookingDiscounts).toEqual({
      users: [{ userId: "u1", discountPercent: 100 }],
      roles: [],
    });
    expect(normalized).not.toHaveProperty("freeBookingUsers");
  });

  it("leaves the bookable it was given untouched", () => {
    const stored = {
      amount: 0,
      permittedRoles: ["r1"],
      blockPeriods: [{ label: "Woche" }],
      freeBookingUsers: ["u1"],
    };
    const copy = JSON.parse(JSON.stringify(stored));

    normalizeBookable(stored);

    expect(stored).toEqual(copy);
  });

  it("changes nothing on a bookable it has normalized before", () => {
    const once = normalizeBookable({
      amount: 0,
      permittedUsers: ["u1"],
      blockPeriods: [{ label: "Woche" }],
      isScheduleRelated: true,
    });

    expect(normalizeBookable(once)).toEqual(once);
  });
});

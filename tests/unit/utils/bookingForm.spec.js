import { describe, expect, it } from "vitest";
import {
  INITIAL_STATE,
  defaultInitialState,
  initialStateChoices,
  initialStateWire,
  paymentDateOf,
  timePaidOf,
  timePaidParts,
  toCreatePayload,
  toUpdatePayload,
} from "@/utils/bookingForm";

/**
 * The create form's "Anfangszustand" (spec E10): the admin picks one of three
 * words, the UI computes the wire value - `status` and, for a booking born
 * paid, the payment fields. The expected values are the spec's table, not
 * the module's.
 */
describe("initialStateWire", () => {
  it.each([
    ["Angefragt", INITIAL_STATE.REQUESTED, 25, { status: "requested" }],
    ["Angefragt, free", INITIAL_STATE.REQUESTED, 0, { status: "requested" }],
    [
      "Freigegeben with a price",
      INITIAL_STATE.CONFIRMED,
      25,
      { status: "payment_due" },
    ],
    ["Freigegeben, free", INITIAL_STATE.CONFIRMED, 0, { status: "confirmed" }],
  ])("%s", (_, selection, priceEur, wire) => {
    expect(
      initialStateWire(
        { selection, paymentMethod: "CASH", timePaid: 1 },
        priceEur
      )
    ).toEqual(wire);
  });

  it("Bezahlt carries the payment method and the moment of the payment", () => {
    expect(
      initialStateWire(
        {
          selection: INITIAL_STATE.PAID,
          paymentMethod: "TRANSFER",
          timePaid: 1_700_000_000_000,
        },
        25
      )
    ).toEqual({
      status: "confirmed",
      paymentMethod: "TRANSFER",
      timePaid: 1_700_000_000_000,
    });
  });

  it("reads a missing selection as Angefragt", () => {
    expect(initialStateWire(null, 25)).toEqual({ status: "requested" });
    expect(defaultInitialState().selection).toBe(INITIAL_STATE.REQUESTED);
  });
});

describe("initialStateChoices", () => {
  it("offers Bezahlt only where there is something to pay", () => {
    expect(initialStateChoices(25)).toEqual([
      INITIAL_STATE.REQUESTED,
      INITIAL_STATE.CONFIRMED,
      INITIAL_STATE.PAID,
    ]);
    expect(initialStateChoices(0)).toEqual([
      INITIAL_STATE.REQUESTED,
      INITIAL_STATE.CONFIRMED,
    ]);
    expect(initialStateChoices(undefined)).toEqual([
      INITIAL_STATE.REQUESTED,
      INITIAL_STATE.CONFIRMED,
    ]);
  });
});

/**
 * What the PUT carries (spec E1.1): content only. The flags the GET delivers
 * are derivations and the stored `status` is not an input on an update -
 * both are dropped as keys, never sent as `null` or `false`, because the
 * backend reads a present flag as a plan.
 */
describe("toUpdatePayload", () => {
  const loaded = {
    id: "bk-1",
    _id: "mongo-1",
    name: "Erika Muster",
    status: "confirmed",
    isCommitted: true,
    isPayed: true,
    isRejected: false,
    rejectionReason: null,
  };

  it("keeps the content and drops the state, the flags and the mongo id", () => {
    const payload = toUpdatePayload(loaded);

    expect(payload).toEqual({
      id: "bk-1",
      name: "Erika Muster",
      rejectionReason: null,
    });
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("isCommitted");
    expect(payload).not.toHaveProperty("isPayed");
    expect(payload).not.toHaveProperty("isRejected");
  });

  it("leaves the form's object alone", () => {
    toUpdatePayload(loaded);
    expect(loaded.status).toBe("confirmed");
    expect(loaded.isCommitted).toBe(true);
  });
});

describe("toCreatePayload", () => {
  const draft = {
    id: null,
    name: "Erika Muster",
    paymentMethod: null,
    timePaid: null,
  };

  it("sends the computed status and no flag", () => {
    const payload = toCreatePayload(
      draft,
      { selection: INITIAL_STATE.CONFIRMED },
      25
    );

    expect(payload).toEqual({
      id: null,
      name: "Erika Muster",
      paymentMethod: null,
      timePaid: null,
      status: "payment_due",
    });
    expect(payload).not.toHaveProperty("isCommitted");
    expect(payload).not.toHaveProperty("isPayed");
    expect(payload).not.toHaveProperty("isRejected");
  });

  it("sends the payment fields for a booking born paid", () => {
    expect(
      toCreatePayload(
        draft,
        {
          selection: INITIAL_STATE.PAID,
          paymentMethod: "CASH",
          timePaid: 1_700_000_000_000,
        },
        25
      )
    ).toMatchObject({
      status: "confirmed",
      paymentMethod: "CASH",
      timePaid: 1_700_000_000_000,
    });
  });

  it("drops a flag a draft may carry", () => {
    const payload = toCreatePayload(
      { ...draft, isCommitted: false, isRejected: true, status: "rejected" },
      { selection: INITIAL_STATE.REQUESTED },
      0
    );
    expect(payload.status).toBe("requested");
    expect(payload).not.toHaveProperty("isCommitted");
    expect(payload).not.toHaveProperty("isRejected");
  });
});

/** The pickers' `YYYY-MM-DD` and `HH:mm` against the stored epoch milliseconds, both ways. */
describe("timePaidOf and timePaidParts", () => {
  const moment = new Date(2026, 2, 5, 14, 30).getTime();

  it("combines a date and a time into the moment, in local time", () => {
    expect(timePaidOf("2026-03-05", "14:30")).toBe(moment);
  });

  it("reads a date without a time as its local midnight, and no date as no moment", () => {
    const midnight = new Date(timePaidOf("2026-03-05", null));
    expect(midnight.getFullYear()).toBe(2026);
    expect(midnight.getMonth()).toBe(2);
    expect(midnight.getDate()).toBe(5);
    expect(midnight.getHours()).toBe(0);
    expect(timePaidOf(null, "14:30")).toBeNull();
  });

  it("reads the picker's date as a local day, not as UTC midnight", () => {
    expect(paymentDateOf("2026-03-05")).toEqual(new Date(2026, 2, 5));
    expect(paymentDateOf("")).toBeNull();
    expect(paymentDateOf(null)).toBeNull();
  });

  it("splits a moment back into the pickers' values", () => {
    expect(timePaidParts(moment)).toEqual({
      paymentDate: "2026-03-05",
      paymentTime: "14:30",
    });
  });
});

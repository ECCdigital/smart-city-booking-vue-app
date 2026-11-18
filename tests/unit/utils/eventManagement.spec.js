import { describe, expect, it } from "vitest";
import {
  eventOccupancy,
  participants,
  ticketOccupancy,
} from "@/utils/eventManagement";

const tickets = [
  { id: "regular", title: "Regulär", amount: 10, isBookable: true },
  { id: "reduced", title: "Ermäßigt", amount: null, isBookable: false },
];

const booking = (id, status, items, extra = {}) => ({
  id,
  status,
  name: `Person ${id}`,
  mail: `${id}@example.org`,
  bookableItems: items.map(([bookableId, amount]) => ({ bookableId, amount })),
  ...extra,
});

const bookings = [
  booking("a", "confirmed", [["regular", 2]], { timeCreated: 1000 }),
  booking(
    "b",
    "requested",
    [
      ["regular", 1],
      ["reduced", 3],
    ],
    {
      timeCreated: 3000,
    }
  ),
  booking("c", "payment_due", [["reduced", 1]], { timeCreated: 2000 }),
  booking("d", "cancelled", [["regular", 4]], { timeCreated: 4000 }),
  booking("e", "confirmed", [["other-event", 5]]),
];

describe("ticketOccupancy", () => {
  it("counts held tickets per state and returned ones apart", () => {
    const [regular, reduced] = ticketOccupancy(tickets, bookings, 50);

    expect(regular.byStatus).toEqual({
      confirmed: 2,
      payment_due: 0,
      requested: 1,
    });
    expect(regular.booked).toBe(3);
    expect(regular.released).toBe(4);
    expect(regular.capacity).toBe(10);
    expect(regular.ownCapacity).toBe(true);

    expect(reduced.booked).toBe(4);
    expect(reduced.capacity).toBe(50);
    expect(reduced.ownCapacity).toBe(false);
  });

  it("has no limit without a number and without Teilnahmeplätze", () => {
    const [, reduced] = ticketOccupancy(tickets, bookings, "");
    expect(reduced.capacity).toBeNull();
  });

  it("reads a request withdrawn by the user as returned", () => {
    const withdrawn = booking("f", "rejected", [["regular", 2]], {
      cancellationRefund: { origin: "user" },
    });
    const [regular] = ticketOccupancy(tickets, [withdrawn], null);
    expect(regular.booked).toBe(0);
    expect(regular.released).toBe(2);
  });
});

describe("eventOccupancy", () => {
  it("sums the tickets against the Teilnahmeplätze", () => {
    const total = eventOccupancy(ticketOccupancy(tickets, bookings, 20), 20);
    expect(total.booked).toBe(7);
    expect(total.released).toBe(4);
    expect(total.capacity).toBe(20);
    expect(total.byStatus.requested).toBe(4);
  });
});

describe("participants", () => {
  it("lists one row per booking of the event, newest first", () => {
    const rows = participants(tickets, bookings);

    expect(rows.map((row) => row.id)).toEqual(["d", "b", "c", "a"]);
    expect(rows[1].items).toEqual([
      { id: "regular", title: "Regulär", amount: 1 },
      { id: "reduced", title: "Ermäßigt", amount: 3 },
    ]);
    expect(rows[1].ticketCount).toBe(4);
    expect(rows[0].holds).toBe(false);
    expect(rows[1].holds).toBe(true);
  });
});

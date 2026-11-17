import { describe, expect, it } from "vitest";
import {
  applyTicketForm,
  defaultTicketTitle,
  hasTieredPrice,
  newTicket,
  parsePrice,
  ticketFormOf,
} from "@/utils/eventTickets";

const form = (patch = {}) => ({
  title: "Weihnachtsmarkt - Regulär",
  amount: "40",
  price: "12,50",
  ...patch,
});

describe("defaultTicketTitle", () => {
  it("adds „- Regulär“ to the event's name", () => {
    expect(defaultTicketTitle(" Weihnachtsmarkt ")).toBe(
      "Weihnachtsmarkt - Regulär"
    );
  });

  it("is „Regulär“ without a name", () => {
    expect(defaultTicketTitle("")).toBe("Regulär");
  });
});

describe("parsePrice", () => {
  it.each([
    ["12,50", 12.5],
    ["8", 8],
    ["0", 0],
    ["", 0],
    ["-1", null],
    ["zwölf", null],
  ])("reads %s as %s", (value, expected) => {
    expect(parsePrice(value)).toBe(expected);
  });
});

describe("newTicket", () => {
  const ticket = newTicket({}, "e-1", form());

  it("is a ticket of the event, bookable without a time", () => {
    expect(ticket.type).toBe("ticket");
    expect(ticket.eventId).toBe("e-1");
    expect(ticket.isScheduleRelated).toBe(false);
    expect(ticket.isTimePeriodRelated).toBe(false);
    expect(ticket.isBlockPeriodRelated).toBe(false);
    expect(ticket.isLongRange).toBe(false);
  });

  it("takes name, number and price per item", () => {
    expect(ticket.title).toBe("Weihnachtsmarkt - Regulär");
    expect(ticket.amount).toBe(40);
    expect(ticket.priceType).toBe("per-item");
    expect(ticket.priceCategories).toHaveLength(1);
    expect(ticket.priceCategories[0].priceEur).toBe(12.5);
  });

  it("leaves the number open without one: the event's places limit it", () => {
    expect(newTicket({}, "e-1", form({ amount: "" })).amount).toBe(null);
  });

  it("is bookable and shown at once", () => {
    expect(ticket.isBookable).toBe(true);
    expect(ticket.isPublic).toBe(true);
  });
});

describe("applyTicketForm", () => {
  const stored = {
    id: "t-1",
    title: "Alt",
    amount: 10,
    priceType: "per-item",
    priceCategories: [{ priceEur: 5, fixedPrice: false, interval: {} }],
    flags: ["bleibt"],
  };

  it("changes name, number and price, and keeps the rest", () => {
    const next = applyTicketForm(stored, form({ price: "7" }));
    expect(next.title).toBe("Weihnachtsmarkt - Regulär");
    expect(next.amount).toBe(40);
    expect(next.priceCategories[0].priceEur).toBe(7);
    expect(next.flags).toEqual(["bleibt"]);
    expect(stored.title).toBe("Alt");
  });

  it("leaves tiered prices to the detail mode", () => {
    const tiered = {
      ...stored,
      priceCategories: [
        { priceEur: 5, weekdays: [1] },
        { priceEur: 8, weekdays: [6] },
      ],
    };
    expect(hasTieredPrice(tiered)).toBe(true);
    const next = applyTicketForm(tiered, form());
    expect(next.priceCategories).toEqual(tiered.priceCategories);
  });
});

describe("ticketFormOf", () => {
  it("reads name, number and price as the form shows them", () => {
    expect(
      ticketFormOf({
        title: "Kinder",
        amount: 20,
        priceCategories: [{ priceEur: 4.5 }],
      })
    ).toEqual({ title: "Kinder", amount: 20, price: "4,50" });
  });
});

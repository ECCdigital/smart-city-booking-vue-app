/*
 * The short form of a ticket on the event editing page („Tickets“): name,
 * how many there are, and the price per ticket. Behind it stands a full
 * bookable of the type „Ticket“, linked to its event (`eventId`), bookable
 * without a time („Zeitunabhängig“) and priced per item. Pure functions, so
 * the dialog and the tests read the same rules.
 */
import Bookable from "@/entities/bookable";
import { normalizeBookable } from "@/utils/normalizeBookable";
import {
  applyBookingMode,
  applyPriceType,
  priceModeOf,
} from "@/utils/bookableFlow";

/** The name a new ticket of the event starts with: „… - Regulär“. */
export function defaultTicketTitle(eventName) {
  const name = (eventName || "").trim();
  return name ? `${name} - Regulär` : "Regulär";
}

/** A price as typed („12,50“, „8“) as a number of euros, `null` when none. */
export function parsePrice(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : null;
}

/** Whether the ticket's price is more than one price per item. */
export function hasTieredPrice(bookable) {
  return priceModeOf(bookable) === "tiers";
}

/** The short form of a stored ticket. */
export function ticketFormOf(bookable) {
  const price = Number(bookable?.priceCategories?.[0]?.priceEur) || 0;
  return {
    title: bookable?.title || "",
    amount: bookable?.amount ?? null,
    price: price.toFixed(2).replace(".", ","),
  };
}

/**
 * The form on a ticket: its name, its number and - unless it has tiered
 * prices, which only the detail mode edits - its price per item. Returns a
 * new bookable; the one handed in stays as it is.
 */
export function applyTicketForm(bookable, form) {
  const next = JSON.parse(JSON.stringify(bookable));
  next.title = form.title.trim();
  next.amount = Number(form.amount) || null;
  if (!hasTieredPrice(next)) {
    applyPriceType(next, "per-item");
    const [first] = next.priceCategories || [];
    next.priceCategories = [
      {
        interval: { start: null, end: null },
        holidays: [],
        weekdays: [],
        ...(first || {}),
        priceEur: parsePrice(form.price) ?? 0,
        fixedPrice: false,
      },
    ];
  }
  return next;
}

/**
 * A new ticket of the event from the tenant's bookable template: bookable
 * without a time, bookable and shown at once, as the tickets the backend
 * creates with an event (`withTickets`), and confirmed without a review.
 */
export function newTicket(template, eventId, form) {
  const bookable = normalizeBookable({
    ...new Bookable(template).toPlain(),
    type: "ticket",
    eventId,
    isBookable: true,
    isPublic: true,
    autoCommitBooking: true,
  });
  applyBookingMode(bookable, "independent");
  bookable.priceCategories = [];
  return applyTicketForm(bookable, form);
}

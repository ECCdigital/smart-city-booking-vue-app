import { BOOKING_STATUS, displayStatus } from "@/utils/bookingStatus";

/**
 * The states in which a booking holds its tickets, in the order the
 * occupancy rail draws them: confirmed first, then what is still open.
 * Abgelehnt, Storniert and Widerrufen give their tickets back.
 */
export const HOLDING_STATUSES = Object.freeze([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.PAYMENT_DUE,
  BOOKING_STATUS.REQUESTED,
]);

export function holdsTickets(booking) {
  return HOLDING_STATUSES.includes(displayStatus(booking));
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** The items of a booking that are tickets of this event. */
export function ticketItems(booking, ticketIds) {
  return (booking?.bookableItems || []).filter((item) =>
    ticketIds.has(item.bookableId)
  );
}

function emptyCounts() {
  return Object.fromEntries(HOLDING_STATUSES.map((status) => [status, 0]));
}

/**
 * The occupancy of each ticket: the tickets held per state, their sum, the
 * tickets given back, and the limit - the ticket's own number, else the
 * event's Teilnahmeplätze (`maxAttendees`), else none.
 */
export function ticketOccupancy(tickets, bookings, maxAttendees) {
  const shared = positive(maxAttendees);
  const rows = tickets.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    isBookable: ticket.isBookable === true,
    capacity: positive(ticket.amount) || shared,
    ownCapacity: positive(ticket.amount) !== null,
    byStatus: emptyCounts(),
    booked: 0,
    released: 0,
  }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ticketIds = new Set(byId.keys());

  for (const booking of bookings) {
    const status = displayStatus(booking);
    const holds = HOLDING_STATUSES.includes(status);
    for (const item of ticketItems(booking, ticketIds)) {
      const row = byId.get(item.bookableId);
      const amount = positive(item.amount) || 1;
      if (holds) {
        row.byStatus[status] += amount;
        row.booked += amount;
      } else {
        row.released += amount;
      }
    }
  }
  return rows;
}

/** The whole event: the tickets held per state against its Teilnahmeplätze. */
export function eventOccupancy(rows, maxAttendees) {
  const byStatus = emptyCounts();
  let released = 0;
  for (const row of rows) {
    for (const status of HOLDING_STATUSES) {
      byStatus[status] += row.byStatus[status];
    }
    released += row.released;
  }
  const booked = HOLDING_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
  return { byStatus, booked, released, capacity: positive(maxAttendees) };
}

/**
 * The participants: one row per booking with this event's tickets, newest
 * first, with what was booked as `{ title, amount }`.
 */
export function participants(tickets, bookings) {
  const titles = new Map(tickets.map((ticket) => [ticket.id, ticket.title]));
  const ticketIds = new Set(titles.keys());

  return bookings
    .map((booking) => {
      const items = ticketItems(booking, ticketIds).map((item) => ({
        id: item.bookableId,
        title: titles.get(item.bookableId) || item._bookableUsed?.title || "",
        amount: positive(item.amount) || 1,
      }));
      return {
        id: booking.id,
        name: booking.name || "",
        company: booking.company || "",
        mail: booking.mail || "",
        status: displayStatus(booking),
        holds: holdsTickets(booking),
        timeCreated: booking.timeCreated || null,
        items,
        ticketCount: items.reduce((sum, item) => sum + item.amount, 0),
      };
    })
    .filter((row) => row.items.length)
    .sort((a, b) => timeOf(b) - timeOf(a));
}

function timeOf(row) {
  const time = row.timeCreated ? new Date(row.timeCreated).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

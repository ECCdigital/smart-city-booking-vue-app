/**
 * The Buchungslink as a route (CONTEXT.md): the page's named route with the
 * tenant in `?tenant=`, the one shape every opener pushes - the list, a
 * series' member rows, a booking's series chip - and the middleware reads.
 */
export function bookingPageRoute(bookingId, tenantId) {
  return {
    name: "booking-details",
    params: { bookingId },
    query: { tenant: tenantId },
  };
}

export function groupBookingPageRoute(groupBookingId, tenantId) {
  return {
    name: "group-booking-details",
    params: { groupBookingId },
    query: { tenant: tenantId },
  };
}

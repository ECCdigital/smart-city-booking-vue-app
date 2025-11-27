export default {
  getEventBookingsExport(tenantId, eventId) {
    return ApiClient.get(`/csv/${tenantId}/events/${eventId}/bookings`, {
      responseType: "blob",
    });
  },
};

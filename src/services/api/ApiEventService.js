import store from "@/store";

export default {
  getEvents(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/events`);
  },
  getEvent(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/events/${id}`);
  },
  getTags(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/events/_meta/tags`);
  },
  addEvent(addTickets = false, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const formData = { ...store.state.events.form };
    formData.tenantId = t;
    return ApiClient.put(`api/${t}/events?withTickets=${addTickets}`, formData);
  },
  deleteEvent(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/events/${id}`);
  },
  duplicateEvent(eventId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(
        `api/${store.getters["tenants/currentTenantId"]}/events/${eventId}`
      )
        .then((getEventResponse) => {
          const event = Object.assign(new Object(), getEventResponse.data);

          delete event.id;
          delete event._id;

          event.information.name = `${event.information.name} (Kopie)`;

          if (event) {
            ApiClient.put(
              `api/${store.getters["tenants/currentTenantId"]}/events`,
              event
            )
              .then((putEventResponse) => {
                resolve(putEventResponse);
              })
              .catch((error) => {
                reject(error);
              });
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async publicEventCountCheck(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return (await ApiClient.get(`api/${t}/events/count/check`)).data;
  },
  async getBookedSeatsCount(eventId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return (await ApiClient.get(`api/${t}/events/${eventId}/count`)).data;
  },
  downloadEventIcal(eventId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/ical/events/${eventId}?includePast=true`);
  },
  downloadEventsIcal(ids, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/ical/events?ids=${ids.join(",")}`);
  },
  getEventFeedUrl(eventId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const base = ApiClient.client.defaults.baseURL.replace(/\/+$/, "");
    return `${base}/api/${t}/ical/feed/events/${eventId}`;
  },
  getEventsFeedUrl(ids, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const base = ApiClient.client.defaults.baseURL.replace(/\/+$/, "");
    return `${base}/api/${t}/ical/feed/events?ids=${ids.join(",")}`;
  },
};

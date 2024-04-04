import store from "@/store";
export default {
  getEvents(tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/events`, { withCredentials: true });
  },
  getEvent(id, tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/events/${id}`, { withCredentials: true })
  },
  getTags(tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/events/_meta/tags`, { withCredentials: true })
  },
  addEvent(tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    const formData = { ...store.state.events.form };
    formData.tenant = t;
    return ApiClient.put(`api/${t}/events`, formData, { withCredentials: true })
  },
  deleteEvent(id, tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.delete(`api/${t}/events/${id}`, { withCredentials: true })
  },
  duplicateEvent(eventId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(`api/${store.getters["tenants/tenant"].id}/events/${eventId}`).then((getEventResponse) => {
        const event = Object.assign(new Object(), getEventResponse.data);

        delete event.id;
        delete event._id;

        event.information.name = `${event.information.name} (Kopie)`;

        if (event) {
          ApiClient.put(`api/${store.getters["tenants/tenant"].id}/events`, event, {withCredentials: true}).then((putEventResponse) => {
            resolve(putEventResponse);
          }).catch((error) => {
            reject(error);
          });
        }
      }).catch((error) => {
        reject(error);
      });
    });
  },
  async eventCountCheck(tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return (await ApiClient.get(`api/${t}/events/count/check`, {
      withCredentials: true,
    })).data
  }
};

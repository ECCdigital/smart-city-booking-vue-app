import ApiEventService from "@/services/api/ApiEventService";
import store from "@/store";

/*
 * The titles of the current tenant's events by id, for naming a ticket's
 * event in the overview of both modes, asked once per tenant. A failed load is not kept: the next call asks
 * again.
 */
let eventTitlesCache = null;
let eventTitlesPromise = null;
let eventTitlesTenantId = null;

/** What the last load of the current tenant's titles left, or `null`. */
export function cachedEventTitlesById() {
  return eventTitlesCache;
}

/** Resolves `{ [eventId]: title }`; the id stands in for a missing title. */
export function loadEventTitlesById() {
  const currentTenantId = store.getters["tenants/currentTenantId"];
  if (eventTitlesCache && eventTitlesTenantId === currentTenantId) {
    return Promise.resolve(eventTitlesCache);
  }
  if (eventTitlesTenantId !== currentTenantId) {
    eventTitlesCache = null;
    eventTitlesPromise = null;
    eventTitlesTenantId = currentTenantId;
  }
  if (!eventTitlesPromise) {
    eventTitlesPromise = ApiEventService.getEvents()
      .then((result) => {
        if (store.getters["tenants/currentTenantId"] !== currentTenantId) {
          return {};
        }
        const map = {};
        (result?.data || []).forEach((item) => {
          if (item?.id) {
            map[item.id] = item.information?.name || item.id;
          }
        });
        eventTitlesCache = map;
        eventTitlesTenantId = currentTenantId;
        return map;
      })
      .catch((error) => {
        console.error("Error loading event titles for overview:", error);
        eventTitlesPromise = null;
        return {};
      });
  }
  return eventTitlesPromise;
}

import store from "@/store";
import { leaveDeclinedTenant } from "@/services/api/tenantDeclined";
import { routeRequiresTenant } from "./requireTenant";

/**
 * The start check of a declined tenant (glossary „abgewiesen“): a current
 * tenant restored from the local storage - or switched to by a link - whose
 * membership the fresh permissions name declined is dropped before any page
 * asks the API about it, with the same toast as the `403 tenant_declined`
 * fallback. A tenant page leads to „Meine Mandanten“, a page of no tenant
 * stays. The instance owner keeps every tenant (`user/declinedMembership`).
 */
export async function rejectDeclinedTenant({ to, next }) {
  if (!to.meta.requiresAuth) return next();

  const tenantId = store.getters["tenants/currentTenantId"];
  if (!tenantId || !store.getters["user/declinedMembership"](tenantId)) {
    return next();
  }

  await leaveDeclinedTenant(store, tenantId);
  return routeRequiresTenant(to) ? next({ name: "dashboard" }) : next();
}

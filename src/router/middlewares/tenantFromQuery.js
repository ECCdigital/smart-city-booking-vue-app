import store from "@/store";
import ToastService from "@/services/ToastService";
import { isTenantMember } from "@/utils/tenantMembership";
import { tenantName } from "@/utils/tenantName";

/**
 * Lands a pasted Buchungslink in the tenant it names before any page mounts:
 * on routes flagged `meta.tenantFromQuery`, a `?tenant=` of which the user is
 * a Mitglied becomes the current tenant, so that `requireTenant` and
 * `requireInterfaceAccess` judge the target tenant. Anyone else continues
 * unchanged and the page shows its non-member state - so does a member of a
 * declined tenant (glossary „abgewiesen“), whose management is closed.
 * Never redirects.
 */
export async function selectTenantFromQuery({ to, next }) {
  if (!to.meta.tenantFromQuery) {
    return next();
  }

  const tenantId = to.query?.tenant;
  if (typeof tenantId !== "string" || tenantId === "") {
    return next();
  }

  if (
    !isTenantMember(tenantId) ||
    store.getters["user/declinedMembership"](tenantId)
  ) {
    return next();
  }

  const previousTenantId = store.getters["tenants/currentTenantId"];
  await store.dispatch("tenants/select", tenantId);

  // Only an actual switch is worth a word; a fresh browser and the same
  // tenant stay silent.
  if (previousTenantId && previousTenantId !== tenantId) {
    await store.dispatch(
      "toasts/add",
      ToastService.createToast("booking.page.tenant-switched", "info", 5000, {
        name: tenantName(store.getters["tenants/tenants"], tenantId),
      })
    );
  }

  return next();
}

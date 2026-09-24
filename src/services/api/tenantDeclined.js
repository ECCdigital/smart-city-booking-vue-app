import ToastService from "@/services/ToastService";
import { tenantName } from "@/utils/tenantName";
import {
  isForbiddenCode,
  isForbiddenError,
  unpackBlobErrorBody,
} from "./apiErrorMessage";

/**
 * The fallback for a tenant declined mid-session (glossary „abgewiesen“):
 * the backend answers every management request of its own people with
 * `403 tenant_declined` (params: tenantId, supervisionLevel,
 * supervisionChangedAt, supervisionReason). Ordinarily the sign-in's
 * `permissions.tenants[]` names the level first and nothing asks; this
 * catches the decline that happened while the user worked.
 *
 * Store, router and auth service are imported on use: `ApiClientService`
 * calls this module, and each of them reaches back to the client.
 */
const TENANT_DECLINED = "tenant_declined";

const DASHBOARD = "dashboard";
const TOAST_KEY = "supervision.declined-tenant.toast";

/**
 * The rule the router's start check shares: the declined tenant stops being
 * the current one, and the user is told why.
 */
export async function leaveDeclinedTenant(store, tenantId) {
  const params = {
    name: tenantName(store.getters["tenants/tenants"], tenantId),
  };
  await store.dispatch("tenants/select", null);
  const toast = ToastService.createToast(TOAST_KEY, "error", 5000, params);
  await store.dispatch("toasts/add", toast);
}

async function reloadPermissions(store) {
  try {
    const { default: ApiAuthService } = await import(
      "@/services/api/ApiAuthService"
    );
    const response = await ApiAuthService.me();
    await store.dispatch("user/update", response.data);
  } catch (error) {
    // Without fresh permissions the user still has to leave the tenant; the
    // next navigation reads them again.
    console.error(error);
  }
}

async function goToMyTenants() {
  const { default: router } = await import("@/router");
  if (router.currentRoute.name === DASHBOARD) return;
  // A guard redirecting the navigation elsewhere is no failure here.
  await router.push({ name: DASHBOARD }).catch(() => {});
}

async function leaveOnDecline(error) {
  if (!isForbiddenError(error)) return;
  // A download (a `/csv/:tenant` export) asks for a Blob; its code is read
  // from the unpacked body.
  const refusal = await unpackBlobErrorBody(error);
  if (!isForbiddenCode(refusal, TENANT_DECLINED)) return;
  const { default: store } = await import("@/store");
  if (store.state.user.data?.permissions?.instanceOwner) return;

  const currentTenantId = store.getters["tenants/currentTenantId"];
  const tenantId = refusal.response.data.params?.tenantId ?? currentTenantId;
  if (!currentTenantId || tenantId !== currentTenantId) return;

  await leaveDeclinedTenant(store, tenantId);
  await reloadPermissions(store);
  await goToMyTenants();
}

/**
 * Called by `ApiClientService` for every failed request, whatever the auth
 * transport, and not awaited: the caller still gets its error, and this
 * never rejects beside it. Acts on the current tenant only, and only once:
 * the selection is cleared right after the check, with nothing awaited in
 * between, so the other refusals of the same page and any answer during the
 * reload find no declined tenant current and pass.
 * An instance owner is never refused so, and is left alone if they were.
 */
export async function handleTenantDeclined(error) {
  try {
    await leaveOnDecline(error);
  } catch (failure) {
    console.error(failure);
  }
}

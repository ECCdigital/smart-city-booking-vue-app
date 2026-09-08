import store from "@/store";
import ToastService from "@/services/ToastService";
import { routeRequiresTenant } from "./requireTenant";

function isAuthorized(ifce) {
  return store.getters["user/isAuthorized"](ifce);
}

function isDenied(ifce) {
  return store.getters["user/isDenied"](ifce);
}

export function checkInterface({ to, next }) {
  if (
    to.meta.interfaceName &&
    to.meta.isPublic &&
    isAuthorized(to.meta.interfaceName)
  ) {
    return next({ name: "home" });
  }
  next();
}

/**
 * The reach gate: a tenant-scoped route (the set `routeRequiresTenant` names,
 * so public and tenant-exempt screens stay open) may only be entered when the
 * membership at the current tenant carries its `interfaceName` — the same
 * getter the navbar hides menu entries with, so menu and router stop
 * contradicting each other. Not a second source of rights.
 *
 * Where the answer cannot be trusted — no session, no tenant, permissions not
 * loaded — it lets the route through and leaves the verdict to the API, whose
 * 403 the screens' empty states catch. See `src/router/middleware.js` for why
 * it runs last.
 */
export async function requireInterfaceAccess({ to, next }) {
  if (!routeRequiresTenant(to)) {
    return next();
  }

  if (!store.getters["user/isLoggedIn"]) {
    return next();
  }

  if (!store.getters["tenants/currentTenantId"]) {
    return next();
  }

  if (!isDenied(to.meta.interfaceName)) {
    return next();
  }

  await store.dispatch(
    "toasts/add",
    ToastService.createToast("errors.interface-forbidden", "error")
  );
  return next({ name: "dashboard" });
}

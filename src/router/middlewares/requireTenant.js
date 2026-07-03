import store from "@/store";

const TENANT_EXEMPT_INTERFACES = new Set(["dashboard", "instance", "settings"]);

export function routeRequiresTenant(route) {
  if (!route.meta.requiresAuth) {
    return false;
  }

  if (route.meta.public) {
    return false;
  }

  const interfaceName = route.meta.interfaceName;
  if (!interfaceName || TENANT_EXEMPT_INTERFACES.has(interfaceName)) {
    return false;
  }

  return true;
}

export function requireTenant({ to, next }) {
  if (!routeRequiresTenant(to)) {
    return next();
  }

  const currentTenantId = store.getters["tenants/currentTenantId"];
  if (!currentTenantId) {
    return next({ name: "dashboard", query: { redirect: to.fullPath } });
  }

  return next();
}

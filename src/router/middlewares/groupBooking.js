import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiRolesService from "@/services/api/ApiRolesService";

export async function checkGroupBooking({ to, next }) {
  if (!to.meta.groupBooking) return next();
  const { id, tenant } = to.query;
  const { data: bookable } = await ApiBookablesService.getBookable(id, tenant);

  if (!bookable?.groupBooking?.enabled) {
    return next({ name: "home" });
  }
  const { permittedRoles } = bookable.groupBooking;
  if (!permittedRoles.length) {
    return next();
  }
  const me = await ApiAuthService.me().catch(() => null);
  if (!me) {
    return next({ name: "home" });
  }
  const { data: userRoles } = await ApiRolesService.getUserRolesByTenant(
    undefined,
    true
  );
  const hasRole = userRoles.some((r) => permittedRoles.includes(r.id));
  return hasRole ? next() : next({ name: "home" });
}

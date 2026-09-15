import { requiresAuth } from "./middlewares/auth";
import { selectTenantFromQuery } from "./middlewares/tenantFromQuery";
import { checkGroupBooking } from "./middlewares/groupBooking";
import {
  checkInterface,
  requireInterfaceAccess,
} from "./middlewares/interface";
import { requireTenant } from "./middlewares/requireTenant";
import { finalAuthRedirect } from "./middlewares/finalAuth";

/**
 * The order every navigation runs through. `requireInterfaceAccess` comes
 * last on purpose: it judges the reach of the membership at the current
 * tenant, so it may only run once `requiresAuth` has refreshed the user,
 * `requireTenant` has established a tenant and `finalAuthRedirect` has
 * confirmed the session. Moved earlier, it would turn users away whose tenant
 * or permissions are not loaded yet.
 *
 * `selectTenantFromQuery` sits directly after `requiresAuth`: a Buchungslink's
 * `?tenant=` must be the current tenant before `requireTenant` and
 * `requireInterfaceAccess` pass judgement.
 */
export const middlewares = [
  requiresAuth,
  selectTenantFromQuery,
  checkGroupBooking,
  checkInterface,
  requireTenant,
  finalAuthRedirect,
  requireInterfaceAccess,
];

/**
 * Vue Router middleware pipeline.
 * Each middleware receives `next` that either continues the chain or
 * (when called with arguments) aborts/redirects via the real router next.
 */
export function pipeline(context, middleware, index) {
  const nextMiddleware = middleware[index];
  if (!nextMiddleware) {
    return context.next;
  }

  return (...args) => {
    // Redirect / abort — skip remaining middleware
    if (args.length > 0) {
      return context.next(...args);
    }

    const nextPipeline = pipeline(context, middleware, index + 1);
    return nextMiddleware({ ...context, next: nextPipeline });
  };
}

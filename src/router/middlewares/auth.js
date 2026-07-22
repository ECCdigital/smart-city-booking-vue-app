import ApiAuthService from "@/services/api/ApiAuthService";
import ToastService from "@/services/ToastService";
import store from "@/store/index";
import { endAdminSession } from "@/services/auth/sessionSync";
import { isBffAuthMode } from "@/services/auth/authMode";

export async function requiresAuth({ to, next }) {
  if (!to.meta.requiresAuth) return next();
  try {
    const response = await ApiAuthService.me();
    await store.dispatch("user/update", response.data);
    next();
  } catch {
    await store.dispatch(
      "toasts/add",
      ToastService.createToast("session.expired", "error")
    );
    if (isBffAuthMode()) {
      await endAdminSession({ redirect: true });
      next(false);
      return;
    }
    await store.dispatch("user/delete");
    next({ name: "login", query: { redirectUrl: to.name } });
  }
}

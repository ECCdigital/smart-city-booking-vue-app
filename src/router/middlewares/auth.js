import ApiAuthService from "@/services/api/ApiAuthService";
import ToastService from "@/services/ToastService";
import store from "@/store/index";

export async function requiresAuth({ to, next }) {
  if (!to.meta.requiresAuth) return next();
  try {
    const response = await ApiAuthService.me();
    await store.dispatch("user/update", response.data);
    next();
  } catch {
    next({ name: "home" });
    await store.dispatch(
      "toasts/add",
      ToastService.createToast("session.expired", "error")
    );
  }
}

import ToastService from "@/services/ToastService";
import store from "@/store";

function isLoggedIn() {
  return store.getters["user/isLoggedIn"];
}

export async function finalAuthRedirect({ to, next }) {
  if (!to.meta.requiresAuth) return next();
  if (!isLoggedIn()) {
    next({ name: "login", query: { redirectUrl: to.name } });
    await store.dispatch(
      "toasts/add",
      ToastService.createToast("errors.unauthenticated", "error")
    );
  } else {
    next();
  }
}

import store from "@/store";

function isAuthorized(ifce) {
  return store.getters["user/isAuthorized"](ifce);
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

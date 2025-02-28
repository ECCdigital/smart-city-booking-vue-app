import store from "@/store";
export default {
  getTags(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/_meta/tags`, { withCredentials : true });
  }
};

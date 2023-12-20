import store from "@/store";
const currentTenant = store.getters["tenants/tenant"];

export default {
  getTags(tenant) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/bookables/_meta/tags`, { withCredentials : true });
  }
};

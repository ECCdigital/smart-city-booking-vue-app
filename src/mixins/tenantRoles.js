import ApiRolesService from "@/services/api/ApiRolesService";

/**
 * The public roles of the bookable's tenant as `tenantRoles`, for a
 * component on `bookableEditing` that offers roles to pick: read when it
 * mounts and again whenever the bookable's tenant changes. A failure leaves
 * the list empty.
 */
export default {
  data() {
    return { tenantRoles: [] };
  },
  watch: {
    "bookable.tenantId": {
      immediate: true,
      handler: "loadTenantRoles",
    },
  },
  methods: {
    async loadTenantRoles(tenantId) {
      if (!tenantId) return;
      try {
        const response = await ApiRolesService.getTenantRoles(true, tenantId);
        this.tenantRoles = response?.data || [];
      } catch (error) {
        console.error(`Could not read the roles of tenant ${tenantId}`, error);
        this.tenantRoles = [];
      }
    },
  },
};

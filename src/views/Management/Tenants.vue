<template>
  <AdminLayout>
    <TenantOverview/>
      <!--
      <DeleteConformationDialog
      :open="openDeleteDialog"
      :toDelete="selectedTenant"
      @close="onCloseDeleteDialog"
    />
    -->
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";import TenantOverview from "@/components/Tenant/TenantOverview.vue";

export default {
  components: {
    TenantOverview,
    AdminLayout,
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      currentTenant: "tenants/currentTenant",
    }),
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
  },
  async mounted() {},
  created() {},
};
</script>

<style scoped>
.search-field {
  border-radius: 15px;
}
.custom-alert {
  border-radius: 15px !important;
}
</style>

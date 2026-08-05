<template>
  <AdminLayout>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
    ></v-progress-linear>

    <PendingApprovals></PendingApprovals>
    <PendingTenantInvitations
      @invitation:accepted="fetchTenants"
      @invitation:rejected="fetchTenants"
    />

    <div class="mb-6">
      <p class="text-subtitle-1 grey--text">
        Überblick über Angebote, Aktivitäten und Finanzen – gesamt und je
        Mandant.
      </p>
    </div>

    <!-- toDo - Auswahl für Zeitraum einfügen (3 Mon, 6 Mon, 12 Mon, jemals) -->

    <dashboard-data :dashboard-data="dashboardData" />

    <!--
    <pre class="light-green pa-1 text-caption">
      {{ dashboardData }}
    </pre>
    <pre class="light-blue pa-1 text-caption">
      {{ tendantData }}
    </pre>
    -->
  </AdminLayout>
</template>
<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import PendingTenantInvitations from "@/components/Tenant/PendingTenantInvitations.vue";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import DashboardData from "@/components/dashboard/DashboardData.vue";

export default {
  name: "Dashboard",
  components: {
    DashboardData,
    PendingApprovals,
    PendingTenantInvitations,
    AdminLayout,
  },
  data() {
    return {
      loading: false,
      dashboardData: null,
      tendantData: null,
    };
  },
  computed: {
    ...mapGetters({
      tenants: "tenants/tenants",
      currentTenant: "tenants/currentTenantId",
    }),

    //toDo
  },
  mounted() {
    this.fetchDashboardData();
    this.fetchDashboardDataByTenantId("diz"); //toDo - TESTWEISE
  },
  methods: {
    ...mapActions({
      select: "tenants/select",
      setTenants: "tenants/setTenants",
    }),
    async fetchTenants() {
      try {
        this.loading = true;
        const response = await ApiTenantService.getTenants(true);
        await this.setTenants(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboardData() {
      try {
        this.loading = true;
        const response = await ApiTenantService.getDashboardData();
        console.log("*A* - got data in dashboard.vue", response);
        this.dashboardData = response;
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboardDataByTenantId(tenantId) {
      try {
        this.loading = true;
        const response = await ApiTenantService.getDashboardDataByTenant(
          tenantId
        );
        console.log("*A.2* - got data in dashboard.vue", response);
        this.tendantData = response;
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    //toDo
  },
};
</script>

<style scoped></style>

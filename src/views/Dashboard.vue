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

    <dashboard-filter
      v-model="selectedPeriod"
      :from="periodFrom"
      :to="periodTo"
      :tenants="tenantOptions"
      :tenant-id.sync="selectedTenantId"
      :only-bookables.sync="onlyBookables"
      :status.sync="selectedStatus"
      @tenant-change="loadDashboard"
      @only-bookables-change="loadDashboard"
      @status-change="loadDashboard"
      @input="loadDashboard"
    />

    <dashboard-data :dashboard-data="dashboardData" :tenant-data="tenantData" />

    <!--
    <pre class="light-green pa-1 text-caption">
      {{ dashboardData }}
    </pre>-->
    <pre class="light-blue pa-1 text-caption">
      {{ tenantData }}
    </pre>
  </AdminLayout>
</template>
<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import PendingTenantInvitations from "@/components/Tenant/PendingTenantInvitations.vue";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import DashboardFilter from "@/components/dashboard/DashboardFilter.vue";
import DashboardData from "@/components/dashboard/DashboardData.vue";

export default {
  name: "Dashboard",
  components: {
    DashboardData,
    DashboardFilter,
    PendingApprovals,
    PendingTenantInvitations,
    AdminLayout,
  },
  data() {
    return {
      loading: false,
      selectedPeriod: "all", // '3' | '12' | 'all'
      selectedTenantId: null, // aus $route.query.tenantId
      onlyBookables: null, // true | false | null
      selectedStatus: [], // e.g. ['status.payment_expected', 'status.awaiting_approval']
      dashboardData: null,
      tenantData: null,
    };
  },
  computed: {
    ...mapGetters({
      tenants: "tenants/tenants",
      currentTenant: "tenants/currentTenantId",
    }),
    dateFrom() {
      let d = new Date();
      if (this.selectedPeriod === "3") {
        const threeMonthAgo = d.setMonth(d.getMonth() - 3);
        return new Date(threeMonthAgo);
      }
      if (this.selectedPeriod === "12") {
        const twelveMonthAgo = d.setMonth(d.getMonth() - 12);
        return new Date(twelveMonthAgo);
      }
      return null;
    },
    dateTo() {
      if (this.selectedPeriod === "all") {
        return null;
      }
      return new Date();
    },
    periodFrom() {
      return this.dashboardData && this.dashboardData.data
        ? this.dashboardData.data.from
        : null;
    },
    periodTo() {
      return this.dashboardData && this.dashboardData.data
        ? this.dashboardData.data.to
        : null;
    },
    tenantOptions() {
      return (this.dashboardData && this.dashboardData.data.byTenant) || [];
    },

    //toDo
  },
  watch: {
    selectedTenantId(newTenantId) {
      this.fetchDashboardDataByTenantId(newTenantId);
    },
  },
  created() {
    this.loadDashboard();
  },
  mounted() {
    this.fetchDashboardData();
  },
  methods: {
    ...mapActions({
      select: "tenants/select",
      setTenants: "tenants/setTenants",
    }),
    async loadDashboard() {
      const filterParams = {
        from: this.dateFrom,
        to: this.dateTo,
        status: this.selectedStatus.length ? this.selectedStatus : undefined,
        //bookableId: null,
        isBookable: this.onlyBookables,
      };
      this.dashboardData = await ApiTenantService.getDashboardData(
        filterParams
      );
      console.log("*A.1* - got data in dashboard.vue", this.dashboardData);
    },
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

        this.dashboardData = await ApiTenantService.getDashboardData();
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboardDataByTenantId(tenantId) {
      if (!tenantId) {
        return;
      }
      try {
        this.loading = true;
        const response = await ApiTenantService.getDashboardDataByTenant(
          tenantId
        );
        console.log("*A.2* - got data in dashboard.vue", response);
        this.tenantData = response;
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

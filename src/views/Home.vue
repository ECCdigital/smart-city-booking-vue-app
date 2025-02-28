<template>
  <AdminLayout>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
    ></v-progress-linear>
    <v-row gutters>
      <v-col
        v-for="tenant in tenants"
        :key="tenant.id"
        cols="12"
        md="3"
        class="d-flex flex-column"
      >
        <v-card
          max-height="200px"
          outlined
          flat
          :color="tenant.id === currentTenant ? 'grey lighten-4' : ''"
          @click="selectTenant(tenant.id)"
          class="fill-height pt-7 rounded"
          ><!-- toDO - dynamically check for activ tenant -->
          <v-card-text class="primary--text">
            {{ tenant.name }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-btn
      v-if="allowCreate"
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      @click="onOpenCreateTenant()"
      class="v-btn"
      :disabled="createDisabled"
    >
      <v-icon>mdi-plus</v-icon> Mandanten anlegen
    </v-btn>
    <TenantCreate :open="openCreateDialog" @close="onCloseCreateDialog" />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin";
import { mapActions, mapGetters } from "vuex";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "HomeView",
  components: {
    TenantCreate,
    AdminLayout,
  },
  data() {
    return {
      loading: false,
      openCreateDialog: false,
    };
  },
  computed: {
    ...mapGetters({
      tenants: "tenants/tenants",
      currentTenant: "tenants/currentTenantId",
      allowCreate: "user/allowToCreateTenants",
    }),
    createDisabled() {
      return false;
    },
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
    async selectTenant(tenantId) {
      await this.select(tenantId);
      await this.$router.push({ name: "bookings" });
    },
    onOpenCreateTenant() {
      this.openCreateDialog = true;
    },
    async onCloseCreateDialog() {
      this.openCreateDialog = false;
      await this.fetchTenants();
    },
  },
};
</script>

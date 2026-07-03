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
        Wählen Sie einen Mandanten aus, um fortzufahren
      </p>
    </div>

    <v-row class="mb-4">
      <v-col>
        <v-text-field
          v-model="search"
          label="Mandanten suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          hide-details
          class="search-field"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="filteredTenants.length > 0">
      <v-col
        v-for="tenant in filteredTenants"
        :key="tenant.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <v-card
          :class="[
            'tenant-card',
            'fill-height',
            'd-flex',
            'flex-column',
            { 'tenant-card--active': tenant.id === currentTenant },
          ]"
          @click="selectTenant(tenant.id)"
          hover
        >
          <div class="tenant-card-header pa-4 text-center">
            <v-avatar
              :color="getTenantColor(tenant)"
              size="64"
              class="mb-3 elevation-4"
            >
              <span class="white--text text-h5 font-weight-bold">
                {{ getTenantInitials(tenant.name) }}
              </span>
            </v-avatar>
            <h3 class="text-h6 font-weight-bold mb-1">
              {{ tenant.name }}
            </h3>
            <p v-if="tenant.contactName" class="text-caption grey--text mb-0">
              <v-icon x-small class="mr-1">mdi-account</v-icon>
              {{ tenant.contactName }}
            </p>
          </div>

          <v-divider></v-divider>

          <v-card-text class="flex-grow-1 pa-4">
            <div
              v-if="tenant.location"
              class="d-flex align-start mb-2 text-body-2"
            >
              <v-icon small color="grey darken-1" class="mr-2 mt-1">
                mdi-map-marker
              </v-icon>
              <span class="grey--text text--darken-2">
                {{ tenant.location }}
              </span>
            </div>

            <div v-if="tenant.mail" class="d-flex align-start mb-2 text-body-2">
              <v-icon small color="grey darken-1" class="mr-2 mt-1">
                mdi-email
              </v-icon>
              <span class="grey--text text--darken-2 text-truncate">
                {{ tenant.mail }}
              </span>
            </div>

            <div
              v-if="tenant.phone"
              class="d-flex align-start mb-2 text-body-2"
            >
              <v-icon small color="grey darken-1" class="mr-2 mt-1">
                mdi-phone
              </v-icon>
              <span class="grey--text text--darken-2">
                {{ tenant.phone }}
              </span>
            </div>

            <div
              v-if="tenant.website && tenant.website !== '/'"
              class="d-flex align-start mb-2 text-body-2"
            >
              <v-icon small color="grey darken-1" class="mr-2 mt-1">
                mdi-web
              </v-icon>
              <span class="grey--text text--darken-2">
                {{ tenant.website }}
              </span>
            </div>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-3 justify-center">
            <v-btn
              small
              :color="tenant.id === currentTenant ? 'primary' : 'grey'"
              :outlined="tenant.id !== currentTenant"
              @click.stop="selectTenant(tenant.id)"
              block
            >
              <v-icon left small>
                {{
                  tenant.id === currentTenant
                    ? "mdi-check-circle"
                    : "mdi-arrow-right"
                }}
              </v-icon>
              {{
                tenant.id === currentTenant ? "Aktiver Mandant" : "Auswählen"
              }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else class="text-center py-12" flat>
      <v-icon size="64" color="grey lighten-2">mdi-domain-off</v-icon>
      <h3 class="text-h6 grey--text mt-4">Keine Mandanten gefunden</h3>
      <p class="grey--text">
        {{
          search
            ? "Keine Mandanten entsprechen Ihrer Suche"
            : "Sie haben noch keine Mandanten"
        }}
      </p>
      <v-btn
        v-if="allowCreate && !search"
        color="primary"
        class="mt-4"
        @click="onOpenCreateTenant()"
      >
        <v-icon left>mdi-plus</v-icon>
        Ersten Mandanten anlegen
      </v-btn>
    </v-card>

    <v-btn
      v-if="allowCreate && filteredTenants.length > 0"
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
      <v-icon>mdi-plus</v-icon>
      Mandanten anlegen
    </v-btn>

    <TenantCreate :open="openCreateDialog" @close="onCloseCreateDialog" />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin";
import { mapActions, mapGetters } from "vuex";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import PendingTenantInvitations from "@/components/Tenant/PendingTenantInvitations.vue";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";

export default {
  name: "HomeView",
  components: {
    PendingApprovals: PendingApprovals,
    PendingTenantInvitations,
    TenantCreate,
    AdminLayout,
  },
  data() {
    return {
      loading: false,
      openCreateDialog: false,
      search: "",
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
    filteredTenants() {
      if (!this.search) return this.tenants;

      const searchLower = this.search.toLowerCase();
      return this.tenants.filter(
        (tenant) =>
          tenant.name?.toLowerCase().includes(searchLower) ||
          tenant.contactName?.toLowerCase().includes(searchLower) ||
          tenant.location?.toLowerCase().includes(searchLower) ||
          tenant.mail?.toLowerCase().includes(searchLower)
      );
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
      const redirect = this.$route.query.redirect;
      if (typeof redirect === "string" && redirect.startsWith("/")) {
        await this.$router.push(redirect);
        return;
      }
      await this.$router.push({ name: "bookings" });
    },
    onOpenCreateTenant() {
      this.openCreateDialog = true;
    },
    async onCloseCreateDialog() {
      this.openCreateDialog = false;
      await this.fetchTenants();
    },
    getTenantInitials(name) {
      if (!name) return "??";
      const words = name.split(" ");
      if (words.length >= 2) {
        return (
          words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase()
        );
      }
      return name.substring(0, 2).toUpperCase();
    },
    getTenantColor(tenant) {
      // Generate color based on tenant name
      const colors = [
        "blue",
        "purple",
        "pink",
        "red",
        "orange",
        "amber",
        "green",
        "teal",
        "cyan",
        "indigo",
      ];
      const index = tenant.name.charCodeAt(0) % colors.length;
      return colors[index];
    },
  },
};
</script>

<style scoped>
.tenant-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  cursor: pointer;
  position: relative;
  border-radius: 12px !important;
  overflow: hidden;
}

.tenant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.tenant-card--active {
  border: 2px solid #4caf50 !important;
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.05) 0%,
    rgba(76, 175, 80, 0.02) 100%
  );
}

.tenant-card--active:hover {
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3) !important;
}

.tenant-card-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .tenant-card-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.badge-active {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Smooth animations */
.v-card {
  transition: all 0.3s ease;
}

.v-avatar {
  transition: transform 0.3s ease;
}

.tenant-card:hover .v-avatar {
  transform: scale(1.1);
}

/* Dark mode adjustments */
.theme--dark .tenant-card--active {
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.1) 0%,
    rgba(76, 175, 80, 0.05) 100%
  );
}

.search-field {
  border-radius: 15px;
}
</style>

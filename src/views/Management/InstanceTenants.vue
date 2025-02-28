<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-text-field
          v-model="search"
          label="Mandant suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>
        <v-data-table
          :headers="headers"
          :items="api.tenants"
          :sort-by="['name']"
          :sort-desc="[false]"
          :search="search"
          :footer-props="{
            'items-per-page-all-text': 'Alle',
            'items-per-page-text': 'Mandanten pro Seite',
          }"
          class="accent elevation-1"
          fixed-header
          :loading="loading"
          loading-text="Daten werden geladen..."
        >
          <template v-slot:header.name="{ header }">
            {{ header.text.toUpperCase() }}
          </template>
          <template v-slot:item.controls="{ item }">
            <span>
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn icon v-bind="attrs" v-on="on" small>
                    <v-icon>mdi-dots-horizontal</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    link
                    @click="onOpenEditTenant(item.id)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-pencil</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Mandanten bearbeiten</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    link
                    @click="onOpenDeleteDialog(item.id)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-delete</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Mandanten löschen</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </span>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <TenantEditDialog
      v-if="selectedTenant.id"
      :open="openEditDialog"
      :tenant-id="selectedTenant.id"
      @close="onCloseDialog"
      ></TenantEditDialog>
    <DeleteConformationDialog
      :open="openDeleteDialog"
      :toDelete="selectedTenant"
      @close="onCloseDeleteDialog"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import DeleteConformationDialog from "@/components/Tenant/tenantDeleteConformationDialog";
import Tenant from "@/entities/tenant";
import TenantEditDialog from "@/components/Tenant/TenantEditDialog.vue";

export default {
  components: {
    DeleteConformationDialog,
    AdminLayout,
    TenantEditDialog,
  },
  data() {
    return {
      search: "",
      api: {
        tenants: [],
      },
      headers: [
        {
          text: "Id",
          align: "start",
          value: "id",
          sortable: false,
        },
        { text: "Name", value: "name" },
        { text: "Kontakt Person", value: "contactName" },
        { text: "Adresse", value: "location" },
        { text: "E-Mail Adresse", value: "mail" },
        { text: "Telefonnummer", value: "phone" },
        { text: "", value: "controls", sortable: false },
      ],
      openEditDialog: false,
      openDeleteDialog: false,
      selectedTenant: {},
      tenantCountCheck: true,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
    }),
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    fetchTenants() {
      this.startLoading("fetch-tenants");
      ApiTenantService.getTenants()
        .then((response) => {
          this.api.tenants = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-tenants");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onOpenEditTenant(tenantId) {
      this.selectedTenant = Object.assign(
        {},
        this.api.tenants.find((tenant) => tenant.id === tenantId)
      );
      this.openEditDialog = true;
    },
    async onCloseDialog() {
      this.fetchTenants();
      this.openEditDialog = false;
      await this.getTenantCountCheck();
    },
    onOpenDeleteDialog(tenantId) {
      this.selectedTenant = Object.assign(
        {},
        this.api.tenants.find((tenant) => tenant.id === tenantId)
      );
      this.openDeleteDialog = true;
    },
    async onCloseDeleteDialog() {
      this.fetchTenants();
      this.openDeleteDialog = false;
      await this.getTenantCountCheck();
    },
    onOpenCreateTenant() {
      this.selectedTenant = new Tenant();
      this.openEditDialog = true;
    },
    async getTenantCountCheck() {
      this.tenantCountCheck = await ApiTenantService.tenantCountCheck();
    },
  },
  async mounted() {
    await this.getTenantCountCheck();
  },
  created() {
    this.fetchTenants();
  },
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

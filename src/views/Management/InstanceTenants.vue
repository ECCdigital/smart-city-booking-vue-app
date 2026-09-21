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
        <div v-if="allowSupervise" class="d-flex align-center flex-wrap mb-4">
          <v-select
            ref="levelFilter"
            :value="levelFilter"
            :items="levelFilterItems"
            :label="$t('supervision.level.filter.label')"
            dense
            outlined
            hide-details
            class="level-filter"
            @input="onFilterLevel"
          />
          <v-spacer />
          <v-btn
            v-if="allowInstanceHistory"
            text
            color="primary"
            data-test="open-instance-history"
            @click="onOpenHistory(null)"
          >
            <v-icon left>mdi-history</v-icon>
            {{ $t("supervision.history.open-instance") }}
          </v-btn>
        </div>
        <div
          v-if="loading"
          class="elevation-2"
          style="border-radius: 25px; overflow: hidden"
        >
          <v-skeleton-loader
            type="table-thead, table-tbody, table-tfoot"
            :types="{
              'table-tbody': 'table-row-divider@6',
            }"
          ></v-skeleton-loader>
        </div>
        <v-data-table
          v-else
          :headers="visibleHeaders"
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
          <template v-slot:item.supervisionLevel="{ item }">
            <SupervisionLevelChip :level="item.supervisionLevel" />
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
                  <v-list-item link @click="onOpenEditTenant(item.id)">
                    <v-list-item-icon>
                      <v-icon>mdi-pencil</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Mandanten bearbeiten</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    v-if="allowReadiness(item.id)"
                    link
                    data-test="open-readiness"
                    @click="onOpenReadiness(item.id)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-clipboard-check-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>{{
                      $t("tenant.readiness.open")
                    }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    v-if="allowSupervise"
                    link
                    data-test="open-level-change"
                    @click="onOpenLevelChange(item.id)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-shield-account-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>{{
                      $t("supervision.level.change.action")
                    }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    v-if="allowSupervisionHistory(item.id)"
                    link
                    data-test="open-supervision-history"
                    @click="onOpenHistory(item.id)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-history</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>{{
                      $t("supervision.history.open")
                    }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item link @click="onSelectTenant(item.id)">
                    <v-list-item-icon>
                      <v-icon>mdi-eye</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title
                      >Zum Mandanten wechseln</v-list-item-title
                    >
                  </v-list-item>
                  <v-list-item link @click="onOpenDeleteDialog(item.id)">
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
    <TenantReadinessDialog
      :open="openReadinessDialog"
      :tenant="selectedTenant"
      @close="openReadinessDialog = false"
    />
    <SupervisionLevelDialog
      :open="openLevelDialog"
      :tenant="selectedTenant"
      @changed="onLevelChanged"
      @stale="onLevelStale"
      @close="openLevelDialog = false"
    />
    <SupervisionHistoryDialog
      :open="openHistoryDialog"
      :tenant="historyTenant"
      :tenants="api.allTenants"
      @close="openHistoryDialog = false"
    />
    <DeleteConformationDialog
      :open="openDeleteDialog"
      :toDelete="selectedTenant"
      @close="onCloseDeleteDialog"
    />
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
    >
      <v-icon>mdi-plus</v-icon> Mandanten anlegen
    </v-btn>
    <TenantCreate :open="openCreateDialog" @close="onCloseCreateDialog" />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import DeleteConformationDialog from "@/components/Tenant/tenantDeleteConformationDialog";
import TenantEditDialog from "@/components/Tenant/TenantEditDialog.vue";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";
import TenantReadinessDialog from "@/components/Tenant/TenantReadinessDialog.vue";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import SupervisionLevelChip from "@/components/Supervision/SupervisionLevelChip.vue";
import SupervisionLevelDialog from "@/components/Supervision/SupervisionLevelDialog.vue";
import SupervisionHistoryDialog from "@/components/Supervision/SupervisionHistoryDialog.vue";
import ToastService from "@/services/ToastService";
import {
  SUPERVISION_LEVEL_VALUES,
  effectiveLevel,
  levelLabelKey,
} from "@/utils/supervision";

export default {
  components: {
    TenantCreate,
    DeleteConformationDialog,
    AdminLayout,
    TenantEditDialog,
    TenantReadinessDialog,
    SupervisionLevelChip,
    SupervisionLevelDialog,
    SupervisionHistoryDialog,
  },
  data() {
    return {
      search: "",
      api: {
        tenants: [],
        // Unfiltered: the instance-wide history names every tenant, whatever
        // level the table is narrowed to.
        allTenants: [],
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
        {
          text: this.$t("supervision.level.column"),
          value: "supervisionLevel",
          supervision: true,
        },
        { text: "", value: "controls", sortable: false },
      ],
      openEditDialog: false,
      openDeleteDialog: false,
      openReadinessDialog: false,
      openLevelDialog: false,
      openHistoryDialog: false,
      // `null` while the dialog shows the instance-wide history.
      historyTenant: null,
      levelFilter: null,
      selectedTenant: {},
      tenantCountCheck: true,
      openCreateDialog: false,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      allowCreate: "user/allowToCreateTenants",
    }),
    // The level, its filter and its change are the instance owner's.
    allowSupervise() {
      return TenantPermissionService.allowSupervise();
    },
    allowInstanceHistory() {
      return TenantPermissionService.allowInstanceSupervisionHistory();
    },
    visibleHeaders() {
      return this.headers.filter(
        (header) => !header.supervision || this.allowSupervise
      );
    },
    levelFilterItems() {
      return [
        { value: null, text: this.$t("supervision.level.filter.all") },
        ...SUPERVISION_LEVEL_VALUES.map((value) => ({
          value,
          text: this.$t(levelLabelKey(value)),
        })),
      ];
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      selectTenant: "tenants/select",
      addToast: "toasts/add",
    }),
    async onCloseCreateDialog() {
      this.openCreateDialog = false;
      await this.fetchTenants();
    },
    fetchTenants() {
      this.startLoading("fetch-tenants");
      // The backend filters by level; only the instance owner sets one.
      return ApiTenantService.getTenants(false, {
        supervisionLevel: this.levelFilter,
      })
        .then((response) => {
          this.api.tenants = response.data;
          if (!this.levelFilter) this.api.allTenants = response.data;
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
    allowReadiness(tenantId) {
      return TenantPermissionService.allowReadiness(tenantId);
    },
    onOpenReadiness(tenantId) {
      this.selectedTenant = Object.assign(
        {},
        this.api.tenants.find((tenant) => tenant.id === tenantId)
      );
      this.openReadinessDialog = true;
    },
    allowSupervisionHistory(tenantId) {
      return TenantPermissionService.allowSupervisionHistory(tenantId);
    },
    onFilterLevel(level) {
      this.levelFilter = level || null;
      this.fetchTenants();
    },
    onOpenLevelChange(tenantId) {
      this.selectedTenant = Object.assign(
        {},
        this.api.tenants.find((tenant) => tenant.id === tenantId)
      );
      this.openLevelDialog = true;
    },
    // The answer of the change is the effective level: the row shows it
    // without waiting for a reload. Under a filter the row may no longer
    // belong to the list, so the list is read again.
    onLevelChanged({ tenantId, supervisionLevel, supervisionChangedAt }) {
      this.openLevelDialog = false;
      const tenant = this.api.tenants.find((t) => t.id === tenantId);
      if (tenant) {
        this.$set(tenant, "supervisionLevel", supervisionLevel);
        this.$set(tenant, "supervisionChangedAt", supervisionChangedAt);
        this.addToast(
          ToastService.createToast(
            "supervision.level.change.success",
            "success",
            5000,
            {
              tenant: tenant.name || tenant.id,
              level: this.$t(levelLabelKey(effectiveLevel(tenant))),
            }
          )
        );
      }
      if (this.levelFilter) this.fetchTenants();
    },
    // A 409 or 404 of the change: the list is read again and the open dialog
    // follows the tenant as it is now. A tenant that is gone stays in the
    // dialog, which says so.
    async onLevelStale() {
      const tenantId = this.selectedTenant.id;
      await this.fetchTenants();
      const current = this.api.tenants.find((t) => t.id === tenantId);
      if (current) this.selectedTenant = Object.assign({}, current);
    },
    onOpenHistory(tenantId) {
      this.historyTenant = tenantId
        ? Object.assign(
            {},
            this.api.tenants.find((tenant) => tenant.id === tenantId)
          )
        : null;
      this.openHistoryDialog = true;
    },
    onOpenCreateTenant() {
      this.openCreateDialog = true;
    },
    async getTenantCountCheck() {
      this.tenantCountCheck = await ApiTenantService.tenantCountCheck();
    },
    onSelectTenant(tenantId) {
      this.selectTenant(tenantId);
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
.level-filter {
  max-width: 260px;
}
.custom-alert {
  border-radius: 15px !important;
}
</style>

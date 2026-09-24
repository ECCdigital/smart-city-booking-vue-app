<template>
  <AdminLayout scroll-body class="instance-tenants">
    <div class="instance-tenants__body">
      <div class="instance-tenants__main">
        <v-card outlined class="section-card instance-tenants__card">
          <v-card-title class="section-header">
            <v-icon>mdi-domain</v-icon>
            <span>{{ $t("tenant.list.section") }}</span>
            <span
              v-if="!loading"
              class="instance-tenants__count"
              data-test="tenant-count"
            >
              {{ $tc("tenant.list.count", api.tenants.length) }}
            </span>
            <v-btn
              v-if="allowCreate"
              small
              depressed
              color="primary"
              class="instance-tenants__create"
              data-test="open-create"
              @click="onOpenCreateTenant"
            >
              <v-icon left small>mdi-plus</v-icon>
              {{ $t("tenant.list.create") }}
            </v-btn>
            <v-btn
              icon
              small
              class="instance-tenants__reload"
              :title="$t('tenant.list.reload')"
              :aria-label="$t('tenant.list.reload')"
              :disabled="loading"
              data-test="tenant-reload"
              @click="fetchTenants"
            >
              <v-icon small>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <p class="instance-tenants__lead">
              {{ $t("tenant.list.hint") }}
              <template v-if="allowCatalog">
                {{ $t("tenant.list.hint-catalog") }}
              </template>
            </p>
            <div class="instance-tenants__filters">
              <v-text-field
                v-model="search"
                :label="$t('tenant.list.search')"
                append-icon="mdi-magnify"
                dense
                outlined
                clearable
                hide-details
                class="instance-tenants__search"
                data-test="tenant-search"
              />
              <v-select
                v-if="allowSupervise"
                ref="levelFilter"
                :value="levelFilter"
                :items="levelFilterItems"
                :label="$t('supervision.level.filter.label')"
                dense
                outlined
                hide-details
                class="instance-tenants__filter"
                @input="onFilterLevel"
              />
              <v-spacer />
              <v-btn
                v-if="allowInstanceHistory"
                text
                small
                color="primary"
                class="instance-tenants__history"
                data-test="open-instance-history"
                @click="onOpenHistory(null)"
              >
                <v-icon left small>mdi-history</v-icon>
                {{ $t("supervision.history.open-instance") }}
              </v-btn>
            </div>
            <v-alert
              v-if="catalogState === 'failed'"
              type="warning"
              text
              dense
              data-test="catalog-unavailable"
            >
              {{ $t("tenant.list.catalog.unavailable") }}
            </v-alert>
            <v-skeleton-loader
              v-if="loading"
              type="list-item-two-line@6"
              data-test="tenant-skeleton"
            />
            <!-- The list sorts itself by name and cuts its own pages; the
                 iterator only turns them. -->
            <v-data-iterator
              v-else
              :items="filteredTenants"
              item-key="id"
              :page.sync="page"
              :items-per-page.sync="pageSize"
              :footer-props="{
                'items-per-page-options': pageSizes,
                'items-per-page-text': $t('tenant.list.per-page'),
                'page-text': $t('tenant.list.page-text'),
              }"
              :no-data-text="
                $t(search ? 'tenant.list.empty-search' : 'tenant.list.empty')
              "
              :hide-default-footer="filteredTenants.length <= pageSizes[0]"
              disable-sort
            >
              <template #default="{ items: rows }">
                <div class="booking-rows">
                  <div
                    v-for="item in rows"
                    :key="item.id"
                    class="booking-row tenant-row"
                    :class="{ 'tenant-row--selected': item.id === selectedId }"
                    role="button"
                    tabindex="0"
                    :aria-pressed="item.id === selectedId ? 'true' : 'false'"
                    data-test="tenant-row"
                    @click="select(item.id)"
                    @keydown.enter.prevent="select(item.id)"
                    @keydown.space.prevent="select(item.id)"
                  >
                    <div class="booking-row__main">
                      <!-- Badges name the exceptions only: a free tenant in
                           the catalog carries none. -->
                      <div class="booking-row__title tenant-row__title">
                        <span>{{ item.name }}</span>
                        <SupervisionLevelChip
                          v-if="allowSupervise && isSupervised(item)"
                          x-small
                          :level="item.supervisionLevel"
                          class="tenant-row__badge"
                        />
                        <v-chip
                          v-if="showCatalog && !isInCatalog(item.id)"
                          x-small
                          label
                          outlined
                          class="tenant-row__badge"
                          data-test="catalog-badge"
                        >
                          {{ $t("tenant.list.catalog.excluded") }}
                        </v-chip>
                      </div>
                      <div class="booking-row__subtitle">
                        {{ rowSubtitle(item) }}
                      </div>
                    </div>
                    <v-icon small class="tenant-row__chevron">
                      mdi-chevron-right
                    </v-icon>
                  </div>
                </div>
              </template>
            </v-data-iterator>
          </v-card-text>
        </v-card>
      </div>

      <!-- The panel follows the selected row: the tenant's facts over its
           actions, as the booking page's panel draws the customer. -->
      <v-card
        outlined
        class="section-card instance-tenants__panel"
        data-test="tenant-panel"
      >
        <template v-if="selected">
          <v-card-title class="section-header section-header--stacked">
            <div class="instance-tenants__identity">
              <v-icon>mdi-domain</v-icon>
              <div class="section-header__text">
                <div class="section-header__title">{{ selected.name }}</div>
                <div v-if="selected.mail" class="section-header__subtitle">
                  {{ selected.mail }}
                </div>
              </div>
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div class="booking-caption">
              {{ $t("tenant.list.panel.contact") }}
            </div>
            <div class="booking-facts">
              <div
                v-for="fact in contactFacts"
                :key="fact.key"
                class="booking-fact"
              >
                <span class="booking-fact__label">{{ fact.label }}</span>
                <span class="booking-fact__value">{{ fact.value || "–" }}</span>
              </div>
            </div>

            <template v-if="allowSupervise">
              <div class="booking-caption booking-caption--spaced">
                {{ $t("tenant.list.panel.supervision") }}
              </div>
              <div class="booking-facts">
                <div class="booking-fact">
                  <span class="booking-fact__label">
                    {{ $t("tenant.list.panel.level") }}
                  </span>
                  <span class="booking-fact__value">
                    <SupervisionLevelChip :level="selected.supervisionLevel" />
                  </span>
                </div>
                <div v-if="selected.supervisionChangedAt" class="booking-fact">
                  <span class="booking-fact__label">
                    {{ $t("tenant.list.panel.level-since") }}
                  </span>
                  <span class="booking-fact__value">
                    {{ dateTime(selected.supervisionChangedAt) }}
                  </span>
                </div>
              </div>
            </template>

            <template v-if="showCatalog">
              <div class="booking-caption booking-caption--spaced">
                {{ $t("tenant.list.panel.catalog") }}
              </div>
              <div class="instance-tenants__switch-row">
                <div class="instance-tenants__switch-text">
                  <div class="instance-tenants__switch-label">
                    {{ $t("tenant.list.catalog.label") }}
                  </div>
                  <div class="instance-tenants__switch-hint">
                    {{ $t("tenant.list.catalog.hint") }}
                  </div>
                </div>
                <v-switch
                  :key="`${selected.id}:${catalogRevision}`"
                  :input-value="isInCatalog(selected.id)"
                  :disabled="isSavingCatalog(selected.id)"
                  :loading="isSavingCatalog(selected.id)"
                  :aria-label="$t('tenant.list.catalog.label')"
                  color="primary"
                  dense
                  inset
                  hide-details
                  class="instance-tenants__switch"
                  data-test="catalog-switch"
                  @change="onToggleCatalog(selected, $event)"
                />
              </div>
            </template>

            <div class="booking-caption booking-caption--spaced">
              {{ $t("tenant.list.panel.actions") }}
            </div>
            <v-list dense class="instance-tenants__actions">
              <v-list-item link data-test="open-edit" @click="onOpenEditTenant">
                <v-list-item-icon>
                  <v-icon small>mdi-pencil</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>
                    {{ $t("tenant.list.panel.edit") }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ $t("tenant.list.panel.edit-hint") }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item
                v-if="allowReadiness(selected.id)"
                link
                data-test="open-readiness"
                @click="openReadinessDialog = true"
              >
                <v-list-item-icon>
                  <v-icon small>mdi-clipboard-check-outline</v-icon>
                </v-list-item-icon>
                <v-list-item-title>
                  {{ $t("tenant.readiness.open") }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="allowSupervise"
                link
                data-test="open-level-change"
                @click="openLevelDialog = true"
              >
                <v-list-item-icon>
                  <v-icon small>mdi-shield-account-outline</v-icon>
                </v-list-item-icon>
                <v-list-item-title>
                  {{ $t("supervision.level.change.action") }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="allowSupervisionHistory(selected.id)"
                link
                data-test="open-supervision-history"
                @click="onOpenHistory(selected.id)"
              >
                <v-list-item-icon>
                  <v-icon small>mdi-history</v-icon>
                </v-list-item-icon>
                <v-list-item-title>
                  {{ $t("supervision.history.open") }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                link
                class="instance-tenants__delete"
                data-test="open-delete"
                @click="openDeleteDialog = true"
              >
                <v-list-item-icon>
                  <v-icon small color="error">mdi-delete</v-icon>
                </v-list-item-icon>
                <v-list-item-title class="error--text">
                  {{ $t("tenant.list.panel.delete") }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </template>

        <template v-else>
          <v-card-title class="section-header">
            <v-icon>mdi-domain</v-icon>
            <span>{{ $t("tenant.list.panel.title") }}</span>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <p class="instance-tenants__none" data-test="tenant-panel-none">
              {{ $t("tenant.list.panel.none") }}
            </p>
          </v-card-text>
        </template>
      </v-card>
    </div>

    <TenantReadinessDialog
      :open="openReadinessDialog"
      :tenant="selected || {}"
      @close="openReadinessDialog = false"
    />
    <SupervisionLevelDialog
      :open="openLevelDialog"
      :tenant="selected || {}"
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
      :toDelete="selected || {}"
      @close="onCloseDeleteDialog"
    />
    <TenantCreate :open="openCreateDialog" @close="onCloseCreateDialog" />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import DeleteConformationDialog from "@/components/Tenant/tenantDeleteConformationDialog";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";
import TenantReadinessDialog from "@/components/Tenant/TenantReadinessDialog.vue";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import SupervisionLevelChip from "@/components/Supervision/SupervisionLevelChip.vue";
import SupervisionLevelDialog from "@/components/Supervision/SupervisionLevelDialog.vue";
import SupervisionHistoryDialog from "@/components/Supervision/SupervisionHistoryDialog.vue";
import ToastService from "@/services/ToastService";
import FormatService from "@/services/FormatService";
import {
  SUPERVISION_LEVELS,
  SUPERVISION_LEVEL_VALUES,
  effectiveLevel,
  levelLabelKey,
} from "@/utils/supervision";
import {
  catalogForSave,
  isTenantInCatalog,
  withTenantInCatalog,
} from "@/utils/instanceCatalog";

/** The fields the search reads, in the order the row names them. */
const SEARCH_FIELDS = [
  "name",
  "contactName",
  "mail",
  "location",
  "phone",
  "id",
];

const byName = (a, b) =>
  String(a.name || "").localeCompare(String(b.name || ""), "de");

/** Whether one of the tenant's search fields contains the lowercased needle. */
const matches = (tenant, needle) =>
  SEARCH_FIELDS.some((field) =>
    String(tenant[field] || "")
      .toLowerCase()
      .includes(needle)
  );

/**
 * The instance's tenant list, drawn as the review queue and the booking page
 * are: a section card of hairline rows in the wide column, a sticky panel
 * beside it that follows the selected row with the tenant's facts and
 * actions. The instance owner switches a tenant into or out of the portal's
 * catalog right in its row; the switch writes `excludedTenantIds` of the
 * instance catalog, the same field the Portal tab of the instance settings
 * edits.
 */
export default {
  name: "InstanceTenants",
  components: {
    TenantCreate,
    DeleteConformationDialog,
    AdminLayout,
    TenantReadinessDialog,
    SupervisionLevelChip,
    SupervisionLevelDialog,
    SupervisionHistoryDialog,
  },
  data() {
    return {
      search: "",
      page: 1,
      pageSize: 25,
      pageSizes: [25, 50, 100],
      api: {
        tenants: [],
        // Unfiltered: the instance-wide history names every tenant, whatever
        // level the list is narrowed to.
        allTenants: [],
      },
      // The instance catalog; `null` until read. Its state says whether the
      // switches may show: they would write a catalog the page never saw.
      catalog: null,
      catalogState: "idle",
      // A failed save leaves the switch flipped; a new revision remounts it
      // on the stored value.
      catalogRevision: 0,
      savingCatalog: {},
      selectedId: null,
      openDeleteDialog: false,
      openReadinessDialog: false,
      openLevelDialog: false,
      openHistoryDialog: false,
      // `null` while the dialog shows the instance-wide history.
      historyTenant: null,
      levelFilter: null,
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
    allowCatalog() {
      return TenantPermissionService.allowCatalogExposure();
    },
    /** The catalog facts and switch show once the catalog is read. */
    showCatalog() {
      return this.allowCatalog && this.catalogState === "ready";
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
    filteredTenants() {
      const needle = String(this.search || "")
        .trim()
        .toLowerCase();
      const rows = needle
        ? this.api.tenants.filter((tenant) => matches(tenant, needle))
        : this.api.tenants;
      return [...rows].sort(byName);
    },
    /** The selected tenant as the list holds it now; gone with the list. */
    selected() {
      return (
        this.api.tenants.find((tenant) => tenant.id === this.selectedId) || null
      );
    },
    contactFacts() {
      const tenant = this.selected;
      if (!tenant) return [];
      return [
        {
          key: "contact",
          labelKey: "contact-person",
          value: tenant.contactName,
        },
        { key: "mail", labelKey: "mail", value: tenant.mail },
        { key: "phone", labelKey: "phone", value: tenant.phone },
        { key: "location", labelKey: "location", value: tenant.location },
        { key: "id", labelKey: "id", value: tenant.id },
      ].map((fact) => ({
        ...fact,
        label: this.$t(`tenant.list.panel.${fact.labelKey}`),
      }));
    },
  },
  watch: {
    search() {
      this.page = 1;
    },
  },
  created() {
    this.fetchTenants();
    if (this.allowCatalog) this.fetchCatalog();
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      selectTenant: "tenants/select",
      addToast: "toasts/add",
    }),
    select(tenantId) {
      this.selectedId = tenantId;
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
    async fetchCatalog() {
      try {
        this.catalog = (await ApiCatalogService.getCatalog()).data || {};
        this.catalogState = "ready";
      } catch (error) {
        console.error(error);
        this.catalogState = "failed";
      }
    },
    isSupervised(tenant) {
      return effectiveLevel(tenant) !== SUPERVISION_LEVELS.FREE;
    },
    isInCatalog(tenantId) {
      return isTenantInCatalog(this.catalog, tenantId);
    },
    isSavingCatalog(tenantId) {
      return this.savingCatalog[tenantId] === true;
    },
    /**
     * The catalog is read anew right before the write, so the switch does
     * not carry back a stale copy of what the Portal tab or another owner
     * changed meanwhile; only this tenant's place in it changes.
     */
    async onToggleCatalog(tenant, inCatalog) {
      this.$set(this.savingCatalog, tenant.id, true);
      try {
        const current = (await ApiCatalogService.getCatalog()).data || {};
        const next = withTenantInCatalog(current, tenant.id, inCatalog);
        await ApiCatalogService.updateCatalog(catalogForSave(next));
        this.catalog = next;
        this.addToast(
          ToastService.createToast(
            inCatalog
              ? "tenant.list.catalog.shown"
              : "tenant.list.catalog.hidden",
            "success",
            5000,
            { tenant: tenant.name || tenant.id }
          )
        );
      } catch (error) {
        console.error(error);
        this.catalogRevision += 1;
        this.addToast(
          ToastService.createToast(
            "tenant.list.catalog.failed",
            "error",
            5000,
            {
              tenant: tenant.name || tenant.id,
            }
          )
        );
      } finally {
        this.$delete(this.savingCatalog, tenant.id);
      }
    },
    rowSubtitle(tenant) {
      return [
        tenant.contactName || this.$t("tenant.list.no-contact"),
        tenant.mail,
        tenant.location,
      ]
        .filter(Boolean)
        .join(" · ");
    },
    dateTime: (value) => FormatService.dateTime(value),
    /**
     * Editing happens in the tenant's own pages: the chosen tenant becomes
     * the current one and the tenant page opens, which says that the
     * instance owner is editing another tenant.
     */
    async onOpenEditTenant() {
      const tenant = this.selected;
      await this.selectTenant(tenant.id);
      this.addToast(
        ToastService.createToast("booking.page.tenant-switched", "info", 5000, {
          name: tenant.name || tenant.id,
        })
      );
      this.$router.push({ name: "tenant" });
    },
    async onCloseDeleteDialog() {
      this.openDeleteDialog = false;
      await this.fetchTenants();
    },
    async onCloseCreateDialog() {
      this.openCreateDialog = false;
      await this.fetchTenants();
    },
    allowReadiness(tenantId) {
      return TenantPermissionService.allowReadiness(tenantId);
    },
    allowSupervisionHistory(tenantId) {
      return TenantPermissionService.allowSupervisionHistory(tenantId);
    },
    onFilterLevel(level) {
      this.levelFilter = level || null;
      this.page = 1;
      this.fetchTenants();
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
        const level = effectiveLevel(tenant);
        const levelKey = levelLabelKey(level);
        this.addToast(
          ToastService.createToast(
            "supervision.level.change.success",
            "success",
            5000,
            {
              tenant: tenant.name || tenant.id,
              level: levelKey ? this.$t(levelKey) : level,
            }
          )
        );
      }
      if (this.levelFilter) this.fetchTenants();
    },
    // A 409 or 404 of the change: the list is read again, and the open
    // dialog follows the tenant as the list holds it now. A tenant that is
    // gone stays in the dialog, which says so.
    onLevelStale() {
      return this.fetchTenants();
    },
    onOpenHistory(tenantId) {
      this.historyTenant = tenantId ? { ...this.selected } : null;
      this.openHistoryDialog = true;
    },
    onOpenCreateTenant() {
      this.openCreateDialog = true;
    },
  },
};
</script>

<style scoped>
/* Two columns as the review queue draws them: the list in the wide column,
   the selected tenant in a sticky panel beside it. */
.instance-tenants__body {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
}

.instance-tenants__main {
  flex: 1;
  min-width: 0;
}

.instance-tenants__panel {
  width: var(--scb-panel-width);
  flex: none;
  position: sticky;
  top: 0;
  margin-bottom: var(--scb-gap-cards);
}

.instance-tenants__card {
  margin-bottom: var(--scb-gap-cards);
}

.instance-tenants__count {
  margin-left: auto;
  margin-right: var(--scb-space-1);
  font-size: var(--scb-font-size-sm);
  font-weight: 400;
  color: var(--scb-text-muted);
}

/* The app's buttons capitalise every word (!important, variables.scss);
   the labels here are sentences, so the override needs the same weight. */
.instance-tenants__create {
  margin-left: var(--scb-space-2);
  text-transform: none !important;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

/* The reload sits in the header strip without adding to its height. */
.instance-tenants__reload {
  margin: -6px -4px -6px 0;
}

.instance-tenants__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.instance-tenants__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-4);
  margin-bottom: var(--scb-space-3);
}

.instance-tenants__search {
  flex: 1 1 240px;
  max-width: 360px;
}

.instance-tenants__filter {
  flex: 0 1 200px;
}

.instance-tenants__history {
  text-transform: none !important;
  letter-spacing: normal;
}

/* A row is a button: it selects the tenant for the panel. The selected one
   is tinted primary, as a chosen item of the media library is, and the tint
   bleeds past the row's edges so the hairlines stay where they are. */
.tenant-row {
  align-items: center;
  padding: var(--scb-space-2) var(--scb-space-2);
  margin: 0 calc(-1 * var(--scb-space-2));
  border-radius: var(--scb-radius-control);
  cursor: pointer;
  transition: background-color var(--scb-motion-fast);
}

.tenant-row:hover {
  background-color: var(--scb-hover-tint);
}

.tenant-row:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: -2px;
}

.tenant-row--selected,
.tenant-row--selected:hover {
  background-color: var(--scb-selected-tint);
}

.tenant-row--selected .booking-row__title {
  color: var(--v-primary-base);
}

/* The name with its badges, if any, on one line. */
.tenant-row__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
}

.tenant-row__badge {
  height: 18px;
  font-size: var(--scb-font-size-caption);
  font-weight: 400;
}

/* The chevron says the row opens something, quietly. */
.tenant-row__chevron {
  flex: none;
  color: var(--scb-text-caption);
}

.tenant-row--selected .tenant-row__chevron {
  color: var(--v-primary-base);
}

/* The catalog switch in the panel: label and hint left, the switch right. */
.instance-tenants__switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-4);
}

.instance-tenants__switch-text {
  min-width: 0;
}

.instance-tenants__switch-label {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  line-height: var(--scb-line-height-base);
}

.instance-tenants__switch-hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
}

.instance-tenants__switch {
  flex: none;
  margin: 0;
  padding: 0;
}

.instance-tenants__identity {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.instance-tenants__none {
  margin: 0;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

/* The actions: a list of rows that bleed to the panel's padding, so the
   hover tint spans the panel as the row tint spans the list. */
.instance-tenants__actions {
  margin: 0 calc(-1 * var(--scb-space-2));
  padding: 0;
  background: transparent;
}

.instance-tenants__actions ::v-deep .v-list-item {
  min-height: 36px;
  border-radius: var(--scb-radius-control);
}

.instance-tenants__actions ::v-deep .v-list-item__icon {
  margin: 8px var(--scb-space-3) 8px 0;
}

.instance-tenants__actions ::v-deep .v-list-item__title {
  font-size: var(--scb-font-size-sm);
}

.instance-tenants__actions ::v-deep .v-list-item__subtitle {
  font-size: var(--scb-font-size-xs);
  white-space: normal;
}

.instance-tenants__delete {
  margin-top: var(--scb-space-2);
  border-top: 1px solid var(--scb-rule);
  border-radius: 0 0 var(--scb-radius-control) var(--scb-radius-control);
}

/* $scb-bp-md / $scb-bp-sm / $scb-bp-xs of tokens.scss. */
@media (max-width: 1264px) {
  .instance-tenants__panel {
    width: var(--scb-panel-width-narrow);
  }
}

@media (max-width: 959px) {
  .instance-tenants__body {
    flex-direction: column;
    align-items: stretch;
  }
  .instance-tenants__panel {
    width: 100%;
    position: static;
  }
}

@media (max-width: 599px) {
  .instance-tenants__search {
    max-width: none;
  }
}
</style>

<style>
/* The section body padding of the review queue; the selector is the page's
   own, so the sheet is plain (not scoped). */
.instance-tenants .section-card > .v-card__text {
  padding: var(--scb-section-body-padding);
}

.instance-tenants .v-data-iterator .v-data-footer {
  border-top: 1px solid var(--scb-rule);
  margin-top: var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>

<template>
  <AdminLayout class="tenant-home">
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

    <p class="tenant-home__lead">{{ $t("tenant.home.hint") }}</p>

    <!-- The toolbar (toolbar.scss): search left, the view switch right. -->
    <div class="scb-toolbar">
      <v-text-field
        v-model="search"
        :label="$t('tenant.home.search')"
        append-icon="mdi-magnify"
        dense
        outlined
        clearable
        hide-details
        class="scb-search"
        data-test="tenant-search"
      ></v-text-field>
      <v-spacer />
      <!-- Two views only, so the switch is a joined pair of buttons; one
           of them is always on. -->
      <v-btn-toggle
        v-model="view"
        mandatory
        dense
        color="primary"
        class="scb-views"
        :aria-label="$t('tenant.home.view.label')"
      >
        <v-btn value="grid" small class="scb-view" data-test="view-grid">
          <v-icon left small>mdi-view-grid-outline</v-icon>
          {{ $t("tenant.home.view.grid") }}
        </v-btn>
        <v-btn value="list" small class="scb-view" data-test="view-list">
          <v-icon left small>mdi-format-list-bulleted</v-icon>
          {{ $t("tenant.home.view.list") }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- The tenants in groups: the ones the user is a member of, then the
         rest of the instance, which only an instance owner sees. With no
         rest there is one group and no heading over it. -->
    <template v-if="filteredTenants.length > 0">
      <section
        v-for="group in groups"
        :key="group.key"
        class="tenant-home__group"
        :data-test="`tenant-group-${group.key}`"
      >
        <div v-if="hasOtherTenants" class="tenant-home__group-head">
          <div class="tenant-home__group-line">
            <h2 class="tenant-home__group-title">
              {{ $t(`tenant.home.group.${group.key}`) }}
            </h2>
            <span class="tenant-home__group-count" data-test="group-count">
              {{ $tc("tenant.home.group.count", group.tenants.length) }}
            </span>
          </div>
          <div class="tenant-home__group-hint">
            {{ $t(`tenant.home.group.${group.key}-hint`) }}
          </div>
        </div>

        <!-- The list: hairline rows as the instance's tenant list draws
             them. A row is a button that picks the tenant; the active
             tenant is the one exception a badge names. -->
        <div
          v-if="view === 'list'"
          class="booking-rows tenant-home__rows"
          data-test="tenant-list"
        >
          <div
            v-for="tenant in group.tenants"
            :key="tenant.id"
            class="booking-row tenant-row"
            :class="{
              'tenant-row--active': tenant.id === currentTenant,
              'tenant-row--declined': !!declinedMembership(tenant.id),
            }"
            role="button"
            tabindex="0"
            :aria-pressed="tenant.id === currentTenant ? 'true' : 'false'"
            :aria-disabled="declinedMembership(tenant.id) ? 'true' : 'false'"
            data-test="tenant-row"
            @click="selectTenant(tenant.id)"
            @keydown.enter.prevent="selectTenant(tenant.id)"
            @keydown.space.prevent="selectTenant(tenant.id)"
          >
            <v-avatar
              :color="getTenantColor(tenant)"
              size="32"
              class="tenant-row__avatar"
            >
              <span class="white--text tenant-row__initials">
                {{ getTenantInitials(tenant.name) }}
              </span>
            </v-avatar>
            <div class="booking-row__main">
              <div class="booking-row__title tenant-row__title">
                <span>{{ tenant.name }}</span>
                <v-chip
                  v-if="tenant.id === currentTenant"
                  x-small
                  label
                  outlined
                  color="primary"
                  class="tenant-row__badge"
                  data-test="active-badge"
                >
                  {{ $t("tenant.home.active") }}
                </v-chip>
                <SupervisionLevelChip
                  v-if="markedLevel(tenant.id)"
                  :level="markedLevel(tenant.id)"
                  x-small
                  class="tenant-row__badge"
                />
              </div>
              <div class="booking-row__subtitle">
                {{ rowSubtitle(tenant) }}
              </div>
              <DeclinedTenantNotice
                v-if="declinedMembership(tenant.id)"
                :membership="declinedMembership(tenant.id)"
              />
            </div>
            <div class="booking-row__aside">
              <v-btn
                v-if="offersSetup(tenant.id)"
                text
                small
                color="primary"
                class="tenant-home__resume"
                data-test="resume-onboarding"
                @click.stop="resumeOnboarding(tenant.id)"
              >
                {{ $t("tenant.onboarding.resume") }}
              </v-btn>
              <v-icon
                v-if="!declinedMembership(tenant.id)"
                small
                class="tenant-row__chevron"
              >
                mdi-chevron-right
              </v-icon>
            </div>
          </div>
        </div>

        <!-- The grid: one card per tenant, the identity over the facts
             over the actions. -->
        <v-row v-else class="tenant-home__grid" data-test="tenant-grid">
          <v-col
            v-for="tenant in group.tenants"
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
                'scb-card',
                'fill-height',
                'd-flex',
                'flex-column',
                {
                  'tenant-card--active': tenant.id === currentTenant,
                  'scb-card--selected': tenant.id === currentTenant,
                  'tenant-card--declined': !!declinedMembership(tenant.id),
                  'scb-card--static': !!declinedMembership(tenant.id),
                },
              ]"
              role="button"
              tabindex="0"
              :aria-pressed="tenant.id === currentTenant ? 'true' : 'false'"
              :aria-disabled="declinedMembership(tenant.id) ? 'true' : 'false'"
              @click="selectTenant(tenant.id)"
              @keydown.enter.prevent="selectTenant(tenant.id)"
              @keydown.space.prevent="selectTenant(tenant.id)"
            >
              <div class="tenant-card__header">
                <v-avatar
                  :color="getTenantColor(tenant)"
                  size="56"
                  class="tenant-card__avatar"
                >
                  <span class="white--text tenant-card__initials">
                    {{ getTenantInitials(tenant.name) }}
                  </span>
                </v-avatar>
                <div class="tenant-card__name">{{ tenant.name }}</div>
                <div v-if="tenant.contactName" class="tenant-card__contact">
                  {{ tenant.contactName }}
                </div>
                <SupervisionLevelChip
                  v-if="markedLevel(tenant.id)"
                  :level="markedLevel(tenant.id)"
                  x-small
                  class="tenant-card__level"
                />
              </div>

              <v-divider></v-divider>

              <v-card-text class="flex-grow-1 tenant-card__facts">
                <DeclinedTenantNotice
                  v-if="declinedMembership(tenant.id)"
                  :membership="declinedMembership(tenant.id)"
                />
                <div v-if="tenant.location" class="tenant-card__fact">
                  <v-icon small class="tenant-card__fact-icon">
                    mdi-map-marker
                  </v-icon>
                  <span>{{ tenant.location }}</span>
                </div>
                <div v-if="tenant.mail" class="tenant-card__fact">
                  <v-icon small class="tenant-card__fact-icon">
                    mdi-email
                  </v-icon>
                  <span class="tenant-card__fact-truncate">
                    {{ tenant.mail }}
                  </span>
                </div>
                <div v-if="tenant.phone" class="tenant-card__fact">
                  <v-icon small class="tenant-card__fact-icon">
                    mdi-phone
                  </v-icon>
                  <span>{{ tenant.phone }}</span>
                </div>
                <div
                  v-if="tenant.website && tenant.website !== '/'"
                  class="tenant-card__fact"
                >
                  <v-icon small class="tenant-card__fact-icon">
                    mdi-web
                  </v-icon>
                  <span class="tenant-card__fact-truncate">
                    {{ tenant.website }}
                  </span>
                </div>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="tenant-card__actions">
                <v-btn
                  small
                  depressed
                  block
                  :color="tenant.id === currentTenant ? 'primary' : undefined"
                  :outlined="tenant.id !== currentTenant"
                  :disabled="!!declinedMembership(tenant.id)"
                  class="tenant-card__select"
                  @click.stop="selectTenant(tenant.id)"
                >
                  <v-icon left small>
                    {{
                      tenant.id === currentTenant
                        ? "mdi-check-circle"
                        : "mdi-arrow-right"
                    }}
                  </v-icon>
                  {{
                    tenant.id === currentTenant
                      ? $t("tenant.home.active")
                      : $t("tenant.home.select")
                  }}
                </v-btn>
              </v-card-actions>
              <v-card-actions
                v-if="offersSetup(tenant.id)"
                class="tenant-card__actions tenant-card__actions--secondary"
              >
                <v-btn
                  small
                  text
                  block
                  color="primary"
                  class="tenant-home__resume"
                  data-test="resume-onboarding"
                  @click.stop="resumeOnboarding(tenant.id)"
                >
                  {{ $t("tenant.onboarding.resume") }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </section>
    </template>

    <div v-else class="tenant-home__empty" data-test="tenant-empty">
      <v-icon size="40" class="tenant-home__empty-icon">
        mdi-domain-off
      </v-icon>
      <div class="tenant-home__empty-title">
        {{ $t("tenant.home.empty") }}
      </div>
      <p class="tenant-home__empty-text">
        {{
          search ? $t("tenant.home.empty-search") : $t("tenant.home.empty-none")
        }}
      </p>
      <v-btn
        v-if="allowCreate && !search"
        depressed
        color="primary"
        class="tenant-home__create"
        @click="onOpenCreateTenant()"
      >
        <v-icon left small>mdi-plus</v-icon>
        {{ $t("tenant.home.create-first") }}
      </v-btn>
    </div>

    <!-- The creation floats bottom right, as it does on every main page. -->
    <v-btn
      v-if="allowCreate && filteredTenants.length > 0"
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      class="v-btn"
      data-test="open-create"
      @click="onOpenCreateTenant()"
    >
      <v-icon>mdi-plus</v-icon>
      {{ $t("tenant.home.create") }}
    </v-btn>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin";
import { mapActions, mapGetters } from "vuex";
import ApiTenantService from "@/services/api/ApiTenantService";
import PendingTenantInvitations from "@/components/Tenant/PendingTenantInvitations.vue";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";
import SupervisionLevelChip from "@/components/Supervision/SupervisionLevelChip.vue";
import DeclinedTenantNotice from "@/components/Supervision/DeclinedTenantNotice.vue";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";
import { SUPERVISION_LEVELS } from "@/utils/supervision";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";

// The levels a card is marked with: the two that keep the tenant out of
// public view. Free and supervised are the ordinary state.
const MARKED_LEVELS = [SUPERVISION_LEVELS.PENDING, SUPERVISION_LEVELS.DECLINED];

// The chosen view outlives the page: the browser keeps it, per device.
const VIEW_STORAGE_KEY = "scb.tenant-home.view";
const VIEWS = ["grid", "list"];

function readStoredView() {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEWS.includes(stored) ? stored : "grid";
  } catch (error) {
    return "grid";
  }
}

function storeView(view) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (error) {
    // A browser that refuses storage still shows the view; it just forgets it.
  }
}

export default {
  name: "HomeView",
  components: {
    PendingApprovals: PendingApprovals,
    PendingTenantInvitations,
    AdminLayout,
    SupervisionLevelChip,
    DeclinedTenantNotice,
  },
  data() {
    return {
      loading: false,
      search: "",
      view: readStoredView(),
      // The ids of the own tenants whose setup is done: at least one offer
      // with the publication wish, as the readiness check reports it.
      setUpTenantIds: [],
    };
  },
  computed: {
    ...mapGetters({
      tenants: "tenants/tenants",
      currentTenant: "tenants/currentTenantId",
      allowCreate: "user/allowToCreateTenants",
      isDenied: "user/isDenied",
      supervisionLevelOf: "user/supervisionLevelOf",
      // A declined tenant cannot be opened by its own people (glossary
      // „abgewiesen“); the instance owner is never handed one here.
      declinedMembership: "user/declinedMembership",
    }),
    // The line between the groups: a membership in the permissions payload.
    // An instance owner is handed every tenant and is a member of few; for
    // everybody else the rest is empty and the groups stay unnamed.
    hasOtherTenants() {
      return this.tenants.some((tenant) => !this.isTenantMember(tenant.id));
    },
    groups() {
      const mine = [];
      const others = [];
      this.filteredTenants.forEach((tenant) => {
        (this.isTenantMember(tenant.id) ? mine : others).push(tenant);
      });
      return [
        { key: "mine", tenants: mine },
        { key: "others", tenants: others },
      ].filter((group) => group.tenants.length > 0);
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
  watch: {
    view(view) {
      storeView(view);
    },
    tenants: { immediate: true, handler: "loadSetupState" },
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
      if (this.declinedMembership(tenantId)) return;
      await this.select(tenantId);
      const redirect = this.$route.query.redirect;
      if (isSafeInternalRedirect(redirect, this.$router)) {
        await this.$router.push(redirect);
        return;
      }
      // The booking list is the default landing screen, but the router turns
      // a membership without that reach away again; staying on the overview
      // beats sending the user through a permission notice they did not ask
      // for.
      if (this.isDenied("bookings")) {
        return;
      }
      await this.$router.push({ name: "bookings" });
    },
    // Self-creation runs through the guided setup; the instance owner
    // keeps the short dialog beside it on the instance's tenant list.
    onOpenCreateTenant() {
      this.$router.push({ name: "tenant-onboarding" });
    },
    isTenantOwner(tenantId) {
      return TenantPermissionService.isTenantOwner(tenantId);
    },
    /**
     * „Einrichtung fortsetzen“ is for an own tenant whose setup is not done.
     * The wizard stores no progress; its done state is a stored publication
     * wish, which the readiness check's "offers" criterion reports. Until
     * that answer is in, or when it is refused, the setup stays offered.
     * A declined tenant has no setup left, and no readiness to ask.
     */
    offersSetup(tenantId) {
      return (
        this.isTenantOwner(tenantId) &&
        !this.declinedMembership(tenantId) &&
        !this.setUpTenantIds.includes(tenantId)
      );
    },
    async loadSetupState() {
      const owned = this.tenants.filter(
        (tenant) =>
          this.isTenantOwner(tenant.id) && !this.declinedMembership(tenant.id)
      );
      const states = await Promise.all(
        owned.map(async (tenant) => {
          try {
            const readiness = await ApiTenantService.getReadiness(tenant.id);
            const offers = (readiness?.criteria || []).find(
              (criterion) => criterion.key === "offers"
            );
            return offers?.state === "fulfilled" ? tenant.id : null;
          } catch (error) {
            console.error(error);
            return null;
          }
        })
      );
      this.setUpTenantIds = states.filter(Boolean);
    },
    isTenantMember(tenantId) {
      return TenantPermissionService.isTenantMember(tenantId);
    },
    markedLevel(tenantId) {
      const level = this.supervisionLevelOf(tenantId);
      return MARKED_LEVELS.includes(level) ? level : null;
    },
    resumeOnboarding(tenantId) {
      this.$router.push({
        name: "tenant-onboarding",
        query: { tenant: tenantId },
      });
    },
    // The row's second line, as the instance's tenant list writes it.
    rowSubtitle(tenant) {
      return [tenant.contactName, tenant.mail, tenant.location]
        .filter(Boolean)
        .join(" · ");
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
.tenant-home__lead {
  margin-bottom: var(--scb-space-3);
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

/* The app's buttons capitalise every word (!important, variables.scss);
   the labels here are sentences, so the override needs the same weight. */
.tenant-home__create,
.tenant-home__resume,
.tenant-card__select {
  text-transform: none !important;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

/* --- The groups --------------------------------------------------------- */

.tenant-home__group + .tenant-home__group {
  margin-top: var(--scb-space-6);
}

/* A group's heading: the name with its count on one line, the hint
   beneath, closed by a hairline that the rows or cards hang from. */
.tenant-home__group-head {
  padding-bottom: var(--scb-space-3);
  margin-bottom: var(--scb-space-3);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.tenant-home__group-line {
  display: flex;
  align-items: baseline;
  gap: var(--scb-space-2);
}

.tenant-home__group-title {
  margin: 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.tenant-home__group-count {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.tenant-home__group-hint {
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

/* --- The list ----------------------------------------------------------- */

/* A row is a button: it picks the tenant. The active one is tinted primary,
   and the tint bleeds past the row's edges so the hairlines stay put. */
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

.tenant-row--active,
.tenant-row--active:hover {
  background-color: var(--scb-selected-tint);
}

.tenant-row--active .booking-row__title {
  color: var(--v-primary-base);
}

.tenant-row__avatar {
  flex: none;
}

.tenant-row__initials {
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: 0.02em;
}

/* The name with its badge, if any, on one line. */
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

.tenant-row--active .tenant-row__chevron {
  color: var(--v-primary-base);
}

/* --- The grid ----------------------------------------------------------- */

/* Surface, lift and the selected glow come from card.scss (`scb-card`);
   the glow alone marks the active card, its surface stays as the others. */

.tenant-card__header {
  padding: var(--scb-space-5) var(--scb-space-4) var(--scb-space-4);
  text-align: center;
  background-color: var(--scb-surface-tint-faint);
}

.tenant-card__avatar {
  margin-bottom: var(--scb-space-3);
}

.tenant-card__initials {
  font-size: 18px;
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: 0.02em;
}

.tenant-card__name {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
  overflow-wrap: anywhere;
}

.tenant-card--active .tenant-card__name {
  color: var(--v-primary-base);
}

.tenant-card__contact {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  line-height: var(--scb-line-height-base);
}

.tenant-card__level {
  margin-top: var(--scb-space-2);
}

/* --- Declined ----------------------------------------------------------- */

/* A declined tenant cannot be opened: greyed out, without the pointer and
   the hover of a button. */
.tenant-card--declined,
.tenant-row--declined {
  cursor: default;
}

.tenant-row--declined:hover {
  background-color: transparent;
}

.tenant-card--declined .tenant-card__name,
.tenant-row--declined .booking-row__title {
  color: var(--scb-text-muted);
}

.tenant-card__facts {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-2);
  padding: var(--scb-space-4) !important;
}

.tenant-card__fact {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-2);
  min-width: 0;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.tenant-card__fact-icon {
  flex: none;
  margin-top: 1px;
  color: var(--scb-text-caption);
}

.tenant-card__fact-truncate {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tenant-card__actions {
  padding: var(--scb-space-3) !important;
}

.tenant-card__actions--secondary {
  padding-top: 0 !important;
}

/* --- Empty -------------------------------------------------------------- */

.tenant-home__empty {
  padding: var(--scb-space-6) var(--scb-space-4);
  text-align: center;
}

.tenant-home__empty-icon {
  color: var(--scb-text-caption);
}

.tenant-home__empty-title {
  margin-top: var(--scb-space-3);
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.tenant-home__empty-text {
  margin: var(--scb-space-1) 0 var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>

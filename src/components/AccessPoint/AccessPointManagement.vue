<script>
import { mapActions, mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import AccessPointProviderSection from "@/components/AccessPoint/AccessPointProviderSection.vue";
import AccessAppSettings from "@/components/AccessPoint/AccessAppSettings.vue";
import AccessPointRow from "@/components/AccessPoint/AccessPointRow.vue";
import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import AccessPointAssignDialog from "@/components/AccessPoint/AccessPointAssignDialog.vue";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import AccessPointCompartmentQrDialog from "@/components/AccessPoint/AccessPointCompartmentQrDialog.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";
import ToolbarAction from "@/components/commons/ToolbarAction.vue";
import { downloadQrCode } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  createLockAndAccessAppDefaults,
  findTenantApp,
  LOCK_AND_ACCESS_APP_IDS,
} from "@/utilities/access-apps";
import { bookingsWithLiveAccess } from "@/utilities/access-grants";
import { carriesOwnCompartments } from "@/utilities/locker-system-compartments";
import { matches, needsAction } from "@/utilities/access-point-rows";

export default {
  name: "AccessPointManagement",
  components: {
    AccessPointProviderSection,
    AccessAppSettings,
    AccessPointRow,
    AccessPointEditDialog,
    AccessPointAssignDialog,
    AccessPointDeleteDialog,
    AccessPointRotateDialog,
    AccessPointCompartmentQrDialog,
    SearchBar,
    ToolbarRow,
    ToolbarAction,
  },
  data() {
    return {
      loading: false,
      loadError: "",
      accessPoints: [],
      bookables: [],
      bookablesForbidden: false,
      providers: [],
      // The tenant's stored access applications by provider, each with the
      // state of its connection.
      apps: {},
      // The providers whose settings are unfolded, and those among them
      // whose settings hold changes not saved yet.
      openSettings: [],
      dirtySettings: [],
      editDialog: false,
      // The provider of the section whose creation opened the dialog; empty
      // while an access point is edited.
      createProvider: "",
      // The access point just created: its row stands out with the next
      // step until it is assigned.
      freshId: "",
      selectedAccessPoint: null,
      deleteDialog: false,
      deleting: false,
      deleteError: "",
      bookings: [],
      bookingsUnreadable: false,
      loadingBookings: false,
      rotateDialog: false,
      compartmentQrDialog: false,
      assignDialog: false,
      // „QR-Codes der Fächer“ opens with the question to rotate all.
      rotateAllCompartments: false,
      search: "",
      // „Offen“: only the access points with something still to do.
      onlyOpen: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    // Which bookables point at which access point - the reference lives on
    // the bookable, so the assignment is resolved here rather than asked for.
    bookablesByAccessPointId() {
      const map = {};
      this.bookables.forEach((bookable) => {
        const ids = bookable.accessPointDetails?.accessPointIds || [];
        ids.forEach((id) => {
          if (!map[id]) map[id] = [];
          map[id].push(bookable);
        });
      });
      return map;
    },
    // One section per connected provider, in the order the backend lists
    // the active ones, each with its access points and its stored
    // application. A provider switched off is not among them; it keeps a
    // section of its own, as does a provider that only has access points
    // left, so that they stay reachable.
    sections() {
      const byProvider = new Map(
        this.providers.map((provider) => [
          provider.id,
          { provider, accessPoints: [] },
        ])
      );
      const ensure = (id) => {
        if (!byProvider.has(id)) {
          byProvider.set(id, {
            provider: {
              id,
              title: createLockAndAccessAppDefaults()[id]?.title,
            },
            accessPoints: [],
          });
        }
        return byProvider.get(id);
      };
      Object.keys(this.apps).forEach(ensure);
      this.accessPoints.forEach((accessPoint) => {
        ensure(accessPoint.provider).accessPoints.push(accessPoint);
      });
      return [...byProvider.values()].map((section) => ({
        ...section,
        app: this.apps[section.provider.id] || null,
        rows: section.accessPoints.filter((accessPoint) =>
          this.shows(accessPoint)
        ),
      }));
    },
    filtering() {
      return !!this.search.trim() || this.onlyOpen;
    },
    openCount() {
      return this.accessPoints.filter((accessPoint) =>
        needsAction(accessPoint, this.bookablesOf(accessPoint))
      ).length;
    },
    hits() {
      return this.sections.reduce(
        (count, section) => count + section.rows.length,
        0
      );
    },
    // `null` where the bookables were not readable, see `bookablesOf`.
    affectedBookables() {
      if (!this.selectedAccessPoint) return [];
      return this.bookablesOf(this.selectedAccessPoint);
    },
    // The bookings that hold a granted, unrevoked access at the access point
    // about to be deleted. There is no route that asks that question directly:
    // `GET /:tenant/access` answers per booking, and
    // `/access/access-points/:id/bookings` is the caller's own bookings only
    // (`accessBookings.read`: own signedIn, any instanceOwner). What a tenant
    // owner can read is the tenant's bookings, which carry it in `accessInfo`
    // - the one place this screen reads that field, because here it is the
    // only reachable source.
    runningBookings() {
      if (!this.selectedAccessPoint) return [];
      return bookingsWithLiveAccess(this.bookings, this.selectedAccessPoint.id);
    },
  },
  watch: {
    tenantId() {
      this.fetchAll();
    },
    dirtySettings(dirty) {
      this.$emit("update:dirty", dirty.length > 0);
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async fetchAll() {
      if (!this.tenantId) return;

      this.loading = true;
      this.loadError = "";

      try {
        const response = await ApiAccessPointService.getAccessPoints(
          this.tenantId
        );
        this.accessPoints = response.data || [];
      } catch (error) {
        this.accessPoints = [];
        this.loadError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.loadFailed",
        });
      } finally {
        this.loading = false;
      }

      await Promise.all([
        this.fetchBookables(),
        this.fetchProviders(),
        this.fetchApps(),
      ]);
    },
    // The access applications travel with the tenant.
    async fetchApps() {
      try {
        const response = await ApiTenantService.getTenant(this.tenantId);
        const applications = response.data?.applications || [];
        const apps = {};
        LOCK_AND_ACCESS_APP_IDS.forEach((id) => {
          const app = findTenantApp(applications, id);
          if (app) apps[id] = app;
        });
        this.apps = apps;
      } catch (error) {
        this.apps = {};
      }
    },
    async fetchBookables() {
      this.bookablesForbidden = false;
      try {
        const response = await ApiBookablesService.getBookables(
          this.tenantId,
          false
        );
        this.bookables = response.data || [];
      } catch (error) {
        // The list stays usable without the assignment column - that decision
        // stands, so no error banner replaces the table. What does not stand is
        // the column then reading "Keinem Buchungsobjekt zugeordnet" for every
        // row: on a denial we cannot tell, and saying "not assigned" would be a
        // claim about data we were refused. The cells say "not readable" and
        // one hint above the table says why. Any other failure keeps the old
        // silence.
        this.bookables = [];
        this.bookablesForbidden = isForbiddenError(error);
      }
    },
    async fetchProviders() {
      try {
        const response = await ApiAccessAppsService.getProviders(this.tenantId);
        this.providers = response.data || [];
      } catch (error) {
        this.providers = [];
      }
    },
    toggleSettings(provider) {
      if (this.openSettings.includes(provider)) this.closeSettings(provider);
      else this.openSettings = [...this.openSettings, provider];
    },
    closeSettings(provider) {
      this.openSettings = this.openSettings.filter((id) => id !== provider);
    },
    onSettingsDirty(provider, dirty) {
      const others = this.dirtySettings.filter((id) => id !== provider);
      this.dirtySettings = dirty ? [...others, provider] : others;
    },
    async onAppRemoved(provider) {
      const apps = { ...this.apps };
      delete apps[provider];
      this.apps = apps;
      this.closeSettings(provider);
      await this.fetchProviders();
    },
    // Switching keeps credentials, access points and assignments; the
    // active providers are read anew, since only they list and create.
    async switchApp(provider, active) {
      try {
        const response = await ApiAccessAppsService.setActive(
          this.tenantId,
          provider,
          active
        );
        this.apps = { ...this.apps, [provider]: response.data };
      } catch (error) {
        await this.addToast(
          ToastService.createToast(
            "accessPoint.management.toasts.switchFailed",
            "error"
          )
        );
        return;
      }
      await this.fetchProviders();
    },
    onAppSaved(provider, app) {
      this.apps = { ...this.apps, [provider]: app };
      this.closeSettings(provider);
    },
    // The creation starts in the section of a provider, so the provider is
    // settled before the dialog opens.
    openCreate(provider) {
      this.createProvider = provider;
      this.selectedAccessPoint = null;
      this.editDialog = true;
    },
    // "Not assigned" is a statement about the bookables; it may only be made
    // when they were actually readable.
    bookablesOf(accessPoint) {
      if (this.bookablesForbidden) return null;
      return this.bookablesByAccessPointId[accessPoint.id] || [];
    },
    needsAction,
    // Whether the row of the access point stands under the search and
    // „Offen“.
    shows(accessPoint) {
      const bookables = this.bookablesOf(accessPoint);
      return (
        matches(accessPoint, this.search, bookables) &&
        (!this.onlyOpen || needsAction(accessPoint, bookables))
      );
    },
    openAssign(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.assignDialog = true;
    },
    // The assignment lives on the bookables, so they are read anew.
    async onAssigned() {
      this.assignDialog = false;
      await this.addToast(
        ToastService.createToast(
          "accessPoint.management.toasts.assigned",
          "success"
        )
      );
      await this.fetchBookables();
    },
    openEdit(accessPoint) {
      this.createProvider = "";
      this.selectedAccessPoint = accessPoint;
      this.editDialog = true;
    },
    // The QR code of a door or a fixed Fach is its PDF, at once; a
    // Schließfachanlage has one per Fach, in their own dialog.
    openQr(accessPoint) {
      if (carriesOwnCompartments(accessPoint)) {
        this.openCompartmentQr(accessPoint);
      } else {
        this.downloadQr(accessPoint, "pdf");
      }
    },
    openRotate(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.rotateDialog = true;
    },
    openCompartmentQr(accessPoint, rotateAll = false) {
      this.selectedAccessPoint = accessPoint;
      this.rotateAllCompartments = rotateAll;
      this.compartmentQrDialog = true;
    },
    async openDelete(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.deleteError = "";
      this.deleteDialog = true;
      await this.fetchBookings();
    },
    /**
     * The tenant's bookings, read when a deletion is about to be confirmed -
     * the list is only needed there, and it is the widest request this screen
     * makes.
     */
    async fetchBookings() {
      this.loadingBookings = true;
      this.bookingsUnreadable = false;
      this.bookings = [];
      try {
        const response = await ApiBookingService.getBookings(this.tenantId);
        this.bookings = response.data || [];
      } catch (error) {
        // Whatever went wrong - a denial or a failure - the dialog may then
        // not claim that no booking is affected. It says so instead.
        this.bookings = [];
        this.bookingsUnreadable = true;
      } finally {
        this.loadingBookings = false;
      }
    },
    async onSaved(answer) {
      if (this.createProvider && answer?.id) this.freshId = answer.id;
      this.editDialog = false;
      await this.addToast(
        ToastService.createToast(
          "accessPoint.management.toasts.saved",
          "success"
        )
      );
      await this.fetchAll();
    },
    async onRotated() {
      await this.fetchAll();
    },
    async confirmDelete() {
      this.deleting = true;
      this.deleteError = "";

      try {
        await ApiAccessPointService.deleteAccessPoint(
          this.selectedAccessPoint.id,
          this.tenantId
        );
        this.deleteDialog = false;
        await this.addToast(
          ToastService.createToast(
            "accessPoint.management.toasts.deleted",
            "success"
          )
        );
        await this.fetchAll();
      } catch (error) {
        this.deleteError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.deleteFailed",
        });
      } finally {
        this.deleting = false;
      }
    },
    async downloadQr(accessPoint, format) {
      try {
        await downloadQrCode(accessPoint, format, this.tenantId);
      } catch (error) {
        // The toast names a reason the backend gives - a missing store-front
        // address, say - and keeps the general sentence for everything else.
        await this.addToast({
          ...ToastService.createToast(
            "accessPoint.management.toasts.qrFailed",
            "error"
          ),
          message: formatAccessPointErrorMessage(error, {
            fallbackKey: "accessPoint.management.toasts.qrFailed.message",
          }),
        });
      }
    },
  },
  mounted() {
    this.fetchAll();
  },
};
</script>

<template>
  <div>
    <v-progress-linear :active="loading" indeterminate color="primary" />

    <v-alert v-if="loadError" color="error" text dense class="mb-4">
      <v-icon left>mdi-alert-circle</v-icon>
      {{ loadError }}
    </v-alert>

    <v-alert v-if="bookablesForbidden" color="info" text dense class="mb-4">
      <v-icon left>mdi-information-outline</v-icon>
      {{ $t("accessPoint.management.hints.assignmentForbidden") }}
    </v-alert>

    <div
      v-if="!loading && !loadError && !sections.length"
      class="text--secondary"
    >
      {{ $t("accessPoint.management.empty") }}
    </div>

    <SearchBar
      v-if="accessPoints.length"
      v-model="search"
      :fields="$t('accessPoint.management.search.fields')"
      class="mb-4"
      data-test="access-point-search"
    >
      <template v-if="filtering || !bookablesForbidden" #actions>
        <ToolbarRow>
          <template #actions>
            <span
              v-if="filtering"
              class="access-point-hits mr-2"
              data-test="access-point-hits"
            >
              {{
                $t("accessPoint.management.search.hits", {
                  hits,
                  total: accessPoints.length,
                })
              }}
            </span>
            <!-- Without the bookables the page cannot tell what is open. -->
            <ToolbarAction
              v-if="!bookablesForbidden"
              icon="mdi-alert-circle-outline"
              :active="onlyOpen"
              data-test="access-point-open"
              @click="onlyOpen = !onlyOpen"
            >
              {{
                $t("accessPoint.management.search.open", { count: openCount })
              }}
            </ToolbarAction>
          </template>
        </ToolbarRow>
      </template>
    </SearchBar>

    <AccessPointProviderSection
      v-for="section in sections"
      :key="section.provider.id"
      :provider="section.provider"
      :state="section.app ? section.app.connectionState : ''"
      :settings-open="openSettings.includes(section.provider.id)"
      :access-points="section.accessPoints"
      :last-error="
        (section.app && section.app.lastTest && section.app.lastTest.error) ||
        ''
      "
      class="mb-5"
      @create="openCreate(section.provider.id)"
      @settings="toggleSettings(section.provider.id)"
      @switch="switchApp(section.provider.id, $event)"
    >
      <template #settings>
        <AccessAppSettings
          :provider="section.provider"
          :app="section.app"
          :access-points="section.accessPoints"
          @cancel="closeSettings(section.provider.id)"
          @saved="onAppSaved(section.provider.id, $event)"
          @dirty="onSettingsDirty(section.provider.id, $event)"
          @removed="onAppRemoved(section.provider.id)"
        />
      </template>
      <div
        v-if="filtering && !section.rows.length"
        class="access-point-none"
        data-test="access-point-none"
      >
        {{
          $t("accessPoint.management.search.none", {
            provider: section.provider.title || section.provider.id,
          })
        }}
      </div>
      <AccessPointRow
        v-for="item in section.rows"
        :key="item.id"
        :access-point="item"
        :bookables="bookablesOf(item)"
        :fresh="item.id === freshId && needsAction(item, bookablesOf(item))"
        @assign="openAssign(item)"
        @edit="openEdit(item)"
        @qr="openQr(item)"
        @download="(format) => downloadQr(item, format)"
        @rotate="openRotate(item)"
        @rotate-all="openCompartmentQr(item, true)"
        @delete="openDelete(item)"
      />
    </AccessPointProviderSection>

    <AccessPointEditDialog
      :open="editDialog"
      :access-point="selectedAccessPoint"
      :access-points="accessPoints"
      :providers="providers"
      :provider="createProvider"
      @close="editDialog = false"
      @saved="onSaved"
    />
    <AccessPointAssignDialog
      :open="assignDialog"
      :access-point="selectedAccessPoint"
      :bookables="bookables"
      @close="assignDialog = false"
      @saved="onAssigned"
    />
    <AccessPointRotateDialog
      :open="rotateDialog"
      :access-point="selectedAccessPoint"
      @close="rotateDialog = false"
      @rotated="onRotated"
    />
    <AccessPointCompartmentQrDialog
      :open="compartmentQrDialog"
      :access-point="selectedAccessPoint"
      :rotate-all="rotateAllCompartments"
      @rotated="onRotated"
      @close="compartmentQrDialog = false"
    />
    <AccessPointDeleteDialog
      :open="deleteDialog"
      :access-point="selectedAccessPoint"
      :affected-bookables="affectedBookables"
      :running-bookings="runningBookings"
      :bookings-unreadable="bookingsUnreadable"
      :loading-bookings="loadingBookings"
      :deleting="deleting"
      :error="deleteError"
      @close="deleteDialog = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.access-point-hits {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.access-point-none {
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>

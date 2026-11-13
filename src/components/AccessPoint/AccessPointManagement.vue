<script>
import { mapActions, mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";
import {
  getApiErrorMessage,
  isForbiddenError,
} from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import AccessPointProviderSection from "@/components/AccessPoint/AccessPointProviderSection.vue";
import AccessAppSettings from "@/components/AccessPoint/AccessAppSettings.vue";
import AccessPointIqRow from "@/components/AccessPoint/AccessPointIqRow.vue";
import AccessPointRow from "@/components/AccessPoint/AccessPointRow.vue";
import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import AccessPointAssignDialog from "@/components/AccessPoint/AccessPointAssignDialog.vue";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import AccessPointCompartmentQrDialog from "@/components/AccessPoint/AccessPointCompartmentQrDialog.vue";
import AccessProviderPicker from "@/components/AccessPoint/AccessProviderPicker.vue";
import AccessSetupStrip from "@/components/AccessPoint/AccessSetupStrip.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";
import ToolbarAction from "@/components/commons/ToolbarAction.vue";
import { downloadQrCode } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  createLockAndAccessAppDefaults,
  findTenantApp,
  LOCK_AND_ACCESS_APP_IDS,
  SALTO_PROVIDER,
} from "@/utilities/access-apps";
import {
  hasActivation,
  iqSummary,
} from "@/components/Tenant/Edit/SaltoIqActivation/iqActivationState";
import { bookingsWithLiveAccess } from "@/utilities/access-grants";
import { canListAccessPoints } from "@/utilities/access-points";
import {
  bookingsWithoutCompartment,
  carriesOwnCompartments,
  compartmentBookings,
} from "@/utilities/locker-system-compartments";
import { bookingPageRoute } from "@/utils/bookingPageRoutes";
import { matches, needsAction } from "@/utilities/access-point-rows";
import { knownProviders, setupState } from "@/utilities/access-setup";

export default {
  name: "AccessPointManagement",
  components: {
    AccessPointProviderSection,
    AccessAppSettings,
    AccessPointIqRow,
    AccessPointRow,
    AccessPointEditDialog,
    AccessPointAssignDialog,
    AccessPointDeleteDialog,
    AccessPointRotateDialog,
    AccessPointCompartmentQrDialog,
    AccessProviderPicker,
    AccessSetupStrip,
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
      // The IQs of Salto KS while it is switched on, loaded behind the
      // page (ECCdigital/tickets#1107); `iqsError` names a list that could
      // not be read.
      iqs: [],
      iqsLoaded: false,
      iqsError: "",
      iqsOpen: false,
      // What each active provider lists, by provider, read behind the page
      // for „von Hand“ and „IQ nicht aktiviert“; a listing that could not
      // be read is left out (ECCdigital/tickets#1107).
      listings: {},
      // The providers being connected: a section in the UI alone until
      // „Speichern und aktivieren“ stores them.
      drafts: [],
      // The provider connected last on this page: its section names the
      // next step while it has no access point.
      freshProvider: "",
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
      this.drafts.forEach(ensure);
      return [...byProvider.values()].map((section) => ({
        ...section,
        app: this.apps[section.provider.id] || null,
        draft:
          !this.apps[section.provider.id] &&
          this.drafts.includes(section.provider.id),
        rows: section.accessPoints.filter((accessPoint) =>
          this.shows(accessPoint)
        ),
      }));
    },
    saltoActive() {
      return !!this.apps[SALTO_PROVIDER]?.active;
    },
    showsIqs() {
      return this.saltoActive && (this.iqsLoaded || !!this.iqsError);
    },
    // The settings of Salto KS ask before a save lets these rest.
    activatedIqCount() {
      return this.iqs.filter(hasActivation).length;
    },
    // The providers without a section, to connect.
    unconnectedProviders() {
      const shown = this.sections.map((section) => section.provider.id);
      return knownProviders().filter(({ id }) => !shown.includes(id));
    },
    filtering() {
      return !!this.search.trim() || this.onlyOpen;
    },
    // The providers stored and switched on, or listed as active.
    connectedCount() {
      const active = this.providers.map((provider) => provider.id);
      return this.sections.filter(({ provider, app, draft }) =>
        app ? app.active : !draft && active.includes(provider.id)
      ).length;
    },
    // The IQs of Salto KS still to activate, from the IQs the page loads.
    openIqs() {
      return this.saltoActive ? iqSummary(this.iqs).open : 0;
    },
    // How far the setup is, and with it what is open.
    setup() {
      return setupState({
        connected: this.connectedCount,
        openIqs: this.openIqs,
        accessPoints: this.accessPoints,
        bookablesOf: this.bookablesOf,
        listingOf: this.listingOf,
      });
    },
    openCount() {
      return this.setup.open;
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
    // The bookings at the Fächer of the Anlage the dialog edits.
    selectedCompartmentBookings() {
      return this.compartmentBookingsOf(this.selectedAccessPoint);
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
    // The page decides what it shows - the sections or the question for
    // the providers - only once the access points, the providers and their
    // connections are read; one that could not be read is named instead
    // (ECCdigital/tickets#1082).
    async fetchAll() {
      if (!this.tenantId) return;

      this.loading = true;
      this.loadError = "";

      const [pointsError, providersError, appsError] = await Promise.all([
        this.fetchAccessPoints(),
        this.fetchProviders(),
        this.fetchApps(),
      ]);
      if (pointsError) {
        this.loadError = formatAccessPointErrorMessage(pointsError, {
          fallbackKey: "accessPoint.management.errors.loadFailed",
        });
      } else if (providersError || appsError) {
        this.loadError = formatAccessPointErrorMessage(
          providersError || appsError,
          { fallbackKey: "accessPoint.management.errors.providersFailed" }
        );
      }
      this.loading = false;

      await Promise.all([
        this.fetchBookables(),
        this.fetchCompartmentBookings(),
      ]);
      // Behind the page: it stands before these are read.
      this.fetchIqs();
      this.listings = {};
      this.providers.forEach((provider) => this.fetchListing(provider.id));
    },
    // A listing that cannot be read leaves its markers out, silently.
    async fetchListing(id) {
      const provider = this.providers.find((known) => known.id === id);
      if (!provider || !canListAccessPoints(provider)) {
        this.$delete(this.listings, id);
        return;
      }
      try {
        const response = await ApiAccessAppsService.getAccessPoints(
          this.tenantId,
          id
        );
        this.$set(
          this.listings,
          id,
          Array.isArray(response?.data) ? response.data : []
        );
      } catch (error) {
        this.$delete(this.listings, id);
      }
    },
    listingOf(accessPoint) {
      return this.listings[accessPoint.provider] || null;
    },
    // After a provider is saved or switched: the active providers anew, and
    // behind them its listing and, for Salto KS, its IQs.
    async refreshProvider(provider) {
      await this.fetchProviders();
      this.fetchListing(provider);
      if (this.isSalto(provider)) await this.fetchIqs();
    },
    // An IQ activated changes what Salto KS lists of its locks.
    async reloadIqs() {
      this.fetchListing(SALTO_PROVIDER);
      await this.fetchIqs();
    },
    async fetchIqs() {
      if (!this.saltoActive) {
        this.iqs = [];
        this.iqsLoaded = false;
        this.iqsError = "";
        return;
      }
      try {
        const response = await ApiAccessAppsService.getSaltoIqs(this.tenantId);
        this.iqs = Array.isArray(response?.data) ? response.data : [];
        this.iqsLoaded = true;
        this.iqsError = "";
      } catch (error) {
        this.iqs = [];
        this.iqsLoaded = false;
        this.iqsError = getApiErrorMessage(
          error,
          this.$t("accessPoint.tenant.salto.iq.errors.generic")
        );
      }
    },
    isSalto(provider) {
      return provider === SALTO_PROVIDER;
    },
    // The jump from the test of Salto KS to its IQs.
    async showIqs() {
      this.iqsOpen = true;
      await this.$nextTick();
      [].concat(this.$refs.iqRow || [])[0]?.$el.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    },
    // The bookings at the Fächer of an Anlage live in the tenant's bookings,
    // so they are read only where an Anlage carries its own Fächer.
    async fetchCompartmentBookings() {
      if (this.accessPoints.some(carriesOwnCompartments)) {
        await this.fetchBookings();
      }
    },
    compartmentBookingsOf(accessPoint) {
      return compartmentBookings(accessPoint, this.bookings, this.bookables);
    },
    // The future bookings a save found no free Fach for, with the link to
    // each.
    withoutCompartmentOf(accessPoint) {
      return bookingsWithoutCompartment(
        accessPoint,
        this.compartmentBookingsOf(accessPoint)
      ).map((booking) => ({
        ...booking,
        href: this.$router?.resolve?.(this.bookingRoute(booking.id))?.href,
      }));
    },
    bookingRoute(bookingId) {
      return bookingPageRoute(bookingId, this.tenantId);
    },
    openBooking(bookingId) {
      this.$router.push(this.bookingRoute(bookingId));
    },
    // The access points of the tenant; answers the error that kept them.
    async fetchAccessPoints() {
      try {
        const response = await ApiAccessPointService.getAccessPoints(
          this.tenantId
        );
        this.accessPoints = response.data || [];
        return null;
      } catch (error) {
        this.accessPoints = [];
        return error;
      }
    },
    // The access applications travel with the tenant; answers the error
    // that kept them.
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
        return null;
      } catch (error) {
        this.apps = {};
        return error;
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
    // The active providers; answers the error that kept them.
    async fetchProviders() {
      try {
        const response = await ApiAccessAppsService.getProviders(this.tenantId);
        this.providers = response.data || [];
        return null;
      } catch (error) {
        this.providers = [];
        return error;
      }
    },
    // Only Salto KS has IQs.
    openIqsOf(provider) {
      return this.isSalto(provider) ? this.openIqs : 0;
    },
    // „Verbinden“: a section of the provider with its settings open, in the
    // UI alone.
    connect(provider) {
      if (!this.drafts.includes(provider)) {
        this.drafts = [...this.drafts, provider];
      }
      if (!this.openSettings.includes(provider)) {
        this.openSettings = [...this.openSettings, provider];
      }
    },
    // „Verwerfen“: the section goes, nothing was stored.
    discard(provider) {
      this.drafts = this.drafts.filter((id) => id !== provider);
      this.closeSettings(provider);
    },
    cancelSettings(provider) {
      if (this.drafts.includes(provider)) this.discard(provider);
      else this.closeSettings(provider);
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
      await this.refreshProvider(provider);
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
      await this.refreshProvider(provider);
    },
    // A provider saved the first time is among the active ones now, and
    // with Salto KS its IQs stand right after (ECCdigital/tickets#1107).
    // Tested again after the save (ECCdigital/tickets#1106), the
    // connection is read anew, so head and IQs say its state.
    async onAppSaved(provider, app, { retested = false } = {}) {
      const first = !this.apps[provider];
      if (first) this.freshProvider = provider;
      this.apps = { ...this.apps, [provider]: app };
      this.drafts = this.drafts.filter((id) => id !== provider);
      this.closeSettings(provider);
      await this.refreshProvider(provider);
      if (retested) await this.fetchApps();
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
        (!this.onlyOpen ||
          needsAction(accessPoint, bookables, this.listingOf(accessPoint)))
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

    <AccessProviderPicker
      v-if="!loading && !loadError && !sections.length"
      start
      :providers="unconnectedProviders"
      @connect="connect"
    />

    <AccessSetupStrip
      v-if="!loadError && sections.length"
      :steps="setup.steps"
      :done="setup.done"
      class="mb-6"
    />

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
      :draft="section.draft"
      :empty="!section.accessPoints.length"
      :fresh="section.provider.id === freshProvider"
      :open-iqs="openIqsOf(section.provider.id)"
      :shrunk="filtering && !section.rows.length"
      class="mb-5"
      @create="openCreate(section.provider.id)"
      @settings="toggleSettings(section.provider.id)"
      @switch="switchApp(section.provider.id, $event)"
      @discard="discard(section.provider.id)"
    >
      <template #settings>
        <AccessAppSettings
          :provider="section.provider"
          :app="section.app"
          :access-points="section.accessPoints"
          :activated-iq-count="activatedIqCount"
          @to-iqs="showIqs"
          @cancel="cancelSettings(section.provider.id)"
          @saved="(app, how) => onAppSaved(section.provider.id, app, how)"
          @dirty="onSettingsDirty(section.provider.id, $event)"
          @removed="onAppRemoved(section.provider.id)"
        />
      </template>
      <template #iqs>
        <AccessPointIqRow
          v-if="isSalto(section.provider.id) && showsIqs"
          ref="iqRow"
          :tenant-id="tenantId"
          :iqs="iqs"
          :error="iqsError"
          :open.sync="iqsOpen"
          :reload="reloadIqs"
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
        :listing="listingOf(item)"
        :fresh="item.id === freshId && needsAction(item, bookablesOf(item))"
        :without-compartment="withoutCompartmentOf(item)"
        @assign="openAssign(item)"
        @edit="openEdit(item)"
        @qr="openQr(item)"
        @download="(format) => downloadQr(item, format)"
        @rotate="openRotate(item)"
        @rotate-all="openCompartmentQr(item, true)"
        @delete="openDelete(item)"
        @open-booking="openBooking"
      />
    </AccessPointProviderSection>

    <AccessProviderPicker
      v-if="sections.length"
      :providers="unconnectedProviders"
      @connect="connect"
    />

    <AccessPointEditDialog
      :open="editDialog"
      :access-point="selectedAccessPoint"
      :access-points="accessPoints"
      :providers="providers"
      :provider="createProvider"
      :compartment-bookings="selectedCompartmentBookings"
      :bookings-unreadable="bookingsUnreadable"
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

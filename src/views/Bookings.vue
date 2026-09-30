<template>
  <AdminLayout>
    <div class="page-header">
      <!-- The search band (SearchBar) with the filter in front; the view
           switch, backlog and export in the row beneath it. -->
      <SearchBar
        v-model="searchTerm"
        :fields="$t('booking.search')"
        :filters="filterSections"
        data-test="booking-search"
        @filter="onFilter"
      >
        <template #actions>
          <!-- PROTOTYPE (#57): the row in variant A, B or C. -->
          <ToolbarRowPrototype
            v-if="rowVariant"
            :variant="rowVariant"
            :views="protoViews"
            :view="currentView"
            :actions="protoActions"
            :primary="protoPrimary"
            @view="currentView = $event"
          />
          <div v-if="rowVariant" style="display: none">
            <BookingExportButton
              ref="protoExport"
              :bookings="filteredBookings"
              :tenant="tenantId"
            />
          </div>
          <template v-else>
            <v-btn-toggle
              v-model="currentView"
              mandatory
              dense
              color="primary"
              class="scb-views"
            >
              <v-btn value="list" small class="scb-view">
                <v-icon left small> mdi-list-box-outline </v-icon>
                Liste
              </v-btn>
              <v-btn value="calendar" small class="scb-view">
                <v-icon left small> mdi-calendar-blank-outline </v-icon>
                Kalender
              </v-btn>
              <v-btn
                v-if="workflow.active"
                value="kanban"
                small
                class="scb-view"
              >
                <v-icon left small> mdi-table-column </v-icon>
                Kanban
              </v-btn>
            </v-btn-toggle>
            <v-spacer />
            <v-tooltip v-if="currentView === 'kanban'" bottom>
              <template v-slot:activator="{ on }">
                <v-btn
                  v-on="on"
                  icon
                  small
                  :class="{ 'active-button': showBacklog }"
                  @click="showBacklog = !showBacklog"
                >
                  <v-icon>mdi-tray-full</v-icon>
                </v-btn>
              </template>
              <span>Backlog ein-/ausblenden</span>
            </v-tooltip>
            <BookingExportButton
              :bookings="filteredBookings"
              :tenant="tenantId"
            />
          </template>
        </template>
      </SearchBar>
    </div>

    <div class="page-content">
      <!-- List view -->
      <div v-if="currentView === 'list'">
        <v-skeleton-loader type="table" class="flex">
          <BookingTable
            :bookings="statusFilteredBookings"
            :loading="loading"
            @open-booking="onOpenBooking"
            @open-group-booking="onOpenGroupBooking"
            @open-edit-booking="onOpenEditBooking"
            @transition="onTransition"
            @open-delete-dialog="onOpenDeleteDialog"
            @download-ical="onDownloadIcal"
          />
        </v-skeleton-loader>
      </div>

      <!-- Calendar view -->
      <div v-else-if="currentView === 'calendar'">
        <BookingOverviewCalendar
          :bookings="statusFilteredBookings"
          :loading="loading"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @transition="onTransition"
          @open-delete-dialog="onOpenDeleteDialog"
        ></BookingOverviewCalendar>
      </div>

      <!-- Kanban view -->
      <div v-else-if="currentView === 'kanban'">
        <BookingKanban
          :bookings="filteredBookings"
          :loading="loading"
          :show-backlog="showBacklog"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @open-group-booking="onOpenGroupBooking"
          @transition="onTransition"
          @update:booking="fetchBooking"
        >
        </BookingKanban>
      </div>
    </div>

    <v-btn
      v-if="!primaryInRow"
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      :to="{ name: 'booking-create' }"
      :disabled="!BookingPermissionService.allowCreate()"
    >
      <v-icon>mdi-plus</v-icon>Buchung erstellen
    </v-btn>
    <BookingDeleteConformationDialog
      :to-delete="selectedBooking"
      :open="openDeleteDialog"
      :in-progress="loading"
      @close="onCloseDeleteDialog"
      @delete-booking="deleteBooking"
    />
    <BookingTransitions
      ref="transitions"
      @transitioned="onTransitioned"
      @failed="onTransitionFailed"
    />
    <GroupBookingDeleteConformationDialog
      v-if="selectedBooking.id"
      :booking-id="selectedBooking.id"
      :open="openDeleteGroupBookingDialog"
      :single-delete-disabled="isSelectedBookingHardDeleteBlocked"
      :group-delete-disabled="isSelectedGroupHardDeleteBlocked"
      @close="openDeleteGroupBookingDialog = false"
      @delete-single-booking="deleteBooking"
      @delete-group-booking="deleteGroupBooking"
    />
    <ProcessingIndicator ref="processingIndicator" />
  </AdminLayout>
</template>

<script>
import Fuse from "fuse.js";
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingOverviewCalendar from "@/components/Booking/BookingOverviewCalendar.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";
import BookingKanban from "@/components/Booking/BookingKanban.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import GroupBookingDeleteConformationDialog from "@/components/Booking/GroupBookingDeleteConformationDialog.vue";
import ToastService from "@/services/ToastService";
import ProcessingIndicator from "@/components/ProcessingIndicator.vue";
import ProcessingService from "@/services/ProcessingService";
import BookingExportButton from "@/components/Booking/BookingExportButton.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRowPrototype from "@/components/commons/prototype-57/ToolbarRowPrototype.vue";
import { rowVariantMixin } from "@/components/commons/prototype-57/variant";
import { saveBlob } from "@/utils/fileDownload";
import {
  bookingPageRoute,
  groupBookingPageRoute,
} from "@/utils/bookingPageRoutes";
import {
  BOOKING_STATUS,
  allowsAction,
  filterBookingsByStatus,
  statusColor,
  statusIcon,
  statusLabel,
  transitionTarget,
} from "@/utils/bookingStatus";

/**
 * The search term survives a detour to a booking's page or the editor and
 * back to the list: it is kept in `sessionStorage`, so it is per tab and gone
 * with it. The filters stay plain component state (spec E11, N1).
 */
const SEARCH_TERM_STORAGE_KEY = "bookings.searchTerm";

function readStoredSearchTerm() {
  try {
    return window.sessionStorage.getItem(SEARCH_TERM_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function storeSearchTerm(searchTerm) {
  try {
    if (searchTerm) {
      window.sessionStorage.setItem(SEARCH_TERM_STORAGE_KEY, searchTerm);
    } else {
      window.sessionStorage.removeItem(SEARCH_TERM_STORAGE_KEY);
    }
  } catch (error) {
    // Storage may be unavailable (privacy mode); the search still works.
  }
}

export default {
  mixins: [rowVariantMixin],
  components: {
    ToolbarRowPrototype,
    SearchBar,
    BookingExportButton,
    ProcessingIndicator,
    GroupBookingDeleteConformationDialog,
    BookingTable,
    BookingOverviewCalendar,
    BookingDeleteConformationDialog,
    BookingTransitions,
    AdminLayout,
    BookingKanban,
  },
  data() {
    return {
      showBacklog: false,
      fuse: null,
      value: "",
      searchTerm: readStoredSearchTerm(),
      bookingTypeFilter: "all",
      // The list's status filter (spec E11, N1): nothing selected means no
      // filter; plain component state - nothing persists it.
      statusFilter: [],
      api: {
        users: [],
        bookings: [],
        groupBookings: [],
      },
      headers: [
        {
          text: "Id",
          align: "start",
          value: "id",
        },
        { text: "Buchungsobjekte", value: "bookableIds" },
        { text: "Von", value: "timeBegin" },
        { text: "Bis", value: "timeEnd" },
        { text: "Erstellt am", value: "timeCreated" },
        { text: "Name", value: "name" },
        { text: "Preis", value: "priceEur" },
        { text: "Status", value: "status" },
        { text: "Zahlungsart", value: "payMethod" },
        { text: "", value: "controls", sortable: false },
      ],
      openDeleteDialog: false,
      openDeleteGroupBookingDialog: false,
      selectedBooking: {},
      selectedGroupBooking: {},
      currentView: "list",
      workflow: {},
    };
  },
  computed: {
    // PROTOTYPE (#57): the page's row as the prototype variants take it.
    protoViews() {
      return [
        { value: "list", label: "Liste", icon: "mdi-list-box-outline" },
        {
          value: "calendar",
          label: "Kalender",
          icon: "mdi-calendar-blank-outline",
        },
        ...(this.workflow.active
          ? [{ value: "kanban", label: "Kanban", icon: "mdi-table-column" }]
          : []),
      ];
    },
    protoActions() {
      const exporter = () => this.$refs.protoExport;
      return [
        ...(this.currentView === "kanban"
          ? [
            {
              key: "backlog",
              label: "Backlog",
              icon: "mdi-tray-full",
              active: this.showBacklog,
              onClick: () => (this.showBacklog = !this.showBacklog),
            },
          ]
          : []),
        {
          key: "export",
          label: "Exportieren",
          icon: "mdi-download",
          disabled: this.filteredBookings.length === 0,
          menu: [
            {
              label: "Als Excel exportieren",
              icon: "mdi-microsoft-excel",
              onClick: () => exporter().exportBookings(),
            },
            {
              label: "Als iCal exportieren",
              icon: "mdi-calendar-export",
              onClick: () => exporter().exportIcal(),
            },
          ],
        },
      ];
    },
    protoPrimary() {
      return {
        label: "Buchung erstellen",
        to: { name: "booking-create" },
        disabled: !BookingPermissionService.allowCreate(),
      };
    },
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    BookingPermissionService() {
      return BookingPermissionService;
    },
    /**
     * The filter card behind the funnel (spec N1): the booking type as a
     * segment switch, the five states as a checkbox list. One restriction for
     * a type other than "all", one per selected state.
     */
    filterSections() {
      return [
        {
          key: "type",
          label: this.$t("booking.filter.type"),
          multiple: false,
          segmented: true,
          empty: "all",
          selected: this.bookingTypeFilter,
          options: [
            {
              value: "all",
              label: this.$t("booking.filter.typeAll"),
              icon: "mdi-view-grid-outline",
            },
            {
              value: "single",
              label: this.$t("booking.filter.typeSingle"),
              icon: "mdi-calendar-check-outline",
            },
            {
              value: "series",
              label: this.$t("booking.filter.typeSeries"),
              icon: "mdi-calendar-multiple",
            },
          ],
        },
        {
          key: "status",
          label: this.$t("booking.filter.status"),
          selected: this.statusFilter,
          options: Object.values(BOOKING_STATUS).map((status) => ({
            value: status,
            label: statusLabel(status),
            color: statusColor(status),
            icon: statusIcon(status),
          })),
        },
      ];
    },
    isSelectedBookingHardDeleteBlocked() {
      return !allowsAction(this.selectedBooking, "delete");
    },
    isSelectedGroupHardDeleteBlocked() {
      if (!this.selectedGroupBooking?.bookingIds) return false;
      return this.selectedGroupBooking.bookingIds.some((bookingId) => {
        const booking = this.api.bookings.find((item) => item.id === bookingId);
        return !allowsAction(booking, "delete");
      });
    },
    mappedBookings() {
      return this.api.bookings.map((booking) => {
        return {
          ...booking,
          groupBooking: this.api.groupBookings.find((groupBooking) =>
            groupBooking.bookingIds.includes(booking.id)
          )?.id,
        };
      });
    },
    filteredBookings() {
      let bookings = this.mappedBookings || [];

      if (this.searchTerm) {
        // A restored term can be there before the bookings - and the index -
        // are; nothing matches until they arrive.
        if (!this.fuse) {
          return [];
        }
        const terms = this.searchTerm.trim().split(/\s+/);
        const searchQuery = {
          $and: terms.map((term) => ({
            $or: [
              { id: `'${term}` },
              { mail: `'${term}` },
              { comment: `'${term}` },
              { name: `'${term}` },
              { street: `'${term}` },
              { zipCode: `'${term}` },
              { location: `'${term}` },
              { company: `'${term}` },
              { phone: `'${term}` },
              { "bookableItems.bookableId": `'${term}` },
              { "bookableItems._bookableUsed.id": `'${term}` },
              { "bookableItems._bookableUsed.title": `'${term}` },
              { "bookableItems._bookableUsed.description": `'${term}` },
              { "bookableItems._bookableUsed.type": `'${term}` },
              { "bookableItems._bookableUsed.eventId": `'${term}` },
              { "bookableItems._bookableUsed.priceEur": `'${term}` },
              { "bookableItems._bookableUsed.attachments.id": `'${term}` },
              { "bookableItems._bookableUsed.attachments.type": `'${term}` },
              { "bookableItems._bookableUsed.attachments.title": `'${term}` },
              { "bookableItems._bookableUsed.attachments.url": `'${term}` },
              { "_populated.bookable.flags": `'${term}` },
              { "_populated.bookable.tags": `'${term}` },
              { "_populated.bookable.bookingNotes": `'${term}` },
              { groupBooking: `'${term}` },
            ],
          })),
        };

        const results = this.fuse.search(searchQuery);
        bookings = results.map((result) => result.item);
      }

      return this.applyBookingTypeFilter(bookings);
    },
    /**
     * What the table and the calendar show. The kanban stays on
     * `filteredBookings` - its columns are workflow states, not booking states.
     */
    statusFilteredBookings() {
      if (this.statusFilter.length === 0) {
        return this.filteredBookings;
      }
      return filterBookingsByStatus(this.filteredBookings, this.statusFilter);
    },
  },
  watch: {
    tenantId() {
      this.fetchBookings();
      this.fetchGroupBookings();
    },
    searchTerm(searchTerm) {
      storeSearchTerm(searchTerm);
    },
    currentView(newView) {
      this.$router
        .replace({ query: { ...this.$route.query, view: newView } })
        .catch((err) => {
          if (err.name !== "NavigationDuplicated") {
            throw err;
          }
        });
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    onFilter(key, selection) {
      if (key === "type") this.bookingTypeFilter = selection;
      if (key === "status") this.statusFilter = selection;
    },
    applyBookingTypeFilter(bookings) {
      if (this.bookingTypeFilter === "single") {
        return bookings.filter((booking) => !booking.groupBooking);
      }
      if (this.bookingTypeFilter === "series") {
        return bookings.filter((booking) => !!booking.groupBooking);
      }
      return bookings;
    },
    /**
     * A menu raised a transition (spec E3): the module runs it against the
     * booking and, for a series member, its series and members.
     */
    onTransition(action, bookingId) {
      const booking = this.api.bookings.find((item) => item.id === bookingId);
      this.$refs.transitions.start(
        action,
        transitionTarget(booking, this.groupBookingOf(bookingId))
      );
    },
    async onTransitioned() {
      await this.reloadBookings();
    },
    /**
     * After a 409 or 404 the module asks for a reload (spec E5), so that list,
     * calendar and kanban show the server's state instead of the one the
     * transition was attempted against.
     */
    async onTransitionFailed({ refetch }) {
      if (refetch) {
        await this.reloadBookings();
      }
    },
    async reloadBookings() {
      await this.fetchBookings();
      await this.fetchGroupBookings();
    },

    async fetchBookings() {
      await this.startLoading("fetch-bookings");

      await ApiBookingService.getBookings(undefined, true)
        .then((response) => {
          this.api.bookings = response.data;
        })
        .finally(async () => {
          this.initializeFuse();
          this.stopLoading("fetch-bookings");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async fetchBooking(id) {
      try {
        const response = await ApiBookingService.getBooking(
          id,
          undefined,
          true
        );
        const booking = response.data;
        const index = this.api.bookings.findIndex((b) => b.id === id);
        if (index !== -1) {
          this.api.bookings[index] = booking;
        } else {
          this.api.bookings.push(booking);
        }
      } catch (error) {
        console.log(error);
      }
    },
    async fetchGroupBookings() {
      await this.startLoading("fetch-grp-bookings");

      await ApiGroupBookingService.getGroupBookings()
        .then((response) => {
          this.api.groupBookings = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-grp-bookings");
          this.initializeFuse();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async deleteBooking(bookingId) {
      const booking = this.api.bookings.find((item) => item.id === bookingId);
      if (!allowsAction(booking, "delete")) {
        await this.addToast(
          ToastService.createToast("booking.delete.requires-rejection", "error")
        );
        return;
      }
      const optionId = ProcessingService.showOverlay("Lösche Buchung...");
      try {
        await this.startLoading("delete-booking");
        await ApiBookingService.deleteBooking(bookingId);
        await this.fetchBookings();
        await this.fetchGroupBookings();
        this.openDeleteDialog = false;
        this.openDeleteGroupBookingDialog = false;
      } finally {
        await this.stopLoading("delete-booking");
        ProcessingService.hide(optionId);
      }
    },
    async deleteGroupBooking(bookingId) {
      const groupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      const hasProtectedBooking = groupBooking.bookingIds.some((id) => {
        const booking = this.api.bookings.find((item) => item.id === id);
        return !allowsAction(booking, "delete");
      });
      if (hasProtectedBooking) {
        await this.addToast(
          ToastService.createToast("booking.delete.requires-rejection", "error")
        );
        return;
      }
      const optionId = ProcessingService.showOverlay("Lösche Serienbuchung...");
      try {
        await this.startLoading("delete-booking");
        await ApiGroupBookingService.deleteGroupBooking(null, groupBooking.id);
        await this.fetchBookings();
        await this.fetchGroupBookings();
        this.openDeleteDialog = false;
        this.openDeleteGroupBookingDialog = false;
      } finally {
        ProcessingService.hide(optionId);
        await this.stopLoading("delete-booking");
      }
    },
    /** "Details" leads to the Buchungsseite; `?tenant=` completes the Buchungslink. */
    onOpenBooking(bookingId) {
      this.$router.push(bookingPageRoute(bookingId, this.tenantId));
    },
    /**
     * The series a booking belongs to, with its members populated, so that
     * `BookingTransitions` can act on a member with its series (spec E3); `null` for
     * a single booking.
     */
    groupBookingOf(bookingId) {
      const groupBooking = this.api.groupBookings.find((item) =>
        item.bookingIds.includes(bookingId)
      );
      return groupBooking ? this.withMembers(groupBooking) : null;
    },
    /** A series with its members populated from the loaded bookings. */
    withMembers(groupBooking) {
      return {
        ...groupBooking,
        bookings: groupBooking.bookingIds
          .map((id) => this.api.bookings.find((booking) => booking.id === id))
          .filter(Boolean),
      };
    },
    /** "Gruppenbuchung" leads to the Serienbuchungsseite, with `?tenant=` as above. */
    onOpenGroupBooking(groupBookingId) {
      this.$router.push(groupBookingPageRoute(groupBookingId, this.tenantId));
    },
    onOpenEditBooking(bookingId) {
      this.$router.push({
        name: "booking-edit",
        params: { bookingId },
      });
    },
    onOpenDeleteDialog(bookingId) {
      const hasGroupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      if (hasGroupBooking) {
        this.selectedGroupBooking = Object.assign({}, hasGroupBooking);
        this.openDeleteGroupBookingDialog = true;
      } else {
        this.selectedGroupBooking = null;
        this.openDeleteDialog = true;
      }
    },
    onCloseDeleteDialog() {
      this.fetchBookings();
      this.fetchGroupBookings();
      this.openDeleteDialog = false;
    },
    initializeFuse() {
      const options = {
        includeScore: true,
        threshold: 0.3,
        useExtendedSearch: true,
        keys: [
          "id",
          "mail",
          "comment",
          "name",
          "street",
          "zipCode",
          "location",
          "company",
          "phone",

          "bookableItems.bookableId",
          "bookableItems._bookableUsed.id",
          "bookableItems._bookableUsed.title",
          "bookableItems._bookableUsed.type",
          "bookableItems._bookableUsed.eventId",
          "bookableItems._bookableUsed.priceEur",

          "bookableItems._bookableUsed.attachments.id",
          "bookableItems._bookableUsed.attachments.type",
          "bookableItems._bookableUsed.attachments.title",
          "bookableItems._bookableUsed.attachments.url",

          "_populated.bookable.flags",
          "_populated.bookable.tags",
          "_populated.bookable.bookingNotes",

          "groupBooking",
        ],
      };
      this.fuse = new Fuse(this.mappedBookings, options);
    },
    async fetchWorkflow() {
      this.workflow = await ApiWorkflowService.getWorkflowStates();
    },
    async onDownloadIcal(bookingId) {
      try {
        const response = await ApiBookingService.downloadBookingIcal(bookingId);
        saveBlob(
          new Blob([response.data], { type: "text/calendar;charset=utf-8" }),
          `buchung-${bookingId}.ics`
        );
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.ical.error", "error")
        );
      }
    },
  },
  async mounted() {
    ProcessingService.setComponent(this.$refs.processingIndicator);

    try {
      await this.fetchBookings();
      await this.fetchWorkflow();
      await this.fetchGroupBookings();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  },
  async created() {
    const viewFromQuery = this.$route.query.view;
    if (
      viewFromQuery &&
      ["list", "calendar", "kanban"].includes(viewFromQuery)
    ) {
      this.currentView = viewFromQuery;
    }
  },
};
</script>

<style scoped lang="scss">
::v-deep .active-button {
  color: black !important;
  background-color: var(--v-secondary-base) !important;
}

html,
body {
  height: 100%;
  margin: 0;
}

.page-container {
  display: flex;
  flex-direction: column;
}

.page-header {
  flex: 0 0 auto;
}

.page-content {
  flex: 1 1 auto;
  overflow-y: auto;
  margin-bottom: 80px;
}

.page-footer {
  flex: 0 0 auto;
}
</style>

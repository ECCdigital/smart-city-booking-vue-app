<template>
  <AdminLayout>
    <div class="page-header">
      <div class="d-flex align-center mb-3 justify-space-between">
        <v-btn-toggle
          v-model="currentView"
          mandatory
          rounded
          active-class="active-button"
        >
          <v-btn value="list">
            <v-icon left> mdi-list-box-outline </v-icon>
            Liste
          </v-btn>
          <v-btn value="calendar">
            <v-icon left> mdi-calendar-blank-outline </v-icon>
            Kalender
          </v-btn>
          <v-btn v-if="workflow.active" value="kanban">
            <v-icon left> mdi-table-column </v-icon>
            Kanban
          </v-btn>
        </v-btn-toggle>

        <div>
          <v-tooltip v-if="currentView === 'kanban'" bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                v-on="on"
                icon
                small
                class="ml-2"
                :class="{ 'active-button': showBacklog }"
                @click="showBacklog = !showBacklog"
              >
                <v-icon>mdi-tray-full</v-icon>
              </v-btn>
            </template>
            <span>Backlog ein-/ausblenden</span>
          </v-tooltip>
          <BookingExportButton
            class="ml-auto"
            :bookings="filteredBookings"
            :tenant="tenantId"
          />
        </div>
      </div>
      <v-text-field
        v-model="searchTerm"
        label="Buchung suchen..."
        append-icon="mdi-magnify"
        solo
        clearable
        class="search-field"
      >
        <template v-slot:prepend-inner>
          <v-menu
            bottom
            left
            offset-y
            nudge-bottom="8"
            max-width="320"
            content-class="booking-type-filter-menu"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-badge
                :value="hasActiveBookingTypeFilter"
                color="primary"
                dot
                overlap
              >
                <v-btn
                  icon
                  v-bind="attrs"
                  v-on="on"
                  class="booking-type-filter-trigger"
                  :class="{
                    'booking-type-filter-trigger--active':
                      hasActiveBookingTypeFilter,
                  }"
                  @click.stop
                >
                  <v-icon>mdi-filter-variant</v-icon>
                </v-btn>
              </v-badge>
            </template>

            <v-card class="booking-type-filter-card" elevation="8" rounded="lg">
              <div class="booking-type-filter-card__header">
                <div class="d-flex align-center">
                  <div class="booking-type-filter-card__header-icon mr-3">
                    <v-icon color="primary" small>mdi-tune-variant</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold line-height-tight">
                      Buchungstyp
                    </div>
                    <div class="text-caption grey--text">
                      Ansicht einschränken
                    </div>
                  </div>
                </div>
                <v-btn
                  v-if="hasActiveBookingTypeFilter"
                  text
                  x-small
                  color="primary"
                  class="px-2"
                  @click="bookingTypeFilter = 'all'"
                >
                  Zurücksetzen
                </v-btn>
              </div>

              <v-divider />

              <div class="booking-type-filter-card__options">
                <button
                  v-for="option in bookingTypeFilterOptions"
                  :key="option.value"
                  type="button"
                  class="booking-type-filter-option"
                  :class="{
                    'booking-type-filter-option--active':
                      bookingTypeFilter === option.value,
                  }"
                  @click="bookingTypeFilter = option.value"
                >
                  <div
                    class="booking-type-filter-option__icon"
                    :class="`booking-type-filter-option__icon--${option.value}`"
                  >
                    <v-icon small>{{ option.icon }}</v-icon>
                  </div>
                  <div class="booking-type-filter-option__content">
                    <span class="booking-type-filter-option__title">{{
                      option.text
                    }}</span>
                    <span class="booking-type-filter-option__desc">{{
                      option.description
                    }}</span>
                  </div>
                  <v-icon
                    v-if="bookingTypeFilter === option.value"
                    small
                    color="primary"
                    class="booking-type-filter-option__check"
                  >
                    mdi-check-circle
                  </v-icon>
                </button>
              </div>
            </v-card>
          </v-menu>
        </template>
        <template v-slot:append-outer>
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            :label="$t('booking.filter.status')"
            multiple
            solo
            hide-details
            class="status-filter"
          >
            <template v-slot:selection="{ item }">
              <v-chip
                small
                :color="item.color"
                text-color="white"
                class="my-1 mr-1"
              >
                {{ item.text }}
              </v-chip>
            </template>
          </v-select>
        </template>
      </v-text-field>
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
    <v-dialog v-model="openBookingDialog" max-width="800px">
      <BookingDetails
        :booking="selectedBooking"
        :group-booking="selectedGroupBooking"
        @update="updateBooking"
        @close="onCloseBookingDialog"
        @download-ical="onDownloadIcal"
      ></BookingDetails>
    </v-dialog>
    <v-dialog v-model="openGroupBookingDialog" max-width="1200px">
      <div style="overflow: hidden">
        <GroupBookingDetails
          :group-booking="selectedGroupBooking"
          @close="closeDialog('groupBooking')"
          @update="updateGroupBookingView"
          @download-ical="onDownloadGroupBookingIcal"
        ></GroupBookingDetails>
      </div>
    </v-dialog>
    <GroupBookingDeleteConformationDialog
      v-if="selectedBooking.id"
      :booking-id="selectedBooking.id"
      :open="openDeleteGroupBookingDialog"
      :single-delete-disabled="isSelectedBookingHardDeleteBlocked"
      :group-delete-disabled="isSelectedGroupHardDeleteBlocked"
      @close="closeDialog('deleteGroupBooking')"
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
import BookingDetails from "@/components/Booking/BookingDetails.vue";
import BookingOverviewCalendar from "@/components/Booking/BookingOverviewCalendar.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";
import BookingKanban from "@/components/Booking/BookingKanban.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import GroupBookingDetails from "@/components/Booking/GroupBookingDetails.vue";
import GroupBookingDeleteConformationDialog from "@/components/Booking/GroupBookingDeleteConformationDialog.vue";
import ToastService from "@/services/ToastService";
import ProcessingIndicator from "@/components/ProcessingIndicator.vue";
import ProcessingService from "@/services/ProcessingService";
import BookingExportButton from "@/components/Booking/BookingExportButton.vue";
import {
  BOOKING_STATUS,
  allowsAction,
  filterBookingsByStatus,
  statusColor,
  statusLabel,
  transitionTarget,
} from "@/utils/bookingStatus";

export default {
  components: {
    BookingExportButton,
    ProcessingIndicator,
    GroupBookingDeleteConformationDialog,
    GroupBookingDetails,
    BookingTable,
    BookingOverviewCalendar,
    BookingDetails,
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
      searchTerm: "",
      bookingTypeFilter: "all",
      // The list's status filter (spec E11): all five states to begin with,
      // plain component state - nothing persists it.
      statusFilter: Object.values(BOOKING_STATUS),
      bookingTypeFilterOptions: [
        {
          value: "all",
          text: "Alle Buchungen",
          description: "Einzel- und Serienbuchungen",
          icon: "mdi-view-grid-outline",
        },
        {
          value: "single",
          text: "Einzelbuchungen",
          description: "Ohne Serienzuordnung",
          icon: "mdi-calendar-check-outline",
        },
        {
          value: "series",
          text: "Serienbuchungen",
          description: "Teil einer Buchungsserie",
          icon: "mdi-calendar-multiple",
        },
      ],
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
      openGroupBookingDialog: false,
      openDeleteGroupBookingDialog: false,
      selectedBooking: {},
      selectedGroupBooking: {},
      openBookingDialog: false,
      currentView: "list",
      workflow: {},
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    BookingPermissionService() {
      return BookingPermissionService;
    },
    hasActiveBookingTypeFilter() {
      return this.bookingTypeFilter !== "all";
    },
    statusFilterOptions() {
      return Object.values(BOOKING_STATUS).map((status) => ({
        value: status,
        text: statusLabel(status),
        color: statusColor(status),
      }));
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
      return filterBookingsByStatus(this.filteredBookings, this.statusFilter);
    },
  },
  watch: {
    tenantId() {
      this.fetchBookings();
      this.fetchGroupBookings();
    },
    currentView(newView) {
      this.$router.replace({ query: { view: newView } }).catch((err) => {
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
    applyBookingTypeFilter(bookings) {
      if (this.bookingTypeFilter === "single") {
        return bookings.filter((booking) => !booking.groupBooking);
      }
      if (this.bookingTypeFilter === "series") {
        return bookings.filter((booking) => !!booking.groupBooking);
      }
      return bookings;
    },
    async onDownloadGroupBookingIcal(bookingIds) {
      const operationId = ProcessingService.showSnackbar(
        "Termine werden heruntergeladen..."
      );
      try {
        const response = await ApiBookingService.downloadGroupBookingIcal(
          bookingIds
        );

        const blob = new Blob([response.data], {
          type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `serienbuchung-${this.selectedGroupBooking.id}.ics`
        );
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.ical.error", "error")
        );
      } finally {
        ProcessingService.hide(operationId);
      }
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
    async closeDialog(type) {
      switch (type) {
        case "delete":
          this.openDeleteDialog = false;
          break;
        case "booking":
          this.openBookingDialog = false;
          break;
        case "groupBooking":
          await this.fetchGroupBookings();
          this.openGroupBookingDialog = false;
          break;
        case "deleteGroupBooking":
          this.openDeleteGroupBookingDialog = false;
          break;
        default:
          break;
      }
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
    onOpenBooking(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      this.selectedGroupBooking = this.groupBookingOf(bookingId);
      this.openBookingDialog = true;
    },
    /**
     * The series a booking belongs to, with its members populated, so that
     * the drawer can act on a member with its series (spec E3); `null` for
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
    onOpenGroupBooking(groupBookingId) {
      const groupBooking = this.api.groupBookings.find(
        (groupBooking) => groupBooking.id === groupBookingId
      );
      this.selectedGroupBooking = this.withMembers(groupBooking);
      this.openGroupBookingDialog = true;
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
    onCloseBookingDialog() {
      this.openBookingDialog = false;
    },
    /**
     * The drawer asks for a reload after a transition, a reprint or a
     * refused call that says the screen is stale (spec E5). A booking that
     * is gone by then closes the drawer instead of showing an empty one.
     */
    async updateBooking(bookingId) {
      await this.fetchBookings();
      await this.fetchGroupBookings();
      const booking = this.api.bookings.find((item) => item.id === bookingId);
      if (!booking) {
        this.openBookingDialog = false;
        return;
      }
      this.selectedBooking = Object.assign({}, booking);
      this.selectedGroupBooking = this.groupBookingOf(bookingId);
    },
    /** The series drawer's reload; a series gone by then closes the drawer, as `updateBooking` does. */
    async updateGroupBookingView() {
      const groupBookingId = this.selectedGroupBooking?.id;
      if (!groupBookingId) return;

      await this.fetchBookings();
      await this.fetchGroupBookings();

      const groupBooking = this.api.groupBookings.find(
        (gb) => gb.id === groupBookingId
      );
      if (!groupBooking) {
        this.openGroupBookingDialog = false;
        return;
      }

      this.selectedGroupBooking = this.withMembers(groupBooking);
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
        const temp = await ApiBookingService.downloadBookingIcal(bookingId);

        const blob = new Blob([temp.data], {
          type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `buchung-${bookingId}.ics`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
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
.search-field {
  border-radius: 15px;
}

.status-filter {
  width: 28rem;
}

.booking-type-filter-trigger--active {
  background: rgba(var(--v-primary-base), 0.12) !important;

  .v-icon {
    color: var(--v-primary-base) !important;
  }
}

.booking-type-filter-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.booking-type-filter-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  background: linear-gradient(
    135deg,
    rgba(var(--v-primary-base), 0.06) 0%,
    rgba(var(--v-primary-base), 0.02) 100%
  );
}

.booking-type-filter-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(var(--v-primary-base), 0.12);
}

.line-height-tight {
  line-height: 1.25;
}

.booking-type-filter-card__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
}

.booking-type-filter-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    transform: translateX(2px);
  }

  &--active {
    background: rgba(var(--v-primary-base), 0.08);
    border-color: rgba(var(--v-primary-base), 0.35);
    box-shadow: 0 2px 8px rgba(var(--v-primary-base), 0.12);

    .booking-type-filter-option__title {
      color: var(--v-primary-base);
      font-weight: 600;
    }
  }
}

.booking-type-filter-option__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  transition: transform 0.2s ease;

  .booking-type-filter-option--active & {
    transform: scale(1.05);
  }

  &--all {
    background: transparent;
    color: #607d8b;
  }

  &--single {
    background: transparent;
    color: #2196f3;
  }

  &--series {
    background: rgba(var(--v-primary-base), 0.16);
    color: var(--v-primary-base);
  }
}

.booking-type-filter-option__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.booking-type-filter-option__title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
}

.booking-type-filter-option__desc {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.54);
  margin-top: 2px;
}

.booking-type-filter-option__check {
  flex-shrink: 0;
}

.theme--dark {
  .booking-type-filter-card {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .booking-type-filter-option {
    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    &--active {
      background: rgba(var(--v-primary-base), 0.15);
    }
  }

  .booking-type-filter-option__title {
    color: rgba(255, 255, 255, 0.9);
  }

  .booking-type-filter-option__desc {
    color: rgba(255, 255, 255, 0.55);
  }
}

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

<style lang="scss">
.booking-type-filter-menu {
  border-radius: 14px !important;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14) !important;

  .v-card {
    border-radius: 14px !important;
  }
}
</style>

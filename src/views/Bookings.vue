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

        <v-tooltip v-if="currentView === 'kanban'" bottom>
          <template v-slot:activator="{ on }">
            <v-btn
              v-on="on"
              fab
              small
              class="ml-2 elevation-0 active-button"
              @click="showBacklog = !showBacklog"
            >
              <v-icon>mdi-tray-full</v-icon>
            </v-btn>
          </template>
          <span>Backlog ein-/ausblenden</span>
        </v-tooltip>
      </div>

      <v-text-field
        v-model="searchTerm"
        label="Buchung suchen..."
        append-icon="mdi-magnify"
        solo
        clearable
        class="search-field"
      ></v-text-field>
    </div>

    <div class="page-content">
      <div v-if="currentView === 'list'">
        <v-skeleton-loader type="table" class="flex">
          <BookingTable
            :bookings="filteredBookings"
            :loading="loading"
            @open-booking="onOpenBooking"
            @open-edit-booking="onOpenEditBooking"
            @commit-booking="commitBooking"
            @open-delete-dialog="onOpenDeleteDialog"
            @reject-booking="onOpenRejectDialog"
          />
        </v-skeleton-loader>
      </div>

      <div v-else-if="currentView === 'calendar'">
        <BookingOverviewCalendar
          :bookings="filteredBookings"
          :loading="loading"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @commit-booking="commitBooking"
          @reject-booking="onOpenRejectDialog"
          @open-delete-dialog="onOpenDeleteDialog"
        ></BookingOverviewCalendar>
      </div>

      <div v-else-if="currentView === 'kanban'">
        <BookingKanban
          :bookings="filteredBookings"
          :loading="loading"
          :show-backlog="showBacklog"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @commit-booking="commitBooking"
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
      @click="onOpenCreateBookings"
      :disabled="!BookingPermissionService.allowCreate()"
    >
      <v-icon>mdi-plus</v-icon>Buchung erstellen
    </v-btn>
    <BookingEdit
      :booking="selectedBooking"
      :open="openEditDialog"
      :bookables="bookables"
      :workflow="workflow"
      @close="onCloseEditDialog"
    />
    <BookingDeleteConformationDialog
      :to-delete="selectedBooking"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    />
    <BookingRejectConformationDialog
      :to-reject="selectedBooking"
      :open="openRejectDialog"
      @close="onCloseRejectDialog"
    />
    <v-dialog v-model="openBookingDialog" max-width="800px">
      <BookingDetails
        :booking="selectedBooking"
        @update="updateBooking"
        @close="onCloseBookingDialog"
      ></BookingDetails>
    </v-dialog>
  </AdminLayout>
</template>

<script>
import Fuse from "fuse.js";
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingEdit from "@/components/Booking/BookingEdit.vue";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDetails from "@/components/Booking/BookingDetails.vue";
import BookingOverviewCalendar from "@/components/Booking/BookingOverviewCalendar.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";
import BookingKanban from "@/components/Booking/BookingKanban.vue";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";

export default {
  components: {
    BookingTable,
    BookingOverviewCalendar,
    BookingDetails,
    BookingDeleteConformationDialog,
    BookingRejectConformationDialog,
    AdminLayout,
    BookingEdit,
    BookingKanban,
  },
  data() {
    return {
      showBacklog: false,
      fuse: null,
      value: "",
      searchTerm: "",
      api: {
        users: [],
        bookings: [],
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
        { text: "Status", value: "isCommitted" },
        { text: "Zahlung", value: "isPayed" },
        { text: "Zahlungart", value: "payMethod" },
        { text: "", value: "controls", sortable: false },
      ],
      openEditDialog: false,
      openDeleteDialog: false,
      openRejectDialog: false,
      selectedBooking: {},
      bookables: [],
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
    filteredBookings() {
      if (!this.searchTerm) {
        return this.api.bookings || [];
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
          ],
        })),
      };

      const results = this.fuse.search(searchQuery);
      return results.map((result) => result.item);
    },
  },
  watch: {
    tenantId() {
      this.fetchBookings();
      this.fetchBookables();
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    //create customSearch to get title of bookable by id
    customSearch(value, search) {
      // return bookables id of this.bookables if they include search string in title
      const bookableIds = this.bookables
        .filter((bookable) =>
          bookable.title.toLowerCase().includes(search.toLowerCase())
        )
        .map((bookable) => bookable.id);
      // return value if value is one of the bookables id
      if (bookableIds.includes(value?.toString())) {
        return true;
      } else if (
        value?.toString().toLowerCase().includes(search.toLowerCase())
      ) {
        return true;
      } else if (typeof value === "object" && value?.length > 0) {
        // for key in value check if value[key] is one of the bookables id
        for (const key in value) {
          if (bookableIds.includes(value[key]?.toString())) {
            return true;
          }
        }
      }
    },

    fetchBookables() {
      ApiBookablesService.getBookables()
        .then((response) => {
          this.bookables = response.data;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async fetchBookings() {
      await this.startLoading("fetch-bookings");

      await ApiBookingService.getBookings(undefined, true)
        .then((response) => {
          this.api.bookings = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-bookings");
          this.initializeFuse();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async fetchBooking(id) {
      await ApiBookingService.getBooking(id, undefined, true)
        .then((response) => {
          const booking = response.data;
          const index = this.api.bookings.findIndex((b) => b.id === id);
          if (index !== -1) {
            this.api.bookings[index] = booking;
          } else {
            this.api.bookings.push(booking);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    commitBooking(id) {
      ApiBookingService.commitBooking(id)
        .then((response) => {
          if (response.status === 200) {
            this.fetchBookings();
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    rejectBooking(id) {
      ApiBookingService.rejectBooking(id, this.tenantId)
        .then((response) => {
          if (response.status === 200) {
            this.fetchBookings();
          }
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onOpenBooking(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      this.openBookingDialog = true;
    },
    onOpenEditBooking(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      this.openEditDialog = true;
    },
    onOpenDeleteDialog(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      this.openDeleteDialog = true;
    },
    onOpenRejectDialog(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      this.openRejectDialog = true;
    },
    onCloseEditDialog() {
      this.fetchBookings();
      this.openEditDialog = false;
    },
    onCloseDeleteDialog() {
      this.fetchBookings();
      this.openDeleteDialog = false;
    },
    onCloseRejectDialog() {
      this.fetchBookings();
      this.openRejectDialog = false;
    },
    onCloseBookingDialog() {
      this.openBookingDialog = false;
    },
    onOpenCreateBookings() {
      this.selectedBooking = {
        id: null,
        tenant: this.tenantId,
        assignedUserId: null,
        attachments: [],
        bookableItems: [],
        comment: null,
        company: null,
        couponCode: null,
        isCommitted: false,
        isPayed: false,
        location: null,
        lockerInfo: null,
        mail: null,
        name: null,
        paymentProvider: null,
        paymentMethod: null,
        phone: null,
        priceEur: 0,
        street: null,
        timeBegin: Date.now(),
        timeCreated: Date.now(),
        timeEnd: Date.now(),
        vatIncludedEur: null,
        zipCode: null,
      };
      this.selectedBooking.tenantId = this.tenantId;
      this.openEditDialog = true;
    },
    translatePayMethod(value) {
      switch (value) {
        case "1":
          return "Giropay";
        case "17":
          return "Giropay";
        case "18":
          return "Giropay";
        case "2":
          return "eps";
        case "12":
          return "iDEAL";
        case "11":
          return "Kreditkarte";
        case "6":
          return "Lastschrift";
        case "7":
          return "Lastschrift";
        case "26":
          return "Bluecode";
        case "33":
          return "Maestro";
        case "14":
          return "PayPal";
        case "23":
          return "paydirekt";
        case "27":
          return "Sofortüberweisung";
        default:
          return "Unbekannt";
      }
    },
    async updateBooking(bookingId) {
      await this.fetchBookings();
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
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
        ],
      };
      this.fuse = new Fuse(this.api.bookings, options);
    },
    async fetchWorkflow() {
      this.workflow = await ApiWorkflowService.getWorkflowStates();
    },
  },
  created() {
    this.fetchBookings();
    this.fetchBookables();
    this.fetchWorkflow();
  },
};
</script>

<style scoped lang="scss">
.search-field {
  border-radius: 15px;
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
  /* page-container selbst muss nicht zwingend Flex sein,
     wenn du in AdminLayout schon Flex-Logik nutzt.
     Kann aber, wenn man Header/Footer explizit abgrenzen möchte. */
  display: flex;
  flex-direction: column;
  /* Hier KEIN fixed height nötig, wir vererben die "Höhe" vom AdminLayout her. */
}

.page-header {
  /* Nimmt nur so viel Platz, wie nötig */
  flex: 0 0 auto;
}

.page-content {
  /* Hier könnte ebenfalls overflow, wenn du den inneren Bereich nochmals eigenständig scrollen lassen willst.
     Falls das jedoch global im AdminLayout schon geregelt wird, kannst du es hier auch simpler halten. */
  flex: 1 1 auto;
  overflow-y: auto;
}

.page-footer {
  flex: 0 0 auto;
}
</style>

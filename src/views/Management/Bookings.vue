<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-btn-toggle v-model="currentView" mandatory rounded class="mb-4">
          <v-btn
            value="list"
            :color="currentView === 'list' ? 'secondary' : ''"
            :class="currentView === 'list' ? 'active-button' : ''"
          >
            <v-icon left> mdi-list-box-outline </v-icon>
            Listenansicht</v-btn
          >
          <v-btn
            value="calendar"
            :color="currentView === 'calendar' ? 'secondary' : ''"
            :class="currentView === 'calendar' ? 'active-button' : ''"
          >
            <v-icon left> mdi-calendar-blank-outline </v-icon>
            Kalenderansicht</v-btn
          >
        </v-btn-toggle>

        <v-text-field
          v-model="searchTerm"
          label="Buchung suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>

        <!-- List view -->
        <div v-if="currentView === 'list'">
          <v-skeleton-loader type="table" class="flex">
            <BookingTable
              :bookings="filteredBookings"
              :loading="loading"
              @open-booking="onOpenBooking"
              @open-edit-booking="onOpenEditBooking"
              @commit-booking="commitBooking"
              @open-delete-dialog="onOpenDeleteDialog"
            />
          </v-skeleton-loader>
        </div>

        <!-- Calendar view -->
        <div v-else-if="currentView === 'calendar'">
          <BookingOverviewCalendar
            :bookings="filteredBookings"
            :loading="loading"
            @open-booking="onOpenBooking"
            @open-edit-booking="onOpenEditBooking"
            @commit-booking="commitBooking"
            @open-delete-dialog="onOpenDeleteDialog"
          ></BookingOverviewCalendar>
        </div>
      </v-col>
    </v-row>
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
      @close="onCloseEditDialog"
    />
    <BookingDeleteConformationDialog
      :to-delete="selectedBooking"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
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
import BookingEdit from "@/components/Booking/BookingEdit";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDetails from "@/components/Booking/BookingDetails.vue";
import BookingOverviewCalendar from "@/components/Booking/BookingOverviewCalendar.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";

export default {
  components: {
    BookingTable,
    BookingOverviewCalendar,
    BookingDetails,
    BookingDeleteConformationDialog,
    AdminLayout,
    BookingEdit,
  },
  data() {
    return {
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
      selectedBooking: {},
      bookables: [],
      openBookingDialog: false,
      currentView: "list",
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenant: "tenants/tenant",
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
    onCloseEditDialog() {
      this.fetchBookings();
      this.openEditDialog = false;
    },
    onCloseDeleteDialog() {
      this.fetchBookings();
      this.openDeleteDialog = false;
    },
    onCloseBookingDialog() {
      this.openBookingDialog = false;
    },
    onOpenCreateBookings() {
      this.selectedBooking = {
        tenant: this.tenant,
        assignedUserId: null,
        timeBegin: Date.now(),
        timeEnd: Date.now(),
        bookableItems: [],
        couponCode: null,
        name: null,
        company: null,
        street: null,
        zipCode: null,
        location: null,
        email: null,
        phone: null,
        comment: null,
        priceEur: 0,
        isCommitted: false,
        isPayed: false,
        attachmentStatus: [],
      };
      this.selectedBooking.tenant = this.tenant.id;
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
  },
  created() {
    this.fetchBookings();
    this.fetchBookables();
  },
};
</script>

<style scoped lanf="scss">
.search-field {
  border-radius: 15px;
}
.active-button {
  color: black !important;
}
</style>

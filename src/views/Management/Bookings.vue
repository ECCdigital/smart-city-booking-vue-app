<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-skeleton-loader type="table" class="flex">
          <v-text-field
            v-model="search"
            label="Buchung suchen..."
            append-icon="mdi-magnify"
            solo
            clearable
            class="search-field"
          ></v-text-field>
          <v-data-table
            :headers="headers"
            :sort-by="['timeCreated']"
            :sort-desc="[true]"
            :search="search"
            :footer-props="{
              'items-per-page-all-text': 'Alle',
              'items-per-page-text': 'Buchungen pro Seite',
            }"
            :items="api.bookings"
            class="accent elevation-1"
            :loading="loading"
            loading-text="Daten werden geladen..."
            no-data-text="Keine Daten vorhanden"
            fixed-header
            :custom-filter="customSearch"
          >
            <template v-slot:item.bookableIds="{ item }">
              <v-chip
                class="ml-1 mt-1"
                color="secondary"
                text-color="black"
                v-for="(i, key) in item.bookableItems"
                :key="key"
              >{{ i._bookableUsed?.title }}</v-chip
              >
            </template>
            <template v-slot:item.timeBegin="{ item }">
              <span v-if="item.timeBegin">{{
                  Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.timeBegin))
                }}</span>
            </template>
            <template v-slot:item.timeEnd="{ item }">
              <span v-if="item.timeEnd">{{
                  Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.timeEnd))
                }}</span>
            </template>
            <template v-slot:item.timeCreated="{ item }">
              <span>{{
                  Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.timeCreated))
                }}</span>
            </template>
            <template v-slot:item.isCommitted="{ item }">
              <span>{{
                  item.isCommitted == true ? "freigegeben" : "ausstehend"
                }}</span>
            </template>
            <template v-slot:item.isPayed="{ item }">
              <span>{{ item.isPayed ? "bezahlt" : "ausstehend" }}</span>
            </template>
            <template v-slot:item.priceEur="{ item }">
              <span>{{
                  Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  }).format(item.priceEur)
                }}</span>
            </template>
            <template v-slot:item.payMethod="{ item }">
              <span>{{ translatePayMethod(item.payMethod) }}</span>
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
                      @click="onOpenEditBooking(item.id)"
                      :disabled="!BookingPermissionService.allowUpdate(item)"
                    >
                      <v-list-item-icon>
                        <v-icon>mdi-pencil</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Buchung bearbeiten</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      link
                      @click="commitBooking(item.id)"
                      :disabled="!BookingPermissionService.allowUpdate(item)"
                    >
                      <v-list-item-icon>
                        <v-icon>mdi-checkbox-marked-circle</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Buchung freigeben</v-list-item-title>
                    </v-list-item>
                     <v-list-item
                       link
                       @click="onOpenBooking(item.id)"
                       :disabled="!BookingPermissionService.allowUpdate(item)"
                     >
                      <v-list-item-icon>
                        <v-icon>mdi-information</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Buchungsdetails ansehen</v-list-item-title>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item
                      link
                      @click="onOpenDeleteDialog(item.id)"
                      class="red--text"
                      :disabled="!BookingPermissionService.allowDelete(item)"
                    >
                      <v-list-item-icon>
                        <v-icon color="red">mdi-delete</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Buchung löschen</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </span>
            </template>
          </v-data-table>
        </v-skeleton-loader>
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
      @close="onCloseDialog"
    />
    <BookingDeleteConformationDialog
      :to-delete="selectedBooking"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    />
    <v-dialog v-model="openBookingDialog" max-width="800px">
      <BookingDetails :booking="selectedBooking" @update="updateBooking">

      </BookingDetails>
    </v-dialog>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingEdit from "@/components/Booking/BookingEdit";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDetails from "@/components/Booking/BookingDetails.vue";

export default {
  components: {
    BookingDetails,
    BookingDeleteConformationDialog,
    AdminLayout,
    BookingEdit,
  },
  data() {
    return {
      search: "",
      api: {
        users: [],
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
    onCloseDialog() {
      this.fetchBookings();
      this.openEditDialog = false;
    },
    onCloseDeleteDialog() {
      this.fetchBookings();
      this.openDeleteDialog = false;
    },
    onOpenCreateBookings() {
      this.selectedBooking = {
        tenant: this.tenant,
        assignedUserId: null,
        timeBegin: 1681383600000,
        timeEnd: 1681387200000,
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
  },
  created() {
    this.fetchBookings();
    this.fetchBookables();
  },
};
</script>

<style scoped>
.search-field {
  border-radius: 15px;
}
</style>

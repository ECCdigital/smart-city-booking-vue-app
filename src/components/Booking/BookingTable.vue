<template>
  <div class="pa-4">
    <div
      v-if="loading && bookings.length === 0"
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

    <div v-else class="booking-table-wrapper">
      <transition name="fade">
        <div v-if="loading" class="table-overlay">
          <v-progress-circular
            indeterminate
            color="primary"
            size="40"
          ></v-progress-circular>
        </div>
      </transition>
      <v-data-table
        class="elevation-1 accent"
        :headers="headers"
        :items="bookings"
        :sort-by="['timeCreated']"
        :sort-desc="[true]"
        :footer-props="{
          'items-per-page-all-text': 'Alle',
          'items-per-page-text': 'Buchungen pro Seite',
        }"
        fixed-header
        dense
      >
        <template v-slot:item.id="{ item }">
          <div
            class="d-flex align-center cursor-pointer"
            @click="onOpenBooking(item)"
          >
            <span
              v-if="BookingPermissionService.allowUpdate(item)"
              class="font-weight-medium primary--text cursor-pointer"
            >
              {{ truncate(item.id, 12) }}
            </span>
            <span v-else class="font-weight-medium">
              {{ truncate(item.id, 12) }}
            </span>
          </div>
        </template>

        <template v-slot:item.name="{ item }">
          <div>
            <div class="font-weight-bold">{{ item.name }}</div>
            <div class="text-caption grey--text">
              {{ truncate(item.company, 20) }}
            </div>
          </div>
        </template>

        <template v-slot:item.timeCreated="{ item }">
          <div class="d-flex align-center">
            <div>
              <div>{{ formatDate(item.timeCreated) }}</div>
              <div class="text-caption grey--text">
                {{ formatTime(item.timeCreated) }}
              </div>
            </div>
          </div>
        </template>

        <template v-slot:item.bookableIds="{ item }">
          <div class="">
            <v-chip
              v-for="(bookable, key) in item.bookableItems.slice(0, 2)"
              :key="key"
              class="ma-1"
              small
              color="secondary"
              text-color="black"
              :title="bookable._bookableUsed?.title"
            >
              <v-icon left x-small>mdi-package-variant</v-icon>
              {{ truncate(bookable._bookableUsed?.title, 20) }}
            </v-chip>
            <v-chip
              v-if="item.bookableItems.length > 2"
              class="ma-1"
              small
              outlined
            >
              +{{ item.bookableItems.length - 2 }}
            </v-chip>
          </div>
        </template>

        <template v-slot:item.groupBooking="{ item }">
          <v-chip
            v-if="item.groupBooking"
            small
            color="primary"
            text-color="white"
            @click="onOpenGroupBooking(item.groupBooking)"
            class="cursor-pointer"
          >
            <v-icon left x-small>mdi-calendar-multiple</v-icon>
            {{ truncate(item.groupBooking, 10) }}
          </v-chip>
          <span v-else class="grey--text">—</span>
        </template>

        <template v-slot:item.timeBegin="{ item }">
          <div v-if="item.timeBegin" class="d-flex align-center">
            <div>
              <div>{{ formatDate(item.timeBegin) }}</div>
              <div class="text-caption grey--text">
                {{ formatTime(item.timeBegin) }}
              </div>
            </div>
          </div>
          <span v-else class="grey--text">—</span>
        </template>

        <template v-slot:item.timeEnd="{ item }">
          <div v-if="item.timeEnd" class="d-flex align-center">
            <div>
              <div>{{ formatDate(item.timeEnd) }}</div>
              <div class="text-caption grey--text">
                {{ formatTime(item.timeEnd) }}
              </div>
            </div>
          </div>
          <span v-else class="grey--text">—</span>
        </template>

        <template v-slot:item.priceEur="{ item }">
          <div class="font-weight-bold text-body-2">
            {{ formatCurrency(item.priceEur) }}
          </div>
        </template>

        <template v-slot:item.isCommitted="{ item }">
          <v-chip
            small
            :color="getStatusChipColor(item)"
            text-color="white"
            class="font-weight-medium"
          >
            <v-icon left x-small>{{ getStatusIcon(item) }}</v-icon>
            {{ getStatusText(item) }}
          </v-chip>
        </template>

        <template v-slot:item.isPayed="{ item }">
          <v-chip
            small
            :color="getPaymentColor(item)"
            :text-color="getPaymentTextColor(item)"
            class="font-weight-medium"
          >
            <v-icon left x-small>{{ getPaymentIcon(item) }}</v-icon>
            {{ payedStatus(item) }}
          </v-chip>
        </template>

        <template v-slot:item.paymentMethod="{ item }">
          <div v-if="item.paymentMethod" class="d-flex align-center">
            <v-icon small class="mr-1" color="grey">mdi-credit-card</v-icon>
            <span class="text-body-2">
              {{ translatePayMethod(item.paymentMethod) }}
            </span>
          </div>
          <span v-else class="grey--text">—</span>
        </template>

        <template v-slot:item.controls="{ item }">
          <v-menu offset-y left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon v-bind="attrs" v-on="on" small color="grey darken-1">
                <v-icon small>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item
                link
                @click="onOpenBooking(item.id)"
                :disabled="!BookingPermissionService.allowUpdate(item)"
              >
                <v-list-item-icon>
                  <v-icon small>mdi-information</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Details ansehen</v-list-item-title>
              </v-list-item>

              <v-divider />

              <v-list-item
                link
                @click="onOpenEditBooking(item.id)"
                :disabled="!BookingPermissionService.allowUpdate(item)"
              >
                <v-list-item-icon>
                  <v-icon small>mdi-pencil</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Bearbeiten</v-list-item-title>
              </v-list-item>

              <v-list-item
                link
                @click="commitBooking(item.id)"
                :disabled="
                  !BookingPermissionService.allowUpdate(item) ||
                  item.isCommitted
                "
              >
                <v-list-item-icon>
                  <v-icon small color="success"
                    >mdi-checkbox-marked-circle</v-icon
                  >
                </v-list-item-icon>
                <v-list-item-title>Freigeben</v-list-item-title>
              </v-list-item>

              <v-list-item
                link
                @click="payBooking(item.id)"
                :disabled="
                  !BookingPermissionService.allowUpdate(item) || item.isPayed
                "
              >
                <v-list-item-icon>
                  <v-icon small color="success">mdi-cash-check</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Als bezahlt markieren</v-list-item-title>
              </v-list-item>

              <v-list-item
                link
                @click="rejectBooking(item.id)"
                :disabled="!BookingPermissionService.allowUpdate(item)"
              >
                <v-list-item-icon>
                  <v-icon small color="orange">mdi-close-circle</v-icon>
                </v-list-item-icon>
                <v-list-item-title>
                  {{ item.isCommitted ? "Stornieren" : "Ablehnen" }}
                </v-list-item-title>
              </v-list-item>

              <v-divider />

              <v-list-item
                link
                @click="onOpenDeleteDialog(item.id)"
                :disabled="!BookingPermissionService.allowDelete(item)"
              >
                <v-list-item-icon>
                  <v-icon small color="red">mdi-delete</v-icon>
                </v-list-item-icon>
                <v-list-item-title>Löschen</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <template v-slot:no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey lighten-1">
              mdi-calendar-blank-outline
            </v-icon>
            <div class="text-h6 grey--text mt-4">Keine Buchungen gefunden</div>
            <div class="text-body-2 grey--text">
              Es sind noch keine Buchungen vorhanden
            </div>
          </div>
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script>
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

export default {
  name: "BookingTable",
  props: {
    bookings: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    showGroupBooking: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      defaultHeaders: [
        {
          text: "Buchung",
          align: "start",
          value: "id",
        },
        { text: "Name", value: "name" },
        { text: "Buchungsdatum", value: "timeCreated" },
        { text: "Buchungsobjekte", value: "bookableIds", sortable: false },
        { text: "Serie", value: "groupBooking" },
        { text: "Von", value: "timeBegin" },
        { text: "Bis", value: "timeEnd" },
        { text: "Preis", value: "priceEur" },
        { text: "Status", value: "isCommitted" },
        { text: "Zahlung", value: "isPayed" },
        { text: "Zahlungsart", value: "paymentMethod" },
        { text: "", value: "controls", sortable: false },
      ],
    };
  },
  computed: {
    BookingPermissionService() {
      return BookingPermissionService;
    },
    headers() {
      return this.showGroupBooking
        ? this.defaultHeaders
        : this.defaultHeaders.filter(
            (header) => header.value !== "groupBooking"
          );
    },
  },
  methods: {
    getStatusColor(item) {
      if (item.isRejected) return "red";
      if (item.isCommitted) return "green";
      return "orange";
    },
    formatDate(date) {
      return Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
      }).format(new Date(date));
    },
    formatTime(date) {
      return Intl.DateTimeFormat("de-DE", {
        timeStyle: "short",
      }).format(new Date(date));
    },
    getStatusIcon(item) {
      if (item.isRejected) return "mdi-cancel";
      if (item.isCommitted) return "mdi-check-circle";
      return "mdi-clock-outline";
    },
    getStatusChipColor(item) {
      if (item.isRejected) return "error";
      if (item.isCommitted) return "success";
      return "orange";
    },
    getStatusText(item) {
      if (item.isRejected && !item.isCommitted) return "Abgelehnt";
      if (item.isRejected && item.isCommitted) return "Storniert";
      if (item.isCommitted) return "Freigegeben";
      return "Ausstehend";
    },
    getPaymentColor(item) {
      if (item.priceEur <= 0) return "grey lighten-1";
      return item.isPayed ? "success" : "grey";
    },
    getPaymentTextColor(item) {
      return "white";
    },
    getPaymentIcon(item) {
      if (item.priceEur <= 0) return "mdi-gift";
      return item.isPayed ? "mdi-check-circle" : "mdi-clock-outline";
    },
    formatCurrency(amount) {
      return Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(amount || 0);
    },
    payedStatus(item) {
      if (item.isPayed && item.priceEur > 0) return "Bezahlt";
      if (!item.isPayed && item.priceEur > 0) return "Offen";
      if (item.priceEur <= 0) return "Kostenlos";
      return "N/A";
    },
    translatePayMethod(paymentMethod) {
      const methods = {
        CASH: "Bar",
        TRANSFER: "Überweisung",
        CREDIT_CARD: "Kreditkarte",
        DEBIT_CARD: "EC-Karte",
        PAYPAL: "PayPal",
        OTHER: "Sonstiges",
        GIROPAY: "Giropay",
        APPLE_PAY: "Apple Pay",
        GOOGLE_PAY: "Google Pay",
        EPS: "EPS",
        IDEAL: "iDEAL",
        MAESTRO: "Maestro",
        PAYDIRECT: "paydirekt",
        SOFORT: "SOFORT",
        BLUECODE: "Bluecode",
      };
      return methods[paymentMethod] || "Unbekannt";
    },
    truncate(text, max = 25) {
      if (!text) return "";
      return text.length > max ? text.slice(0, max - 1) + "…" : text;
    },
    onOpenBooking(bookingId) {
      if (typeof bookingId === "object" && bookingId.id) {
        bookingId = bookingId.id;
      }

      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    onOpenDeleteDialog(bookingId) {
      this.$emit("open-delete-dialog", bookingId);
    },
    onOpenGroupBooking(groupBookingId) {
      this.$emit("open-group-booking", groupBookingId);
    },
    commitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
    },
    rejectBooking(bookingId) {
      this.$emit("reject-booking", bookingId);
    },
    payBooking(bookingId) {
      this.$emit("pay-booking", bookingId);
    },
  },
};
</script>

<style scoped>

.booking-table-wrapper {
  position: relative;
  border-radius: 25px;
  overflow: hidden;
}

.table-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 25px;
}

.theme--dark .table-overlay {
  background: rgba(40, 40, 40, 0.7);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>

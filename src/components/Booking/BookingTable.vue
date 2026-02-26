<template>
  <div class="pa-4">
    <div v-if="loading" class="elevation-2" style="border-radius: 25px; overflow: hidden;">
      <v-skeleton-loader
        type="table-thead, table-tbody, table-tfoot"
        :types="{
          'table-tbody': 'table-row-divider@6',
        }"
      ></v-skeleton-loader>
    </div>

    <v-data-table
      v-else
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
      @click:row="onOpenBooking"
    >
      <template v-slot:item.id="{ item }">
        <div class="d-flex align-center">
          <v-avatar
            :color="getStatusColor(item)"
            size="32"
            class="mr-2 white--text"
          >
            <v-icon small dark>{{ getStatusIcon(item) }}</v-icon>
          </v-avatar>
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
        <div class="py-2">
          <div class="font-weight-bold">{{ item.name }}</div>
        </div>
      </template>

      <template v-slot:item.timeCreated="{ item }">
        <div class="d-flex align-center">
          <v-icon small class="mr-1" color="grey">mdi-calendar-plus</v-icon>
          <span class="text-body-2">
            {{
              Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(item.timeCreated))
            }}
          </span>
        </div>
      </template>

      <template v-slot:item.bookableIds="{ item }">
        <div class="py-2">
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
          <v-icon small class="mr-1" color="grey">mdi-calendar-start</v-icon>
          <span class="text-body-2">
            {{
              Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(item.timeBegin))
            }}
          </span>
        </div>
        <span v-else class="grey--text">—</span>
      </template>

      <template v-slot:item.timeEnd="{ item }">
        <div v-if="item.timeEnd" class="d-flex align-center">
          <v-icon small class="mr-1" color="grey">mdi-calendar-end</v-icon>
          <span class="text-body-2">
            {{
              Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(item.timeEnd))
            }}
          </span>
        </div>
        <span v-else class="grey--text">—</span>
      </template>

      <template v-slot:item.priceEur="{ item }">
        <div class="font-weight-bold text-body-2">
          <v-icon small class="mr-1">mdi-currency-eur</v-icon>
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
                !BookingPermissionService.allowUpdate(item) || item.isCommitted
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
          width: "180px",
        },
        { text: "Name", value: "name", width: "200px" },
        { text: "Buchungsdatum", value: "timeCreated", width: "180px" },
        { text: "Buchungsobjekte", value: "bookableIds", sortable: false },
        { text: "Serie", value: "groupBooking", width: "140px" },
        { text: "Von", value: "timeBegin", width: "180px" },
        { text: "Bis", value: "timeEnd", width: "180px" },
        { text: "Preis", value: "priceEur", width: "120px" },
        { text: "Status", value: "isCommitted", width: "140px" },
        { text: "Zahlung", value: "isPayed", width: "130px" },
        { text: "Zahlungsart", value: "paymentMethod", width: "140px" },
        { text: "", value: "controls", sortable: false, width: "80px" },
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
      if(typeof bookingId === "object" && bookingId.id) {
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

<style scoped></style>

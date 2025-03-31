<template>
  <v-data-table
    :headers="headers"
    :sort-by="['timeCreated']"
    :sort-desc="[true]"
    :footer-props="{
      'items-per-page-all-text': 'Alle',
      'items-per-page-text': 'Buchungen pro Seite',
    }"
    :items="bookings"
    class="accent elevation-1"
    :loading="loading"
    loading-text="Daten werden geladen..."
    no-data-text="Keine Daten vorhanden"
    fixed-header
  >
    <template v-slot:item.id="{ item }">
      <span v-if="BookingPermissionService.allowUpdate(item)"
        ><a @click="onOpenBooking(item.id)">{{ item.id }}</a></span
      >
      <span v-else>{{ item.id }}</span>
    </template>
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
      <v-chip
        small
        :color="item.isRejected ? 'error' : item.isCommitted ? 'success' : ''"
      >
        <v-icon left small>
          {{
            item.isRejected
              ? "mdi-cancel"
              : item.isCommitted == true
              ? "mdi-check"
              : "mdi-timer-sand-empty"
          }}
        </v-icon>
        {{
          item.isRejected && !item.isCommitted
            ? "abgelehnt"
            : item.isRejected && item.isCommitted
            ? "stoniert"
            : item.isCommitted == true
            ? "freigegeben"
            : "ausstehend"
        }}
      </v-chip>
    </template>
    <template v-slot:item.isPayed="{ item }">
      <v-chip small :color="item.isPayed ? 'success' : ''">
        <v-icon left small>
          {{ item.isPayed ? "mdi-check" : "mdi-timer-sand-empty" }}
        </v-icon>
        {{ item.isPayed ? "bezahlt" : "ausstehend" }}
      </v-chip>
    </template>
    <template v-slot:item.priceEur="{ item }">
      <span>{{
        Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(item.priceEur)
      }}</span>
    </template>
    <template v-slot:item.paymentMethod="{ item }">
      <span>{{ translatePayMethod(item.paymentMethod) }}</span>
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
            <v-divider></v-divider>
            <v-list-item
              link
              @click="rejectBooking(item.id)"
              :disabled="!BookingPermissionService.allowUpdate(item)"
            >
              <v-list-item-icon>
                <v-icon>mdi-close-circle</v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{
                item.isCommitted ? "Buchung stornieren" : "Buchung ablehnen"
              }}</v-list-item-title>
            </v-list-item>
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
</template>

<script>
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

export default {
  name: "BookingTable",
  computed: {
    BookingPermissionService() {
      return BookingPermissionService;
    },
  },
  props: {
    bookings: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
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
        { text: "Zahlungart", value: "paymentMethod" },
        { text: "", value: "controls", sortable: false },
      ],
    };
  },
  methods: {
    translatePayMethod(paymentMethod) {
      switch (paymentMethod) {
        case "CASH":
          return "Bar";
        case "TRANSFER":
          return "Überweisung";
        case "CREDIT_CARD":
          return "Kreditkarte";
        case "DEBIT_CARD":
          return "EC-Karte";
        case "PAYPAL":
          return "PayPal";
        case "OTHER":
          return "Sonstiges";
        case "GIROPAY":
          return "Giropay";
        case "APPLE_PAY":
          return "Apple Pay";
        case "GOOGLE_PAY":
          return "Google Pay";
        case "EPS":
          return "EPS";
        case "IDEAL":
          return "iDEAL";
        case "MAESTRO":
          return "Maestro";
        case "PAYDIRECT":
          return "paydirekt";
        case "SOFORT":
          return "SOFORT-Überweisung";
        case "BLUECODE":
          return "Bluecode";
        default:
          return "Unbekannt";
      }
    },
    onOpenBooking(bookingId) {
      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    onOpenDeleteDialog(bookingId) {
      this.$emit("open-delete-dialog", bookingId);
    },
    commitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
    },
    rejectBooking(bookingId) {
      this.$emit("reject-booking", bookingId);
    },
  },
};
</script>

<style scoped></style>

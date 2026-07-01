<template>
  <div class="checkout-status-page">
    <v-container class="py-10" style="max-width: 800px">
      <!-- Loading State -->
      <v-card v-if="isLoading" class="pa-10 text-center" flat >
        <v-progress-circular
          indeterminate
          color="primary"
          size="75"
          width="5"
        ></v-progress-circular>
        <h1 class="text-h4 mt-6">Bitte warten...</h1>
        <p class="text-body-1 grey--text text--darken-1 mt-4">
          Wir prüfen den Status Ihrer Buchung. Dies kann einige Sekunden in
          Anspruch nehmen.
        </p>
      </v-card>

      <!-- Result States -->
      <div v-else>
        <!-- Single Booking Status -->
        <v-card
          v-if="status !== 'multiple'"
          class="pa-10 text-center"
          flat
        >
          <!-- Success -->
          <div v-if="status === 'success'">
            <v-avatar size="90" color="primary" class="mb-6">
              <v-icon size="50" color="white">mdi-check</v-icon>
            </v-avatar>
            <h1 class="text-h4">Vielen Dank für Ihre Buchung</h1>
            <p class="text-body-1 grey--text text--darken-1 mt-4">
              Ihre Buchung wurde erfolgreich abgeschlossen.
            </p>
          </div>

          <!-- Await Approval -->
          <div v-if="status === 'await-approval'">
            <v-avatar size="90" color="primary" class="mb-6">
              <v-icon size="50" color="white">mdi-timer-sand-empty</v-icon>
            </v-avatar>
            <h1 class="text-h4">Vielen Dank für Ihre Anfrage</h1>
            <p
              class="text-body-1 grey--text text--darken-1 mt-4 mx-auto"
              style="max-width: 550px"
            >
              Ihre Buchungsanfrage ist bei uns eingegangen und wird derzeit zur
              Freigabe geprüft. Unsere Koordinator*innen melden sich so schnell
              wie möglich bei Ihnen. Sobald Ihre Anfrage freigegeben wurde,
              erhalten Sie eine Benachrichtigung.
            </p>
          </div>

          <!-- Await Payment -->
          <div v-if="status === 'await-payment'">
            <v-avatar size="90" color="primary" class="mb-6">
              <v-icon size="50" color="white">mdi-timer-sand-empty</v-icon>
            </v-avatar>
            <h1 class="text-h4">Vielen Dank für Ihre Buchung</h1>
            <p
              class="text-body-1 grey--text text--darken-1 mt-4 mx-auto"
              style="max-width: 550px"
            >
              Ihre Buchung wurde von uns entgegengenommen und freigegeben.
              Weitere Informationen erhalten Sie in Kürze per E-Mail.
            </p>
          </div>

          <!-- No Payment -->
          <div v-if="status === 'no-payment'">
            <v-avatar size="90" color="warning" class="mb-6">
              <v-icon size="50" color="white">mdi-timer-sand-empty</v-icon>
            </v-avatar>
            <h1 class="text-h4 warning--text">
              Die Zahlung konnte nicht abgeschlossen werden
            </h1>
            <p
              class="text-body-1 grey--text text--darken-1 mt-4 mx-auto"
              style="max-width: 550px"
            >
              Leider konnte die Buchung nicht korrekt abgeschlossen werden.
              Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut oder
              wenden Sie sich an unsere Koordinator*innen.
            </p>
          </div>

          <!-- Rejected -->
          <div v-if="status === 'rejected'">
            <v-avatar size="90" color="warning" class="mb-6">
              <v-icon size="50" color="white">mdi-alert</v-icon>
            </v-avatar>
            <h1 class="text-h4 warning--text">
              Ihre Buchung wurde abgelehnt
            </h1>
            <p class="text-body-1 grey--text text--darken-1 mt-4">
              Ihre Buchungsanfrage konnte leider nicht bestätigt werden. Bitte
              wenden Sie sich an unsere Koordinator*innen für weitere Info.
            </p>
          </div>

          <!-- Cancelled -->
          <div v-if="status === 'cancelled'">
            <v-avatar size="90" color="warning" class="mb-6">
              <v-icon size="50" color="white">mdi-alert</v-icon>
            </v-avatar>
            <h1 class="text-h4 warning--text">
              Ihre Buchung wurde storniert
            </h1>
            <p class="text-body-1 grey--text text--darken-1 mt-4">
              Ihre Buchungsanfrage wurde storniert. Bitte wenden Sie sich an
              unsere Koordinator*innen für weitere Info.
            </p>
          </div>

          <!-- Not Found / Error -->
          <div v-if="status === 'not-found'">
            <v-avatar size="90" color="error" class="mb-6">
              <v-icon size="50" color="white">mdi-alert</v-icon>
            </v-avatar>
            <h1 class="text-h4">Es ist ein Fehler aufgetreten.</h1>
            <p class="text-body-1 grey--text text--darken-1 mt-4">
              Bitte versuchen Sie es später erneut. Wenn es dennoch nicht geht
              wenden Sie sich an unsere Koordinator*innen.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex justify-center flex-wrap mt-8" style="gap: 12px">
            <v-btn
              v-if="!!websiteLink"
              elevation="0"
              outlined
              color="primary"
              :href="normalizeUrl(websiteLink)"
            >
              <v-icon left small>mdi-arrow-left</v-icon>
              Zurück zur Website
            </v-btn>
            <v-btn
              v-if="bookingsLink"
              elevation="0"
              color="primary"
              :href="bookingsLink"
            >
              <v-icon left small>mdi-book-outline</v-icon>
              Meine Buchungen
            </v-btn>
          </div>
        </v-card>

        <!-- Multiple Bookings Overview -->
        <v-card v-else class="pa-8" elevation="2" rounded="lg">
          <h1 class="text-h4 text-center mb-6">Übersicht Ihrer Buchungen</h1>
          <v-data-table
            :headers="headers"
            :items="bookingStatuses"
            disable-pagination
            hide-default-footer
            class="elevation-0"
          >
            <template v-slot:item.bookingId="{ item }">
              <strong>{{ item.bookingId }}</strong>
            </template>

            <template v-slot:item.timeRange="{ item }">
              <span v-if="item.timeBegin && item.timeEnd">
                {{ formatDate(item.timeBegin) }} -
                {{ formatDate(item.timeEnd) }}
              </span>
              <span v-else>-</span>
            </template>

            <template v-slot:item.price="{ item }">
              <span>
                {{
                  item.priceEur != null ? item.priceEur.toFixed(2) + " €" : "-"
                }}
              </span>
            </template>

            <template v-slot:item.status="{ item }">
              <v-chip
                :color="chipColor(item)"
                small
                label
                :text-color="chipTextColor(item)"
              >
                <v-icon left small>{{ iconName(item) }}</v-icon>
                {{ statusText(item) }}
              </v-chip>
            </template>
          </v-data-table>

          <!-- Action Buttons -->
          <div
            class="d-flex justify-center flex-wrap mt-8"
            style="gap: 12px"
          >
            <v-btn
              v-if="!!websiteLink"
              elevation="0"
              outlined
              color="primary"
              :href="normalizeUrl(websiteLink)"
            >
              <v-icon left small>mdi-arrow-left</v-icon>
              Zurück zur Website
            </v-btn>
            <v-btn
              v-if="bookingsLink"
              elevation="0"
              color="primary"
              :href="bookingsLink"
            >
              <v-icon left small>mdi-book-outline</v-icon>
              Meine Buchungen
            </v-btn>
          </div>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import {
  isCheckoutStatusComplete,
  isFreeBooking,
} from "@/utils/bookingPaymentStatus";

export default {
  name: "CheckoutSuccess",

  data() {
    return {
      bookingStatuses: [],
      tenant: undefined,
      status: undefined,
      websiteLink: undefined,
      publicInstance: undefined,
      paymentProvider: undefined,
      headers: [
        { text: "Buchungs-ID", value: "bookingId", sortable: false },
        { text: "Zeitraum", value: "timeRange", sortable: false },
        { text: "Preis", value: "price", sortable: false },
        { text: "Status", value: "status", sortable: false },
      ],
      pollIntervalId: null,
      pollTimeoutId: null,
      pollIntervalMs: 15 * 1000,
      pollTimeoutMs: 2 * 60 * 1000,
      isLoading: false,
    };
  },

  computed: {
    bookingsLink() {
      const portalUrl =
        this.publicInstance?.portalUrl || this.publicInstance?.catalogUrl;
      if (!portalUrl) return null;
      const base = this.normalizeUrl(portalUrl).replace(/\/+$/, "");
      return base + "/account/bookings";
    },
  },

  async mounted() {
    const { id, ids, tenant, status, paymentProvider } = this.$route.query;
    this.paymentProvider = paymentProvider;
    this.tenant = tenant;

    let allIds = [];
    if (ids) {
      allIds = ids
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
    }
    if (id) allIds.push(id);

    try {
      await this.fetchPublicInstanceData();
      const r = await ApiTenantService.getTenant(this.tenant);
      this.websiteLink = r?.data?.website;
    } catch (e) {
      console.error("Error fetching tenant:", e);
    }

    if (allIds.length && this.tenant) {
      await this.fetchBookingStatus(this.tenant, allIds);
    }
  },

  beforeDestroy() {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    if (this.pollTimeoutId) clearTimeout(this.pollTimeoutId);
  },

  methods: {
    normalizeUrl(url) {
      if (!url) return "";
      const trimmed = url.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return "https://" + trimmed;
    },

    formatDate(timestamp) {
      if (!timestamp) return "-";
      return new Date(timestamp).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    async fetchPublicInstanceData() {
      try {
        const res = await ApiInstanceService.getPublicInstance();
        this.publicInstance = res;
      } catch (err) {
        this.status = "error";
        this.isLoading = false;
      }
    },

    async fetchBookingStatus(tenantId, bookingIds) {
      try {
        const res = await ApiBookingService.getBookingStatus(
          bookingIds,
          tenantId
        );
        this.bookingStatuses = Array.isArray(res.data) ? res.data : [res.data];

        const pending = this.bookingStatuses
          .filter(
            (b) =>
              (b.isCommitted && !b.isPayed && !isFreeBooking(b)) || b.isRejected
          )
          .map((b) => b.bookingId);

        if (pending.length === 0) {
          this.finalizeStatus();
          return;
        }

        this.isLoading = true;
        this.startPolling();
      } catch (err) {
        this.status = "error";
        this.isLoading = false;
      }
    },

    finalizeStatus() {
      this.isLoading = false;
      if (this.bookingStatuses.length === 1) {
        this.applySingleStatus(this.bookingStatuses[0]);
      } else {
        this.status = "multiple";
      }
    },

    applySingleStatus(obj) {
      const { isCommitted, isPayed, isRejected } = obj;
      if (isRejected && !isCommitted) {
        this.status = "rejected";
        return;
      }

      if (isRejected && isCommitted) {
        this.status = "cancelled";
        return;
      }
      if (isCheckoutStatusComplete(obj)) {
        this.status = "success";
      } else if (!isCommitted) {
        this.status = "await-approval";
      } else if (isCommitted && !isPayed) {
        this.status =
          this.paymentProvider === "invoice" ? "await-payment" : "no-payment";
      }
    },

    statusText(booking) {
      if (booking.isRejected && !booking.isCommitted) {
        return "Abgelehnt";
      }
      if (booking.isRejected && booking.isCommitted) {
        return "Storniert";
      }
      if (booking.isCommitted && isFreeBooking(booking)) {
        return "Abgeschlossen (kostenfrei)";
      }
      if (booking.isCommitted && booking.isPayed) {
        return "Abgeschlossen";
      }
      if (!booking.isCommitted) {
        return "In Prüfung";
      }
      if (booking.isCommitted && !booking.isPayed) {
        return "Zahlung ausstehend";
      }
      return "Unbekannt";
    },

    isCompletedStatusText(text) {
      return text === "Abgeschlossen" || text === "Abgeschlossen (kostenfrei)";
    },

    iconName(booking) {
      const txt = this.statusText(booking);
      if (txt === "Storniert") return "mdi-cancel";
      if (txt === "Abgelehnt") return "mdi-alert";
      if (txt === "Abgeschlossen (kostenfrei)") return "mdi-gift";
      if (this.isCompletedStatusText(txt)) return "mdi-check";
      if (txt === "In Prüfung") return "mdi-timer-sand-empty";
      if (txt === "Zahlung ausstehend") return "mdi-clock-outline";
      if (txt === "Zahlung fehlgeschlagen") return "mdi-alert";
      return "mdi-help";
    },

    iconColor(booking) {
      const txt = this.statusText(booking);
      if (
        txt === "Abgelehnt" ||
        txt === "Zahlung fehlgeschlagen" ||
        txt === "Storniert"
      )
        return "warning";
      if (this.isCompletedStatusText(txt)) return "success";
      if (txt === "In Prüfung" || txt === "Zahlung ausstehend") return "info";
      return "";
    },

    chipColor(booking) {
      const txt = this.statusText(booking);
      if (
        txt === "Abgelehnt" ||
        txt === "Zahlung fehlgeschlagen" ||
        txt === "Storniert"
      )
        return "orange lighten-4";
      if (this.isCompletedStatusText(txt)) return "green lighten-4";
      if (txt === "In Prüfung" || txt === "Zahlung ausstehend")
        return "blue lighten-4";
      return "grey lighten-3";
    },

    chipTextColor(booking) {
      const txt = this.statusText(booking);
      if (
        txt === "Abgelehnt" ||
        txt === "Zahlung fehlgeschlagen" ||
        txt === "Storniert"
      )
        return "orange darken-4";
      if (this.isCompletedStatusText(txt)) return "green darken-4";
      if (txt === "In Prüfung" || txt === "Zahlung ausstehend")
        return "blue darken-4";
      return "grey darken-3";
    },

    startPolling() {
      this.pollIntervalId = setInterval(this.doPoll, this.pollIntervalMs);
      this.pollTimeoutId = setTimeout(() => {
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
        this.finalizeStatus();
      }, this.pollTimeoutMs);
    },

    async doPoll() {
      const pending = this.bookingStatuses
        .filter((b) => !isCheckoutStatusComplete(b) && !b.isRejected)
        .map((b) => b.bookingId);

      if (pending.length === 0 || this.paymentProvider === "invoice") {
        clearInterval(this.pollIntervalId);
        clearTimeout(this.pollTimeoutId);
        this.pollIntervalId = null;
        this.pollTimeoutId = null;
        this.finalizeStatus();
        return;
      }

      try {
        const res = await ApiBookingService.getBookingStatus(
          pending,
          this.tenant
        );
        const updates = Array.isArray(res.data) ? res.data : [res.data];

        updates.forEach((u) => {
          const idx = this.bookingStatuses.findIndex(
            (b) => b.bookingId === u.bookingId
          );
          if (idx !== -1) {
            this.$set(this.bookingStatuses, idx, {
              ...this.bookingStatuses[idx],
              ...u,
            });
          }
        });
      } catch (e) {
        console.error("Polling-Error:", e);
      }
    },
  },
};
</script>

<style scoped>
.checkout-status-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

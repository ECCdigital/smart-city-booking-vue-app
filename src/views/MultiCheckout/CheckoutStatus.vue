<template>
  <div>
    <v-container class="text-center mt-15">
      <div v-if="isLoading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="75"
          width="5"
        ></v-progress-circular>
        <h1 class="mt-5">Bitte warten...</h1>
        <p class="lead mt-5">
          Wir prüfen den Status Ihrer Buchung. Dies kann einige Sekunden in
          Anspruch nehmen.
        </p>
      </div>

      <div v-else>
        <div v-if="status !== 'multiple'">
          <div v-if="status === 'success'">
            <v-icon size="75" class="mb-5" color="primary">mdi-check</v-icon>
            <h1>Vielen Dank für Ihre Buchung</h1>
            <p class="lead mt-5">
              Ihre Buchung wurde von uns entgegengenommen und freigegeben.
            </p>
          </div>

          <div v-if="status === 'await-approval'">
            <v-icon size="75" class="mb-5" color="primary"
              >mdi-timer-sand-empty</v-icon
            >
            <h1>Vielen Dank für Ihre Anfrage</h1>
            <p class="lead mt-5">
              Ihre Buchungsanfrage ist bei uns eingegangen. Unsere
              Koordinator*innen prüfen ihre Anfrage und kommen so schnell wie
              möglich auf Sie zu.
            </p>
          </div>

          <div v-if="status === 'await-payment'">
            <v-icon size="75" class="mb-5" color="primary"
              >mdi-timer-sand-empty</v-icon
            >
            <h1>Vielen Dank für Ihre Buchung</h1>
            <p class="lead mt-5">
              Ihre Buchung wurde von uns entgegengenommen und freigegeben. Bitte
              überweisen Sie den fälligen Betrag zeitnah, damit die Buchung
              endgültig abgeschlossen werden kann.
            </p>
          </div>

          <div v-if="status === 'no-payment'">
            <v-icon size="75" class="mb-5" color="warning"
              >mdi-timer-sand-empty</v-icon
            >
            <h1 class="warning--text">
              Die Zahlung konnte nicht abgeschlossen werden
            </h1>
            <p class="lead mt-5">
              Leider konnte die Buchung nicht korrekt abgeschlossen werden.
              Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut oder
              wenden Sie sich an unsere Koordinator*innen.
            </p>
          </div>

          <div v-if="status === 'rejected'">
            <v-icon size="75" class="mb-5" color="warning">mdi-alert</v-icon>
            <h1 class="warning--text">Ihre Buchung wurde abgelehnt</h1>
            <p class="lead mt-5">
              Ihre Buchungsanfrage konnte leider nicht bestätigt werden. Bitte
              wenden Sie sich an unsere Koordinator*innen für weitere Info.
            </p>
          </div>

          <div v-if="status === 'cancelled'">
            <v-icon size="75" class="mb-5" color="warning">mdi-alert</v-icon>
            <h1 class="warning--text">Ihre Buchung wurde storniert</h1>
            <p class="lead mt-5">
              Ihre Buchungsanfrage wurde storniert. Bitte wenden Sie sich an
              unsere Koordinator*innen für weitere Info.
            </p>
          </div>

          <div v-if="status === 'not-found'">
            <v-icon size="75" class="mb-5" color="error">mdi-alert</v-icon>
            <h1>Es ist ein Fehler aufgetreten.</h1>
            <p class="lead mt-5">
              Bitte versuchen Sie es später erneut. Wenn es dennoch nicht geht
              wenden Sie sich an unsere Koordinator*innen.
            </p>
          </div>

          <v-btn
            v-if="!!websiteLink"
            elevation="0"
            outlined
            color="primary mt-15"
            :href="'https://'+websiteLink"
          >
            Zurück zur Website
          </v-btn>
        </div>

        <div v-else>
          <h1>Übersicht Ihrer Buchungen</h1>
          <v-data-table
            :headers="headers"
            :items="bookingStatuses"
            disable-pagination
            hide-default-footer
            class="elevation-1 mt-5"
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
              <v-icon :color="iconColor(item)" size="24" class="mr-2">
                {{ iconName(item) }}
              </v-icon>
              {{ statusText(item) }}
            </template>
          </v-data-table>
          <v-btn
            v-if="!!websiteLink"
            elevation="0"
            outlined
            class="mt-5"
            :href="'https://'+websiteLink"
          >
            Zurück zur Website
          </v-btn>
        </div>
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "CheckoutSuccess",

  data() {
    return {
      bookingStatuses: [],
      tenant: undefined,
      status: undefined,
      websiteLink: undefined,
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

    async fetchBookingStatus(tenantId, bookingIds) {
      try {
        const res = await ApiBookingService.getBookingStatus(
          bookingIds,
          tenantId
        );
        this.bookingStatuses = Array.isArray(res.data) ? res.data : [res.data];

        const pending = this.bookingStatuses
          .filter((b) => ((b.isCommitted && !b.isPayed) || b.isRejected))
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
      if (isCommitted && isPayed) {
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

    iconName(booking) {
      const txt = this.statusText(booking);
      if (txt === "Storniert") return "mdi-cancel";
      if (txt === "Abgelehnt") return "mdi-alert";
      if (txt === "Abgeschlossen") return "mdi-check";
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
      if (txt === "Abgeschlossen") return "success";
      if (txt === "In Prüfung" || txt === "Zahlung ausstehend") return "info";
      return "";
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
        .filter((b) => !((b.isCommitted && b.isPayed) || b.isRejected))
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

<style scoped></style>

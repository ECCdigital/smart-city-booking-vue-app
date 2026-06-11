<script>
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { mapActions } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import ProcessingService from "@/services/ProcessingService";
import ToastService from "@/services/ToastService";

export default {
  name: "BookingExportButton",
  props: {
    bookings: {
      type: Array,
      required: true,
    },
    tenant: {
      type: String,
      required: true,
    },
  },
  computed: {
    exportableIcalBookings() {
      return this.bookings.filter(
        (booking) =>
          (booking.timeBegin && booking.timeEnd) ||
          booking.bookableItems?.some((item) => item._bookableUsed?.eventId)
      );
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    async exportBookings() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Buchungen");

      worksheet.columns = [
        { header: "ID der Buchung", key: "ID", width: 15 },

        { header: "Zugewiesener Benutzer", key: "AssignedUser", width: 30 },
        { header: "Name", key: "Name", width: 25 },
        { header: "E-Mail", key: "Email", width: 30 },
        { header: "Telefon", key: "Telefon", width: 15 },
        { header: "Firma", key: "Firma", width: 30 },
        { header: "Straße", key: "Straße", width: 25 },
        { header: "PLZ", key: "PLZ", width: 8 },
        { header: "Ort", key: "Ort", width: 20 },

        { header: "Gebuchtes Objekt", key: "BookableTitle", width: 25 },
        { header: "Typ", key: "BookableType", width: 15 },
        { header: "Beschreibung", key: "BookableDescription", width: 30 },

        { header: "Startzeit", key: "Startzeit", width: 20 },
        { header: "Endzeit", key: "Endzeit", width: 20 },
        { header: "Bestätigt", key: "Bestätigt", width: 12 },

        { header: "Endpreis (brutto in EUR)", key: "Preis", width: 20 },
        { header: "End-MwSt (EUR)", key: "MwSt", width: 15 },
        { header: "Grundpreis (brutto in EUR)", key: "regularPreis", width: 15 },
        { header: "Grund-MwSt (EUR)", key: "regularMwSt", width: 15 },

        { header: "Bezahlt", key: "Bezahlt", width: 12 },
        { header: "Payment Provider", key: "PaymentProvider", width: 15 },
        { header: "Payment Method", key: "PaymentMethod", width: 15 },

        { header: "Abgelehnt", key: "Abgelehnt", width: 12 },
        { header: "Ablehnungsgrund", key: "AblehnungsGrund", width: 25 },

        { header: "Erstellt am", key: "Erstellt", width: 20 },
        { header: "Kommentar", key: "Kommentar", width: 30 },
        { header: "Interne Kommentare", key: "InterneKommentare", width: 30 },
        { header: "Coupon Code", key: "CouponCode", width: 15 },
      ];

      worksheet.getColumn("Preis").numFmt = "#,##0.00 €";
      worksheet.getColumn("MwSt").numFmt = "#,##0.00 €";
      worksheet.getColumn("regularPreis").numFmt = "#,##0.00 €";
      worksheet.getColumn("regularMwSt").numFmt = "#,##0.00 €";

      worksheet.getColumn("Startzeit").numFmt = "dd.mm.yy hh:mm";
      worksheet.getColumn("Endzeit").numFmt = "dd.mm.yy hh:mm";
      worksheet.getColumn("Erstellt").numFmt = "dd.mm.yy hh:mm";

      worksheet.getRow(1).font = { bold: true };

      const sortedBookings = [...this.bookings].sort(
        (a, b) => b.timeCreated - a.timeCreated
      );

      sortedBookings.forEach((booking) => {
        const firstBookable = booking.bookableItems?.[0]?._bookableUsed || {};

        worksheet.addRow({
          ID: booking.id || "",

          AssignedUser: booking.assignedUserId || "",
          Name: booking.name || "",
          Email: booking.mail || "",
          Telefon: booking.phone || "",
          Firma: booking.company || "",
          Straße: booking.street || "",
          PLZ: booking.zipCode || "",
          Ort: booking.location || "",

          BookableTitle: firstBookable.title || "",
          BookableType: this.getBookableType(firstBookable.type) || "",
          BookableDescription:
            this.getDescription(firstBookable.description) || "",

          Startzeit: booking.timeBegin ? new Date(booking.timeBegin) : "",
          Endzeit: booking.timeEnd ? new Date(booking.timeEnd) : "",
          Bestätigt: booking.isCommitted ? "Ja" : "Nein",

          Preis: booking.priceEur || 0,
          MwSt: booking.vatIncludedEur || 0,
          regularPreis: this.getRegularGrossPriceSum(booking) || 0,
          regularMwSt: this.getRegularVatIncludedSum(booking) || 0,

          Bezahlt: booking.isPayed ? "Ja" : "Nein",
          PaymentProvider: booking.PaymentProvider || "",
          PaymentMethod: this.getPaymentMethod(booking.paymentMethod) || "",

          Abgelehnt: booking.isRejected ? "Ja" : "Nein",
          AblehnungsGrund: booking.rejectionReason || "-",

          Erstellt: booking.timeCreated ? new Date(booking.timeCreated) : "",
          Kommentar: booking.comment || "-",
          InterneKommentare: booking.internalComments || "-",
          CouponCode: booking.couponCode || "-",
        });
      });

      worksheet.autoFilter = {
        from: "A1",
        to: "AA1",
      };

      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `buchungen-${this.tenant}-${this.formatDate(Date.now()).split(",")[0]}.xlsx`
      );
    },
    async exportIcal() {
      const ids = this.exportableIcalBookings.map((booking) => booking.id);
      if (!ids.length) return;

      const operationId = ProcessingService.showSnackbar(
        "Termine werden heruntergeladen..."
      );

      try {
        const response = await ApiBookingService.downloadGroupBookingIcal(
          ids,
          this.tenant
        );

        const blob = new Blob([response.data], {
          type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `buchungen-${this.tenant}-${this.formatDate(Date.now()).split(",")[0]}.ics`
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
    formatDate(timestamp) {
      if (!timestamp) return "";

      return new Date(timestamp).toLocaleString("de-DE");
    },
    getBookableType(type) {
      switch (type) {
      case "room":
        return "Raum";
      case "event-location":
        return "Veranstaltungsort";
      case "resource":
        return "Gerät";
      case "event":
        return "Veranstaltung";
      case "ticket":
        return "Ticket";
      default:
        return "";
      }
    },
    getDescription(description) {
      if (!description) return "";
      return description.replace(/<[^>]*>/g, "");
    },
    getRegularGrossPriceSum(booking){
      let regularGrossPrice = 0;
      if (booking.bookableItems && booking.bookableItems.length > 0) {
        booking.bookableItems.forEach((item) => {
          if (item.regularGrossPriceEur) {
            regularGrossPrice += item.regularGrossPriceEur;
          }
        });
      }
      return regularGrossPrice;
    },
    getRegularVatIncludedSum(booking){
      let regularVatIncluded = 0;
      if (booking.bookableItems && booking.bookableItems.length > 0) {
        booking.bookableItems.forEach((item) => {
          if (item.regularGrossPriceEur && item.regularPriceEur) {
            regularVatIncluded += (item.regularGrossPriceEur - item.regularPriceEur);
          }
        });
      }
      return regularVatIncluded;
    },
    getPaymentMethod(method) {
      switch (method) {
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
      }
      return method || "";
    },
  },
};
</script>

<template>
  <v-menu offset-y left>
    <template v-slot:activator="{ on, attrs }">
      <v-tooltip bottom>
        <template v-slot:activator="{ on: tooltipOn, attrs: tooltipAttrs }">
          <v-btn
            icon
            small
            class="ml-2"
            v-bind="{ ...attrs, ...tooltipAttrs }"
            v-on="{ ...on, ...tooltipOn }"
            :disabled="bookings.length === 0"
          >
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <span>Exportieren</span>
      </v-tooltip>
    </template>
    <v-list dense>
      <v-list-item :disabled="bookings.length === 0" @click="exportBookings">
        <v-list-item-icon>
          <v-icon small>mdi-microsoft-excel</v-icon>
        </v-list-item-icon>
        <v-list-item-title>Als Excel exportieren</v-list-item-title>
      </v-list-item>
      <v-list-item
        :disabled="exportableIcalBookings.length === 0"
        @click="exportIcal"
      >
        <v-list-item-icon>
          <v-icon small>mdi-calendar-export</v-icon>
        </v-list-item-icon>
        <v-list-item-title>Als iCal exportieren</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

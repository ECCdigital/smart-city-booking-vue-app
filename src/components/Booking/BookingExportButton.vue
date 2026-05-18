<script>
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
  methods: {
    async exportBookings() {
      console.log("Exporting bookings:", this.bookings);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Buchungen");

      // Spalten definieren
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

        { header: "Preis (EUR)", key: "Preis", width: 15 },
        { header: "MwSt (EUR)", key: "MwSt", width: 15 },

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

      // Währung formatieren
      worksheet.getColumn("Preis").numFmt = "#,##0.00 €";
      worksheet.getColumn("MwSt").numFmt = "#,##0.00 €";

      //Datum formatieren
      worksheet.getColumn("Startzeit").numFmt = "dd.mm.yy hh:mm";
      worksheet.getColumn("Endzeit").numFmt = "dd.mm.yy hh:mm";
      worksheet.getColumn("Erstellt").numFmt = "dd.mm.yy hh:mm";

      // Header stylen
      worksheet.getRow(1).font = { bold: true };

      //Sortieren nach neustem Erstellungsdatum
      const sortedBookings = [...this.bookings].sort((a, b) => b.timeCreated - a.timeCreated);

      // Daten hinzufügen
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

      // AutoFilter aktivieren
      worksheet.autoFilter = {
        from: "A1",
        to: "AA1",
      };

      // Datei erzeugen
      const buffer = await workbook.xlsx.writeBuffer();

      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `buchungen-${this.tenant}-${this.formatDate(Date.now()).split(",")[0]}.xlsx`
      );
    },
    formatDate(timestamp) {
      if (!timestamp) return "";

      return new Date(timestamp).toLocaleString("de-DE");
    },
    getBookableType(type) {
      //toDo - read dynamically from categories
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
  <v-btn color="primary" large rounded @click="exportBookings">
    <v-icon>mdi-download</v-icon>Buchungen exportieren
  </v-btn>
</template>

<style scoped></style>

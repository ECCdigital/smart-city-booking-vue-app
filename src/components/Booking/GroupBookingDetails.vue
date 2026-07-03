<template>
  <div>
    <v-card class="booking-details" elevation="0">
      <div class="px-6 py-5 d-flex align-center">
        <v-icon large class="mr-3">mdi-book-multiple</v-icon>
        <span class="text-h5 font-weight-bold">Serienbuchung</span>
        <v-spacer />
        <v-chip outlined label>
          <v-icon left small>mdi-pound</v-icon>
          {{ groupBooking.id }}
        </v-chip>
      </div>

      <v-divider />

      <v-card-text class="px-6 py-6 booking-details-content">
        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-information-outline</v-icon>
              <span class="text-h6 font-weight-bold">
                Buchungsinformationen
              </span>
            </div>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  small
                  fab
                  elevation="0"
                  color="primary"
                  v-bind="attrs"
                  v-on="on"
                  @click="onDownloadIcal"
                >
                  <v-icon>mdi-calendar-export</v-icon>
                </v-btn>
              </template>
              Termine für alle Buchungen herunterladen
            </v-tooltip>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-calendar-clock</v-icon>
                    Buchungsdatum
                  </div>
                  <div class="info-value">{{ formattedDate }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-currency-eur</v-icon>
                    Gesamtpreis
                  </div>
                  <div class="info-value price-highlight">
                    {{ formattedPrice }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-counter</v-icon>
                    Einzelbuchungen
                  </div>
                  <div class="info-value">
                    {{
                      groupBooking.bookings ? groupBooking.bookings.length : 0
                    }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
              <span class="text-h6 font-weight-bold">Interne Bemerkung</span>
            </div>
            <v-btn v-if="!editingComment" small icon @click="editingComment">
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div v-if="!editingComment">
              <div
                v-if="groupBooking.internalComments"
                class="comment-box internal"
              >
                {{ groupBooking.internalComments }}
              </div>
              <div v-else class="text-center grey--text py-2">
                <v-icon color="grey lighten-1" class="mb-1">
                  mdi-comment-outline
                </v-icon>
                <div class="text-body-2 font-italic">
                  Kein Kommentar vorhanden
                </div>
              </div>
            </div>
            <div v-else>
              <v-textarea
                v-model="editedComment"
                outlined
                dense
                rows="3"
                auto-grow
                placeholder="Kommentar eingeben..."
                hide-details="auto"
              />
              <div class="d-flex justify-end mt-3 gap-2">
                <v-btn
                  small
                  text
                  :disabled="savingComment"
                  @click="cancelEditingComment"
                >
                  Abbrechen
                </v-btn>
                <v-btn
                  small
                  color="primary"
                  :loading="savingComment"
                  @click="saveComment"
                >
                  <v-icon left small>mdi-content-save</v-icon>
                  Speichern
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          v-if="usesInvoicePayment"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-invoice-outline</v-icon>
              <span class="text-h6 font-weight-bold">Rechnungen</span>
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <v-alert
              :type="invoices.length === 0 ? 'warning' : 'info'"
              dense
              outlined
              border="left"
              class="mb-0"
            >
              <div class="d-flex align-center mb-2">
                <v-icon class="mr-2">
                  {{
                    invoices.length === 0
                      ? "mdi-alert-outline"
                      : "mdi-file-document-check-outline"
                  }}
                </v-icon>
                <span class="font-weight-medium">
                  {{
                    invoices.length === 0
                      ? "Für diese Serienbuchung wurde noch keine Sammelrechnung erstellt."
                      : "Sammelrechnung erneut erstellen und versenden."
                  }}
                </span>
              </div>
              <div class="d-flex gap-2 flex-wrap mt-3">
                <v-btn
                  small
                  color="primary"
                  :loading="invoiceLoading"
                  @click="createGroupInvoice(true)"
                >
                  <v-icon left small>mdi-email-fast-outline</v-icon>
                  {{
                    invoices.length === 0
                      ? "Sammelrechnung erstellen & versenden"
                      : "Sammelrechnung erneut versenden"
                  }}
                </v-btn>
                <v-btn
                  small
                  outlined
                  :loading="invoiceGenerateLoading"
                  @click="createGroupInvoice(false)"
                >
                  <v-icon left small>mdi-file-plus-outline</v-icon>
                  {{
                    invoices.length === 0
                      ? "Nur erstellen (ohne Versand)"
                      : "Nur neu erstellen"
                  }}
                </v-btn>
              </div>
              <div v-if="invoiceError" class="mt-2">
                <v-alert type="error" dense outlined class="mb-0">
                  {{ invoiceError }}
                </v-alert>
              </div>
            </v-alert>
          </v-card-text>
          <v-card-text class="pa-0" v-if="invoices.length > 0">
            <v-list dense>
              <template v-for="(item, index) in invoices">
                <v-list-item :key="item.name" class="px-4">
                  <v-list-item-avatar color="success lighten-4">
                    <v-icon color="success">mdi-file-pdf-box</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      {{ item.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.timeCreated">
                      <v-icon x-small>mdi-calendar</v-icon>
                      Ausstellungsdatum:
                      {{
                        Intl.DateTimeFormat("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.timeCreated))
                      }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn icon @click="downloadInvoice(item)">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-divider
                  v-if="index < invoices.length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Einzelbuchungen -->
        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
            <span class="text-h6 font-weight-bold">Einzelbuchungen</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <BookingTable
              :bookings="groupBooking.bookings"
              :show-group-booking="false"
            />
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn outlined @click="closeDialog">
          <v-icon left>mdi-close</v-icon>
          Schließen
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import BookingTable from "@/components/Booking/BookingTable.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ApiBookingService from "@/services/api/ApiBookingService";
import ToastService from "@/services/ToastService";
import ProcessingService from "@/services/ProcessingService";
import { getGroupBookingErrorMessage } from "@/utils/errorMessages";
import {
  collectGroupInvoices,
  groupUsesInvoicePayment,
} from "@/utils/groupBookingInvoices";
import { mapActions } from "vuex";

export default {
  name: "GroupBookingDetails",
  components: { BookingTable },
  props: {
    groupBooking: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      editingComment: false,
      editedComment: "",
      savingComment: false,
      invoiceLoading: false,
      invoiceGenerateLoading: false,
      invoiceError: null,
    };
  },
  computed: {
    usesInvoicePayment() {
      return groupUsesInvoicePayment(this.groupBooking.bookings);
    },
    invoices() {
      return collectGroupInvoices(this.groupBooking.bookings);
    },
    totalPriceEur() {
      if (!this.groupBooking.bookings) return 0;
      return this.groupBooking.bookings.reduce(
        (acc, booking) => acc + (booking.priceEur || 0),
        0
      );
    },
    formattedDate() {
      return Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(this.groupBooking.timeCreated));
    },
    formattedPrice() {
      return Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(this.totalPriceEur);
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    onDownloadIcal() {
      const ids = this.groupBooking.bookings?.map((b) => b.id) || [];
      if (ids.length === 0) return;
      this.$emit("download-ical", ids);
    },
    closeDialog() {
      this.invoiceError = null;
      this.$emit("close");
    },
    async createGroupInvoice(sendEmail) {
      const isSend = sendEmail === true;
      if (isSend) {
        this.invoiceLoading = true;
      } else {
        this.invoiceGenerateLoading = true;
      }
      this.invoiceError = null;
      const operationId = ProcessingService.showOverlay(
        isSend
          ? "Erstelle und versende Sammelrechnung..."
          : "Erstelle Sammelrechnung..."
      );
      try {
        const response = await ApiGroupBookingService.generateGroupInvoice(
          undefined,
          this.groupBooking.id,
          isSend
        );
        if (!response.success) {
          const code = response.errors?.[0]?.code;
          this.invoiceError = getGroupBookingErrorMessage(code);
          await this.addToast(
            ToastService.createToast("group-booking.invoice.error", "error")
          );
        } else {
          await this.addToast(
            ToastService.createToast("group-booking.invoice.success", "success")
          );
          this.$emit("update");
        }
      } catch (error) {
        this.invoiceError = isSend
          ? "Fehler beim Erstellen und Versenden der Sammelrechnung."
          : "Fehler beim Erstellen der Sammelrechnung.";
        await this.addToast(
          ToastService.createToast("group-booking.invoice.error", "error")
        );
      } finally {
        ProcessingService.hide(operationId);
        if (isSend) {
          this.invoiceLoading = false;
        } else {
          this.invoiceGenerateLoading = false;
        }
      }
    },
    downloadInvoice(item) {
      const operationId = ProcessingService.showSnackbar(
        "Stelle Rechnung bereit..."
      );
      ApiBookingService.getInvoice(item.bookingId, item.name).then(
        (response) => {
          const blob = new Blob([response.data], {
            type: "application/pdf",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", item.name);
          document.body.appendChild(link);
          link.click();
          ProcessingService.hide(operationId);
        }
      );
    },
    startEditingComment() {
      this.editedComment = this.groupBooking.internalComments || "";
      this.editingComment = true;
    },
    cancelEditingComment() {
      this.editingComment = false;
      this.editedComment = "";
    },
    async saveComment() {
      this.savingComment = true;
      try {
        await ApiGroupBookingService.updateGroupBooking(
          this.groupBooking.tenantId,
          this.groupBooking.id,
          {
            ...this.groupBooking,
            internalComments: this.editedComment,
          }
        );
        this.groupBooking.internalComments = this.editedComment;
        this.editingComment = false;
        await this.addToast(
          ToastService.createToast("group-booking.update.success", "success")
        );
      } catch (error) {
        console.error(error);
        await this.addToast(
          ToastService.createToast("group-booking.update.error", "error")
        );
      } finally {
        this.savingComment = false;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.booking-details {
  border-radius: 12px !important;
  overflow: hidden;
}

.booking-details-content {
  max-height: 70vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.theme--dark .booking-details-content {
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.info-item {
  margin-bottom: 8px;
}

.info-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.theme--dark .info-label {
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  font-size: 1rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
  padding-left: 28px;
}

.theme--dark .info-value {
  color: rgba(255, 255, 255, 0.87);
}

.price-highlight {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--v-primary-base);
}

.comment-box {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-left: 3px solid var(--v-primary-base);
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-box.internal {
  background: rgba(255, 152, 0, 0.08);
  border-left-color: var(--v-warning-base);
}

.theme--dark .comment-box {
  background: rgba(255, 255, 255, 0.05);
}

.theme--dark .comment-box.internal {
  background: rgba(255, 152, 0, 0.12);
}

.gap-2 {
  gap: 8px;
}
</style>

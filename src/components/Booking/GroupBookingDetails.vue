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
        <BookingStatusPath
          class="mb-6"
          :label="$t('group-booking.status.title')"
          :status="seriesStatus"
          :path="seriesPath"
          :actions="seriesActions"
          :action-label="seriesActionLabel"
          :hint="mixedHint"
          @action="transitionSeries"
        >
          <template v-if="mixed" #default>
            <div class="series-status-counts text-body-2">
              <template v-for="(entry, index) in counts">
                <span
                  v-if="index > 0"
                  :key="`${entry.status}-dot`"
                  class="mx-2 text--disabled"
                  >·</span
                >
                <span
                  :key="entry.status"
                  class="series-status-count font-weight-medium"
                  :class="`${entry.color}--text`"
                  >{{
                    $t("group-booking.status.count", {
                      count: entry.count,
                      state: entry.label,
                    })
                  }}</span
                >
              </template>
            </div>
          </template>
          <template
            v-if="seriesPath && seriesPath.end && seriesPath.end.reason"
            #reason
          >
            <div class="text-caption font-weight-bold error--text">
              {{ $t(`booking.edit.reason.${seriesPath.end.status}`) }}
            </div>
            <div class="text-body-2">{{ seriesPath.end.reason }}</div>
          </template>
        </BookingStatusPath>

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
                  :disabled="invoiceGenerateLoading"
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
                  :disabled="invoiceLoading"
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
                <v-list-item
                  :key="item.name || `${item.invoiceId}-${item.revision ?? 0}`"
                  class="px-4"
                >
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

        <CancellationReceiptsCard
          :receipts="cancellationReceipts"
          :can-reprint="canReprintCancellationReceipt"
          :busy="reprintInProgress"
          :error="cancellationReceiptError"
          @reprint="reprintCancellationReceipt"
          @download="downloadCancellationReceipt"
        />

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
              @transition="transitionMember"
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
      <BookingTransitions
        ref="transitions"
        @transitioned="$emit('update')"
        @failed="onTransitionFailed"
      />
    </v-card>
  </div>
</template>

<script>
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";
import BookingTransitions from "@/components/Booking/BookingTransitions.vue";
import CancellationReceiptsCard from "@/components/Booking/CancellationReceiptsCard.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import ToastService from "@/services/ToastService";
import ProcessingService from "@/services/ProcessingService";
import { getGroupBookingErrorMessage } from "@/utils/errorMessages";
import {
  getApiErrorMessage,
  shouldRefetch,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";
import {
  collectGroupCancellationReceipts,
  collectGroupInvoices,
  groupUsesInvoicePayment,
} from "@/utils/groupBookingInvoices";
import {
  BOOKING_ACTION,
  MIXED,
  groupAllowsAction,
  groupBookingStatus,
  isRejectedOrCancelled,
  mixedCounts,
  seriesActionLabel,
  seriesPathOf,
  totalPriceOf,
  transitionActions,
  transitionTarget,
} from "@/utils/bookingStatus";
import { mapActions } from "vuex";

/**
 * The series drawer shows the series as a booking (spec E9, N5): the
 * members' shared state as a headline over the series' path
 * (`seriesPathOf`), with a series-wide action - worded "Serie freigeben"
 * and so on - only where that state allows it, through the mounted
 * `BookingTransitions`; there is no series-wide Wiederherstellen. A mixed
 * series is counted per state instead and acts per member: the member
 * rows' menus hand their transition to the same module. The aggregated
 * cancellation receipt is reissued here once every member is cancelled
 * (spec E8).
 */
export default {
  name: "GroupBookingDetails",
  components: {
    BookingStatusPath,
    BookingTable,
    BookingTransitions,
    CancellationReceiptsCard,
  },
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
      reprintInProgress: false,
      cancellationReceiptError: null,
    };
  },
  computed: {
    members() {
      return (this.groupBooking.bookings || []).filter(Boolean);
    },
    seriesStatus() {
      return groupBookingStatus(this.members);
    },
    mixed() {
      return this.seriesStatus === MIXED;
    },
    /** The series' path; `null` while the series is mixed, so the headline shows the count instead. */
    seriesPath() {
      return seriesPathOf(this.groupBooking, this.members);
    },
    counts() {
      return mixedCounts(this.members);
    },
    canEditEveryMember() {
      return this.members.every((b) => BookingPermissionService.allowUpdate(b));
    },
    /** Why a mixed series offers no action - for whoever could act on the members. */
    mixedHint() {
      return this.mixed && this.canEditEveryMember
        ? this.$t("group-booking.status.mixedHint")
        : null;
    },
    /** The series-wide transitions: the shared state's, for whoever may edit every member. */
    seriesActions() {
      if (!this.canEditEveryMember) {
        return [];
      }
      return transitionActions(this.seriesStatus).filter(
        (action) =>
          action !== BOOKING_ACTION.REINSTATE &&
          groupAllowsAction(this.members, action)
      );
    },
    /** The aggregated cancellation receipt exists once every member is cancelled; the right is `booking.reprint` on each. */
    canReprintCancellationReceipt() {
      return (
        this.members.length > 0 &&
        this.members.every(
          (b) =>
            isRejectedOrCancelled(b) && BookingPermissionService.allowReprint(b)
        )
      );
    },
    /** The members' cancellation receipts, the aggregated one counted once. */
    cancellationReceipts() {
      return collectGroupCancellationReceipts(this.members);
    },
    usesInvoicePayment() {
      return groupUsesInvoicePayment(this.groupBooking.bookings);
    },
    invoices() {
      return collectGroupInvoices(this.groupBooking.bookings);
    },
    totalPriceEur() {
      return totalPriceOf(this.members);
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
    seriesActionLabel,
    /**
     * A series-wide button acts on the whole series: `seriesOnly` keeps the
     * group dialogs from offering "Nur diese Buchung", which would otherwise
     * act on an arbitrary member.
     */
    transitionSeries(action) {
      this.$refs.transitions.start(action, {
        ...transitionTarget(this.members[0], this.groupBooking),
        seriesOnly: true,
      });
    },
    /** A member row's menu: the member with its series, so the dialogs can still offer the series where it is uniform. */
    transitionMember(action, bookingId) {
      const member = this.members.find((booking) => booking.id === bookingId);
      if (!member) return;
      this.$refs.transitions.start(
        action,
        transitionTarget(member, this.groupBooking)
      );
    },
    onTransitionFailed({ refetch }) {
      if (refetch) {
        this.$emit("update");
      }
    },
    async reprintCancellationReceipt() {
      const operationId = ProcessingService.showOverlay(
        this.$t("group-booking.cancellationReceipt.reprint.progress")
      );
      this.reprintInProgress = true;
      this.cancellationReceiptError = null;
      try {
        const response =
          await ApiGroupBookingService.reprintGroupCancellationReceipt(
            undefined,
            this.groupBooking.id
          );
        if (response && response.success === false) {
          this.cancellationReceiptError = getGroupBookingErrorMessage(
            response.errors?.[0]?.code
          );
          await this.addToast(
            ToastService.createToast(
              "group-booking.cancellationReceipt.reprint.error",
              "error"
            )
          );
          return;
        }
        await this.addToast(
          ToastService.createToast(
            "group-booking.cancellationReceipt.reprint.success",
            "success"
          )
        );
        this.$emit("update");
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          this.$t("group-booking.cancellationReceipt.reprint.error.message")
        );
        this.cancellationReceiptError = message;
        await this.addToast({
          title: this.$t(
            "group-booking.cancellationReceipt.reprint.error.title"
          ),
          message,
          type: "error",
        });
        if (shouldRefetch(error)) {
          this.$emit("update");
        }
      } finally {
        this.reprintInProgress = false;
        ProcessingService.hide(operationId);
      }
    },
    downloadCancellationReceipt(item) {
      const operationId = ProcessingService.showSnackbar(
        this.$t("booking.cancellationReceipt.download.progress")
      );
      ApiBookingService.getCancellationReceipt(item.bookingId, item.title)
        .then((response) => {
          const blob = new Blob([response.data], {
            type: "application/pdf",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", item.title);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(async (error) => {
          const unpacked = await unpackBlobErrorBody(error);
          this.addToast({
            title: this.$t("booking.cancellationReceipt.download.error.title"),
            message: getApiErrorMessage(
              unpacked,
              this.$t("booking.cancellationReceipt.download.error.message")
            ),
            type: "error",
          });
        })
        .finally(() => {
          ProcessingService.hide(operationId);
        });
    },
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
      ApiBookingService.getInvoice(item.bookingId, item.name)
        .then((response) => {
          const blob = new Blob([response.data], {
            type: "application/pdf",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", item.name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          this.addToast(
            ToastService.createToast("invoice.download.error", "error")
          );
        })
        .finally(() => {
          ProcessingService.hide(operationId);
        });
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

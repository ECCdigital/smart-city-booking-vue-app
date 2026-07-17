<template>
  <AdminLayout>
    <div class="page-header">
      <div class="d-flex align-center mb-3 justify-space-between">
        <v-btn-toggle
          v-model="currentView"
          mandatory
          rounded
          active-class="active-button"
        >
          <v-btn value="list">
            <v-icon left> mdi-list-box-outline </v-icon>
            Liste
          </v-btn>
          <v-btn value="calendar">
            <v-icon left> mdi-calendar-blank-outline </v-icon>
            Kalender
          </v-btn>
          <v-btn v-if="workflow.active" value="kanban">
            <v-icon left> mdi-table-column </v-icon>
            Kanban
          </v-btn>
        </v-btn-toggle>

        <div>
          <v-tooltip v-if="currentView === 'kanban'" bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                v-on="on"
                icon
                small
                class="ml-2"
                :class="{ 'active-button': showBacklog }"
                @click="showBacklog = !showBacklog"
              >
                <v-icon>mdi-tray-full</v-icon>
              </v-btn>
            </template>
            <span>Backlog ein-/ausblenden</span>
          </v-tooltip>
          <BookingExportButton
            class="ml-auto"
            :bookings="filteredBookings"
            :tenant="tenantId"
          />
        </div>
      </div>
      <v-text-field
        v-model="searchTerm"
        label="Buchung suchen..."
        append-icon="mdi-magnify"
        solo
        clearable
        class="search-field"
      >
        <template v-slot:prepend-inner>
          <v-menu
            bottom
            left
            offset-y
            nudge-bottom="8"
            max-width="320"
            content-class="booking-type-filter-menu"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-badge
                :value="hasActiveBookingTypeFilter"
                color="primary"
                dot
                overlap
              >
                <v-btn
                  icon
                  v-bind="attrs"
                  v-on="on"
                  class="booking-type-filter-trigger"
                  :class="{
                    'booking-type-filter-trigger--active':
                      hasActiveBookingTypeFilter,
                  }"
                  @click.stop
                >
                  <v-icon>mdi-filter-variant</v-icon>
                </v-btn>
              </v-badge>
            </template>

            <v-card class="booking-type-filter-card" elevation="8" rounded="lg">
              <div class="booking-type-filter-card__header">
                <div class="d-flex align-center">
                  <div class="booking-type-filter-card__header-icon mr-3">
                    <v-icon color="primary" small>mdi-tune-variant</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold line-height-tight">
                      Buchungstyp
                    </div>
                    <div class="text-caption grey--text">
                      Ansicht einschränken
                    </div>
                  </div>
                </div>
                <v-btn
                  v-if="hasActiveBookingTypeFilter"
                  text
                  x-small
                  color="primary"
                  class="px-2"
                  @click="bookingTypeFilter = 'all'"
                >
                  Zurücksetzen
                </v-btn>
              </div>

              <v-divider />

              <div class="booking-type-filter-card__options">
                <button
                  v-for="option in bookingTypeFilterOptions"
                  :key="option.value"
                  type="button"
                  class="booking-type-filter-option"
                  :class="{
                    'booking-type-filter-option--active':
                      bookingTypeFilter === option.value,
                  }"
                  @click="bookingTypeFilter = option.value"
                >
                  <div
                    class="booking-type-filter-option__icon"
                    :class="`booking-type-filter-option__icon--${option.value}`"
                  >
                    <v-icon small>{{ option.icon }}</v-icon>
                  </div>
                  <div class="booking-type-filter-option__content">
                    <span class="booking-type-filter-option__title">{{
                      option.text
                    }}</span>
                    <span class="booking-type-filter-option__desc">{{
                      option.description
                    }}</span>
                  </div>
                  <v-icon
                    v-if="bookingTypeFilter === option.value"
                    small
                    color="primary"
                    class="booking-type-filter-option__check"
                  >
                    mdi-check-circle
                  </v-icon>
                </button>
              </div>
            </v-card>
          </v-menu>
        </template>
      </v-text-field>
    </div>

    <div class="page-content">
      <!-- List view -->
      <div v-if="currentView === 'list'">
        <v-skeleton-loader type="table" class="flex">
          <BookingTable
            :bookings="filteredBookings"
            :loading="loading"
            @open-booking="onOpenBooking"
            @open-group-booking="onOpenGroupBooking"
            @open-edit-booking="onOpenEditBooking"
            @commit-booking="commitBooking"
            @pay-booking="onPayBooking"
            @open-delete-dialog="onOpenDeleteDialog"
            @reject-booking="onOpenRejectDialog"
            @download-ical="onDownloadIcal"
          />
        </v-skeleton-loader>
      </div>

      <!-- Calendar view -->
      <div v-else-if="currentView === 'calendar'">
        <BookingOverviewCalendar
          :bookings="filteredBookings"
          :loading="loading"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @commit-booking="commitBooking"
          @pay-booking="onPayBooking"
          @reject-booking="onOpenRejectDialog"
          @open-delete-dialog="onOpenDeleteDialog"
        ></BookingOverviewCalendar>
      </div>

      <!-- Kanban view -->
      <div v-else-if="currentView === 'kanban'">
        <BookingKanban
          :bookings="filteredBookings"
          :loading="loading"
          :show-backlog="showBacklog"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @open-group-booking="onOpenGroupBooking"
          @pay-booking="onPayBooking"
          @commit-booking="commitBooking"
          @update:booking="fetchBooking"
        >
        </BookingKanban>
      </div>
    </div>

    <v-btn
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      :to="{ name: 'booking-create' }"
      :disabled="!BookingPermissionService.allowCreate()"
    >
      <v-icon>mdi-plus</v-icon>Buchung erstellen
    </v-btn>
    <BookingDeleteConformationDialog
      :to-delete="selectedBooking"
      :open="openDeleteDialog"
      :in-progress="loading"
      @close="onCloseDeleteDialog"
      @delete-booking="deleteBooking"
    />
    <BookingRejectConformationDialog
      :to-reject="selectedBooking"
      :open="openRejectDialog"
      :loading="loading"
      @close="onCloseRejectDialog"
      @reject-booking="rejectBooking"
    />
    <v-dialog v-model="openBookingDialog" max-width="800px">
      <BookingDetails
        :booking="selectedBooking"
        :group-booking="selectedGroupBooking"
        @update="updateBooking"
        @close="onCloseBookingDialog"
        @download-ical="onDownloadIcal"
      ></BookingDetails>
    </v-dialog>
    <v-dialog v-model="openGroupBookingDialog" max-width="1200px">
      <div style="overflow: hidden">
        <GroupBookingDetails
          :group-booking="selectedGroupBooking"
          @close="closeDialog('groupBooking')"
          @update="updateGroupBookingView"
          @download-ical="onDownloadGroupBookingIcal"
        ></GroupBookingDetails>
      </div>
    </v-dialog>
    <BookingPayDialog
      v-if="selectedBooking.id"
      :booking-id="selectedBooking.id"
      :open="openPayDialog"
      :has-group-booking="!!selectedGroupBooking?.id"
      @close="openPayDialog = false"
      @pay-single-booking="payBooking"
      @pay-group-booking="payGroupBooking"
    />

    <GroupBookingCommitDialog
      v-if="selectedBooking.id"
      :booking-id="selectedBooking.id"
      :open="openCommitGroupBookingDialog"
      :in-progress="loading"
      :error="errors.commit"
      @close="closeDialog('commitGroupBooking')"
      @commit-single-booking="commitBooking(selectedBooking.id, true)"
      @commit-group-booking="commitGroupBooking(selectedGroupBooking.id)"
    />
    <GroupBookingRejectConformationDialog
      :to-reject="selectedBooking"
      :group-booking-id="selectedGroupBooking?.id"
      :open="openRejectGroupBookingDialog"
      :in-progress="loading"
      :error="errors.reject"
      @close="closeDialog('rejectGroupBooking')"
      @reject-single-booking="rejectBooking"
      @reject-group-booking="rejectGroupBooking"
    />
    <GroupBookingDeleteConformationDialog
      v-if="selectedBooking.id"
      :booking-id="selectedBooking.id"
      :open="openDeleteGroupBookingDialog"
      :single-delete-disabled="isSelectedBookingHardDeleteBlocked"
      :group-delete-disabled="isSelectedGroupHardDeleteBlocked"
      @close="closeDialog('deleteGroupBooking')"
      @delete-single-booking="deleteBooking"
      @delete-group-booking="deleteGroupBooking"
    />
    <ProcessingIndicator ref="processingIndicator" />
  </AdminLayout>
</template>

<script>
import Fuse from "fuse.js";
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookingDetails from "@/components/Booking/BookingDetails.vue";
import BookingOverviewCalendar from "@/components/Booking/BookingOverviewCalendar.vue";
import BookingTable from "@/components/Booking/BookingTable.vue";
import BookingKanban from "@/components/Booking/BookingKanban.vue";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import GroupBookingDetails from "@/components/Booking/GroupBookingDetails.vue";
import GroupBookingCommitDialog from "@/components/Booking/GroupBookingCommitDialog.vue";
import GroupBookingRejectConformationDialog from "@/components/Booking/GroupBookingRejectConformationDialog.vue";
import GroupBookingDeleteConformationDialog from "@/components/Booking/GroupBookingDeleteConformationDialog.vue";
import ToastService from "@/services/ToastService";
import {
  getBookingErrorMessage,
  getGroupBookingErrorMessage,
} from "@/utils/errorMessages";
import BookingPayDialog from "@/components/Booking/BookingPayDialog.vue";
import ProcessingIndicator from "@/components/ProcessingIndicator.vue";
import ProcessingService from "@/services/ProcessingService";
import BookingExportButton from "@/components/Booking/BookingExportButton.vue";

export default {
  components: {
    BookingExportButton,
    ProcessingIndicator,
    BookingPayDialog,
    GroupBookingDeleteConformationDialog,
    GroupBookingRejectConformationDialog,
    GroupBookingCommitDialog,
    GroupBookingDetails,
    BookingTable,
    BookingOverviewCalendar,
    BookingDetails,
    BookingDeleteConformationDialog,
    BookingRejectConformationDialog,
    AdminLayout,
    BookingKanban,
  },
  data() {
    return {
      showBacklog: false,
      fuse: null,
      value: "",
      searchTerm: "",
      bookingTypeFilter: "all",
      bookingTypeFilterOptions: [
        {
          value: "all",
          text: "Alle Buchungen",
          description: "Einzel- und Serienbuchungen",
          icon: "mdi-view-grid-outline",
        },
        {
          value: "single",
          text: "Einzelbuchungen",
          description: "Ohne Serienzuordnung",
          icon: "mdi-calendar-check-outline",
        },
        {
          value: "series",
          text: "Serienbuchungen",
          description: "Teil einer Buchungsserie",
          icon: "mdi-calendar-multiple",
        },
      ],
      api: {
        users: [],
        bookings: [],
        groupBookings: [],
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
        { text: "Zahlungsart", value: "payMethod" },
        { text: "", value: "controls", sortable: false },
      ],
      openDeleteDialog: false,
      openRejectDialog: false,
      openGroupBookingDialog: false,
      openCommitGroupBookingDialog: false,
      openRejectGroupBookingDialog: false,
      openDeleteGroupBookingDialog: false,
      openPayDialog: false,
      selectedBooking: {},
      selectedGroupBooking: {},
      openBookingDialog: false,
      currentView: "list",
      workflow: {},
      errors: {
        commit: null,
        reject: null,
        pay: null,
      },
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    BookingPermissionService() {
      return BookingPermissionService;
    },
    hasActiveBookingTypeFilter() {
      return this.bookingTypeFilter !== "all";
    },
    isSelectedBookingHardDeleteBlocked() {
      return !!(
        this.selectedBooking?.isCommitted || this.selectedBooking?.isPayed
      );
    },
    isSelectedGroupHardDeleteBlocked() {
      if (!this.selectedGroupBooking?.bookingIds) return false;
      return this.selectedGroupBooking.bookingIds.some((bookingId) => {
        const booking = this.api.bookings.find((item) => item.id === bookingId);
        return booking?.isCommitted || booking?.isPayed;
      });
    },
    mappedBookings() {
      return this.api.bookings.map((booking) => {
        return {
          ...booking,
          groupBooking: this.api.groupBookings.find((groupBooking) =>
            groupBooking.bookingIds.includes(booking.id)
          )?.id,
        };
      });
    },
    filteredBookings() {
      let bookings = this.mappedBookings || [];

      if (this.searchTerm) {
        const terms = this.searchTerm.trim().split(/\s+/);
        const searchQuery = {
          $and: terms.map((term) => ({
            $or: [
              { id: `'${term}` },
              { mail: `'${term}` },
              { comment: `'${term}` },
              { name: `'${term}` },
              { street: `'${term}` },
              { zipCode: `'${term}` },
              { location: `'${term}` },
              { company: `'${term}` },
              { phone: `'${term}` },
              { "bookableItems.bookableId": `'${term}` },
              { "bookableItems._bookableUsed.id": `'${term}` },
              { "bookableItems._bookableUsed.title": `'${term}` },
              { "bookableItems._bookableUsed.description": `'${term}` },
              { "bookableItems._bookableUsed.type": `'${term}` },
              { "bookableItems._bookableUsed.eventId": `'${term}` },
              { "bookableItems._bookableUsed.priceEur": `'${term}` },
              { "bookableItems._bookableUsed.attachments.id": `'${term}` },
              { "bookableItems._bookableUsed.attachments.type": `'${term}` },
              { "bookableItems._bookableUsed.attachments.title": `'${term}` },
              { "bookableItems._bookableUsed.attachments.url": `'${term}` },
              { "_populated.bookable.flags": `'${term}` },
              { "_populated.bookable.tags": `'${term}` },
              { "_populated.bookable.bookingNotes": `'${term}` },
              { groupBooking: `'${term}` },
            ],
          })),
        };

        const results = this.fuse.search(searchQuery);
        bookings = results.map((result) => result.item);
      }

      return this.applyBookingTypeFilter(bookings);
    },
  },
  watch: {
    tenantId() {
      this.fetchBookings();
      this.fetchGroupBookings();
    },
    currentView(newView) {
      this.$router.replace({ query: { view: newView } }).catch((err) => {
        if (err.name !== "NavigationDuplicated") {
          throw err;
        }
      });
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    applyBookingTypeFilter(bookings) {
      if (this.bookingTypeFilter === "single") {
        return bookings.filter((booking) => !booking.groupBooking);
      }
      if (this.bookingTypeFilter === "series") {
        return bookings.filter((booking) => !!booking.groupBooking);
      }
      return bookings;
    },
    async onDownloadGroupBookingIcal(bookingIds) {
      const operationId = ProcessingService.showSnackbar(
        "Termine werden heruntergeladen..."
      );
      try {
        const response = await ApiBookingService.downloadGroupBookingIcal(
          bookingIds
        );

        const blob = new Blob([response.data], {
          type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `serienbuchung-${this.selectedGroupBooking.id}.ics`
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

    handleGroupBookingError(action, errors) {
      const code = errors[0]?.code;
      if (errors.length === 0) {
        return;
      }
      this.addToast(
        ToastService.createToast(`group-booking.${action}.error`, "error")
      );
      this.errors[action] = getGroupBookingErrorMessage(code);
    },
    handleBookingError(action, errors) {
      if (errors.length === 0) {
        return;
      }
      const code = errors[0]?.code;
      this.addToast(
        ToastService.createToast(`booking.${action}.error`, "error")
      );
      this.errors[action] = getBookingErrorMessage(code);
    },

    async fetchBookings() {
      await this.startLoading("fetch-bookings");

      await ApiBookingService.getBookings(undefined, true)
        .then((response) => {
          this.api.bookings = response.data;
        })
        .finally(async () => {
          this.initializeFuse();
          this.stopLoading("fetch-bookings");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async fetchBooking(id) {
      try {
        const response = await ApiBookingService.getBooking(
          id,
          undefined,
          true
        );
        const booking = response.data;
        const index = this.api.bookings.findIndex((b) => b.id === id);
        if (index !== -1) {
          this.api.bookings[index] = booking;
        } else {
          this.api.bookings.push(booking);
        }
      } catch (error) {
        console.log(error);
      }
    },
    async fetchGroupBookings() {
      await this.startLoading("fetch-grp-bookings");

      await ApiGroupBookingService.getGroupBookings()
        .then((response) => {
          this.api.groupBookings = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-grp-bookings");
          this.initializeFuse();
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async closeDialog(type) {
      switch (type) {
        case "delete":
          this.openDeleteDialog = false;
          break;
        case "reject":
          this.errors.reject = null;
          break;
        case "booking":
          this.openBookingDialog = false;
          break;
        case "groupBooking":
          await this.fetchGroupBookings();
          this.openGroupBookingDialog = false;
          break;
        case "commitGroupBooking":
          this.errors.commit = null;
          this.openCommitGroupBookingDialog = false;
          break;
        case "deleteGroupBooking":
          this.openDeleteGroupBookingDialog = false;
          break;
        case "rejectGroupBooking":
          this.errors.reject = null;
          this.openRejectGroupBookingDialog = false;
          break;
        default:
          break;
      }
    },
    async deleteBooking(bookingId) {
      const booking = this.api.bookings.find((item) => item.id === bookingId);
      if (booking?.isCommitted || booking?.isPayed) {
        await this.addToast(
          ToastService.createToast("booking.delete.requires-rejection", "error")
        );
        return;
      }
      const optionId = ProcessingService.showOverlay("Lösche Buchung...");
      try {
        await this.startLoading("delete-booking");
        await ApiBookingService.deleteBooking(bookingId);
        await this.fetchBookings();
        await this.fetchGroupBookings();
        this.openDeleteDialog = false;
        this.openDeleteGroupBookingDialog = false;
      } finally {
        await this.stopLoading("delete-booking");
        ProcessingService.hide(optionId);
      }
    },
    async deleteGroupBooking(bookingId) {
      const groupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      const hasProtectedBooking = groupBooking.bookingIds.some((id) => {
        const booking = this.api.bookings.find((item) => item.id === id);
        return booking?.isCommitted || booking?.isPayed;
      });
      if (hasProtectedBooking) {
        await this.addToast(
          ToastService.createToast("booking.delete.requires-rejection", "error")
        );
        return;
      }
      const optionId = ProcessingService.showOverlay("Lösche Serienbuchung...");
      try {
        await this.startLoading("delete-booking");
        await ApiGroupBookingService.deleteGroupBooking(null, groupBooking.id);
        await this.fetchBookings();
        await this.fetchGroupBookings();
        this.openDeleteDialog = false;
        this.openDeleteGroupBookingDialog = false;
      } finally {
        ProcessingService.hide(optionId);
        await this.stopLoading("delete-booking");
      }
    },
    async commitBooking(id, force = false) {
      const hasGroupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(id)
      );
      if (!force && hasGroupBooking) {
        this.selectedBooking = Object.assign(
          {},
          this.api.bookings.find((booking) => booking.id === id)
        );
        this.selectedGroupBooking = Object.assign(
          {},
          this.api.groupBookings.find((groupBooking) =>
            groupBooking.bookingIds.includes(id)
          )
        );
        this.openCommitGroupBookingDialog = true;
      } else {
        const operationId = ProcessingService.showOverlay(
          "Buchung wird freigegeben..."
        );
        try {
          const booking = this.api.bookings.find(
            (booking) => booking.id === id
          );

          if (booking.priceEur > 0 && !booking.paymentProvider) {
            await this.addToast(
              ToastService.createToast(
                "booking.commit.no-payment-method",
                "error"
              )
            );
            return;
          }
          const data = await ApiBookingService.commitBooking(id);

          if (!data.success) {
            this.handleBookingError("commit", data.errors);
          } else {
            await this.addToast(
              ToastService.createToast("booking.commit.success", "success")
            );
            this.errors.commit = null;
            await this.fetchBookings();
            await this.fetchGroupBookings();
            this.openCommitGroupBookingDialog = false;
          }
        } finally {
          ProcessingService.hide(operationId);
        }
      }
    },
    hasGroupBooking(id) {
      return !!this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(id)
      );
    },
    async onPayBooking(id) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === id)
      );
      if (this.hasGroupBooking(id)) {
        this.selectedGroupBooking = Object.assign(
          {},
          this.api.groupBookings.find((groupBooking) =>
            groupBooking.bookingIds.includes(id)
          )
        );
      } else {
        this.selectedGroupBooking = null;
      }
      this.openPayDialog = true;
    },

    async payBooking({ id, paymentMethod, timePaid }) {
      const operationId = ProcessingService.showOverlay(
        "Zahlung wird verarbeitet..."
      );
      try {
        await this.startLoading("pay-booking");
        const data = await ApiBookingService.payBooking(
          id,
          paymentMethod,
          timePaid
        );

        if (!data.success) {
          this.handleBookingError("pay", data.errors);
        } else {
          await this.addToast(
            ToastService.createToast("booking.pay.success", "success")
          );
          this.openPayDialog = false;
          this.errors.pay = null;
          await this.fetchBookings();
          await this.fetchGroupBookings();
        }
      } finally {
        await this.stopLoading("pay-booking");
        ProcessingService.hide(operationId);
      }
    },

    async payGroupBooking({ paymentMethod, timePaid }) {
      const operationId = ProcessingService.showOverlay(
        "Zahlung wird verarbeitet..."
      );
      try {
        await this.startLoading("pay-booking");
        const response = await ApiGroupBookingService.payGroupBooking({
          id: this.selectedGroupBooking.id,
          paymentMethod,
          timePaid,
        });

        if (!response.success) {
          this.handleGroupBookingError("pay", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("group-booking.pay.success", "success")
          );
          this.errors.pay = null;
          this.openPayDialog = false;
          await this.fetchBookings();
          await this.fetchGroupBookings();
        }
      } finally {
        await this.stopLoading("pay-booking");
        ProcessingService.hide(operationId);
      }
    },
    async commitGroupBooking(id) {
      const operationId = ProcessingService.showOverlay(
        "Serienbuchung wird freigegeben..."
      );
      try {
        const response = await ApiGroupBookingService.commitGroupBooking(
          null,
          id
        );

        if (!response.success) {
          this.handleGroupBookingError("commit", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("group-booking.commit.success", "success")
          );
          this.errors.commit = null;
          await this.fetchBookings();
          await this.fetchGroupBookings();
          this.openCommitGroupBookingDialog = false;
        }
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    async rejectBooking(
      id,
      rejectReason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      const operationId = ProcessingService.showOverlay(
        "Buchung wird abgelehnt..."
      );
      try {
        await this.startLoading("reject-booking");
        await ApiBookingService.rejectBooking(
          id,
          this.tenantId,
          rejectReason,
          skipCancellation,
          bankDetails,
          refundPercentage
        );
        await this.addToast(
          ToastService.createToast("booking.reject.success", "success")
        );
        await this.fetchBookings();
        await this.fetchGroupBookings();
        this.openRejectDialog = false;
        this.openRejectGroupBookingDialog = false;
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.reject.error", "error")
        );
      } finally {
        await this.stopLoading("reject-booking");
        ProcessingService.hide(operationId);
      }
    },
    async rejectGroupBooking(
      id,
      rejectReason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      const groupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(id)
      );
      const operationId = ProcessingService.showOverlay(
        "Serienbuchung wird abgelehnt..."
      );
      try {
        await this.startLoading("reject-booking");
        const response = await ApiGroupBookingService.rejectGroupBooking(
          null,
          groupBooking.id,
          rejectReason,
          skipCancellation,
          bankDetails,
          refundPercentage
        );

        if (!response.success) {
          this.handleGroupBookingError("reject", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("group-booking.reject.success", "success")
          );
          this.errors.reject = null;
          await this.fetchBookings();
          await this.fetchGroupBookings();
          this.openRejectGroupBookingDialog = false;
        }
      } catch (error) {
        this.errors.reject =
          error?.response?.data === "invalid_refund_percentage"
            ? this.$t("booking.cancellationRefund.percentageRange")
            : this.$t("group-booking.reject.error.message");
        await this.addToast(
          ToastService.createToast("group-booking.reject.error", "error")
        );
      } finally {
        await this.stopLoading("reject-booking");
        ProcessingService.hide(operationId);
      }
    },
    onOpenBooking(bookingId) {
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      const hasGroupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      if (hasGroupBooking) {
        this.selectedGroupBooking = Object.assign(
          {},
          this.api.groupBookings.find((groupBooking) =>
            groupBooking.bookingIds.includes(bookingId)
          )
        );
      } else {
        this.selectedGroupBooking = null;
      }
      this.openBookingDialog = true;
    },
    onOpenGroupBooking(groupBookingId) {
      const groupBooking = this.api.groupBookings.find(
        (groupBooking) => groupBooking.id === groupBookingId
      );
      this.selectedGroupBooking = Object.assign(
        {},
        {
          ...groupBooking,
          bookings: groupBooking.bookingIds
            .map((bookingId) =>
              this.api.bookings.find((booking) => booking.id === bookingId)
            )
            .filter(Boolean),
        }
      );
      this.openGroupBookingDialog = true;
    },
    onOpenEditBooking(bookingId) {
      this.$router.push({
        name: "booking-edit",
        params: { bookingId },
      });
    },
    onOpenDeleteDialog(bookingId) {
      const hasGroupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      if (hasGroupBooking) {
        this.selectedGroupBooking = Object.assign({}, hasGroupBooking);
        this.openDeleteGroupBookingDialog = true;
      } else {
        this.selectedGroupBooking = null;
        this.openDeleteDialog = true;
      }
    },
    onOpenRejectDialog(bookingId) {
      const hasGroupBooking = this.api.groupBookings.find((groupBooking) =>
        groupBooking.bookingIds.includes(bookingId)
      );
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
      if (hasGroupBooking) {
        this.selectedGroupBooking = Object.assign({}, hasGroupBooking);
        this.openRejectGroupBookingDialog = true;
      } else {
        this.selectedGroupBooking = null;
        this.openRejectDialog = true;
      }
    },
    onCloseDeleteDialog() {
      this.fetchBookings();
      this.fetchGroupBookings();
      this.openDeleteDialog = false;
    },
    onCloseRejectDialog() {
      this.fetchBookings();
      this.fetchGroupBookings();
      this.openRejectDialog = false;
    },
    onCloseBookingDialog() {
      this.openBookingDialog = false;
    },
    async updateBooking(bookingId) {
      await this.fetchBookings();
      await this.fetchGroupBookings();
      this.selectedBooking = Object.assign(
        {},
        this.api.bookings.find((booking) => booking.id === bookingId)
      );
    },
    async updateGroupBookingView() {
      const groupBookingId = this.selectedGroupBooking?.id;
      if (!groupBookingId) return;

      await this.fetchBookings();
      await this.fetchGroupBookings();

      const groupBooking = this.api.groupBookings.find(
        (gb) => gb.id === groupBookingId
      );
      if (!groupBooking) return;

      this.selectedGroupBooking = Object.assign(
        {},
        {
          ...groupBooking,
          bookings: groupBooking.bookingIds
            .map((bookingId) =>
              this.api.bookings.find((booking) => booking.id === bookingId)
            )
            .filter(Boolean),
        }
      );
    },
    initializeFuse() {
      const options = {
        includeScore: true,
        threshold: 0.3,
        useExtendedSearch: true,
        keys: [
          "id",
          "mail",
          "comment",
          "name",
          "street",
          "zipCode",
          "location",
          "company",
          "phone",

          "bookableItems.bookableId",
          "bookableItems._bookableUsed.id",
          "bookableItems._bookableUsed.title",
          "bookableItems._bookableUsed.type",
          "bookableItems._bookableUsed.eventId",
          "bookableItems._bookableUsed.priceEur",

          "bookableItems._bookableUsed.attachments.id",
          "bookableItems._bookableUsed.attachments.type",
          "bookableItems._bookableUsed.attachments.title",
          "bookableItems._bookableUsed.attachments.url",

          "_populated.bookable.flags",
          "_populated.bookable.tags",
          "_populated.bookable.bookingNotes",

          "groupBooking",
        ],
      };
      this.fuse = new Fuse(this.mappedBookings, options);
    },
    async fetchWorkflow() {
      this.workflow = await ApiWorkflowService.getWorkflowStates();
    },
    async onDownloadIcal(bookingId) {
      try {
        const temp = await ApiBookingService.downloadBookingIcal(bookingId);

        const blob = new Blob([temp.data], {
          type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `buchung-${bookingId}.ics`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.ical.error", "error")
        );
      }
    },
  },
  async mounted() {
    ProcessingService.setComponent(this.$refs.processingIndicator);

    try {
      await this.fetchBookings();
      await this.fetchWorkflow();
      await this.fetchGroupBookings();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  },
  async created() {
    const viewFromQuery = this.$route.query.view;
    if (
      viewFromQuery &&
      ["list", "calendar", "kanban"].includes(viewFromQuery)
    ) {
      this.currentView = viewFromQuery;
    }
  },
};
</script>

<style scoped lang="scss">
.search-field {
  border-radius: 15px;
}

.booking-type-filter-trigger--active {
  background: rgba(var(--v-primary-base), 0.12) !important;

  .v-icon {
    color: var(--v-primary-base) !important;
  }
}

.booking-type-filter-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.booking-type-filter-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  background: linear-gradient(
    135deg,
    rgba(var(--v-primary-base), 0.06) 0%,
    rgba(var(--v-primary-base), 0.02) 100%
  );
}

.booking-type-filter-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(var(--v-primary-base), 0.12);
}

.line-height-tight {
  line-height: 1.25;
}

.booking-type-filter-card__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
}

.booking-type-filter-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    transform: translateX(2px);
  }

  &--active {
    background: rgba(var(--v-primary-base), 0.08);
    border-color: rgba(var(--v-primary-base), 0.35);
    box-shadow: 0 2px 8px rgba(var(--v-primary-base), 0.12);

    .booking-type-filter-option__title {
      color: var(--v-primary-base);
      font-weight: 600;
    }
  }
}

.booking-type-filter-option__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  transition: transform 0.2s ease;

  .booking-type-filter-option--active & {
    transform: scale(1.05);
  }

  &--all {
    background: transparent;
    color: #607d8b;
  }

  &--single {
    background: transparent;
    color: #2196f3;
  }

  &--series {
    background: rgba(var(--v-primary-base), 0.16);
    color: var(--v-primary-base);
  }
}

.booking-type-filter-option__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.booking-type-filter-option__title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
}

.booking-type-filter-option__desc {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.54);
  margin-top: 2px;
}

.booking-type-filter-option__check {
  flex-shrink: 0;
}

.theme--dark {
  .booking-type-filter-card {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .booking-type-filter-option {
    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    &--active {
      background: rgba(var(--v-primary-base), 0.15);
    }
  }

  .booking-type-filter-option__title {
    color: rgba(255, 255, 255, 0.9);
  }

  .booking-type-filter-option__desc {
    color: rgba(255, 255, 255, 0.55);
  }
}

::v-deep .active-button {
  color: black !important;
  background-color: var(--v-secondary-base) !important;
}

html,
body {
  height: 100%;
  margin: 0;
}

.page-container {
  display: flex;
  flex-direction: column;
}

.page-header {
  flex: 0 0 auto;
}

.page-content {
  flex: 1 1 auto;
  overflow-y: auto;
  margin-bottom: 80px;
}

.page-footer {
  flex: 0 0 auto;
}
</style>

<style lang="scss">
.booking-type-filter-menu {
  border-radius: 14px !important;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14) !important;

  .v-card {
    border-radius: 14px !important;
  }
}
</style>

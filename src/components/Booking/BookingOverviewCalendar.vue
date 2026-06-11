<template>
  <div class="booking-overview-calendar">
    <div ref="printArea" class="calendar-print-area">
      <div class="calendar-print-header print-only">
        <h2 class="calendar-print-header__title">Buchungskalender</h2>
        <p class="calendar-print-header__description">
          {{ printHeaderDescription }}
        </p>
        <p class="calendar-print-header__meta">Erstellt am {{ printDate }}</p>
      </div>
    <v-toolbar flat dense class="no-print">
      <v-btn icon class="no-print" @click="$refs.calendar.prev()">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>

      <v-btn text class="no-print" @click="setToday">Heute</v-btn>

      <v-btn icon class="no-print" @click="$refs.calendar.next()">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>

      <v-toolbar-title class="mx-4">
        {{ calendarTitle }}
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            class="no-print mr-1"
            v-bind="attrs"
            v-on="on"
            :disabled="loading"
            @click="printCalendar"
          >
            <v-icon>mdi-printer</v-icon>
          </v-btn>
        </template>
        <span>Kalender drucken / als PDF speichern</span>
      </v-tooltip>

      <v-btn-toggle v-model="type" dense color="secondary" class="no-print">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              value="day"
              :title="'Tagesansicht'"
              v-bind="attrs"
              v-on="on"
              :color="type === 'day' ? 'secondary' : ''"
              :class="type === 'day' ? 'active-button' : ''"
            >
              <v-icon>mdi-calendar</v-icon>
            </v-btn>
          </template>
          <span>Tagesansicht</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              value="week"
              :title="'Wochenansicht'"
              v-bind="attrs"
              v-on="on"
              :color="type === 'week' ? 'secondary' : ''"
              :class="type === 'week' ? 'active-button' : ''"
            >
              <v-icon>mdi-calendar-week</v-icon>
            </v-btn>
          </template>
          <span>Wochenansicht</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              value="month"
              :title="'Monatsansicht'"
              v-bind="attrs"
              v-on="on"
              :color="type === 'month' ? 'secondary' : ''"
              :class="type === 'month' ? 'active-button' : ''"
            >
              <v-icon>mdi-calendar-month</v-icon>
            </v-btn>
          </template>
          <span>Monatsansicht</span>
        </v-tooltip>
      </v-btn-toggle>
    </v-toolbar>
    <v-progress-linear
      class="no-print"
      indeterminate
      v-if="loading === true"
    ></v-progress-linear>
    <v-calendar
      class="my-calendar elevation-1"
      :class="{ 'my-calendar--month': type === 'month' }"
      :type="type"
      ref="calendar"
      v-model="focus"
      color="primary"
      locale="de"
      weekdays="1,2,3,4,5,6,0"
      :events="events"
      :event-height="calendarEventHeight"
      :event-name="getEventName"
      event-overlap-mode="stack"
      event-color="primary"
      @click:event="showEvent"
    >
      <template v-slot:event="{ event, eventSummary }">
        <div
          v-if="type === 'month'"
          class="booking-calendar-event booking-calendar-event--month"
        >
          <div class="booking-calendar-event__line">
            <span class="booking-calendar-event__time">{{
              formatEventTimeRange(event.start, event.end)
            }}</span>
            <span class="booking-calendar-event__user">{{ event.user }}</span>
          </div>
          <div v-if="event.company" class="booking-calendar-event__company">
            {{ event.company }}
          </div>
          <div class="booking-calendar-event__bookable">{{ event.name }}</div>
        </div>
        <div v-else v-html="eventSummary()"></div>
      </template>
    </v-calendar>
    </div>
    <v-menu
      v-model="selectedOpen"
      :close-on-content-click="false"
      :activator="selectedElement"
      offset-x
    >
      <v-card min-width="350px" flat>
        <v-list>
          <v-list-item-title class="ml-2 text-h6">{{
            selectedEvent.name
          }}</v-list-item-title>
          <v-list-item-subtitle class="ml-2 mb-2"
            ><strong>{{ selectedEvent.user }}</strong>
          </v-list-item-subtitle>
          <v-list-item-subtitle
            v-if="selectedEvent.company"
            class="ml-2 mb-2"
          >
            Firma: <strong>{{ selectedEvent.company }}</strong>
          </v-list-item-subtitle>
          <v-list-item-subtitle class="ml-2 mb-2"
            >Buchungsnummer: <strong>{{ selectedEvent.id }}</strong>
          </v-list-item-subtitle>
          <v-list-item
            link
            @click="onOpenBooking(selectedEvent.id)"
            :disabled="!BookingPermissionService.allowUpdate(selectedEvent)"
          >
            <v-list-item-icon>
              <v-icon>mdi-information</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchungsdetails ansehen</v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item
            link
            @click="onOpenEditBooking(selectedEvent.id)"
            :disabled="!BookingPermissionService.allowUpdate(selectedEvent)"
          >
            <v-list-item-icon>
              <v-icon>mdi-pencil</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung bearbeiten</v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="commitBooking(selectedEvent.id)"
            :disabled="!BookingPermissionService.allowUpdate(selectedEvent)"
          >
            <v-list-item-icon>
              <v-icon>mdi-checkbox-marked-circle</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung freigeben</v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="payBooking(selectedEvent.id)"
            :disabled="
              !BookingPermissionService.allowUpdate(selectedEvent) ||
              selectedEvent.isPayed
            "
          >
            <v-list-item-icon>
              <v-icon>mdi-cash-check</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung als bezahlt markieren</v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="rejectBooking(selectedEvent.id)"
            :disabled="!BookingPermissionService.allowUpdate(selectedEvent)"
          >
            <v-list-item-icon>
              <v-icon>mdi-close-circle</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung stornieren</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item
            link
            @click="onOpenDeleteDialog(selectedEvent.id)"
            class="red--text"
            :disabled="!BookingPermissionService.allowDelete(selectedEvent)"
          >
            <v-list-item-icon>
              <v-icon color="red">mdi-delete</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung löschen</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

export default {
  name: "BookingOverviewCalendar",
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
      focus: "",
      type: "week",
      types: [
        { label: "Tag", type: "day" },
        { label: "Woche", type: "week" },
        { label: "Monat", type: "month" },
      ],
      selectedEvent: {},
      selectedElement: null,
      selectedOpen: false,
      calendarTitle: "",
    };
  },
  computed: {
    ...mapGetters({
      currentTenant: "tenants/currentTenant",
    }),
    BookingPermissionService() {
      return BookingPermissionService;
    },
    printHeaderDescription() {
      const viewLabel = {
        day: "Tagesansicht",
        week: "Wochenansicht",
        month: "Monatsansicht",
      }[this.type];
      const parts = [];

      if (this.currentTenant?.name) {
        parts.push(`Mandant: ${this.currentTenant.name}`);
      }
      if (viewLabel && this.calendarTitle) {
        parts.push(`${viewLabel} (${this.calendarTitle})`);
      }

      return parts.join(" · ");
    },
    printDate() {
      return new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    calendarEventHeight() {
      return this.type === "month" ? 44 : 20;
    },
    events() {
      return (
        this.bookings
          .filter(
            (booking) =>
              !booking.isRejected && booking.timeBegin && booking.timeEnd
          )
          .map((booking) => {
            const start = Date.parse(booking.timeBegin) || booking.timeBegin;
            const end = Date.parse(booking.timeEnd) || booking.timeEnd;
            return {
              id: booking.id,
              name: this.getBookingTitle(booking),
              start: start,
              end: end,
              color: booking.isCommitted ? booking.color : "grey",
              timed: true,
              user: booking.name,
              company: booking.company || "",
              isPayed: booking.isPayed,
              isCommitted: booking.isCommitted,
              isRejected: booking.isRejected,
            };
          }) || []
      );
    },
  },
  methods: {
    getBookingTitle(booking) {
      const bookableItems = booking.bookableItems;
      if (!bookableItems) {
        return "";
      }
      const bookableUsed = bookableItems[0]?._bookableUsed;
      return bookableUsed?.title || "Unbekannt";
    },
    setToday() {
      this.focus = "";
    },
    showEvent({ nativeEvent, event }) {
      const open = () => {
        this.selectedEvent = event.input || event;
        this.selectedElement = nativeEvent.target;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => (this.selectedOpen = true))
        );
      };

      if (this.selectedOpen) {
        this.selectedOpen = false;
        requestAnimationFrame(() => requestAnimationFrame(() => open()));
      } else {
        open();
      }

      nativeEvent.stopPropagation();
    },
    getEventName(event) {
      const input = event.input || event;
      const lines = [
        `<span class="booking-calendar-event__user">${this.escapeHtml(input.user)}</span>`,
      ];
      if (input.company) {
        lines.push(
          `<span class="booking-calendar-event__company">${this.escapeHtml(input.company)}</span>`
        );
      }
      lines.push(
        `<span class="booking-calendar-event__bookable">${this.escapeHtml(input.name)}</span>`
      );
      return lines.join("<br>");
    },
    formatEventTime(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      const options = { hour: "numeric" };
      if (date.getMinutes() > 0) {
        options.minute = "2-digit";
      }
      return date.toLocaleTimeString("de-DE", options);
    },
    formatEventTimeRange(start, end) {
      const startLabel = this.formatEventTime(start);
      if (!end) return startLabel;
      const endLabel = this.formatEventTime(end);
      if (!endLabel || startLabel === endLabel) return startLabel;
      return `${startLabel} – ${endLabel}`;
    },
    escapeHtml(text) {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
    printCalendar() {
      this.selectedOpen = false;
      this.updateTitle();
      this.$nextTick(() => {
        const originalTitle = document.title;
        document.title = this.getPrintDocumentTitle();
        document.body.classList.add("booking-calendar-print");

        const cleanup = () => {
          document.body.classList.remove("booking-calendar-print");
          document.title = originalTitle;
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
      });
    },
    getPrintDocumentTitle() {
      const viewLabel = { day: "Tag", week: "Woche", month: "Monat" }[this.type];
      const period = this.sanitizeForFilename(this.calendarTitle || "Kalender");
      return `Buchungen-Kalender-${viewLabel}-${period}`;
    },
    sanitizeForFilename(value) {
      return value
        .trim()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    },
    onOpenBooking(bookingId) {
      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    commitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
    },
    rejectBooking(bookingId) {
      this.$emit("reject-booking", bookingId);
    },
    onOpenDeleteDialog(bookingId) {
      this.$emit("open-delete-dialog", bookingId);
    },
    updateTitle() {
      this.$nextTick(() => {
        if (this.$refs.calendar) {
          this.calendarTitle = this.$refs.calendar.title;
        }
      });
    },
    payBooking(bookingId) {
      this.$emit("pay-booking", bookingId);
    },
  },
  mounted() {
    this.updateTitle();
  },
  watch: {
    focus() {
      this.updateTitle();
    },
    type() {
      this.updateTitle();
    },
  },
};
</script>

<style scoped lang="scss">
.print-only {
  display: none;
}

.calendar-print-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-print-header__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 4px;
  line-height: 1.3;
}

.calendar-print-header__description {
  font-size: 0.95rem;
  margin: 0 0 2px;
  line-height: 1.4;
}

.calendar-print-header__meta {
  font-size: 0.8rem;
  margin: 0;
  color: rgba(0, 0, 0, 0.6);
}

.my-calendar {
  min-height: 600px;

  ::v-deep .v-event-timed .booking-calendar-event__company,
  ::v-deep .v-event-summary .booking-calendar-event__company {
    font-size: 0.82em;
    opacity: 0.9;
  }

}

.my-calendar--month {
  ::v-deep .v-event {
    white-space: normal !important;
    overflow: visible !important;
    height: auto !important;
    min-height: 44px;
    line-height: 1.2;
  }

  ::v-deep .v-event-summary {
    white-space: normal !important;
    display: block;
  }
}

.booking-calendar-event--month {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 1px 4px;
  font-size: 11px;
  line-height: 1.2;
  width: 100%;
  overflow: hidden;
}

.booking-calendar-event__line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.booking-calendar-event__time {
  flex-shrink: 0;
  font-weight: 700;
}

.booking-calendar-event__user {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.booking-calendar-event__company {
  font-size: 0.82em;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-calendar-event__bookable {
  font-size: 0.82em;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style lang="scss">
@media print {
  body.booking-calendar-print {
    .print-only {
      display: block !important;
    }

    .v-navigation-drawer,
    .v-app-bar,
    .page-header,
    .v-btn--fixed,
    .no-print,
    .v-menu__content {
      display: none !important;
    }

    h1.text-h5 {
      display: none !important;
    }

    .v-main {
      padding: 0 !important;
    }

    .v-container {
      max-width: 100% !important;
      padding: 0 !important;
    }

    .calendar-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }

    .calendar-print-header {
      border-bottom-color: rgba(0, 0, 0, 0.2);
    }

    .calendar-print-header__meta {
      color: rgba(0, 0, 0, 0.55);
    }

    .my-calendar {
      min-height: auto;
      box-shadow: none !important;
    }

    .v-calendar-weekly__head-weeknumber,
    .v-calendar-weekly__week-number {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .v-event {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    // Heutigen Tag nicht hervorheben (Druck/PDF)
    .v-calendar-weekly__head-weekday.v-present,
    .v-calendar-daily_head-day.v-present .v-calendar-daily_head-weekday {
      color: inherit !important;
    }

    .v-calendar-weekly__day.v-present .v-calendar-weekly__day-label .v-btn,
    .v-calendar-daily_head-day.v-present .v-calendar-daily_head-day-label .v-btn {
      background-color: transparent !important;
      color: inherit !important;
      box-shadow: none !important;
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      border-radius: 0 !important;
    }
  }
}
</style>

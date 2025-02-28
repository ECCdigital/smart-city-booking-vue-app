<template>
  <div>
    <v-toolbar flat dense>
      <v-btn icon @click="$refs.calendar.prev()">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>

      <v-btn text @click="setToday">Heute</v-btn>

      <v-btn icon @click="$refs.calendar.next()">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>

      <v-toolbar-title class="mx-4">
        {{ calendarTitle }}
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn-toggle v-model="type" dense color="secondary">
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
      indeterminate
      v-if="loading === true"
    ></v-progress-linear>
    <v-calendar
      class="my-calendar elevation-1"
      :type="type"
      ref="calendar"
      v-model="focus"
      color="primary"
      locale="de"
      weekdays="1,2,3,4,5,6,0"
      :events="events"
      :event-name="getEventName"
      event-overlap-mode="stack"
      event-color="primary"
      @click:event="showEvent"
    >
    </v-calendar>
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
          <v-divider></v-divider>
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
          <v-divider></v-divider>
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
    BookingPermissionService() {
      return BookingPermissionService;
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
        this.selectedEvent = event;
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
      return `<span>${event.input?.user}</span><br><span>${event.input?.name}</span>`;
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

<style scoped lang="scss"></style>

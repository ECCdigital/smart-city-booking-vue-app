<script>
import { mapGetters } from "vuex";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiEventService from "@/services/api/ApiEventService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import SectionCard from "@/components/commons/SectionCard.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import BookingExportButton from "@/components/Booking/BookingExportButton.vue";
import EventOccupancyRail from "./EventOccupancyRail.vue";
import {
  BOOKING_STATUS,
  statusColor,
  statusIcon,
  statusLabel,
} from "@/utils/bookingStatus";
import { bookingPageRoute } from "@/utils/bookingPageRoutes";
import {
  HOLDING_STATUSES,
  eventOccupancy,
  participants,
  ticketOccupancy,
} from "@/utils/eventManagement";

/**
 * The tab „Veranstaltungsmanagement“ of the event editing page: where the
 * event stands. The occupancy of the event and of each ticket - the tickets
 * held per state against the limit (`eventManagement`) - and the
 * participants, one row per booking, each opening its booking page, searched
 * and filtered by state with the search band of the booking list. It reads
 * the stored event, not the form: tickets and bookings are saved apart.
 */
export default {
  name: "EventManagement",
  components: {
    SectionCard,
    SearchBar,
    BookingExportButton,
    EventOccupancyRail,
  },
  props: {
    eventId: { type: String, required: true },
  },
  data() {
    return {
      tickets: [],
      bookings: [],
      loading: false,
      loadFailed: false,
      search: "",
      // The states picked behind the funnel; none, every booking.
      statusFilter: [],
      holdingStatuses: HOLDING_STATUSES,
    };
  },
  computed: {
    ...mapGetters({
      form: "events/form",
      tenantId: "tenants/currentTenantId",
    }),
    maxAttendees() {
      return this.form.attendees?.maxAttendees;
    },
    ticketRows() {
      return ticketOccupancy(this.tickets, this.bookings, this.maxAttendees);
    },
    total() {
      return eventOccupancy(this.ticketRows, this.maxAttendees);
    },
    allParticipants() {
      return participants(this.tickets, this.bookings);
    },
    /**
     * The filter card behind the funnel: the states holding tickets, in the
     * order of the booking list.
     */
    filterSections() {
      return [
        {
          key: "status",
          label: this.$t("booking.filter.status"),
          selected: this.statusFilter,
          options: Object.values(BOOKING_STATUS)
            .filter((status) => HOLDING_STATUSES.includes(status))
            .map((status) => ({
              value: status,
              label: statusLabel(status),
              color: statusColor(status),
              icon: statusIcon(status),
            })),
        },
      ];
    },
    filtered() {
      return !!(this.search || "").trim() || this.statusFilter.length > 0;
    },
    shownParticipants() {
      const term = (this.search || "").trim().toLowerCase();
      const statuses = this.statusFilter;
      return this.allParticipants.filter(
        (row) =>
          (!statuses.length || statuses.includes(row.status)) &&
          (!term ||
            [row.name, row.company, row.mail, row.id].some((value) =>
              String(value).toLowerCase().includes(term)
            ))
      );
    },
    /** The bookings behind the rows shown, for the export. */
    shownBookings() {
      const ids = new Set(this.shownParticipants.map((row) => row.id));
      return this.bookings.filter((booking) => ids.has(booking.id));
    },
    ownReachOnly() {
      return !BookingPermissionService.allowReadAny();
    },
    headline() {
      const { booked, capacity } = this.total;
      return capacity
        ? this.$t("event.manage.occupancy.ofCapacity", { booked, capacity })
        : this.$tc("event.manage.occupancy.booked", booked, { booked });
    },
    headers() {
      return [
        { text: this.$t("event.manage.participants.name"), value: "name" },
        {
          text: this.$t("event.manage.participants.tickets"),
          value: "ticketCount",
          align: "end",
        },
        {
          text: this.$t("event.manage.participants.status"),
          value: "status",
          sortable: false,
        },
        {
          text: this.$t("event.manage.participants.booked"),
          value: "timeCreated",
        },
        { text: "", value: "open", sortable: false, align: "end", width: 1 },
      ];
    },
  },
  watch: {
    eventId: { immediate: true, handler: "load" },
  },
  methods: {
    statusColor,
    statusIcon,
    statusLabel,
    async load() {
      this.loading = true;
      this.loadFailed = false;
      try {
        const [bookables, bookings] = await Promise.all([
          ApiBookablesService.getBookables(),
          ApiEventService.getEventBookings(this.eventId),
        ]);
        this.tickets = (bookables.data || []).filter(
          (b) => b.type === "ticket" && b.eventId === this.eventId
        );
        this.bookings = bookings.data || [];
      } catch (error) {
        this.loadFailed = true;
      } finally {
        this.loading = false;
      }
    },
    capacityLabel(row) {
      if (!row.capacity) return this.$t("event.manage.tickets.unlimited");
      return this.$t("event.manage.tickets.ofCapacity", {
        booked: row.booked,
        capacity: row.capacity,
      });
    },
    /** Date and time on two lines, to keep the column narrow. */
    formatDate(value) {
      if (!value) return "–";
      return new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(
        new Date(value)
      );
    },
    formatTime(value) {
      if (!value) return "";
      return new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(
        new Date(value)
      );
    },
    onFilter(key, selection) {
      if (key === "status") this.statusFilter = selection;
    },
    openBooking(row) {
      this.$router.push(bookingPageRoute(row.id, this.tenantId));
    },
  },
};
</script>

<template>
  <div class="event-manage" data-test="event-management">
    <v-progress-linear
      v-if="loading && !tickets.length"
      indeterminate
      color="primary"
    />

    <v-alert
      v-if="loadFailed"
      dense
      text
      type="error"
      class="text-body-2"
      data-test="manage-load-failed"
    >
      {{ $t("event.manage.loadFailed") }}
      <template #append>
        <v-btn small text color="error" @click="load">
          {{ $t("event.manage.retry") }}
        </v-btn>
      </template>
    </v-alert>

    <template v-else-if="!loading || tickets.length">
      <SectionCard
        icon="mdi-chart-box-outline"
        :title="$t('event.manage.occupancy.title')"
      >
        <div v-if="!tickets.length" class="event-manage__empty">
          <p>{{ $t("event.manage.tickets.none") }}</p>
          <v-btn
            small
            outlined
            color="primary"
            data-test="manage-to-tickets"
            @click="$emit('go', { tab: 'tickets' })"
          >
            {{ $t("event.manage.tickets.toTickets") }}
          </v-btn>
        </div>

        <template v-else>
          <div class="event-manage__total">
            <div>
              <div class="event-manage__headline" data-test="manage-headline">
                {{ headline }}
              </div>
              <div
                v-if="total.capacity"
                class="event-manage__sub text--secondary"
              >
                {{
                  $tc(
                    "event.manage.occupancy.free",
                    Math.max(total.capacity - total.booked, 0)
                  )
                }}
              </div>
            </div>
            <v-btn
              small
              text
              color="primary"
              :loading="loading"
              data-test="manage-refresh"
              @click="load"
            >
              <v-icon left small>mdi-refresh</v-icon>
              {{ $t("event.manage.refresh") }}
            </v-btn>
          </div>

          <EventOccupancyRail
            :by-status="total.byStatus"
            :capacity="total.capacity"
            large
          />

          <ul class="event-manage__legend">
            <li v-for="status in holdingStatuses" :key="status">
              <span
                class="event-manage__swatch"
                :class="[
                  statusColor(status),
                  { 'event-manage__swatch--open': status === 'requested' },
                ]"
              />
              {{ statusLabel(status) }}
              <b>{{ total.byStatus[status] }}</b>
            </li>
            <li v-if="total.released" class="text--secondary">
              {{ $tc("event.manage.occupancy.released", total.released) }}
            </li>
          </ul>

          <div class="event-edit__label mt-6">
            {{ $t("event.manage.tickets.title") }}
          </div>
          <div class="event-manage__tickets" data-test="manage-tickets">
            <div
              v-for="row in ticketRows"
              :key="row.id"
              class="event-manage__ticket"
            >
              <div class="event-manage__ticket-name">
                <span class="font-weight-medium">{{ row.title }}</span>
                <v-chip v-if="!row.isBookable" x-small label outlined>
                  {{ $t("event.edit.tickets.notBookable") }}
                </v-chip>
              </div>
              <EventOccupancyRail
                class="event-manage__ticket-rail"
                :by-status="row.byStatus"
                :capacity="row.capacity"
              />
              <div
                class="event-manage__ticket-count"
                :class="{
                  'event-manage__ticket-count--over':
                    row.capacity && row.booked > row.capacity,
                }"
                :title="
                  row.capacity && !row.ownCapacity
                    ? $t('event.manage.tickets.sharedCapacity')
                    : null
                "
              >
                <v-icon
                  v-if="row.capacity && !row.ownCapacity"
                  x-small
                  class="mr-1"
                >
                  mdi-account-group-outline
                </v-icon>
                {{ capacityLabel(row) }}
              </div>
            </div>
          </div>
        </template>
      </SectionCard>

      <SectionCard
        icon="mdi-account-multiple-outline"
        :title="$t('event.manage.participants.title')"
        :badge="
          $tc('event.manage.participants.count', shownParticipants.length)
        "
      >
        <p v-if="ownReachOnly" class="event-edit__note mb-4">
          <v-icon small>mdi-account-lock-outline</v-icon>
          {{ $t("event.manage.participants.ownReach") }}
        </p>

        <SearchBar
          v-model="search"
          :fields="$t('event.manage.participants.search')"
          :filters="filterSections"
          class="event-manage__search"
          data-test="manage-search"
          @filter="onFilter"
        >
          <template #actions>
            <BookingExportButton :bookings="shownBookings" :tenant="tenantId" />
          </template>
        </SearchBar>

        <v-data-table
          :headers="headers"
          :items="shownParticipants"
          :items-per-page="25"
          :footer-props="{
            'items-per-page-options': [25, 50, 100, -1],
            'items-per-page-text': $t('event.manage.participants.perPage'),
            'items-per-page-all-text': $t('event.manage.participants.all'),
          }"
          sort-by="timeCreated"
          sort-desc
          class="event-manage__table"
          data-test="manage-participants"
          @click:row="openBooking"
        >
          <template #item.name="{ item }">
            <div class="event-manage__person">
              <span class="font-weight-medium">{{ item.name || "–" }}</span>
              <span v-if="item.company" class="text-caption text--secondary">
                {{ item.company }}
              </span>
              <a
                v-if="item.mail"
                :href="`mailto:${item.mail}`"
                class="event-manage__mail text-caption"
                @click.stop
              >
                {{ item.mail }}
              </a>
            </div>
          </template>
          <template #item.ticketCount="{ item }">
            <div class="event-manage__items">
              <span v-for="entry in item.items" :key="entry.id">
                <b>{{ entry.amount }}</b> × {{ entry.title }}
              </span>
            </div>
          </template>
          <template #item.status="{ item }">
            <v-chip
              small
              :color="statusColor(item.status)"
              text-color="white"
              class="font-weight-medium"
            >
              <v-icon left x-small>{{ statusIcon(item.status) }}</v-icon>
              {{ statusLabel(item.status) }}
            </v-chip>
          </template>
          <template #item.timeCreated="{ item }">
            <div class="text-no-wrap">{{ formatDate(item.timeCreated) }}</div>
            <div class="text-caption text--secondary">
              {{ formatTime(item.timeCreated) }}
            </div>
          </template>
          <template #item.open="{ item }">
            <v-tooltip left>
              <template #activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  color="primary"
                  v-bind="attrs"
                  :aria-label="$t('event.manage.participants.open')"
                  :data-test="`manage-open-${item.id}`"
                  v-on="on"
                  @click.stop="openBooking(item)"
                >
                  <v-icon small>mdi-open-in-app</v-icon>
                </v-btn>
              </template>
              <span>{{ $t("event.manage.participants.open") }}</span>
            </v-tooltip>
          </template>
          <template #no-data>
            <div class="event-manage__empty py-6">
              {{
                filtered
                  ? $t("event.manage.participants.noMatch")
                  : $t("event.manage.participants.none")
              }}
            </div>
          </template>
        </v-data-table>
      </SectionCard>
    </template>
  </div>
</template>

<style scoped>
.event-manage__total {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--scb-space-4);
  margin-bottom: var(--scb-space-3);
}

.event-manage__headline {
  font-size: var(--scb-font-size-lead);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
  font-variant-numeric: tabular-nums;
}

.event-manage__sub {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-sm);
}

.event-manage__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--scb-space-2) var(--scb-space-5);
  margin: var(--scb-space-3) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.event-manage__legend li {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-2);
}

.event-manage__legend b {
  color: var(--scb-text);
  font-variant-numeric: tabular-nums;
}

.event-manage__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

/* Angefragt is held, but not yet sure: striped, as on the rail. */
.event-manage__swatch--open {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.55) 0 2px,
    transparent 2px 4px
  );
}

.event-manage__tickets {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.event-manage__ticket {
  display: grid;
  grid-template-columns: minmax(140px, 1.2fr) 2fr minmax(96px, auto);
  align-items: center;
  gap: var(--scb-space-4);
  min-height: var(--scb-row-height);
  padding: var(--scb-space-2) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
}

.event-manage__ticket + .event-manage__ticket {
  border-top: 1px solid var(--scb-rule);
}

.event-manage__ticket-name {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  min-width: 0;
}

.event-manage__ticket-count {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  font-variant-numeric: tabular-nums;
  color: var(--scb-text);
  white-space: nowrap;
}

.event-manage__ticket-count--over {
  color: var(--v-error-base);
  font-weight: var(--scb-font-weight-semibold);
}

/* The band of the booking list, narrower inside the card: the export
   beside it, at the far end, not in a row beneath. */
.event-manage__search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-3) var(--scb-space-5);
  margin-bottom: var(--scb-space-3);
}

.event-manage__search >>> .scb-search {
  flex: 0 1 420px;
}

.event-manage__search >>> .scb-toolbar {
  margin-top: 0;
  margin-left: auto;
}

/* Rounded as the frames around it (the ticket list, the section card),
   not as the app's lists (App.vue, 25px). */
.event-manage__table {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface) !important;
  overflow: hidden !important;
}

.event-manage__table >>> .v-data-table__wrapper {
  border-radius: var(--scb-radius-surface) var(--scb-radius-surface) 0 0 !important;
}

.event-manage__table >>> thead th:first-child {
  border-top-left-radius: var(--scb-radius-surface) !important;
}

.event-manage__table >>> thead th:last-child {
  border-top-right-radius: var(--scb-radius-surface) !important;
}

/* Narrower cells than the app's lists (App.vue, 16px), so that the button
   to the booking fits beside the overview. */
.event-manage__table >>> tbody td,
.event-manage__table >>> thead th {
  padding-left: var(--scb-space-3) !important;
  padding-right: var(--scb-space-3) !important;
}

.event-manage__table >>> tbody td:last-child,
.event-manage__table >>> thead th:last-child {
  padding-left: 0 !important;
  padding-right: var(--scb-space-2) !important;
}

/* The footer on the header's background (App.vue), closing the frame;
   dense, as the rows above it. */
.event-manage__table >>> .v-data-footer {
  min-height: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: var(--scb-font-size-xs);
}

.event-manage__table >>> .v-data-footer .v-select {
  margin: 0 0 0 var(--scb-space-3) !important;
  padding: 0;
}

.event-manage__table >>> .v-data-footer {
  border-top: 1px solid var(--scb-surface-border);
  border-radius: 0 0 var(--scb-radius-surface) var(--scb-radius-surface) !important;
}

.event-manage__table.theme--light >>> .v-data-footer {
  background-color: #e5f5fc !important;
}

.event-manage__table >>> tbody tr {
  cursor: pointer;
}

.event-manage__person,
.event-manage__items {
  display: flex;
  flex-direction: column;
  padding: var(--scb-space-1) 0;
}

.event-manage__items {
  align-items: flex-end;
  text-align: right;
}

.event-manage__mail {
  color: var(--scb-text-link);
  text-decoration: none;
}

.event-manage__mail:hover {
  text-decoration: underline;
}

.event-manage__empty {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
  text-align: center;
}

.event-manage__empty p {
  margin-bottom: var(--scb-space-3);
}

@media (max-width: 599px) {
  .event-manage__ticket {
    grid-template-columns: 1fr auto;
  }

  .event-manage__ticket-rail {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>

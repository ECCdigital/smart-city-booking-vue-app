<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import FormatService from "@/services/FormatService";
import eventEditing from "@/mixins/eventEditing";
import { REGISTRATION } from "@/utils/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

/**
 * The tab „Tickets“: how the event becomes bookable. An event is not booked
 * itself; bookers book a ticket - a bookable of the type „Ticket“ that names
 * the event in `eventId`. The tab explains that, lists the tickets of the
 * event and opens the ticket editor, the event already chosen.
 */
export default {
  name: "EventEditTickets",
  components: { SectionCard },
  mixins: [eventEditing],
  data() {
    return { tickets: [], loading: false, loadFailed: false };
  },
  computed: {
    needsTickets() {
      return this.registrationMode === REGISTRATION.PORTAL;
    },
    eventId() {
      return this.form.id;
    },
    noneBookable() {
      return !this.loading && !this.tickets.some((t) => t.isBookable === true);
    },
    steps() {
      return ["event", "ticket", "booking"];
    },
  },
  watch: {
    eventId: { immediate: true, handler: "load" },
  },
  methods: {
    async load() {
      this.tickets = [];
      this.loadFailed = false;
      if (!this.eventId) return;
      this.loading = true;
      try {
        const response = await ApiBookablesService.getBookables();
        this.tickets = (response.data || []).filter(
          (b) => b.type === "ticket" && b.eventId === this.eventId
        );
      } catch (error) {
        this.loadFailed = true;
      } finally {
        this.loading = false;
      }
    },
    priceOf(ticket) {
      const price = ticket.priceCategories?.[0]?.priceEur;
      if (price === undefined || price === null || price === "") {
        return this.$t("event.edit.tickets.noPrice");
      }
      const amount = Number(String(price).replace(",", "."));
      if (!amount) return this.$t("event.edit.tickets.free");
      return FormatService.currency(amount);
    },
    editTicket(ticket) {
      this.$router.push({ name: "ticket-edit", query: { id: ticket.id } });
    },
    addTicket() {
      this.$router.push({
        name: "ticket-edit",
        query: { eventId: this.eventId },
      });
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-tickets"
    icon="mdi-ticket-outline"
    :title="$t('event.edit.cards.tickets')"
  >
    <p
      v-if="!needsTickets"
      class="event-edit__note"
      data-test="tickets-not-needed"
    >
      <v-icon small>mdi-information-outline</v-icon>
      {{
        $t("event.edit.tickets.notNeeded", {
          mode: $t(`event.edit.participation.${registrationMode}.label`),
        })
      }}
    </p>

    <template v-else>
      <ol class="event-tickets__how">
        <li
          v-for="step in steps"
          :key="step"
          :class="{ 'event-tickets__how--main': step === 'ticket' }"
        >
          <b>{{ $t(`event.edit.tickets.how.${step}.title`) }}</b>
          <span>{{ $t(`event.edit.tickets.how.${step}.text`) }}</span>
        </li>
      </ol>

      <p
        v-if="!eventId"
        class="event-edit__note"
        data-test="tickets-save-first"
      >
        <v-icon small>mdi-content-save-outline</v-icon>
        {{ $t("event.edit.tickets.saveFirst") }}
      </p>

      <template v-else>
        <v-alert v-if="loadFailed" dense text type="error" class="text-body-2">
          {{ $t("event.edit.tickets.loadFailed") }}
        </v-alert>
        <v-alert
          v-else-if="noneBookable"
          dense
          text
          type="warning"
          class="text-body-2"
          data-test="tickets-none-bookable"
        >
          {{ $t("event.edit.tickets.noneBookable") }}
        </v-alert>

        <div class="event-edit__label">
          {{ $t("event.edit.tickets.list") }}
        </div>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-card
          v-else-if="tickets.length"
          outlined
          class="event-tickets__list"
          data-test="tickets-list"
        >
          <div
            v-for="ticket in tickets"
            :key="ticket.id"
            class="event-tickets__row"
          >
            <v-icon color="primary">mdi-ticket-confirmation-outline</v-icon>
            <div class="event-tickets__name">
              <span class="font-weight-medium">{{ ticket.title }}</span>
              <span class="text-caption text--secondary">
                {{ priceOf(ticket) }}
              </span>
            </div>
            <v-chip
              x-small
              label
              :color="ticket.isBookable ? 'success' : undefined"
              :outlined="!ticket.isBookable"
            >
              {{
                ticket.isBookable
                  ? $t("event.edit.tickets.bookable")
                  : $t("event.edit.tickets.notBookable")
              }}
            </v-chip>
            <v-btn small text color="primary" @click="editTicket(ticket)">
              <v-icon small left>mdi-open-in-new</v-icon>
              {{ $t("event.edit.tickets.edit") }}
            </v-btn>
          </div>
        </v-card>
        <p v-else class="event-edit__note">
          {{ $t("event.edit.tickets.empty") }}
        </p>

        <v-btn
          small
          outlined
          color="primary"
          class="mt-3"
          data-test="tickets-add"
          @click="addTicket"
        >
          <v-icon small left>mdi-plus</v-icon>
          {{ $t("event.edit.tickets.add") }}
        </v-btn>
        <div class="event-edit__hint">
          {{ $t("event.edit.tickets.addHint") }}
        </div>
      </template>

      <ul class="event-tickets__facts">
        <li>
          <v-icon small color="primary">mdi-calendar-remove-outline</v-icon>
          {{ $t("event.edit.tickets.factEnd") }}
        </li>
        <li>
          <v-icon small color="primary">mdi-account-multiple-outline</v-icon>
          {{ $t("event.edit.tickets.factPlaces") }}
        </li>
        <li>
          <v-icon small color="primary">mdi-cash</v-icon>
          {{ $t("event.edit.tickets.factPrice") }}
        </li>
      </ul>
    </template>
  </SectionCard>
</template>

<style scoped>
.event-tickets__how {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--scb-space-6);
  margin: 0 0 var(--scb-space-5);
  padding: 0;
  list-style: none;
  counter-reset: how;
}

.event-tickets__how li {
  position: relative;
  display: grid;
  gap: var(--scb-space-1);
  align-content: start;
  padding: var(--scb-space-3);
  border: 1px solid var(--scb-rule);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface-tint);
  counter-increment: how;
}

.event-tickets__how li::before {
  content: counter(how);
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--v-primary-base);
  background: var(--scb-selected-tint-strong);
}

.event-tickets__how li + li::after {
  content: "→";
  position: absolute;
  top: 50%;
  left: calc(-1 * var(--scb-space-5));
  transform: translateY(-50%);
  color: var(--scb-text-caption);
}

.event-tickets__how--main {
  border-color: var(--v-primary-base) !important;
  background: var(--scb-selected-tint) !important;
}

.event-tickets__how--main::before {
  color: #fff !important;
  background: var(--v-primary-base) !important;
}

.event-tickets__how span {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.event-tickets__list {
  margin-top: var(--scb-space-2);
}

.event-tickets__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: var(--scb-space-3);
  align-items: center;
  padding: var(--scb-space-2) var(--scb-space-3);
}

.event-tickets__row + .event-tickets__row {
  border-top: 1px solid var(--scb-rule);
}

.event-tickets__name {
  display: grid;
  min-width: 0;
}

.event-tickets__facts {
  display: grid;
  gap: var(--scb-space-2);
  margin: var(--scb-space-5) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

@media (max-width: 599px) {
  .event-tickets__how {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--scb-space-5);
  }

  .event-tickets__how li + li::after {
    content: "↓";
    top: calc(-1 * var(--scb-space-5));
    left: 50%;
    transform: translateX(-50%);
  }

  .event-tickets__row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
}
</style>

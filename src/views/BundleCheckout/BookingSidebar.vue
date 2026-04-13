<template>
  <v-card outlined class="rounded-sm booking-sidebar">
    <v-card-title class="d-flex align-center py-3">
      <v-icon left>mdi-calendar-multiple</v-icon>
      <span>Buchungsübersicht</span>
      <v-spacer></v-spacer>
      <v-chip small :color="allValid ? 'success' : 'warning'" dark>
        {{ validCount }}/{{ bookingAttempts.length }}
      </v-chip>
    </v-card-title>

    <v-divider></v-divider>

    <div v-if="bookingAttempts.length === 0" class="pa-4 text-center">
      <v-icon size="48" color="grey lighten-1" class="mb-2">
        mdi-calendar-blank-outline
      </v-icon>
      <p class="grey--text">Noch keine Buchungen generiert.</p>
    </div>

    <v-list
      v-else
      dense
      class="booking-list pa-0"
    >
      <template v-for="(attempt, index) in bookingAttempts">
        <v-list-item
          :key="'attempt-' + index"
          :class="{
            'booking-item--valid': attempt.valid === true,
            'booking-item--invalid': attempt.valid === false,
            'booking-item--pending': attempt.valid == null,
          }"
          class="booking-item"
        >
          <v-list-item-icon class="mr-2 my-auto">
            <v-icon
              v-if="attempt.valid === true"
              color="success"
              small
            >
              mdi-check-circle
            </v-icon>
            <v-icon
              v-else-if="attempt.valid === false"
              color="error"
              small
            >
              mdi-alert-circle
            </v-icon>
            <v-icon v-else color="grey" small>
              mdi-clock-outline
            </v-icon>
          </v-list-item-icon>

          <v-list-item-content class="py-1">
            <v-list-item-title class="text-body-2">
              {{ formatDate(attempt.timeBegin) }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ formatTime(attempt.timeBegin) }} –
              {{ formatTime(attempt.timeEnd) }}
            </v-list-item-subtitle>
            <v-list-item-subtitle
              v-if="attempt.valid === false && attempt.error"
              class="text-caption error--text"
            >
              <span
                v-for="(err, idx) in attempt.error"
                :key="idx"
              >
                {{ err }}
              </span>
            </v-list-item-subtitle>
          </v-list-item-content>

          <v-list-item-action class="my-auto ml-1" style="flex-direction: row">
            <span
              v-if="attempt.userPriceEur != null"
              class="text-caption font-weight-medium mr-1"
            >
              {{ attempt.userPriceEur | currency }}
            </span>
            <v-btn
              icon
              x-small
              @click="$emit('remove-booking-attempt', index)"
            >
              <v-icon small>mdi-close</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider
          :key="'div-' + index"
          v-if="index < bookingAttempts.length - 1"
        ></v-divider>
      </template>
    </v-list>

    <!-- Zusatzobjekte -->
    <template v-if="subsequentItems.length > 0">
      <v-divider></v-divider>
      <v-card-subtitle class="pb-1 pt-3 text-caption font-weight-bold">
        Ergänzungen
      </v-card-subtitle>
      <v-list dense class="pa-0">
        <v-list-item
          v-for="item in subsequentItems"
          :key="'sub-' + item.bookableId"
          class="pl-4"
        >
          <v-list-item-icon class="mr-2 my-auto">
            <v-icon small color="primary">mdi-plus-circle-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content class="py-1">
            <v-list-item-title class="text-body-2">
              {{ item.bookable?.title || item.bookableId }}
            </v-list-item-title>
            <v-list-item-subtitle
              v-if="item.mandatory"
              class="text-caption"
            >
              Pflicht
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action v-if="!item.mandatory" class="my-auto">
            <v-btn
              icon
              x-small
              @click="$emit('remove-subsequent-item', item.bookableId)"
            >
              <v-icon small>mdi-close</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </template>

    <!-- Zusammenfassung -->
    <template v-if="bookingAttempts.length > 0">
      <v-divider></v-divider>
      <v-card-text class="py-3">
        <div class="d-flex justify-space-between text-body-2">
          <span>Buchungen</span>
          <span>{{ bookingAttempts.length }}</span>
        </div>
        <div
          v-if="invalidCount > 0"
          class="d-flex justify-space-between text-body-2 error--text"
        >
          <span>Nicht verfügbar</span>
          <span>{{ invalidCount }}</span>
        </div>
        <v-divider class="my-2"></v-divider>
        <div class="d-flex justify-space-between font-weight-bold">
          <span>Gesamt</span>
          <span>{{ totalPrice | currency }}</span>
        </div>
      </v-card-text>
    </template>
  </v-card>
</template>

<script>
export default {
  name: "BookingSidebar",

  props: {
    bookingAttempts: {
      type: Array,
      default: () => [],
    },
    subsequentItems: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    allValid() {
      return (
        this.bookingAttempts.length > 0 &&
        this.bookingAttempts.every((a) => a.valid === true)
      );
    },
    validCount() {
      return this.bookingAttempts.filter((a) => a.valid === true).length;
    },
    invalidCount() {
      return this.bookingAttempts.filter((a) => a.valid === false).length;
    },
    totalPrice() {
      return this.bookingAttempts.reduce(
        (sum, a) => sum + (a.userPriceEur || 0),
        0
      );
    },
  },

  methods: {
    formatDate(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      return date.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    formatTime(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
};
</script>

<style scoped>
.booking-sidebar {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.booking-list {
  max-height: 400px;
  overflow-y: auto;
}

.booking-item--valid {
  border-left: 3px solid #4caf50;
}

.booking-item--invalid {
  border-left: 3px solid #f44336;
  background-color: rgba(244, 67, 54, 0.04);
}

.booking-item--pending {
  border-left: 3px solid #9e9e9e;
}
</style>

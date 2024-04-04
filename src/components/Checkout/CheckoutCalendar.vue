<template>
  <div>
    <v-row class="mb-1">
      <v-col>
        <h3 class="text-h5">
          {{
            new Date(focus).toLocaleString("de-DE", {
              month: "long",
              year: "numeric",
            })
          }}
        </h3>
      </v-col>

      <v-col class="col-auto">
        <v-btn
          class="me-2"
          @click="today()"
          title="Zum heutigen Datum springen"
        >
          Heute
        </v-btn>
        <v-btn
          class="me-2"
          @click="prev()"
          :disabled="loading === true || allowPrevPage === false"
          title="Zurück blättern"
        >
          <v-icon small> mdi-arrow-left-circle-outline </v-icon>
        </v-btn>
        <v-btn
          @click="next()"
          :disabled="loading === true"
          title="Weiter blättern"
        >
          <v-icon small> mdi-arrow-right-circle-outline </v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <v-progress-linear
      indeterminate
      v-if="loading === true"
    ></v-progress-linear>
    <v-sheet height="400">
      <v-calendar
        type="4day"
        ref="checkoutCalendar"
        color="primary"
        locale="de"
        weekdays="1,2,3,4,5,6,0"
        :events="events"
        :first-interval="7"
        :interval-count="16"
        :event-ripple="false"
        event-color="#999"
        :start="startDate"
        v-model="focus"
      ></v-calendar>
    </v-sheet>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";

export default {
  props: {
    bookableId: {
      type: String,
      required: true,
    },
    tenant: {
      type: String,
      required: true,
    },
    bookingTimeBegin: {
      type: Number,
    },
    bookingTimeEnd: {
      type: Number,
    },
    amount: {
      type: Number,
      default: 1,
    },
  },
  data: () => ({
    loading: false,
    availabilityItems: [],
    startDate: undefined,
    focus: new Date().toISOString().split("T")[0],
    fetchedUntil: undefined,
    test: undefined,
  }),

  computed: {
    events() {
      const av = this.availabilityItems.map((item) => {
        return {
          name: "Nicht verfügbar",
          start: new Date(item.timeBegin),
          end: new Date(item.timeEnd),
          timed: true,
        };
      });

      av.push({
        name: "Ihre Buchung",
        start: new Date(this.bookingTimeBegin),
        end: new Date(this.bookingTimeEnd),
        timed: true,
        color: "primary",
      });

      return av;
    },

    allowPrevPage() {
      return new Date(this.focus) > new Date();
    },
  },

  watch: {
    bookingTimeBegin() {
      this.focus = new Date(this.bookingTimeBegin).toISOString().split("T")[0];
    },
    amount() {
      this.fetchedUntil = undefined;
      this.availabilityItems = [];
      this.fetchEvents();
    },
    async focus() {
      await this.fetchEvents();
    },
  },

  methods: {
    fetchEvents() {
      // Date Begin is the last fetched date + 1
      let dateBegin = new Date();
      if (this.fetchedUntil) {
        dateBegin = new Date(this.fetchedUntil);
        dateBegin.setTime(dateBegin.getTime() + 1000 * 60 * 60 * 24);
      }

      // The date until data should be loaded is 3 days after the current focus date
      const dateEnd = new Date(this.focus);
      dateEnd.setTime(dateEnd.getTime() + (3 * 24 * 60 * 60 * 1000));

      // If the calendar is currently loading or the dateBegin is after the dateEnd, not data should be fetched to prevent double fetching
      if (this.loading === true || dateBegin >= dateEnd) {
        return;
      }

      this.loading = true;
      ApiBookablesService.getBookableAvailability(
        this.bookableId,
        this.tenant,
        dateBegin.toISOString().split("T")[0],
        dateEnd.toISOString().split("T")[0],
        this.amount
      ).then((response) => {
        // Add new fetched data to the existing data and set new fetchedUntil date
        this.availabilityItems = this.availabilityItems.concat(response.data);
        this.fetchedUntil = dateEnd.toISOString().split("T")[0];
        this.loading = false;
      });
    },
    async next() {
      this.$refs.checkoutCalendar.next();
    },
    async prev() {
      if (this.allowPrevPage === true) {
        this.$refs.checkoutCalendar.prev();
      }
    },
    async today() {
      this.focus = new Date().toISOString().split("T")[0];
    },
  },

  async mounted() {
    await this.fetchEvents();
  },
};
</script>

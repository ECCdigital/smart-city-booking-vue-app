<template>
  <AdminLayout class="pb-15">
    <v-row>
      <v-col class="col-auto">
        <v-alert
          class="custom-alert"
          v-if="!eventCountCheck"
          type="info"
          elevation="2"
        >
          Sie haben die maximale Anzahl an öffentlichen Events erreicht. Erweitern Sie Ihr Kontingent, oder löschen Sie nicht mehr benötigte Events.
        </v-alert>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-select
          class="filter-field"
          v-model="filters"
          :items="api.tags"
          prepend-inner-icon="mdi-filter-variant"
          label="Filtern"
          hide-selected
          no-data-text="Keine Filtermöglichkeiten gefunden"
          multiple
          clearable
          chips
          solo
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="remove(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-select>
      </v-col>
      <v-col cols="auto">
        <v-checkbox
          v-model="hidePastEvents"
          label="Vergangene ausblenden"
          class="mt-2"
        ></v-checkbox>
      </v-col>
    </v-row>
    <v-row gutters align="stretch">
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        v-for="(event, index) in filteredEvents.slice().reverse()"
        :key="index"
        class="mx-xs-auto d-flex flex-column"
        height="100%"
      >
        <v-skeleton-loader type="card" class="flex" :loading="loading">
          <event-card
            :item="event"
            :from-route="$router.currentRoute.name"
            @delete="removeBookable(event.id)"
            @duplicate="duplicateEvent(event.id)"
          ></event-card>
        </v-skeleton-loader>
      </v-col>
    </v-row>
    <v-fab-transition>
      <v-btn
        color="primary"
        fixed
        large
        bottom
        right
        rounded
        class="v-btn"
        :to="{ name: 'event-create-information' }"
        :disabled="createDisabled"
      >
        <v-icon>mdi-plus</v-icon>
        Veranstaltung erstellen
      </v-btn>
    </v-fab-transition>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import EventCard from "@/components/EventCard";
import { mapGetters, mapActions } from "vuex";
import ApiEventService from "@/services/api/ApiEventService";
import ToastService from "@/services/ToastService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import { slice } from "lodash";

export default {
  components: {
    AdminLayout,
    EventCard,
  },
  data() {
    return {
      api: {
        events: [],
        tags: [],
      },
      filters: [],
      hidePastEvents: true,
      eventCountCheck: true,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
    }),
    createDisabled() {
      return !this.BookablePermissionService.allowCreate();
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
    filteredEvents() {
      // Check if filter is set

      return this.api.events
        .filter((event) => {
          // Check if element has tags
          if (this.filters.length > 0) {
            if (
              _.isNil(event.information.tags) ||
              event.information.tags.length === 0
            ) {
              return false;
            }

            // Check if the element includes every selected chip/service
            return this.filters.every((chip) =>
              event.information.tags.includes(chip)
            );
          }

          if (
            this.hidePastEvents === true &&
            (_.isNil(event.information.startDate) ||
              new Date(event.information.endDate) < new Date())
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          return (
            new Date(b.information.startDate) -
            new Date(a.information.startDate)
          );
        });
    },
  },
  methods: {
    slice,
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),
    remove(item) {
      this.filters.splice(this.filters.indexOf(item), 1);
    },
    async removeBookable(eventId) {
      await this.startLoading("fetch-delete-event");
      ApiEventService.deleteEvent(eventId)
        .then(() => {
          this.fetchEvents();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("event.delete.success", "success")
          );
          this.stopLoading("fetch-delete-event");
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast("errors.something-wrong", "error")
          );
          console.log(error);
        });
      await this.getEventCount();
    },
    async duplicateEvent(eventId) {
      await this.startLoading("fetch-duplicate-event");
      ApiEventService.duplicateEvent(eventId)
        .then(() => {
          this.fetchEvents();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("event.duplicate.success", "success")
          );
          this.stopLoading("fetch-duplicate-event");
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast("event.duplicate.errors.something-wrong", "error")
          );
          console.log(error);
        });
      await this.getEventCount();
    },
    fetchFilterTags() {
      ApiEventService.getTags()
        .then((response) => {
          this.api.tags = response.data;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    fetchEvents() {
      this.startLoading("fetch-events");
      ApiEventService.getEvents()
        .then((response) => {
          this.api.events = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-events");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async getEventCount() {
      this.eventCountCheck = await ApiEventService.publicEventCountCheck();
    },
  },
  async mounted() {
    await this.getEventCount();
  },
  created() {
    this.fetchEvents();
    this.fetchFilterTags();
  },
};
</script>

<style scoped>
.filter-field {
  border-radius: 15px;
}

.custom-alert {
  border-radius: 15px !important;
}
</style>

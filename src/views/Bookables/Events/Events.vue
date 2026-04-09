<template>
  <AdminLayout class="pb-15">
    <v-row v-if="!eventCountCheck">
      <v-col class="col-auto">
        <v-alert class="custom-alert" type="info" elevation="2">
          Sie haben die maximale Anzahl an öffentlichen Events erreicht.
          Erweitern Sie Ihr Kontingent, oder löschen Sie nicht mehr benötigte
          Events.
        </v-alert>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <Search
          :items="api.events"
          v-model="searchResults"
          placeholder="Veranstaltung suchen…"
          :keys="searchKeys"
          filter-key="information.tags"
          :filter-options="api.tags"
          :sortable="true"
          :sort-options="[
            { text: 'Titel', value: 'information.name' },
            { text: 'Datum', value: 'information.startDate' },
            { text: 'Öffentlich', value: 'isPublic' },
            { text: 'Kostenfrei', value: 'attendees.free' },
            { text: 'Max. Teilnehmer', value: 'attendees.maxAttendees' },
          ]"
        ></Search>
      </v-col>
    </v-row>
    <v-row no-gutters class="mt-3">
      <v-col cols="auto" class="mr-2">
        <v-chip color="primary" small>
          Sichtbar: {{ publicEventsCount }}
        </v-chip>
      </v-col>
      <v-col cols="auto">
        <v-chip color="grey lighten-2" small>
          Gesamt: {{ totalEventsCount }}
        </v-chip>
      </v-col>
      <v-spacer />
      <v-col cols="auto">
        <v-menu offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-chip
              small
              outlined
              v-bind="attrs"
              v-on="on"
              :disabled="api.events.length === 0"
              class="clickable"
            >
              <v-icon left x-small>mdi-calendar-export</v-icon>
              iCal Export
            </v-chip>
          </template>
          <v-list dense>
            <v-list-item @click="downloadAllEventsIcal">
              <v-list-item-icon>
                <v-icon small>mdi-download</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  Alle Termine als .ics herunterladen
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="showFeedUrlDialog">
              <v-list-item-icon>
                <v-icon small>mdi-rss</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title> iCal-Feed abonnieren </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>
    <v-row gutters align="stretch" class="mt-1">
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
        v-for="event in displayedEvents.slice().reverse()"
        :key="event.id"
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
      <div class="floating-menu-container">
        <v-menu :disabled="createDisabled">
          <template v-slot:activator="{ on }">
            <div class="split-btn">
              <v-btn
                rounded
                large
                color="primary"
                dark
                class="main-btn"
                :to="{ name: buttonTarget?.to }"
              >
                <v-icon>mdi-plus</v-icon>Veranstaltung erstellen
              </v-btn>
              <v-btn
                v-on="on"
                rounded
                large
                color="primary"
                dark
                class="actions-btn"
              >
                <v-icon left>mdi-menu-down</v-icon>
              </v-btn>
            </div>
          </template>

          <v-list>
            <v-list-item-group v-model="activeTarget" color="primary">
              <v-list-item
                v-for="(item, index) in items"
                :key="index"
                :to="{ name: item.to }"
              >
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-menu>
      </div>
    </v-fab-transition>

    <v-dialog v-model="feedUrlDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-sync</v-icon>
          Kalender-Feed abonnieren
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 grey--text text--darken-1 mb-4">
            Fügen Sie diese URL in Ihrem Kalender-Client hinzu (z.B. Google
            Calendar, Apple Kalender, Outlook), um Events automatisch zu
            synchronisieren.
          </p>
          <v-text-field
            :value="feedUrl"
            readonly
            outlined
            dense
            append-icon="mdi-content-copy"
            @click:append="copyFeedUrl"
            @focus="$event.target.select()"
            :hint="feedUrlCopied ? '✓ In Zwischenablage kopiert!' : ''"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="feedUrlDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
import Search from "@/components/commons/Search.vue";

export default {
  components: {
    Search,
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
      buttonTarget: null,
      activeTarget: null,
      items: [
        {
          title: "Detaillierte Event-Erstellung",
          to: "event-create-information",
        },
        { title: "Einfache Event-Erstellung", to: "simple-event-creator" },
      ],
      searchResults: [],
      searchKeys: ["id", "information.name", "eventOrganizer.name"],
      feedUrlDialog: false,
      feedUrl: "",
      feedUrlCopied: false,
      feedUrlCopiedTimeout: null,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenant: "tenants/currentTenant",
      tenantId: "tenants/currentTenantId",
    }),
    createDisabled() {
      return !this.BookablePermissionService.allowCreate();
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
    displayedEvents() {
      return this.searchResults;
    },
    publicEventsCount() {
      return this.api.events.filter((event) => event.isPublic).length;
    },
    totalEventsCount() {
      return this.api.events.length;
    },
  },
  watch: {
    tenantId() {
      this.fetchEvents();
      this.fetchFilterTags();
    },
  },
  methods: {
    slice,
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),
    setButtonTarget(target) {
      this.buttonTarget = target;
      this.activeTarget = this.items.findIndex((item) => item.to === target.to);
    },
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
            ToastService.createToast(
              "event.duplicate.errors.something-wrong",
              "error"
            )
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
    setInitialButtonTarget() {
      if (this.tenant?.defaultEventCreationMode === "simple") {
        this.buttonTarget = this.items[1];
        this.activeTarget = 1;
      } else {
        this.buttonTarget = this.items[0];
        this.activeTarget = 0;
      }
    },
    async downloadAllEventsIcal() {
      const ids = this.api.events.map((event) => event.id);
      if (ids.length === 0) return;
      try {
        const response = await ApiEventService.downloadEventsIcal(ids);
        this.triggerIcalDownload(response.data, "alle-events.ics");
      } catch (error) {
        console.error("iCal download failed:", error);
        await this.addToast(
          ToastService.createToast("event.ical.error", "error")
        );
      }
    },
    showFeedUrlDialog() {
      this.feedUrl = ApiEventService.getEventsFeedUrl();
      this.feedUrlCopied = false;
      this.feedUrlDialog = true;
    },
    async copyFeedUrl() {
      await navigator.clipboard.writeText(this.feedUrl);
      this.feedUrlCopied = true;
      if (this.feedUrlCopiedTimeout) clearTimeout(this.feedUrlCopiedTimeout);
      this.feedUrlCopiedTimeout = setTimeout(() => {
        this.feedUrlCopied = false;
      }, 2000);
    },
    triggerIcalDownload(data, filename) {
      const blob = new Blob([data], {
        type: "text/calendar;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  },
  async mounted() {
    await this.getEventCount();
    this.setInitialButtonTarget();
  },
  created() {
    this.fetchEvents();
    this.fetchFilterTags();
  },
  beforeDestroy() {
    if (this.feedUrlCopiedTimeout) clearTimeout(this.feedUrlCopiedTimeout);
  },
};
</script>

<style scoped>
.main-btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  padding-right: 2px !important;
}

.actions-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  padding: 0 !important;
  min-width: 35px !important;
  margin-left: 0.5px;
}

.split-btn {
  display: inline-block;
}

.filter-field {
  border-radius: 15px;
}

.custom-alert {
  border-radius: 15px !important;
}

.floating-menu-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
}
</style>

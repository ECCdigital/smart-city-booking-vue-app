<template>
  <v-card
    :class="[
      'event-card',
      'fill-height',
      'd-flex',
      'flex-column',
      { 'event-card--unavailable': !item.isPublic },
    ]"
    hover
    @click="navigateToEdit"
  >
    <div class="event-card-header position-relative">
      <div class="menu-container">
        <v-menu offset-y>
          <template v-slot:activator="{ on: menu, attrs }">
            <v-tooltip bottom>
              <template v-slot:activator="{ on: tooltip }">
                <v-btn icon v-bind="attrs" v-on="{ ...tooltip, ...menu }">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <span>Schnellaktionen</span>
            </v-tooltip>
          </template>
          <v-list dense>
            <v-list-item link @click="downloadIcal">
              <v-list-item-icon>
                <v-icon>mdi-calendar-export</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Termin herunterladen</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="copyFeedUrl">
              <v-list-item-icon>
                <v-icon>
                  {{ feedCopied ? "mdi-check" : "mdi-calendar-sync" }}
                </v-icon>
              </v-list-item-icon>
              <v-list-item-title>
                {{
                  feedCopied ? "Feed-URL kopiert!" : "Kalender-Feed abonnieren"
                }}
              </v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item
              link
              @click="downloadEventBookings(item.id, item.tenantId)"
              :disabled="!BookablePermissionService.allowUpdate(item)"
            >
              <v-list-item-icon>
                <v-icon>mdi-account-group</v-icon>
              </v-list-item-icon>
              <v-list-item-title>
                Teilnehmerliste herunterladen
              </v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item
              link
              @click="emitDuplicateAction"
              :disabled="duplicateDisabled"
            >
              <v-list-item-icon>
                <v-icon>mdi-content-copy</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Duplizieren</v-list-item-title>
            </v-list-item>
            <v-divider
              v-if="BookablePermissionService.allowDelete(item)"
            ></v-divider>
            <v-list-item
              class="red--text"
              link
              @click="emitDeleteAction"
              :disabled="!BookablePermissionService.allowDelete(item)"
              v-if="BookablePermissionService.allowDelete(item)"
            >
              <v-list-item-icon>
                <v-icon color="red">mdi-delete</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Löschen</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <v-img
        v-if="item.information?.teaserImage"
        :lazy-src="item.information?.teaserImage"
        aspect-ratio="16/9"
        :src="item.information?.teaserImage"
        class="event-image"
        height="200"
      >
        <div v-if="!item.isPublic" class="status-badges pa-3">
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip small color="warning" class="elevation-2" v-on="on">
                <v-icon small left>mdi-eye-off</v-icon>
                Nicht gelistet
              </v-chip>
            </template>
            <span>Nicht öffentlich sichtbar</span>
          </v-tooltip>
        </div>
      </v-img>

      <div v-else class="placeholder-container">
        <PlaceholderPattern variant="poly" :theme="isDark ? 'dark' : 'light'" />

        <div v-if="!item.isPublic" class="status-badges pa-3">
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip small color="warning" class="elevation-2" v-on="on">
                <v-icon small left>mdi-eye-off</v-icon>
                Nicht gelistet
              </v-chip>
            </template>
            <span>Nicht öffentlich sichtbar</span>
          </v-tooltip>
        </div>
      </div>
    </div>

    <div class="event-card-title pa-4 text-center">
      <h3
        class="font-weight-bold mb-1 title-dynamic"
        :class="titleSizeClass"
        :title="item.information?.name"
      >
        {{ item.information?.name }}
      </h3>
    </div>

    <v-divider></v-divider>

    <v-card-text class="flex-grow-1 pa-4 event-card-content">
      <div class="mb-3">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2">
            mdi-calendar
          </v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            Veranstaltungsdaten
          </span>
        </div>
        <div class="ml-7">
          <div class="d-flex align-start mb-2 text-body-2">
            <span
              class="font-weight-bold grey--text text--darken-2 mr-2"
              style="min-width: 50px"
            >
              Beginn:
            </span>
            <span class="grey--text text--darken-1">
              {{ item.information?.startDate | date("short") }} –
              {{ item.information?.startTime | time("short") }} Uhr
            </span>
          </div>
          <div class="d-flex align-start mb-2 text-body-2">
            <span
              class="font-weight-bold grey--text text--darken-2 mr-2"
              style="min-width: 50px"
            >
              Ende:
            </span>
            <span class="grey--text text--darken-1">
              {{ item.information?.endDate | date("short") }} –
              {{ item.information?.endTime | time("short") }} Uhr
            </span>
          </div>
          <div
            class="d-flex align-start text-body-2"
            v-if="item.eventLocation?.name"
          >
            <span
              class="font-weight-bold grey--text text--darken-2 mr-2"
              style="min-width: 50px"
            >
              Ort:
            </span>
            <span class="grey--text text--darken-1">
              {{ item.eventLocation?.name }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="item.information?.teaserText" class="mb-3 text-body-2">
        <p
          class="grey--text text--darken-2 mb-0"
          v-html="item.information?.teaserText"
        ></p>
      </div>

      <div class="mb-3">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2">
            mdi-account
          </v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            Teilnehmer
          </span>
        </div>
        <div class="ml-7">
          <div class="text-body-2 mb-2">
            <span
              v-if="item.attendees?.maxAttendees"
              class="grey--text text--darken-1"
            >
              {{ bookedSeatsCount }} / {{ item.attendees.maxAttendees }} Plätze
              belegt
            </span>
            <span v-else class="grey--text text--darken-1">
              {{ bookedSeatsCount }} Plätze gebucht
            </span>
          </div>
          <v-progress-linear
            v-if="item.attendees?.maxAttendees"
            :value="(bookedSeatsCount / item.attendees.maxAttendees) * 100"
            height="8"
            color="primary"
            rounded
            class="mb-1"
          ></v-progress-linear>
        </div>
      </div>

      <div class="mb-3" v-if="item.attendees?.free">
        <div class="d-flex align-center text-body-2">
          <v-icon small color="success" class="mr-2">mdi-cash-check</v-icon>
          <span class="success--text font-weight-bold">Kostenfrei</span>
        </div>
      </div>
      <div class="mb-3" v-else-if="item.attendees?.priceCategories?.price">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2">mdi-cash</v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            Preis
          </span>
        </div>
        <div class="ml-7">
          <span class="font-weight-bold primary--text text-body-2">
            {{
              item.attendees?.priceCategories?.price | currency("EUR", "de-DE")
            }}
          </span>
        </div>
      </div>

      <div v-if="item.information?.flags && item.information.flags.length > 0">
        <div class="ml-3">
          <div
            v-for="(flag, index) in item.information.flags.slice(0, 3)"
            :key="index"
            class="d-flex align-center mb-1 text-body-2"
          >
            <v-icon x-small color="success" class="mr-2">mdi-check</v-icon>
            <span class="grey--text text--darken-2">{{ flag }}</span>
          </div>
          <span
            v-if="item.information.flags.length > 3"
            class="text-caption grey--text ml-5"
          >
            +{{ item.information.flags.length - 3 }} weitere
          </span>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import ApiEventService from "@/services/api/ApiEventService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiExportService from "@/services/api/ApiExportService";
import PlaceholderPattern from "@/components/commons/PlaceholderPattern.vue";

export default {
  components: { PlaceholderPattern },
  props: {
    fromRoute: String,
    item: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isDuplicateAllowed: true,
      seatsBooked: null,
      feedCopied: false,
      feedCopiedTimeout: null,
    };
  },
  computed: {
    titleSizeClass() {
      const len = this.item.information?.name?.length || 0;
      if (len <= 25) return "text-h6";
      if (len <= 50) return "text-subtitle-1";
      return "text-body-2";
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
    isDark() {
      return this.$vuetify?.theme?.dark || false;
    },
    duplicateDisabled() {
      return (
        !this.BookablePermissionService.allowCreate() ||
        !this.isDuplicateAllowed
      );
    },
    bookedSeatsCount() {
      return this.seatsBooked;
    },
  },
  methods: {
    emitDeleteAction() {
      this.$emit("delete");
    },
    emitDuplicateAction() {
      this.$emit("duplicate");
    },
    navigateToEdit() {
      if (this.BookablePermissionService.allowUpdate(this.item)) {
        this.$router.push({
          name: "event-create-information",
          query: { id: this.item.id, fromRoute: this.fromRoute },
        });
      }
    },
    async downloadEventBookings(id, tenantId) {
      const response = await ApiExportService.getEventBookingsExport(
        tenantId,
        id
      );
      const eventTitle = this.item.information?.name || "Veranstaltung";
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Teilnehmerliste_${eventTitle}_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    async downloadIcal() {
      try {
        const response = await ApiEventService.downloadEventIcal(this.item.id);
        this.triggerIcalDownload(
          response.data,
          `event-${this.item.information?.name || this.item.id}.ics`
        );
      } catch (error) {
        console.error("iCal download failed:", error);
      }
    },
    async copyFeedUrl() {
      const url = ApiEventService.getEventFeedUrl(this.item.id);
      await navigator.clipboard.writeText(url);
      this.feedCopied = true;
      if (this.feedCopiedTimeout) clearTimeout(this.feedCopiedTimeout);
      this.feedCopiedTimeout = setTimeout(() => {
        this.feedCopied = false;
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
    async setAllowDuplicate() {
      const eventCountCheck = await ApiEventService.publicEventCountCheck();
      this.isDuplicateAllowed = eventCountCheck || !this.item.isPublic;
    },
    async fetchBookedSeats() {
      const result = await ApiEventService.getBookedSeatsCount(this.item.id);
      if (result && result.bookedSeats) {
        this.seatsBooked = result.bookedSeats;
      } else {
        this.seatsBooked = 0;
      }
    },
  },
  async mounted() {
    await this.fetchBookedSeats();
    await this.setAllowDuplicate();
  },
  beforeDestroy() {
    if (this.feedCopiedTimeout) clearTimeout(this.feedCopiedTimeout);
  },
};
</script>

<style scoped lang="scss">
.placeholder-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.event-card {
  max-width: 400px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  cursor: default;
  position: relative;
  border-radius: 12px !important;
  overflow: hidden;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.event-card--unavailable {
  opacity: 0.85;
}

.event-card-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.event-card-title {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .event-card-header,
.theme--dark .event-card-title {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.event-image {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  transition: transform 0.3s ease;
}

.event-card:hover .event-image {
  transform: scale(1.02);
}

.status-badges {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.4) 0%,
    transparent 100%
  );
}

.position-relative {
  position: relative;
}

.event-card-content {
  max-height: 350px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.theme--dark .event-card-content {
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

.menu-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.title-dynamic {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  transition: font-size 0.2s ease;
}
</style>

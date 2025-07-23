<template>
  <v-card class="mx-auto accent flex d-flex flex-column" height="100%">
    <div>
      <v-img
        :lazy-src="item.information?.teaserImage"
        height="200px"
        max-height="200px"
        aspect-ratio="16/9"
        class="rounded-img"
        :src="
          item.information?.teaserImage
            ? item.information?.teaserImage
            : defaultImage
        "
      >
        <v-overlay
          :absolute="true"
          :value="!item.isPublic"
          class="align-start justify-start"
        >
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-icon class="ml-2" v-on="on" v-if="!item.isPublic" size="75"
                >mdi-eye-off-outline</v-icon
              >
            </template>
            <span
              >Das Buchungsobjekt ist für die Öffentlichkeit nicht
              sichtbar</span
            >
          </v-tooltip>
        </v-overlay>
      </v-img>
    </div>
    <v-card-title>{{ item.information?.name }}</v-card-title>
    <v-card-subtitle class="">
      <v-row no-gutters>
        <v-col class="col-2 font-weight-bold">
          <small>Beginn:</small>
        </v-col>
        <v-col>
          {{ item.information?.startDate | date("short") }} –
          {{ item.information?.startTime | time("short") }} Uhr
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col class="col-2 font-weight-bold">
          <small>Ende:</small>
        </v-col>
        <v-col>
          {{ item.information?.endDate | date("short") }} –
          {{ item.information?.endTime | time("short") }} Uhr
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col class="col-2 font-weight-bold">
          <small>Ort:</small>
        </v-col>
        <v-col>
          {{ item.eventLocation?.name }}
        </v-col>
      </v-row>

      <p class="mt-2 mb-0" v-html="item.information?.teaserText"></p>
    </v-card-subtitle>

    <v-card-text
      class="font-weight-bold title pb-0"
      color="grey darken-1"
      v-if="item.attendees?.free"
    >
      Kostenfrei
    </v-card-text>
    <v-card-text
      class="font-weight-bold title pb-0"
      color="grey darken-1"
      v-else-if="item.attendees?.priceCategories.price"
    >
      <!-- An neue Struktur anpassen, wenn klar -->
      {{ item.attendees?.priceCategories.price | currency("EUR", "de-DE") }}
    </v-card-text>

    <v-card-text
      class="font-weight-bold title pb-0"
      color="grey darken-1"
      v-if="item.attendees?.maxAttendees"
      title="Maximale Teilnehmerzahl"
    >
      <v-icon class="pe-2" size="23">mdi-account</v-icon>
      <span class="subtitle-1">{{ item.attendees?.maxAttendees }}</span>
    </v-card-text>

    <v-card-text color="grey darken-1" v-if="item.information?.flags">
      <ul class="unstyled-list">
        <li v-for="flag in item.information?.flags" :key="flag" class="d-flex">
          <v-icon class="pe-2" size="23">mdi-check</v-icon>
          <div class="subtitle-1">{{ flag }}</div>
        </li>
      </ul>
    </v-card-text>

    <v-card-actions class="py-4 mt-auto">
      <v-spacer></v-spacer>
      <v-btn
        class="secondary"
        color="black"
        rounded
        text
        :to="{
          name: 'event-create-information',
          query: { id: item.id, fromRoute: fromRoute },
        }"
        :disabled="!BookablePermissionService.allowUpdate(item)"
      >
        Bearbeiten
      </v-btn>

      <v-menu offset-y>
        <template v-slot:activator="{ on: menu, attrs }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn icon v-bind="attrs" v-on="{ ...tooltip, ...menu }">
                <v-icon size="25">mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <span>Einstellungen</span>
          </v-tooltip>
        </template>
        <v-list dense>
          <v-list-item
            link
            :href="eventBookingsDownloadLink(item.id, item.tenantId)"
            target="_blank"
            :disabled="!BookablePermissionService.allowUpdate(item)"
          >
            <v-list-item-icon>
              <v-icon>mdi-account-group</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Teilnehmerliste herunterladen</v-list-item-title>
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
    </v-card-actions>
  </v-card>
</template>

<script>
import ApiEventService from "@/services/api/ApiEventService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";

export default {
  props: {
    fromRoute: String,
    item: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      defaultImage: require("@/assets/bookable-default.jpg"),
      isDuplicateAllowed: true,
    };
  },
  computed: {
    BookablePermissionService() {
      return BookablePermissionService;
    },
    duplicateDisabled() {
      return (
        !this.BookablePermissionService.allowCreate() ||
        !this.isDuplicateAllowed
      );
    },
  },
  methods: {
    emitDeleteAction() {
      this.$emit("delete");
    },
    emitDuplicateAction() {
      this.$emit("duplicate");
    },
    eventBookingsDownloadLink(id, tenantId) {
      return `${process.env.VUE_APP_SERVER_BASE_URL}/csv/${tenantId}/events/${id}/bookings`;
    },
    async setAllowDuplicate() {
      const eventCountCheck = await ApiEventService.publicEventCountCheck();
      this.isDuplicateAllowed = eventCountCheck || !this.item.isPublic;
    },
  },
  created() {},
  mounted() {
    this.setAllowDuplicate();
  },
};
</script>

<style scoped lang="scss">
.unstyled-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.rounded-img {
  border-top-left-radius: 25px !important;
  border-top-right-radius: 25px !important;
  height: 200px;
  max-height: 200px;
}
</style>

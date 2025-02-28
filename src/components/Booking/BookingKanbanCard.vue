<template>
  <v-card class="mb-2" style="max-width: 450px">
    <v-app-bar flat>
      <v-toolbar-title class="text-h6 pl-0">
        <div v-if="element.bookingItem">
          {{ element.bookingItem.name || "Unbekannt" }}
        </div>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-menu offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item @click="onOpenBooking(element.bookingItem.id)">
            <v-list-item-icon>
              <v-icon>mdi-information</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchungsdetails anzeigen</v-list-item-title>
          </v-list-item>

          <v-divider></v-divider>

          <v-list-item @click="onOpenEditBooking(element.bookingItem.id)">
            <v-list-item-icon>
              <v-icon>mdi-pencil</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung bearbeiten</v-list-item-title>
          </v-list-item>

          <v-list-item @click="commitBooking(element.bookingItem.id)">
            <v-list-item-icon>
              <v-icon>mdi-checkbox-marked-circle</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung freigeben</v-list-item-title>
          </v-list-item>

          <v-list-item @click="archiveTask(element.id)">
            <v-list-item-icon>
              <v-icon>mdi-archive</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung archivieren</v-list-item-title>
          </v-list-item>

          <v-list-item
            v-if="!backlog"
            @click="
              moveTask(
                { added: { element: { id: element.id }, newIndex: 0 } },
                'backlog'
              )
            "
          >
            <v-list-item-icon>
              <v-icon>mdi-database</v-icon>
            </v-list-item-icon>
            <v-list-item-title>In Backlog verschieben</v-list-item-title>
          </v-list-item>

          <v-divider> </v-divider>

          <v-list-item link @click="rejectBooking(element.id)">
            <v-list-item-icon>
              <v-icon>mdi-close-circle</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Buchung stornieren</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-card-text v-if="element.bookingItem">
      <v-row no-gutters>
        <v-col>
          {{ element.bookingItem.bookableItems[0]?._bookableUsed?.title }}
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col> Buchungsnummer: {{ element.bookingItem?.id }} </v-col>
      </v-row>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-rating
        v-if="!backlog"
        class="mr-4"
        empty-icon="mdi-circle-outline"
        full-icon="mdi-circle"
        readonly
        dense
        length="4"
        size="10"
        background-color="purple lighten-3"
        :color="
          durationInStatus(element.added) >= 4
            ? 'error'
            : durationInStatus(element.added) >= 2
            ? 'warning'
            : 'success'
        "
        :value="durationInStatus(element.added)"
      ></v-rating>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: "BookingKanbanCard",
  props: {
    element: Object,
    backlog: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    durationInStatus(dateAdded) {
      const now = Date.now();
      const diff = now - dateAdded;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days >= 7) {
        return 4;
      } else if (days >= 5) {
        return 3;
      } else if (days >= 3) {
        return 2;
      } else if (days >= 1) {
        return 1;
      } else {
        return 1;
      }
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
    archiveTask(taskId) {
      this.$emit("archive-task", taskId);
    },
    moveTask(event, status) {
      this.$emit("move-task", event, status);
    },
  },
};
</script>

<style scoped></style>

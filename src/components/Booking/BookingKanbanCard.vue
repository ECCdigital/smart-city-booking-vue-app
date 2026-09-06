<template>
  <v-card
    class="kanban-card mb-2"
    :class="{
      'kanban-card--dragging': isDragging,
      'kanban-card--series': !!element.bookingItem?.groupBooking,
    }"
    @click="onOpenBooking(element.bookingItem.id)"
    hover
    outlined
  >
    <div class="d-flex align-center pa-2 pb-0">
      <div class="flex-grow-1 overflow-hidden">
        <div class="text-subtitle-2 font-weight-medium text-truncate">
          {{ element.bookingItem?.name || "Unbekannt" }}
        </div>
        <div class="text-caption grey--text text-truncate">
          #{{ element.bookingItem?.id }}
        </div>
      </div>

      <v-menu offset-y left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon x-small v-bind="attrs" v-on="on" @click.stop>
            <v-icon small>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item @click.stop="onOpenBooking(element.bookingItem.id)">
            <v-list-item-icon>
              <v-icon small>mdi-information</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Details</v-list-item-title>
          </v-list-item>

          <v-list-item @click.stop="onOpenEditBooking(element.bookingItem.id)">
            <v-list-item-icon>
              <v-icon small>mdi-pencil</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Bearbeiten</v-list-item-title>
          </v-list-item>

          <v-list-item
            v-if="element.bookingItem?.groupBooking"
            @click.stop="onOpenGroupBooking(element.bookingItem.groupBooking)"
          >
            <v-list-item-icon>
              <v-icon small>mdi-calendar-multiple</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Serienbuchung öffnen</v-list-item-title>
          </v-list-item>

          <v-divider />

          <v-list-item
            v-for="action in transitionActions(element.bookingItem?.status)"
            :key="action"
            :disabled="
              !BookingPermissionService.allowUpdate(element.bookingItem)
            "
            @click.stop="transition(action, element.bookingItem.id)"
          >
            <v-list-item-icon>
              <v-icon small :color="actionColor(action)">
                {{ actionIcon(action) }}
              </v-icon>
            </v-list-item-icon>
            <v-list-item-title>
              {{ actionLabel(action, element.bookingItem.status) }}
            </v-list-item-title>
          </v-list-item>

          <v-list-item @click.stop="archiveTask(element.id)">
            <v-list-item-icon>
              <v-icon small>mdi-archive</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Archivieren</v-list-item-title>
          </v-list-item>

          <v-list-item
            v-if="!backlog"
            @click.stop="
              moveTask(
                { added: { element: { id: element.id }, newIndex: 0 } },
                'backlog'
              )
            "
          >
            <v-list-item-icon>
              <v-icon small>mdi-inbox-arrow-down</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Ins Backlog</v-list-item-title>
          </v-list-item>

          <v-divider />
        </v-list>
      </v-menu>
    </div>

    <div class="px-2 py-1">
      <div
        v-if="bookableTitle"
        class="text-caption text-truncate"
        :title="bookableTitle"
      >
        <v-icon x-small class="mr-1">mdi-package-variant</v-icon>
        {{ bookableTitle }}
      </div>
      <v-chip
        v-if="element.bookingItem?.groupBooking"
        x-small
        color="primary"
        text-color="white"
        class="mt-1 series-chip"
        @click.stop="onOpenGroupBooking(element.bookingItem.groupBooking)"
      >
        <v-icon x-small left>mdi-calendar-multiple</v-icon>
        Serie {{ truncate(element.bookingItem.groupBooking, 10) }}
      </v-chip>
    </div>

    <div class="d-flex align-center justify-space-between px-2 pb-2">
      <div class="d-flex align-center flex-wrap" style="gap: 4px">
        <v-chip
          v-if="element.bookingItem?.status"
          x-small
          :color="statusColor(element.bookingItem.status)"
          text-color="white"
        >
          <v-icon x-small left>{{
            statusIcon(element.bookingItem.status)
          }}</v-icon>
          {{ statusLabel(element.bookingItem.status) }}
        </v-chip>

        <v-chip
          v-if="isFree(element.bookingItem)"
          x-small
          :color="freeChip.color"
          :text-color="freeChip.textColor"
        >
          <v-icon x-small left>{{ freeChip.icon }}</v-icon>
          {{ freeChip.label }}
        </v-chip>
      </div>

      <v-tooltip v-if="!backlog" top>
        <template v-slot:activator="{ on, attrs }">
          <div v-bind="attrs" v-on="on" class="duration-indicator">
            <div class="duration-dot" :class="durationClass" />
            <span class="text-caption grey--text">{{ daysInStatus }}d</span>
          </div>
        </template>
        <span>{{ daysInStatus }} Tag(e) in diesem Status</span>
      </v-tooltip>
    </div>
  </v-card>
</template>

<script>
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import {
  actionColor,
  actionIcon,
  actionLabel,
  freeMarker,
  isFree,
  statusColor,
  statusIcon,
  statusLabel,
  transitionActions,
} from "@/utils/bookingStatus";

export default {
  name: "BookingKanbanCard",
  props: {
    element: {
      type: Object,
      required: true,
    },
    backlog: {
      type: Boolean,
      default: false,
    },
    isDragging: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    BookingPermissionService() {
      return BookingPermissionService;
    },
    bookableTitle() {
      return this.element.bookingItem?.bookableItems?.[0]?._bookableUsed?.title;
    },
    daysInStatus() {
      const now = Date.now();
      const diff = now - this.element.added;
      return Math.floor(diff / (1000 * 60 * 60 * 24), 0);
    },
    durationClass() {
      const days = this.daysInStatus;
      if (days >= 4) return "duration--critical";
      if (days >= 2) return "duration--warning";
      return "duration--ok";
    },
    freeChip() {
      return freeMarker();
    },
  },
  methods: {
    actionColor,
    actionIcon,
    actionLabel,
    isFree,
    statusColor,
    statusIcon,
    statusLabel,
    transitionActions,
    onOpenBooking(bookingId) {
      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    onOpenGroupBooking(groupBookingId) {
      this.$emit("open-group-booking", groupBookingId);
    },
    truncate(text, max = 25) {
      if (!text) return "";
      return text.length > max ? text.slice(0, max - 1) + "…" : text;
    },
    /** A transition of `BOOKING_ACTION`; the host runs it through `BookingTransitions`. */
    transition(action, bookingId) {
      this.$emit("transition", action, bookingId);
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

<style scoped lang="scss">
.series-chip {
  cursor: pointer;
  max-width: 100%;
}

.kanban-card {
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
  cursor: grab;
  min-width: 200px;
  max-width: 220px;

  &--series {
    border-left: 3px solid var(--v-primary-base) !important;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }

  &:active {
    cursor: grabbing;
  }

  &--dragging {
    opacity: 0.8;
    transform: rotate(2deg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
  }
}

.duration-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.duration-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.duration--ok {
  background-color: var(--v-success-base);
}

.duration--warning {
  background-color: var(--v-warning-base);
}

.duration--critical {
  background-color: var(--v-error-base);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.theme--dark .kanban-card {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>

<template>
  <div class="kanban-column" :class="{ 'kanban-column--dragging': dragging }">
    <div class="kanban-column-header">
      <div class="d-flex align-center">
        <span class="text-subtitle-2 font-weight-bold">{{ title }}</span>
        <v-chip
          x-small
          :color="count > 0 ? 'primary' : 'grey'"
          text-color="white"
          class="ml-2"
        >
          {{ count }}
        </v-chip>
      </div>
      <v-progress-circular
        v-if="isLoading"
        indeterminate
        color="primary"
        size="16"
        width="2"
      />
    </div>

    <div class="kanban-column-body">
      <draggable
        class="kanban-column-content custom-scrollbar"
        :list="tasks"
        group="bookings"
        :move="onMove"
        ghost-class="ghost-card"
        chosen-class="chosen-card"
        drag-class="drag-card"
        @change="onChange"
        @end="onDragEnd"
        @start="onDragStart"
      >
        <transition-group
          type="transition"
          name="flip-list"
          tag="div"
          class="kanban-drop-zone"
        >
          <BookingKanbanCard
            v-for="element in tasks"
            :key="element.id"
            :element="element"
            :backlog="statusId === 'backlog'"
            @open-booking="onOpenBooking"
            @open-edit-booking="onOpenEditBooking"
            @open-group-booking="onOpenGroupBooking"
            @commit-booking="onCommitBooking"
            @pay-booking="onPayBooking"
            @reject-booking="onRejectBooking"
            @archive-task="onArchiveTask"
            @move-task="onMoveTask"
          />
        </transition-group>
      </draggable>

      <!-- Empty State Overlay -->
      <div v-if="tasks.length === 0" class="empty-state-overlay">
        <v-icon color="grey lighten-1" size="32">mdi-inbox-outline</v-icon>
        <span class="text-caption grey--text mt-2">Keine Buchungen</span>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import BookingKanbanCard from "@/components/Booking/BookingKanbanCard.vue";

export default {
  name: "BookingKanbanColumn",
  components: { BookingKanbanCard, draggable },

  props: {
    tasks: {
      type: Array,
      required: true,
    },
    statusId: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    count: {
      type: Number,
      default: 0,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    dragging: {
      type: Boolean,
      default: false,
    },
  },

  methods: {
    onChange(evt) {
      this.$emit("change-task", evt, this.statusId);
    },
    onDragStart(evt) {
      this.$emit("drag-start", evt);
    },
    onDragEnd(evt) {
      this.$emit("drag-end", evt);
    },
    onMove(evt) {
      this.$emit("drag-move", evt);
      return true;
    },
    onOpenBooking(bookingId) {
      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    onOpenGroupBooking(groupBookingId) {
      this.$emit("open-group-booking", groupBookingId);
    },
    onCommitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
    },
    onPayBooking(id) {
      this.$emit("pay-booking", id);
    },
    onRejectBooking(bookingId) {
      this.$emit("reject-booking", bookingId);
    },
    onArchiveTask(taskId) {
      this.$emit("archive-task", taskId);
    },
    onMoveTask(event, statusId) {
      this.$emit("move-task", event, statusId);
    },
  },
};
</script>

<style scoped lang="scss">
.kanban-column {
  flex: 0 0 auto;
  width: 240px;
  min-width: 240px;
  max-width: 320px;
  margin: 0 6px;
  display: flex;
  flex-direction: column;
  background: var(--v-accent-base);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.kanban-column-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

.kanban-column-content {
  flex: 1;
  padding: 8px;
  min-height: 100%;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.2s ease;
  border-radius: 0 0 12px 12px;
}

.kanban-drop-zone {
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  pointer-events: none;
}

.kanban-column--dragging {
  .kanban-column-content {
    background: var(--v-accent-darken1);
    border: 2px dashed var(--v-primary-lighten2);
  }

  .empty-state-overlay {
    opacity: 0.3;
  }
}

.ghost-card {
  opacity: 0.4;
  background: var(--v-primary-lighten4) !important;
  border: 2px dashed var(--v-primary-base) !important;
}

.chosen-card {
  opacity: 0.9;
}

.drag-card {
  transform: rotate(3deg);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2) !important;
}

.flip-list-move {
  transition: transform 0.3s ease;
}

.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.25);
    }
  }
}

.theme--dark {
  .kanban-column {
    background: rgba(255, 255, 255, 0.05);
  }

  .kanban-column-header {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .custom-scrollbar {
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
}

.drop-in {
  background: var(--v-primary-lighten5) !important;
}
</style>

<template>
  <div class="mx-2 pa-1 task-panel">
    <div class="mb-4 d-flex">
      <div class="text-overline">{{ title }} {{ count }}</div>
      <v-spacer></v-spacer>
      <v-progress-circular
        v-if="isLoading"
        indeterminate
        color="primary"
        size="20"
      />
    </div>

    <draggable
      class="my-scrollbar pa-2"
      :list="tasks"
      group="bookings"
      :move="onMove"
      :class="dragging ? 'dragging' : ''"
      @change="onChange"
      @end="onDragEnd"
      @start="onDragStart"
      style="
        height: 70vh;

        min-width: 150px;
        max-width: 350px;
        overflow-y: auto;
      "
    >
      <!-- Einzelne Karten -->
      <BookingKanbanCard
        v-for="element in tasks"
        :key="element.id"
        :element="element"
        class="mx-2"
        @open-booking="onOpenBooking"
        @open-edit-booking="onOpenEditBooking"
        @commit-booking="onCommitBooking"
        @reject-booking="onRejectBooking"
        @archive-task="onArchiveTask"
        @move-task="onMoveTask"
      />
    </draggable>
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
    },

    onOpenBooking(bookingId) {
      this.$emit("open-booking", bookingId);
    },
    onOpenEditBooking(bookingId) {
      this.$emit("open-edit-booking", bookingId);
    },
    onCommitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
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
.task-panel {
  background-color: var(--v-accent-base);
  border-radius: 10px;
}

.my-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background-color: #fff;
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #999;
    border-radius: 10px;
  }
}

.dragging {
  outline: 2px dashed var(--v-accent-darken4);
  outline-offset: -2px; // verschiebt den Outline etwas nach innen
  border-radius: 10px; // Rundungen gelten weiterhin für das Element
  background-color: var(--v-accent-darken1);
}

.drop-in {
  background-color: var(--v-accent-darken2) !important;
}
</style>

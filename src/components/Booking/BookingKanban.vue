<template>
  <div class="kanban-wrapper">
    <div v-if="showScrollLeft" class="scroll-indicator-left">
      <v-icon @click="scrollLeft">mdi-chevron-left</v-icon>
    </div>
    <div v-if="showScrollRight" class="scroll-indicator-right">
      <v-icon @click="scrollRight">mdi-chevron-right</v-icon>
    </div>
    <div
      class="d-flex kanban-container"
      ref="kanbanContainer"
      style="width: 100%"
      @scroll="onScroll"
    >
      <v-slide-x-transition>
        <BookingKanbanColumn
          v-if="showBacklog"
          statusId="backlog"
          :tasks="combinedBacklog"
          title="Backlog"
          :count="combinedBacklog.length"
          :is-loading="isLoading"
          :dragging="dragging"
          @change-task="handleChangeTask"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
          @drag-move="onMove"
          @open-booking="onOpenBooking"
          @open-edit-booking="onOpenEditBooking"
          @commit-booking="commitBooking"
          @reject-booking="rejectBooking"
          @archive-task="archiveTask"
          @move-task="moveTask"
        />
      </v-slide-x-transition>

      <BookingKanbanColumn
        v-for="status in combinedWorkflow"
        :key="status.id"
        :statusId="status.id"
        :tasks="status.tasks"
        :title="status.name"
        :count="status.tasks.length"
        :is-loading="isLoading"
        :dragging="dragging"
        @change-task="handleChangeTask"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drag-move="onMove"
        @open-booking="onOpenBooking"
        @open-edit-booking="onOpenEditBooking"
        @commit-booking="commitBooking"
        @reject-booking="rejectBooking"
        @archive-task="archiveTask"
        @move-task="moveTask"
      />
    </div>

    <BookingConfirmStatusChangeDialog
      v-if="confirmStatusChange"
      :open="confirmStatusChange"
      :status="onChangeBookingStatus"
      :status-key="currentStatusKey"
      @reject="statusChangeRejected"
      @confirm="statusChangeConfirmed"
      :in-progress="isLoading"
    />
  </div>
</template>

<script>
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import BookingKanbanColumn from "@/components/Booking/KanbanColumn.vue";
import BookingConfirmStatusChangeDialog from "@/components/Booking/BookingConfirmStatusChangeDialog.vue";
import { mapActions, mapGetters } from "vuex";

export default {
  name: "BookingWorkflow",
  components: { BookingConfirmStatusChangeDialog, BookingKanbanColumn },
  props: {
    bookings: {
      type: Array,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    showBacklog: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      workflow: {},
      backlog: [],
      combinedWorkflow: [],
      combinedBacklog: [],
      internalLoading: true,
      lastHoveredContainer: null,
      dragging: false,
      showScrollLeft: false,
      showScrollRight: false,
      confirmStatusChange: false,
      onChangeBookingStatus: [],
      newStatusId: null,
      oldStatusId: null,
      temporaryEvent: null,
      currentStatusKey: null,
    };
  },
  computed: {
    ...mapGetters("userPreferences", ["shouldSkipStatusConfirmation"]),
    isLoading() {
      return this.loading || this.internalLoading;
    },
  },
  methods: {
    ...mapActions("userPreferences", ["loadSkipStatusConfirmations"]),
    combineWorkflow() {
      this.combinedWorkflow = this.workflow.states.map((state) => {
        const filteredTasks = state.tasks
          .map((task) => {
            const bookingItem = this.bookings.find(
              (booking) => booking.id === task.id
            );
            if (bookingItem) {
              return {
                id: task.id,
                added: task.added,
                bookingItem: bookingItem,
              };
            }
            return null;
          })
          .filter((task) => task !== null);

        return {
          id: state.id,
          name: state.name,
          tasks: filteredTasks,
        };
      });
    },
    combineBacklog() {
      this.combinedBacklog = this.backlog
        .map((task) => {
          const bookingItem = this.bookings.find(
            (booking) => booking.id === task.id
          );
          if (bookingItem) {
            return {
              id: task.id,
              added: task.added,
              bookingItem: bookingItem,
            };
          }
          return null;
        })
        .filter((task) => task !== null);
    },
    moveTask: async function (evt, status) {
      if (evt.added) {
        this.workflow = await ApiWorkflowService.updateTask({
          taskId: evt.added.element.id,
          operation: "move",
          destination: status,
          newIndex: evt.added.newIndex,
        });
        this.backlog = await ApiWorkflowService.getBacklog();
        this.$emit("update:booking", evt.added.element.id);
      }
      if (evt.moved) {
        this.workflow = await ApiWorkflowService.updateTask({
          taskId: evt.moved.element.id,
          operation: "move",
          destination: status,
          newIndex: evt.moved.newIndex,
        });
        this.backlog = await ApiWorkflowService.getBacklog();
        this.$emit("update:booking", evt.moved.element.id);
      }
    },
    archiveTask: async function (taskId) {
      this.workflow = await ApiWorkflowService.archiveTask({
        taskId: taskId,
      });
      this.backlog = await ApiWorkflowService.getBacklog();
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
    onMove(evt) {
      if (this.lastHoveredContainer && this.lastHoveredContainer !== evt.to) {
        this.lastHoveredContainer.classList.remove("drop-in");
      }
      evt.to.classList.add("drop-in");
      this.lastHoveredContainer = evt.to;
    },
    onDragStart() {
      this.dragging = true;
    },
    onDragEnd() {
      if (this.lastHoveredContainer) {
        this.lastHoveredContainer.classList.remove("drop-in");
        this.lastHoveredContainer = null;
      }
      this.dragging = false;
    },
    onScroll() {
      this.updateScrollIndicators();
    },
    updateScrollIndicators() {
      const container = this.$refs.kanbanContainer;

      if (!container) return;

      this.showScrollLeft = container.scrollLeft > 0;

      this.showScrollRight =
        container.scrollWidth > container.clientWidth + container.scrollLeft;
    },
    scrollLeft() {
      const container = this.$refs.kanbanContainer;
      container.scrollBy({
        left: -200,
        behavior: "smooth",
      });
    },
    scrollRight() {
      const container = this.$refs.kanbanContainer;
      container.scrollBy({
        left: 200,
        behavior: "smooth",
      });
    },
    handleDragOver(evt) {
      if (!this.dragging) return;

      const container = this.$refs.kanbanContainer;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const threshold = 100;

      if (evt.clientX < rect.left + threshold) {
        container.scrollBy({ left: -10, behavior: "smooth" });
      } else if (evt.clientX > rect.right - threshold) {
        container.scrollBy({ left: 10, behavior: "smooth" });
      }
    },
    handleChangeTask(evt, statusId) {
      if (!evt.added) {
        this.moveTask(evt, statusId);
        return;
      }

      const taskId = evt.added.element.id;
      const oldStatus = this.findTaskCurrentStatus(taskId);
      const newStatus = this.workflow.states.find(
        (state) => state.id === statusId
      );

      const statusChangeActions =
        newStatus.actions?.filter(
          (action) => action.type === "bookingStatus"
        ) || [];

      if (statusChangeActions.length > 0) {
        const statusKey = this.generateStatusKey(
          oldStatus.id,
          statusId,
          statusChangeActions
        );

        if (this.shouldSkipStatusConfirmation(statusKey)) {
          this.moveTask(evt, statusId);
        } else {
          this.showStatusChangeConfirmation(
            evt,
            statusId,
            oldStatus.id,
            statusChangeActions,
            statusKey
          );
        }
      } else {
        this.moveTask(evt, statusId);
      }
    },

    generateStatusKey(fromStatus, toStatus, actions) {
      const actionTypes = actions
        .map((action) => action.bookingStatus)
        .flat()
        .sort()
        .join("_");

      return `${fromStatus}_to_${toStatus}_${actionTypes}`;
    },

    findTaskCurrentStatus(taskId) {
      return this.workflow.states.find((state) =>
        state.tasks.some((task) => task.id === taskId)
      );
    },

    showStatusChangeConfirmation(evt, newStatusId, oldStatusId, actions, statusKey) {
      this.onChangeBookingStatus = actions
        .map(action => action.bookingStatus)
        .flat();

      this.newStatusId = newStatusId;
      this.oldStatusId = oldStatusId;
      this.temporaryEvent = evt;
      this.currentStatusKey = statusKey;
      this.confirmStatusChange = true;
    },

    statusChangeConfirmed() {
      this.executeStatusChange(this.newStatusId);
    },

    statusChangeRejected() {
      this.executeStatusChange(this.oldStatusId);
    },

    executeStatusChange(statusId) {
      this.moveTask(this.temporaryEvent, statusId);
      this.resetStatusChangeState();
    },

    resetStatusChangeState() {
      this.onChangeBookingStatus = [];
      this.temporaryEvent = null;
      this.newStatusId = null;
      this.oldStatusId = null;
      this.confirmStatusChange = false;
    },
  },
  watch: {
    bookings() {
      try {
        this.internalLoading = true;
        this.combineWorkflow();
        this.combineBacklog();
      } finally {
        this.internalLoading = false;
      }
    },
    workflow() {
      try {
        this.internalLoading = true;
        this.combineWorkflow();
      } finally {
        this.internalLoading = false;
      }
    },
    backlog() {
      try {
        this.internalLoading = true;
        this.combineBacklog();
      } finally {
        this.internalLoading = false;
      }
    },
  },
  async mounted() {
    await this.loadSkipStatusConfirmations();
    this.workflow = await ApiWorkflowService.getWorkflowStates();
    this.backlog = await ApiWorkflowService.getBacklog();

    this.combineWorkflow();

    this.updateScrollIndicators();
    window.addEventListener("resize", this.updateScrollIndicators);
    document.addEventListener("dragover", this.handleDragOver);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.updateScrollIndicators);
    document.removeEventListener("dragover", this.handleDragOver);
  },
};
</script>

<style scoped lang="scss">
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

.kanban-wrapper {
  position: relative;
  overflow-x: hidden;
}

.kanban-container {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.task-panel {
  background-color: var(--v-accent-base);
  border-radius: 10px;
}

.scroll-indicator-left,
.scroll-indicator-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
  pointer-events: none;
}

.scroll-indicator-left {
  left: 0;
}

.scroll-indicator-right {
  right: 0;
}

.scroll-indicator-left > .v-icon,
.scroll-indicator-right > .v-icon {
  font-size: 48px;
  pointer-events: auto;
}
</style>

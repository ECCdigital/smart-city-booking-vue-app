<template>
  <div class="kanban-wrapper">
    <transition name="fade">
      <v-btn
        v-if="showScrollLeft"
        class="scroll-btn scroll-btn--left"
        icon
        @click="scrollLeft"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
    </transition>

    <transition name="fade">
      <v-btn
        v-if="showScrollRight"
        class="scroll-btn scroll-btn--right"
        icon
        @click="scrollRight"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </transition>

    <div
      ref="kanbanContainer"
      class="kanban-container custom-scrollbar"
      @scroll="onScroll"
    >
      <transition name="slide-x">
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
          @open-group-booking="onOpenGroupBooking"
          @commit-booking="commitBooking"
          @reject-booking="rejectBooking"
          @archive-task="archiveTask"
          @move-task="moveTask"
        />
      </transition>

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
        @open-group-booking="onOpenGroupBooking"
        @commit-booking="commitBooking"
        @pay-booking="payBooking"
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

    async moveTask(evt, status) {
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

    async archiveTask(taskId) {
      this.workflow = await ApiWorkflowService.archiveTask({ taskId });
      this.backlog = await ApiWorkflowService.getBacklog();
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
    commitBooking(bookingId) {
      this.$emit("commit-booking", bookingId);
    },
    payBooking(id) {
      this.$emit("pay-booking", id);
    },
    rejectBooking(bookingId, reason = null, skipCancellation = false) {
      this.$emit("reject-booking", bookingId, reason, skipCancellation);
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
      document.body.style.cursor = "grabbing";
    },

    onDragEnd() {
      if (this.lastHoveredContainer) {
        this.lastHoveredContainer.classList.remove("drop-in");
        this.lastHoveredContainer = null;
      }
      this.dragging = false;
      document.body.style.cursor = "";
    },

    onScroll() {
      this.updateScrollIndicators();
    },

    updateScrollIndicators() {
      const container = this.$refs.kanbanContainer;
      if (!container) return;

      this.showScrollLeft = container.scrollLeft > 20;
      this.showScrollRight =
        container.scrollWidth >
        container.clientWidth + container.scrollLeft + 20;
    },

    scrollLeft() {
      this.$refs.kanbanContainer?.scrollBy({ left: -300, behavior: "smooth" });
    },

    scrollRight() {
      this.$refs.kanbanContainer?.scrollBy({ left: 300, behavior: "smooth" });
    },

    handleDragOver(evt) {
      if (!this.dragging) return;

      const container = this.$refs.kanbanContainer;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const threshold = 80;

      if (evt.clientX < rect.left + threshold) {
        container.scrollBy({ left: -15, behavior: "auto" });
      } else if (evt.clientX > rect.right - threshold) {
        container.scrollBy({ left: 15, behavior: "auto" });
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
        newStatus.actions?.filter((a) => a.type === "bookingStatus") || [];

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
        .map((a) => a.bookingStatus)
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

    showStatusChangeConfirmation(
      evt,
      newStatusId,
      oldStatusId,
      actions,
      statusKey
    ) {
      this.onChangeBookingStatus = actions.map((a) => a.bookingStatus).flat();
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
      this.internalLoading = true;
      this.combineWorkflow();
      this.combineBacklog();
      this.internalLoading = false;
    },
    workflow() {
      this.internalLoading = true;
      this.combineWorkflow();
      this.internalLoading = false;
    },
    backlog() {
      this.internalLoading = true;
      this.combineBacklog();
      this.internalLoading = false;
    },
  },

  async mounted() {
    await this.loadSkipStatusConfirmations();
    this.workflow = await ApiWorkflowService.getWorkflowStates();
    this.backlog = await ApiWorkflowService.getBacklog();
    this.combineWorkflow();

    this.$nextTick(() => {
      this.updateScrollIndicators();
    });

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
.kanban-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 180px);
  min-height: 400px;
}

.kanban-container {
  display: flex;
  gap: 8px;
  padding: 16px 8px;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: var(--v-surface-base) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;

  &--left {
    left: 8px;
  }

  &--right {
    right: 8px;
  }

  &:hover {
    background: var(--v-primary-lighten4) !important;
  }
}

.custom-scrollbar {
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.slide-x-enter-active,
.slide-x-leave-active {
  transition: all 0.3s ease;
}

.slide-x-enter,
.slide-x-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.theme--dark {
  .scroll-btn {
    background: rgba(40, 40, 40, 0.95) !important;
  }

  .custom-scrollbar {
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
}
</style>

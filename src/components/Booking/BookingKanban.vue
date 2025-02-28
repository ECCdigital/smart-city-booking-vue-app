<template>
  <div>
    <div class="d-flex overflow-x-auto my-scrollbar" style="width: 100%">
      <v-slide-x-transition>
        <div v-if="showBacklog" class="mx-2 pa-1 task-panel">
          <div class="mb-4 d-flex">
            <div class="text-overline">
              Backlog {{ combinedBacklog.length }}
            </div>
            <v-spacer> </v-spacer>
            <v-progress-circular
              v-if="isLoading"
              indeterminate
              color="primary"
              size="20"
            ></v-progress-circular>
          </div>
          <draggable
            style="height: 100%; max-height: 940px; overflow-y: auto;"
            :list="combinedBacklog"
            group="bookings"
            @change="moveTask($event, 'backlog')"
            class="my-scrollbar"
          >
            <BookingKanbanCard
              class="mx-2"
              v-for="element in combinedBacklog"
              :key="element._id"
              :element="element"
              :backlog="true"
              @open-booking="onOpenBooking"
              @open-edit-booking="onOpenEditBooking"
              @commit-booking="commitBooking"
              @reject-booking="rejectBooking"
              @archive-task="archiveTask"
              @move-task="moveTask"
            ></BookingKanbanCard>
          </draggable>
        </div>
      </v-slide-x-transition>
      <div
        v-for="(status, id) in combinedWorkflow"
        class="mx-2 pa-1 task-panel"
        :key="id"
      >
        <div class="mb-4 d-flex">
          <div class="text-overline">
            {{ status.name }} {{ status.tasks.length }}
          </div>
          <v-spacer> </v-spacer>
          <v-progress-circular
            v-if="isLoading"
            indeterminate
            color="primary"
            size="20"
          ></v-progress-circular>
        </div>
        <draggable
          style="height: 100%; max-height: 940px;min-width: 320px ; overflow-y: auto"
          :list="status.tasks"
          group="bookings"
          @change="moveTask($event, status.id)"
          class="my-scrollbar pa-2"
        >
          <BookingKanbanCard
            class="mx-2"
            v-for="element in status.tasks"
            :key="element.id"
            :element="element"
            @open-booking="onOpenBooking"
            @open-edit-booking="onOpenEditBooking"
            @commit-booking="commitBooking"
            @reject-booking="rejectBooking"
            @archive-task="archiveTask"
            @move-task="moveTask"
          >
          </BookingKanbanCard>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import BookingKanbanCard from "@/components/Booking/BookingKanbanCard.vue";
export default {
  name: "BookingWorkflow",
  components: { BookingKanbanCard, draggable },
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
    };
  },
  computed: {
    isLoading() {
      return this.loading || this.internalLoading;
    },
  },
  methods: {
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
      }
      if (evt.moved) {
        this.workflow = await ApiWorkflowService.updateTask({
          taskId: evt.moved.element.id,
          operation: "move",
          destination: status,
          newIndex: evt.moved.newIndex,
        });
        this.backlog = await ApiWorkflowService.getBacklog();
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
    this.workflow = await ApiWorkflowService.getWorkflowStates();
    this.backlog = await ApiWorkflowService.getBacklog();

    this.combineWorkflow();
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

.task-panel {
  background-color: var(--v-accent-base) !important;
  box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.1);
}

</style>

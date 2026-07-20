<script>
export default {
  name: "BookableEditStatus",
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    manualApproval: {
      get() {
        return !this.model.autoCommitBooking;
      },
      set(value) {
        this.model.autoCommitBooking = !value;
      },
    },
  },
};
</script>

<template>
  <v-sheet
    class="mb-4 px-4 py-2 d-flex flex-wrap align-center status-indicator"
    rounded
  >
    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap mr-6">
          <v-switch
            v-model="model.isBookable"
            :label="$t('bookable.edit.status.bookable.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="model.isBookable">
                mdi-calendar-check
              </v-icon>
              <v-icon color="grey" v-else>mdi-calendar-remove</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.bookable.tooltip") }}</span>
    </v-tooltip>

    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap mr-6">
          <v-switch
            v-model="model.isPublic"
            :label="$t('bookable.edit.status.public.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="bookable.isPublic">mdi-eye</v-icon>
              <v-icon color="grey" v-else>mdi-eye-off</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.public.tooltip") }}</span>
    </v-tooltip>

    <v-tooltip bottom max-width="280">
      <template v-slot:activator="{ on, attrs }">
        <div v-bind="attrs" v-on="on" class="status-switch-wrap">
          <v-switch
            v-model="manualApproval"
            :label="$t('bookable.edit.status.manualApproval.label')"
            hide-details
            dense
            class="mt-0"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon color="primary" v-if="manualApproval">
                mdi-account-check
              </v-icon>
              <v-icon color="grey" v-else>mdi-check-circle-outline</v-icon>
            </template>
          </v-switch>
        </div>
      </template>
      <span>{{ $t("bookable.edit.status.manualApproval.tooltip") }}</span>
    </v-tooltip>
  </v-sheet>
</template>

<style scoped>
.status-indicator {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .status-indicator {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.status-switch-wrap {
  display: inline-flex;
}
</style>

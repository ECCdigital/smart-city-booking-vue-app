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
  },
};
</script>

<template>
  <v-sheet
    class="mb-4 px-4 py-2 d-flex flex-wrap align-center"
    color="grey lighten-5"
    rounded
  >
    <v-switch
      v-model="model.isBookable"
      label="Buchbar"
      hide-details
      dense
      class="mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon color="primary" v-if="model.isBookable">
          mdi-calendar-check
        </v-icon>
        <v-icon color="grey" v-else>mdi-calendar-remove</v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="model.isPublic"
      label="Öffentlich"
      hide-details
      dense
      class="mt-0 mr-6"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon color="primary" v-if="bookable.isPublic"> mdi-eye </v-icon>
        <v-icon color="grey" v-else>mdi-eye-off</v-icon>
      </template>
    </v-switch>

    <v-switch
      v-model="model.autoCommitBooking"
      label="Auto-Bestätigung"
      hide-details
      dense
      class="mt-0"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon color="primary" v-if="model.autoCommitBooking">
          mdi-check-circle
        </v-icon>
        <v-icon color="grey" v-else>mdi-circle-outline</v-icon>
      </template>
    </v-switch>
  </v-sheet>
</template>

<style scoped></style>

<template>
  <v-container fill-height class="align-start" style="max-width: 1200px">
    <v-row class="fill-height">
      <v-col cols="12">
        <div class="d-inline-flex align-center my-4">
          <v-btn @click="goBack()" class="mr-4 accent" icon>
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <h1 v-if="eventId">Veranstaltung bearbeiten</h1>
          <h1 v-else>Veranstaltung erstellen</h1>
        </div>
        <v-row>
          <v-col>
            <slot/>
          </v-col>
          <v-col cols="auto">
            <slot name="sidebar"/>
          </v-col>
        </v-row>
      </v-col>

    </v-row>

  </v-container>
</template>
<script>
import {mapActions} from "vuex";

export default {
  methods: {
    ...mapActions({
      clearForm: "events/clearForm",

    }),
    goBack() {
      this.clearForm();
      this.$router.push({name: "events"});
    },
  },
  computed: {
    eventId: {
      get() {
        return this.$store.state.events.form.id;
      },
    },
  },
}
</script>

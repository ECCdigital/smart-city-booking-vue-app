<template>
  <v-container fluid fill-height class="align-start">
    <v-row class="fill-height">
      <v-col cols="12" md="9">
        <div class="d-inline-flex align-center my-4">
          <v-btn @click="goBack()" class="mr-4 accent" icon>
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <h1>Neue Veranstaltung erstellen</h1>
        </div>

        <v-row>
          <v-col cols="9" md="8">
            <slot/>
          </v-col>
          <v-col cols="3" md="4">
            <slot name="sidebar"/>
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="3" class="accent">
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
}
</script>

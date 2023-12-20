<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="pager">
          <template v-if="isLastStep()">
            <v-btn plain elevation="2" rounded @click="decreaseStep" class="mr-2">Zurück</v-btn>
            <v-btn color="primary" elevation="2" rounded @click="submitForm" :disabled="invalid">Absenden</v-btn>
          </template>
          <template v-else-if="isFirstStep()">
            <v-btn color="primary" elevation="2" rounded @click="increaseStep" :disabled="invalid">Weiter</v-btn>
          </template>
          <template v-else>
            <v-btn plain elevation="2" rounded @click="decreaseStep" class="mr-2">Zurück</v-btn>
            <v-btn color="primary" elevation="2" rounded @click="increaseStep" :disabled="invalid">Weiter</v-btn>
          </template>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ApiEventService from "@/services/api/ApiEventService";
import ToastService from "@/services/ToastService";
import {mapActions} from "vuex";

export default {
  props: {
    invalid: Boolean,
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      clearForm: "events/clearForm"
    }),
    submitForm() {
      ApiEventService.addEvent()
        .then(() => {
          this.clearForm();
          return this.$router.push({name: "events"});
        })
        .finally(() => {
          this.addToast(ToastService.createToast("event.create.success", "success"));
        })
        .catch(error => {
          this.addToast(ToastService.createToast("errors.something-wrong", "error"));
          console.log(error);
        });
    },
    isFirstStep() {
      return this.$router.currentRoute.name === "event-create-information";
    },
    isLastStep() {
      return this.$router.currentRoute.name === "event-create-images";
    },
    decreaseStep() {
      const routes = this.$router.getRoutes();
      const currentRouteIndex = routes.findIndex(route => route.name === this.$router.currentRoute.name);

      if (!this.isFirstStep()) {
        const previousStep = routes[currentRouteIndex - 1];
        this.$router.push({
          name: previousStep.name,
        })
      }
    },
    increaseStep() {
      const routes = this.$router.getRoutes();
      const currentRouteIndex = routes.findIndex(route => route.name === this.$router.currentRoute.name);

      if (!this.isLastStep()) {
        const previousStep = routes[currentRouteIndex + 1];
        this.$router.push({
          name: previousStep.name,
        })
      }
    }
  },
}
</script>

<style scoped>

</style>

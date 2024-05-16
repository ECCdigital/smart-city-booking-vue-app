<template>
  <FormLayout v-if="!isLoading">
    <router-view></router-view>
    <template #sidebar>
      <multi-stepper :structure="stepperMenu" :updateEvent="!!form.id" />
      <v-switch
        :disabled="!allowPublic"
        class="mt-10"
        dense
        label="Veranstaltung ist sichtbar"
        hide-details
        v-model="isPublic"
      ></v-switch>
      <v-btn
        v-if="formHasChanged"
        class="mt-10"
        color="primary"
        elevation="2"
        rounded
        @click="submitForm"
        >Änderungen übernehmen</v-btn
      >
    </template>
  </FormLayout>
</template>

<script>
import FormLayout from "@/layouts/Form.vue";
import MultiStepper from "@/components/MultiStepper";
import { required, email, max } from "vee-validate/dist/rules";
import { extend, setInteractionMode } from "vee-validate";
import { mapActions, mapGetters } from "vuex";
import ApiEventService from "@/services/api/ApiEventService";
import ToastService from "@/services/ToastService";

setInteractionMode("eager");

extend("required", {
  ...required,
  message: "{_field_} muss ausgefüllt sein.",
});

extend("email", {
  ...email,
  message: "E-Mail ist ungültig.",
});

extend("max", {
  ...max,
  message:
    "{_field_} Die Anzahl an Zeichen darf nicht größer als {length} sein.",
});

export default {
  components: {
    FormLayout,
    MultiStepper,
  },

  data() {
    return {
      stepperMenu: [
        {
          routeName: "event-create-information",
        },
        {
          routeName: "event-create-event-location",
        },
        {
          routeName: "event-create-organizer",
        },
        {
          routeName: "event-create-attendees",
        },
        {
          routeName: "event-create-agenda",
        },
        {
          routeName: "event-create-attachments",
        },
        {
          routeName: "event-create-images",
        },
      ],
      formHasChanged: false,
      allowPublic: true,
    };
  },

  computed: {
    ...mapGetters({
      form: "events/form",
      isLoading: "loading/isLoading",
    }),
    name() {
      return this.data;
    },
    isPublic: {
      get() {
        return this.$store.state.events.form.isPublic;
      },
      set(value) {
        this.updateValue({ field: "isPublic", value: value });
      },
    },
  },
  watch: {
    form: {
      handler(newVal, oldVal) {
        if (newVal.id && newVal.id === oldVal.id) {
          this.formHasChanged = true;
        }
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      clearForm: "events/clearForm",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      restoreFromApi: "events/restoreFromApi",
      updateValue: "events/updateForm",
      addToast: "toasts/add",
    }),
    goBack() {
      // this.$router.go(-1);
      this.$router.push({ name: "events" });
    },
    fetchEvent(id) {
      this.startLoading("fetch-event");
      ApiEventService.getEvent(id)
        .then((response) => {
          const payload = response.data;
          delete payload._id;
          this.restoreFromApi(payload);
        })
        .finally(() => {
          this.stopLoading("fetch-event");
        });
    },
    prepareCreateForm() {
      // Clear all form fields
      this.clearForm();

      // Set default bookable type based on route meta settings
      // this.updateValue({ field: 'type', value: this.$router.currentRoute.meta.type });
    },
    initialize() {
      const eventId = this.$route.query.id;
      if (!_.isNil(eventId)) {
        this.fetchEvent(eventId);
      } else {
        this.prepareCreateForm();
      }
    },
    submitForm() {
      ApiEventService.addEvent()
        .then(() => {})
        .finally(() => {
          this.formHasChanged = false;
          this.addToast(ToastService.createToast("event.update.success", "success"));
        })
        .catch(error => {
          this.addToast(ToastService.createToast("errors.something-wrong", "error"));
          console.log(error);
        });
    },
    async allowSetPublic() {
      const eventCountCheck = await ApiEventService.publicEventCountCheck();
      this.allowPublic = eventCountCheck || this.isPublic
    },
  },

  mounted() {
    this.initialize();
    this.allowSetPublic();
  },
};
</script>

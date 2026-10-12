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
      <div class="event-review">
        <p
          v-if="publicationWishHint"
          class="text-caption text--secondary mt-2 mb-0"
          data-test="publication-wish-hint"
        >
          <v-icon small class="mr-1">mdi-information-outline</v-icon>
          {{ $t(publicationWishHint) }}
        </p>
        <OfferReviewPanel
          class="mt-4"
          :tenant-id="form.tenantId || tenantId"
          :offer-type="offerType"
          :offer-id="form.id"
          :review="review"
          :is-public="isPublic === true"
          :supervision-level="supervisionLevel"
          @update:review="setReview"
        />
      </div>
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
import ApiReviewService from "@/services/api/ApiReviewService";
import ToastService from "@/services/ToastService";
import OfferReviewPanel from "@/components/Supervision/OfferReviewPanel.vue";
import { publicationWishHintKey } from "@/utils/offerReview";
import { OFFER_TYPES } from "@/utils/supervision";

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
    OfferReviewPanel,
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
      offerType: OFFER_TYPES.EVENT,
    };
  },

  computed: {
    ...mapGetters({
      form: "events/form",
      review: "events/review",
      isLoading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
      supervisionLevel: "tenants/currentSupervisionLevel",
    }),
    publicationWishHint() {
      return publicationWishHintKey(this.supervisionLevel);
    },
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
    isSimpleEvent() {
      return this.$route.name === "simple-event-creator";
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
      setReview: "events/setReview",
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
        .then(() => this.refreshReview())
        .finally(() => {
          this.formHasChanged = false;
          this.addToast(
            ToastService.createToast("event.update.success", "success")
          );
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast("errors.something-wrong", "error")
          );
          console.log(error);
        });
    },
    /**
     * A save can move the review - the first publication wish submits the
     * event - but answers no body, so the status is read again. A failed
     * read leaves the save a success and the old status in place.
     */
    async refreshReview() {
      if (!this.form.id) return;
      try {
        this.setReview(
          await ApiReviewService.getReview(
            this.form.tenantId || this.tenantId,
            this.offerType,
            this.form.id
          )
        );
      } catch (error) {
        // The status stays as shown until the event is loaded again.
      }
    },
    async allowSetPublic() {
      const eventCountCheck = await ApiEventService.publicEventCountCheck();
      this.allowPublic =
        (eventCountCheck || this.isPublic) && !this.isSimpleEvent;
    },
  },

  mounted() {
    this.initialize();
    this.allowSetPublic();
  },
};
</script>

<style scoped>
/* The sidebar column sizes to its content; the review texts must not widen it. */
.event-review {
  max-width: 280px;
}
</style>

<script>
import ChooseFile from "@/components/Files/ChooseFile.vue";
import Tiptap from "@/components/Tiptap.vue";
import { mapActions, mapGetters } from "vuex";
import ApiEventService from "@/services/api/ApiEventService";
import ToastService from "@/services/ToastService";

export default {
  name: "SimpleEventCreator",
  components: { Tiptap, ChooseFile },
  data() {
    return {
      api: {
        tags: [],
      },
      formValid: false,
      rules: {
        required: (value) => !!value || "Pflichtfeld",
        email: (value) => /.+@.+\..+/.test(value) || "E-Mail muss gültig sein",
      },
    };
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
      clearForm: "events/clearForm",
      addToast: "toasts/add",
    }),
    removeFlags(item) {
      this.flags.splice(this.flags.indexOf(item), 1);
    },
    removeTags(item) {
      this.eventTags.splice(this.eventTags.indexOf(item), 1);
    },
    fetchTags() {
      ApiEventService.getTags()
        .then((response) => {
          this.api.tags = response.data;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    submitForm() {
      if (!this.$refs.eventForm.validate()) {
        return;
      }
      ApiEventService.addEvent(this.needsRegistration)
        .then(() => {
          this.clearForm();
          return this.$router.push({ name: "events" });
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("event.create.success", "success")
          );
        })
        .catch(() => {
          this.addToast(
            ToastService.createToast("errors.something-wrong", "error")
          );
        });
    },
    goBack() {
      this.clearForm();
      this.$router.push({ name: "events" });
    },
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    eventName: {
      get() {
        return this.$store.state.events.form.information.name;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "name",
          value: value,
        });
      },
    },
    locationName: {
      get() {
        return this.$store.state.events.form.eventLocation.name;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "name",
          value: value,
        });
      },
    },
    organizerName: {
      get() {
        return this.$store.state.events.form.eventOrganizer.name;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "name",
          value: value,
        });
      },
    },
    contactPersonName: {
      get() {
        return this.$store.state.events.form.eventOrganizer.contactPersonName;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "contactPersonName",
          value: value,
        });
      },
    },
    contactPersonPhoneNumber: {
      get() {
        return this.$store.state.events.form.eventOrganizer
          .contactPersonPhoneNumber;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "contactPersonPhoneNumber",
          value: value,
        });
      },
    },
    contactPersonEmailAddress: {
      get() {
        return this.$store.state.events.form.eventOrganizer
          .contactPersonEmailAddress;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "contactPersonEmailAddress",
          value: value,
        });
      },
    },
    teaserText: {
      get() {
        return this.$store.state.events.form.information.teaserText;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "teaserText",
          value: value,
        });
      },
    },
    description: {
      get() {
        return this.$store.state.events.form.information.description;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "description",
          value: value,
        });
      },
    },
    teaserImage: {
      get() {
        return this.$store.state.events.form.information.teaserImage;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "teaserImage",
          value: value,
        });
      },
    },
    eventFlags: {
      get() {
        return this.$store.state.events.form.information.flags;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "flags",
          value: value,
        });
      },
    },
    eventTags: {
      get() {
        return this.$store.state.events.form.information.tags;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "tags",
          value: value,
        });
      },
    },
    startDate: {
      get() {
        return this.$store.state.events.form.information.startDate;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "startDate",
          value: value,
        });
      },
    },
    startTime: {
      get() {
        return this.$store.state.events.form.information.startTime;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "startTime",
          value: value,
        });
      },
    },
    endDate: {
      get() {
        return this.$store.state.events.form.information.endDate;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "endDate",
          value: value,
        });
      },
    },
    endTime: {
      get() {
        return this.$store.state.events.form.information.endTime;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "endTime",
          value: value,
        });
      },
    },
    street: {
      get() {
        return this.$store.state.events.form.eventAddress.street;
      },
      set(value) {
        this.updateValue({
          parent: "eventAddress",
          field: "street",
          value: value,
        });
      },
    },
    houseNumber: {
      get() {
        return this.$store.state.events.form.eventAddress.houseNumber;
      },
      set(value) {
        this.updateValue({
          parent: "eventAddress",
          field: "houseNumber",
          value: value,
        });
      },
    },
    additional: {
      get() {
        return this.$store.state.events.form.eventAddress.additional;
      },
      set(value) {
        this.updateValue({
          parent: "eventAddress",
          field: "additional",
          value: value,
        });
      },
    },
    city: {
      get() {
        return this.$store.state.events.form.eventAddress.city;
      },
      set(value) {
        this.updateValue({
          parent: "eventAddress",
          field: "city",
          value: value,
        });
      },
    },
    zip: {
      get() {
        return this.$store.state.events.form.eventAddress.zip;
      },
      set(value) {
        this.updateValue({
          parent: "eventAddress",
          field: "zip",
          value: value,
        });
      },
    },
    publicEvent: {
      get() {
        return this.$store.state.events.form.attendees.publicEvent;
      },
      set(value) {
        this.updateValue({
          parent: "attendees",
          field: "publicEvent",
          value: value,
        });
      },
    },
    needsRegistration: {
      get() {
        return this.$store.state.events.form.attendees.needsRegistration;
      },
      set(value) {
        this.updateValue({
          parent: "attendees",
          field: "needsRegistration",
          value: value,
        });
      },
    },
    maxAttendees: {
      get() {
        return this.$store.state.events.form.attendees.maxAttendees;
      },
      set(value) {
        this.updateValue({
          parent: "attendees",
          field: "maxAttendees",
          value: value,
        });
      },
    },
    ...mapGetters({
      form: "events/form",
    }),
  },
  created() {
    this.fetchTags();
  },
};
</script>

<template>
  <div>
    <v-form ref="eventForm" v-model="formValid">
      <v-row>
        <v-col cols="12">
          <h4 class="title">Informationen</h4>
          <v-text-field
            v-model="eventName"
            background-color="accent"
            filled
            label="Name der Veranstaltung*"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12">
          <ChooseFile
            :tenant-id="tenantId"
            v-model="teaserImage"
            background-color="accent"
            label="Titelbild der Veranstaltung"
            images-only
            filled
            forced-subdirectory="events"
          ></ChooseFile>
        </v-col>
        <v-col cols="12">
          <Tiptap label="Kurzbeschreibung" v-model="teaserText"></Tiptap>
        </v-col>
        <v-col cols="12">
          <Tiptap label="Beschreibung" v-model="description"></Tiptap>
        </v-col>
        <v-col cols="12">
          <v-combobox
            v-model="eventFlags"
            :items="eventFlags"
            label="Schlagwörter"
            no-data-text="Keine Schlagwörter angelegt"
            background-color="accent"
            multiple
            filled
            hide-selected
            clearable
            chips
          >
            <template v-slot:selection="{ attrs, item, select, selected }">
              <v-chip
                v-bind="attrs"
                :input-value="selected"
                close
                color="secondary"
                @click="select"
                @click:close="removeFlags(item)"
              >
                <strong>{{ item }}</strong>
              </v-chip>
            </template>
          </v-combobox>
        </v-col>
      </v-row>

      <v-row class="mt-6">
        <v-col cols="12">
          <h4 class="title">Zeitraum</h4>
          <v-divider></v-divider>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            filled
            v-model="startDate"
            background-color="accent"
            label="Startdatum*"
            type="date"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            filled
            :disabled="!startDate"
            v-model="startTime"
            background-color="accent"
            label="Startuhrzeit*"
            type="time"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            filled
            v-model="endDate"
            background-color="accent"
            label="Enddatum*"
            type="date"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            filled
            v-model="endTime"
            :disabled="!endDate"
            background-color="accent"
            label="Enduhrzeit*"
            type="time"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row class="mt-6">
        <v-col cols="12">
          <h4 class="title">Adresse</h4>
          <v-divider></v-divider>
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="locationName"
            background-color="accent"
            filled
            label="Name des Veranstaltungsortes*"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="street"
            background-color="accent"
            filled
            label="Straße"
            required
            type="text"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="houseNumber"
            background-color="accent"
            filled
            label="Hausnummer"
            required
            type="text"
          ></v-text-field>
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="additional"
            background-color="accent"
            filled
            label="Adresszusatz"
            required
            type="text"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="zip"
            background-color="accent"
            filled
            label="Postleitzahl"
            required
            type="number"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="city"
            background-color="accent"
            filled
            label="Stadt"
            required
            type="text"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row> </v-row>
      <v-row class="mt-6">
        <v-col cols="12">
          <h4 class="title">Veranstalter</h4>
          <v-divider></v-divider>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            background-color="accent"
            filled
            v-model="organizerName"
            label="Name des Veranstalters*"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            background-color="accent"
            filled
            v-model="contactPersonName"
            label="Name der Kontaktperson*"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            background-color="accent"
            filled
            v-model="contactPersonPhoneNumber"
            label="Telefonnummer der Kontaktperson*"
            lazy-validation
            :rules="[rules.required]"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            background-color="accent"
            filled
            v-model="contactPersonEmailAddress"
            label="E-Mail der Kontaktperson*"
            lazy-validation
            :rules="[rules.required, rules.email]"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row class="mt-6">
        <v-col cols="12">
          <h4 class="title">Teilnehmer</h4>
          <v-divider></v-divider>
          <v-checkbox
            v-model="needsRegistration"
            label="Teilnehmer müssen sich anmelden"
          ></v-checkbox>
          <v-text-field
            v-model="maxAttendees"
            v-if="needsRegistration"
            background-color="accent"
            filled
            label="Max. Anzahl Teilnehmer"
            required
          ></v-text-field>
        </v-col>
      </v-row>
      <v-col class="col-12 text-subtitle-2">*Pflichtfelder</v-col>

      <v-btn plain elevation="2" rounded @click="goBack" class="mr-2"
        >Zurück</v-btn
      >
      <v-btn
        color="primary"
        elevation="2"
        rounded
        @click="submitForm"
        :disabled="!formValid"
        >Absenden</v-btn
      >
    </v-form>
  </div>
</template>

<style scoped></style>

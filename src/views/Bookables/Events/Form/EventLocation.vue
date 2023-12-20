<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Veranstaltungsort</h4>
            </v-col>
            <v-col cols="12">
              <validation-provider
                v-slot="{ errors }"
                name="Veranstalter*"
                rules="required"
              >
                <v-text-field
                  v-model="name"
                  :error-messages="errors"
                  background-color="accent"
                  filled
                  label="Name des Veranstaltungsortes*"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>
          </v-row>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Kontaktdaten</h4>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="phoneNumber"
                background-color="accent"
                filled
                label="Telefonnummer für Rückfragen"
                required
                type="tel"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <validation-provider
                v-slot="{ errors }"
                name="E-Mail Adresse*"
                rules="required|email"
              >
                <v-text-field
                  v-model="emailAddress"
                  :error-messages="errors"
                  filled
                  background-color="accent"
                  label="E-Mail Adresse für Rückfragen*"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>
          </v-row>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Format</h4>
              <v-radio-group v-model="format" label="" hide-details>
                <v-radio
                  v-for="(format, index) in eventFormats"
                  :key="format.id"
                  :label="`${format.name}`"
                  :value="index"
                ></v-radio>
              </v-radio-group>
            </v-col>

            <template v-if="format === 1">
              <v-col cols="12">
                <v-text-field
                  v-model="url"
                  background-color="accent"
                  filled
                  label="Veranstaltungslink zur Teilnahme"
                  required
                  type="text"
                ></v-text-field>
              </v-col>
            </template>
            <template v-if="format === 0 || format === 1">
              <v-col cols="12">
                <v-select
                  v-model="eventLocations"
                  background-color="accent"
                  filled
                  label="Veranstaltungsort"
                  required
                  item-text="title"
                  item-value="id"
                  :items="api.locations"
                  type="select"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="room"
                  background-color="accent"
                  filled
                  label="Raum"
                  :items="api.rooms"
                  item-text="title"
                  item-value="id"
                  required
                  type="select"
                ></v-select>
              </v-col>
            </template>
            <template v-if="format === 2">
              <v-col cols="12">
                <v-text-field
                  v-model="url"
                  background-color="accent"
                  filled
                  label="Veranstaltungslink zur Teilnahme"
                  required
                  type="text"
                ></v-text-field>
              </v-col>
            </template>
          </v-row>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 data-v-eca9f636="" class="title">Adresse</h4>
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
            <v-col class="col-12 text-subtitle-2">*Pflichtfelder</v-col>
          </v-row>
        </v-container>
        <Pager :invalid="invalid" />
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import { required, email, max } from "vee-validate/dist/rules";
import {
  extend,
  ValidationObserver,
  ValidationProvider,
  setInteractionMode,
} from "vee-validate";
import Pager from "@/components/Events/Form/Pager";
import uniqueId from "lodash/uniqueId";
import ApiBookablesService from "@/services/api/ApiBookablesService";

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
    ValidationProvider,
    ValidationObserver,
    Pager,
  },
  data() {
    return {
      roomFormat: [
        { id: uniqueId(), name: "Raum auswählen" },
        { id: uniqueId(), name: "Adresse" },
      ],
      api: {
        rooms: [],
        locations: [],
      },
      eventFormats: [
        {
          id: uniqueId(),
          name: "Präsenz",
        },
        {
          id: uniqueId(),
          name: "Hybrid",
        },
        {
          id: uniqueId(),
          name: "Online",
        },
      ],
    };
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
    goBack() {
      this.$router.push({ name: "events" });
    },
    fetchRooms() {
      ApiBookablesService.getBookables()
        .then((response) => {
          this.api.rooms = response.data.filter(
            (resource) => resource.type === "room"
          );
        })
        .catch((error) => {
          console.log(error);
        });
    },
    fetchLocations() {
      ApiBookablesService.getBookables()
        .then((response) => {
          this.api.locations = response.data.filter(
            (location) => location.type === "event-location"
          );
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
  computed: {
    name: {
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
    phoneNumber: {
      get() {
        return this.$store.state.events.form.eventLocation.phoneNumber;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "phoneNumber",
          value: value,
        });
      },
    },
    emailAddress: {
      get() {
        return this.$store.state.events.form.eventLocation.emailAddress;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "emailAddress",
          value: value,
        });
      },
    },
    eventLocations: {
      get() {
        return this.$store.state.events.form.eventLocation.select;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "select",
          value: value,
        });
      },
    },
    room: {
      get() {
        return this.$store.state.events.form.eventLocation.room;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "room",
          value: value,
        });
      },
    },
    url: {
      get() {
        return this.$store.state.events.form.eventLocation.url;
      },
      set(value) {
        this.updateValue({
          parent: "eventLocation",
          field: "url",
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
    format: {
      get() {
        return this.$store.state.events.form.format;
      },
      set(value) {
        this.updateValue({ field: "format", value: value });
      },
    },
    ...mapGetters({
      form: "events/form",
    }),
  },
  created() {
    this.fetchRooms();
    this.fetchLocations();
  },
};
</script>

<style scoped></style>

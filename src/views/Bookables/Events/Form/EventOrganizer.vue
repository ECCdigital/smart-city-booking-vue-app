<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <form>
          <v-container>
            <v-row class="pa-2">
              <v-col cols="12">
                <h4 class="title">Veranstalter</h4>
              </v-col>
              <v-col cols="12">
                <validation-provider
                  v-slot="{ errors }"
                  name="Veranstalter"
                  rules="required"
                >
                  <v-text-field
                    background-color="accent"
                    filled
                    v-model="name"
                    label="Name des Veranstalters*"
                    :error-messages="errors"
                    required
                  ></v-text-field>
                </validation-provider>
                <v-checkbox
                  v-model="addContactPerson"
                  label="Kontaktperson hinzufügen"
                ></v-checkbox>
              </v-col>
            </v-row>
            <v-row class="pa-2" v-if="addContactPerson">
              <v-col cols="12">
                <h4 class="title">Kontaktperson</h4>
              </v-col>
              <v-col cols="12">
                <validation-provider
                  v-slot="{ errors }"
                  name="Kontaktperson"
                  rules="required"
                >
                  <v-text-field
                    background-color="accent"
                    filled
                    v-model="contactPersonName"
                    label="Name der Kontaktperson*"
                    :error-messages="errors"
                    required
                  ></v-text-field>
                </validation-provider>
              </v-col>
              <v-col cols="12" md="6">
                <validation-provider
                  v-slot="{ errors }"
                  name="Telefon"
                  rules="required"
                >
                  <v-text-field
                    background-color="accent"
                    filled
                    v-model="contactPersonPhoneNumber"
                    label="Telefonnummer der Kontaktperson*"
                    :error-messages="errors"
                    required
                  ></v-text-field>
                </validation-provider>
              </v-col>
              <v-col cols="12" md="6">
                <validation-provider
                  v-slot="{ errors }"
                  name="E-Mail"
                  rules="required|email"
                >
                  <v-text-field
                    background-color="accent"
                    filled
                    v-model="contactPersonEmailAddress"
                    label="E-Mail der Kontaktperson*"
                    :error-messages="errors"
                    required
                  ></v-text-field>
                </validation-provider>
              </v-col>
              <v-col cols="12">
                <ChooseFile
                  :tenant-id="tenantId"
                  v-model="contactPersonImage"
                  images-only
                  background-color="accent"
                  filled
                  label="Foto des Ansprechpartners"
                  forced-subdirectory="events/contacts"
                />
              </v-col>
            </v-row>
            <v-row class="pa-2">
              <v-col cols="12">
                <h4 class="title">Referenten</h4>
              </v-col>
              <v-col cols="12">
                <v-card
                  class="pa-4 mb-4 mx-auto"
                  v-for="speaker in speakers"
                  :key="speaker.id"
                >
                  <v-tooltip bottom offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        absolute
                        top
                        right
                        icon
                        color="white"
                        class="error"
                        @click="removeSpeaker(speaker.id)"
                      >
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </template>
                    <span>Entfernen</span>
                  </v-tooltip>
                  <h2 class="mb-2">Referent {{ speaker.name }}</h2>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        background-color="accent"
                        filled
                        v-model="speaker.name"
                        label="Name des Referenten"
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        background-color="accent"
                        filled
                        type="tel"
                        v-model="speaker.phoneNumber"
                        label="Telefon"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        background-color="accent"
                        filled
                        v-model="speaker.emailAddress"
                        placeholder="max.mustermann@web.de"
                        label="E-Mail-Adresse des Referenten"
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <ChooseFile
                        :tenant-id="tenantId"
                        v-model="speaker.image"
                        images-only
                        background-color="accent"
                        filled
                        label="Foto des Referenten"
                        forced-subdirectory="events/contacts"
                      />
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
              <v-col cols="12" class="d-flex align-center justify-center">
                <v-tooltip bottom offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      class="primary align-center"
                      color="white"
                      v-on="on"
                      large
                      icon
                      @click="addNewSpeaker"
                    >
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </template>
                  <span>Referent hinzufügen</span>
                </v-tooltip>
              </v-col>
            </v-row>
            <v-col class="col-12 text-subtitle-2">*Pflichtfelder</v-col>
          </v-container>
        </form>
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
import ChooseFile from "@/components/Files/ChooseFile.vue";

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
    ChooseFile,
    ValidationProvider,
    ValidationObserver,
    Pager,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
      addSpeaker: "events/addSpeaker",
      removeSpeaker: "events/removeSpeaker",
    }),
    addNewSpeaker() {
      this.addSpeaker({
        id: uniqueId(),
        phoneNumber: "",
        emailAddress: "",
      });
    },
    goBack() {
      this.$router.push({ name: "events" });
    },
  },
  computed: {
    ...mapGetters({
      form: "events/form",
      speakers: "events/speakers",
      tenantId: "tenants/currentTenantId",
    }),
    name: {
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
    addContactPerson: {
      get() {
        return this.$store.state.events.form.eventOrganizer.addContactPerson;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "addContactPerson",
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
    contactPersonImage: {
      get() {
        return this.$store.state.events.form.eventOrganizer.contactPersonImage;
      },
      set(value) {
        this.updateValue({
          parent: "eventOrganizer",
          field: "contactPersonImage",
          value: value,
        });
      },
    },
  },
};
</script>

<style scoped></style>

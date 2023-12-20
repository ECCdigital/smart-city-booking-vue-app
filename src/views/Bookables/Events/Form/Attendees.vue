<template>
  <v-row>
    <v-col cols="12">
      <validation-observer
        ref="observer"
        v-slot="{ invalid }">
        <v-container>

          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Teilnehmer</h4>
              <validation-provider
                v-slot="{ errors }"
                name="Art"
                rules="required">
                <v-checkbox
                  v-model="publicEvent"
                  :error-messages="errors"
                  label="Diese Veranstaltung ist öffentlich"></v-checkbox>
                <v-alert
                  prominent
                  type="info"
                  text
                  v-if="publicEvent">
                  <v-row align="center">
                    <v-col class="grow">
                      Eine öffentliche Veranstaltung kann von jeder Person gebucht werden. Nicht öffentliche Veranstaltungen sind über einen speziellen Link zu erreichen. Der Link zu dieser Veranstaltung wird nach dem Erstellen angezeigt.
                    </v-col>
                  </v-row>
                </v-alert>
              </validation-provider>
              <validation-provider
                v-slot="{ errors }"
                name="Registration"
                rules="required">
                <v-checkbox
                  v-model="needsRegistration"
                  :error-messages="errors"
                  label="Teilnehmer müssen sich anmelden"></v-checkbox>
              </validation-provider>
              <validation-provider
                v-slot="{ errors }"
                name="Teilnehmer"
                rules="required">
                <v-text-field
                  v-model="maxAttendees"
                  v-if="needsRegistration"
                  background-color="accent"
                  filled
                  label="Max. Anzahl Teilnehmer"
                  :error-messages="errors"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>
          </v-row>

          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Preise</h4>
              <validation-provider
                v-slot="{ errors }"
                name="Kostenlos"
                rules="required">
                <v-checkbox
                  v-model="free"
                  :error-messages="errors"
                  label="Diese Veranstaltung ist kostenlos"></v-checkbox>
              </validation-provider>
              <v-card class="pa-4 mb-4 mx-auto" v-for="category in priceCategories" :key="category.id">
                <v-tooltip bottom offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" absolute top right icon color="white" class="error" @click="removeEventCategory(category.id)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </template>
                  <span>Entfernen</span>
                </v-tooltip>
                <h2 class="mb-2">Preiskategorie {{ category.name }}</h2>
                <v-row>
                  <v-col cols="12" md="8">
                    <v-text-field
                      background-color="accent"
                      filled
                      v-model="category.name"
                      label="Name der Preiskategorie"
                      required
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      background-color="accent"
                      filled
                      value="10.00"
                      suffix="€"
                      v-model="category.price"
                      label="Preis"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card>
              <v-col cols="12" class="d-flex align-center justify-center">
                <v-tooltip bottom offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn class="primary align-center" color="white" v-on="on" large icon @click="addNewCategory">
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </template>
                  <span>Preiskategorie hinzufügen</span>
                </v-tooltip>
              </v-col>
            </v-col>
          </v-row>
        </v-container>
        <Pager :invalid="invalid"/>
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import { required, email, max } from "vee-validate/dist/rules"
import { extend, ValidationObserver, ValidationProvider, setInteractionMode } from "vee-validate"
import Pager from "@/components/Events/Form/Pager";
import uniqueId from "lodash/uniqueId";

setInteractionMode("eager")

extend("required", {
  ...required,
  message: "{_field_} muss ausgefüllt sein.",
})

extend("email", {
  ...email,
  message: "E-Mail ist ungültig.",
})

extend("max", {
  ...max,
  message: "{_field_} Die Anzahl an Zeichen darf nicht größer als {length} sein.",
})

export default {
  components: {
    ValidationProvider,
    ValidationObserver,
    Pager
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
      addEventCategory: "events/addEventCategory",
      removeEventCategory: "events/removeEventCategory"
    }),
    addNewCategory() {
      this.addEventCategory({
        id: uniqueId(),
        name: "",
        price: "",
      })
    },
  },
  computed: {
    ...mapGetters({
      form: "events/form",
      priceCategories: "events/priceCategories",
    }),
    publicEvent: {
      get() {
        return this.$store.state.events.form.attendees.publicEvent
      },
      set(value) {
        this.updateValue({ parent: "attendees", field: "publicEvent", value: value });
      }
    },
    needsRegistration: {
      get() {
        return this.$store.state.events.form.attendees.needsRegistration
      },
      set(value) {
        this.updateValue({ parent: "attendees", field: "needsRegistration", value: value });
      }
    },
    free: {
      get() {
        return this.$store.state.events.form.attendees.free
      },
      set(value) {
        this.updateValue({ parent: "attendees", field: "free", value: value });
      }
    },
    maxAttendees: {
      get() {
        return this.$store.state.events.form.attendees.maxAttendees
      },
      set(value) {
        this.updateValue({ parent: "attendees", field: "maxAttendees", value: value });
      }
    },
    priceCategories: {
      get() {
        return this.$store.state.events.form.attendees.priceCategories
      },
      set(value) {
        this.updateValue({ parent: "attendees", field: "priceCategories", value: value });
      }
    },
    ...mapGetters({
      form: "events/form"
    })
  },
}
</script>

<style scoped>

</style>

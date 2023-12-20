<template>
  <v-row>
    <v-col cols="12">
      <validation-observer
        ref="observer"
        v-slot="{ invalid }">
        <v-container>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Agenda</h4>
            </v-col>
            <v-col cols="12">
              <v-card class="pa-4 mb-4 mx-auto" v-for="(schedule, index) in schedules" :key="schedule.id">
                <v-tooltip bottom offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn v-on="on" absolute top right icon color="white" class="error" @click="removeScheduleDay(schedule.id)">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </template>
                  <span>Entfernen</span>
                </v-tooltip>
                <h2 class="mb-2">{{ index + 1 }}. Tag {{ schedule.name }}</h2>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field
                      filled
                      v-model="schedule.date"
                      background-color="accent"
                      label="Datum"
                      type="date"
                      required
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-text-field
                      filled
                      v-model="schedule.time"
                      background-color="accent"
                      label="Uhrzeit"
                      type="time"
                      required
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-text-field
                      filled
                      v-model="schedule.description"
                      background-color="accent"
                      label="Beschreibung"
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row align="center" v-for="(s, index) in schedule.schedules" :key="index">
                  <v-col cols="4">
                    <v-text-field
                      filled
                      v-model="s.time"
                      background-color="accent"
                      label="Uhrzeit"
                      hide-details
                      type="time"
                      required
                    ></v-text-field>
                  </v-col>

                  <v-col cols="7">
                    <v-text-field
                      filled
                      v-model="s.description"
                      background-color="accent"
                      label="Beschreibung"
                      hide-details
                      required
                    ></v-text-field>
                  </v-col>
                  <v-col cols="1">
                    <v-tooltip bottom offset-y>
                      <template v-slot:activator="{ on }">
                        <v-btn icon v-on="on"><v-icon color="red" @click="removeScheduleFromDay({dayId: schedule.id, id: s.id})">mdi-delete</v-icon></v-btn>
                      </template>
                        <span>Programmpunkt entfernen</span>
                    </v-tooltip>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col class="text-center">
                    <v-tooltip bottom offset-y>
                      <template v-slot:activator="{ on }">
                        <v-btn class="primary" color="white" v-on="on" small icon @click="addNewScheduleForDay(schedule.id)">
                          <v-icon>mdi-plus</v-icon>
                        </v-btn>
                      </template>
                      <span>Programmpunkt hinzufügen</span>
                    </v-tooltip>
                  </v-col>
                </v-row>
              </v-card>
              <v-col cols="12" class="d-flex align-center justify-center">
                <v-tooltip bottom offset-y>
                  <template v-slot:activator="{ on }">
                    <v-btn class="primary align-center" color="white" v-on="on" large icon @click="addNewScheduleDay">
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </template>
                  <span>Zeitplanung hinzufügen</span>
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
import { extend, ValidationObserver, setInteractionMode } from "vee-validate"
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
    Pager,
    ValidationObserver,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
      addScheduleDay: "events/addScheduleDay",
      removeScheduleDay: "events/removeScheduleDay",
      addScheduleForDay: "events/addScheduleForDay",
      removeScheduleFromDay: "events/removeScheduleFromDay",
    }),
    addNewScheduleDay() {
      this.addScheduleDay({
        id: uniqueId(),
        date: "",
        time: "",
        description: "",
        schedules: [],
      })
    },
    addNewScheduleForDay(dayId) {
      this.addScheduleForDay({
        dayId,
        id: uniqueId(),
        time: "",
        description: "",
      })
    },
  },
  computed: {
    ...mapGetters({
      schedules: "events/schedules",
    }),
    schedule: {
      get() {
        return this.$store.state.events.form.schedule
      },
      set(value) {
        this.updateValue({ parent: null, field: "schedule", value: value });
      }
    },
  },
}
</script>

<style scoped>

</style>

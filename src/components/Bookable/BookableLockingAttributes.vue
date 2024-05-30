<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import {mapActions} from "vuex";
import { v4 as uuidv4 } from "uuid";


export default {
  name: "BookableLockingAttributes",
  props: {
    tenant: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
  },
  data() {
    return {
      lockerSystems: [],
    };
  },
  computed: {
    lockerDetails: {
      get() {
        return this.$store.state.bookables.form.lockerDetails;
      },
      set(value) {
        this.updateValue({ key: "lockerDetails", value });
      },
    },
  },
  methods: {
    ...mapActions({
      updateValue: "bookables/updateForm",
    }),
    async fetchLockerSystems() {
      try {
        const tenant = await ApiTenantService.getTenant(this.tenant);
        this.lockerSystems = tenant.data.applications?.filter(app => app.type === "locker" && app.active);
      } catch (error) {
        console.error(error);
      }
    },
    addLockerUnit() {
      const id = uuidv4();
      this.lockerDetails.units.push({ id: id, lockerSystem: "", unitId: ""});
    },
    removeLockerUnit(idx) {
      this.lockerDetails.units.splice(idx, 1);
    },
  },
  mounted() {
    this.fetchLockerSystems();
  },
}
</script>

<template>
  <div>
    <v-row>
      <v-col>
        <v-expansion-panels flat multiple>
          <v-expansion-panel class="mb-6 panel">
            <v-expansion-panel-header
              color="accent"
              expand-icon="mdi-menu-down"
              class="panel-header"
            >
              <template v-slot:default="{ open }">
                <v-row no-gutters align="center">
                  <v-col cols="4">
                    <span class="text-subtitle-1">
                      Schließsysteme
                    </span>
                  </v-col>
                  <v-col class="col-2">
                    <v-fade-transition leave-absolute>
                      <div v-if="!open">
                        <v-icon color="darkgrey">mdi-information</v-icon>
                        <span v-if="lockerDetails.active" class="ml-2"
                        >Aktiviert</span
                        >
                        <span v-else class="ml-2">Inaktiviert</span>
                      </div>
                    </v-fade-transition>
                  </v-col>
                  <v-col
                    cols="4"
                    offset="1"
                    r-offset="1"
                    class="text--secondary"
                  >
                    <v-fade-transition leave-absolute>
                      <v-alert type="warning" dense outlined v-if="lockerDetails.active && lockerDetails.units?.length !== amount ">
                        Die Anzahl der verfügbaren Buchungsobjekte passt nicht mit der Anzahl der Schließfächer überein.
                      </v-alert>
                    </v-fade-transition>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-row>
                <v-col>
                  <v-switch
                    v-model="lockerDetails.active"
                    label="Schließsystem aktivieren"
                  >
                  </v-switch>
                </v-col>
              </v-row>
              <v-row
                v-for="(unit, idx) in lockerDetails.units"
                :key="idx"
                align="center"
              >
                <v-col class="col-12 col-md-4">
                  <v-select
                    background-color="accent"
                    filled
                    v-model="unit.lockerSystem"
                    :items="lockerSystems"
                    object
                    item-text="title"
                    item-value="id"
                    label="Schließsystem"
                    hide-selected
                    hide-details
                  >

                  </v-select>
                </v-col>
                <v-col>
                  <v-text-field
                    v-model="unit.unitId"
                    label="Schließfachnummer"
                    background-color="accent"
                    filled
                    hide-selected
                    hide-details
                  ></v-text-field>
                </v-col>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      v-on="on"
                      icon
                      @click="removeLockerUnit(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Schließfach löschen</span>
                </v-tooltip>
              </v-row>
              <v-row>
                <v-col class="text-center">
                  <v-tooltip bottom offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        class="align-center add-time-period"
                        v-on="on"
                        outlined
                        :disabled="!lockerDetails.active"
                        @click="addLockerUnit"
                      >
                        Weitere Schließfach hinzufügen
                      </v-btn>
                    </template>
                    <span>Weitere Schließfach hinzufügen</span>
                  </v-tooltip>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </div>

</template>

<style scoped>
.panel {
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.2);
}
.panel-header {
  padding: 13px 13px 13px 13px;
}

</style>

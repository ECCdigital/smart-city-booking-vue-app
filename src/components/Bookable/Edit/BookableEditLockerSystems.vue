<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiLockerService from "@/services/api/ApiLockerService";
import { mapGetters } from "vuex";

export default {
  name: "BookableEditLockerSystems",
  components: { BaseSection },
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      lockerSystems: [],
      locations: [],
      loading: false,
      loadingLocations: false,
      selectedSystemType: "",
      systemTypes: [
        {
          value: "pareva",
          text: "Pareva Schließfächer",
          icon: "mdi-locker-multiple",
          title: "Schließfächer",
        },
        {
          value: "ifbs",
          text: "Parkraum Fahrradboxen",
          icon: "mdi-bicycle",
          title: "Fahrradboxen",
        },
      ],
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    lockerDetails: {
      get() {
        return this.model.lockerDetails || { active: false, units: [] };
      },
      set(value) {
        this.model.lockerDetails = value;
      },
    },
    lockerUnitCount() {
      return this.lockerDetails.units
        .map((unit) => {
          if (unit.lockerSystem === "ifbs") return 1;
          return Number(unit.amount) || 0;
        })
        .reduce((acc, val) => acc + val, 0);
    },
    hasCountMismatch() {
      return (
        this.lockerDetails.active &&
        this.model.amount > 0 &&
        Number(this.lockerUnitCount) !== Number(this.model.amount)
      );
    },
    locationsFlat() {
      const flat = [];
      this.locations.forEach((city) => {
        city.locations.forEach((loc) => {
          flat.push({
            ...loc,
            CityName: city.CityName,
            displayName: `${loc.LocationName} (${city.CityName})`,
          });
        });
      });
      return flat;
    },
    availableSystemTypes() {
      return this.systemTypes.filter((type) => {
        return this.lockerSystems.some((sys) =>
          sys.id?.toLowerCase().includes(type.value)
        );
      });
    },
    canAddUnit() {
      return (
        this.selectedSystemType &&
        this.lockerSystems.length > 0 &&
        this.model.amount > 0
      );
    },
    currentSystemTypeConfig() {
      return (
        this.systemTypes.find((st) => st.value === this.selectedSystemType) ||
        {}
      );
    },
  },
  methods: {
    async fetchLockerSystems() {
      if (!this.tenantId) return;

      this.loading = true;
      try {
        const tenant = await ApiTenantService.getTenant(this.tenantId);
        this.lockerSystems =
          tenant.data.applications?.filter(
            (app) => app.type === "locker" && app.active
          ) || [];
      } catch (error) {
        console.log(error);
      } finally {
        this.loading = false;
      }
    },
    async fetchLocations(provider) {
      if (!this.tenantId || !provider) return;

      this.loadingLocations = true;
      try {
        const response = await ApiLockerService.getLocations(
          this.tenantId,
          provider
        );

        this.locations = response.data || [];
      } catch (error) {
        this.locations = [];
      } finally {
        this.loadingLocations = false;
      }
    },
    async addLockerUnit() {
      if (!this.lockerDetails.units) {
        this.lockerDetails.units = [];
      }

      const matchingSystem = this.lockerSystems.find((sys) =>
        sys.id?.toLowerCase().includes(this.selectedSystemType)
      );

      const newUnit = {
        lockerSystem: matchingSystem?.id || "",
        id: "",
        amount: 1,
        locationId: "",
      };

      this.lockerDetails.units.push(newUnit);

      if (
        this.selectedSystemType === "ifbs" &&
        this.locations.length === 0 &&
        matchingSystem
      ) {
        await this.fetchLocations(matchingSystem.id);
      }
    },
    removeLockerUnit(idx) {
      this.lockerDetails.units.splice(idx, 1);
    },
    getSystemTypeIcon(type) {
      const systemType = this.systemTypes.find((st) => st.value === type);
      return systemType?.icon || "mdi-lock-outline";
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.fetchLockerSystems();
      },
    },
    selectedSystemType(newType, oldType) {
      if (oldType && oldType !== newType) {
        this.lockerDetails.units = [];
      }

      if (newType === "ifbs" && this.locations.length === 0) {
        const parkraumSystem = this.lockerSystems.find((sys) =>
          sys.id?.toLowerCase().includes("ifbs")
        );
        if (parkraumSystem) {
          this.fetchLocations(parkraumSystem.id);
        }
      }
    },
    lockerSystems: {
      handler(newSystems) {
        if (
          newSystems.length > 0 &&
          this.lockerDetails.units &&
          this.lockerDetails.units.length > 0
        ) {
          const firstUnit = this.lockerDetails.units[0];
          const systemId = firstUnit.lockerSystem;

          const systemType = this.systemTypes.find((type) =>
            systemId?.toLowerCase().includes(type.value)
          );

          if (systemType) {
            this.selectedSystemType = systemType.value;

            if (systemType.value === "ifbs" && this.locations.length === 0) {
              const parkraumSystem = newSystems.find((sys) =>
                sys.id?.toLowerCase().includes("ifbs")
              );
              if (parkraumSystem) {
                this.fetchLocations(parkraumSystem.id);
              }
            }
          }
        }
      },
    },
  },
  mounted() {
    if (!this.lockerDetails.units) {
      this.lockerDetails = { active: false, units: [] };
    }
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Schließsysteme" icon="mdi-lock-outline"> </BaseSection>

    <v-switch
      v-model="lockerDetails.active"
      label="Schließsysteme aktivieren"
      hide-details
      color="primary"
      class="mt-0"
    >
      <template v-slot:label>
        <div>
          <div class="font-weight-medium">Schließsysteme aktivieren</div>
          <div class="text-caption text--secondary">
            Buchungsobjekte mit Schließsystemen können automatisch geöffnet und
            geschlossen werden
          </div>
        </div>
      </template>
    </v-switch>

    <v-card
      v-if="lockerDetails.active && !selectedSystemType"
      class="my-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-lock-outline</v-icon>
        <span class="text-h6 font-weight-bold">System-Typ wählen</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">

        <template >
          <v-alert
            v-if="lockerSystems.length === 0 && !loading"
            color="info"
            dense
            text
            class="mb-4"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-3" color="info">
                mdi-information-outline
              </v-icon>
              <div>
                Es sind keine aktiven Schließsysteme konfiguriert. Bitte fügen
                Sie zunächst ein Schließsystem in den Mandanten-Einstellungen
                hinzu.
              </div>
            </div>
          </v-alert>

          <v-select
            v-model="selectedSystemType"
            :items="availableSystemTypes"
            label="Wählen Sie den System-Typ für dieses Buchungsobjekt"
            background-color="accent"
            filled
            dense
            hide-details
            :loading="loading"
            :disabled="lockerSystems.length === 0"
          >
            <template v-slot:prepend-inner>
              <v-icon small>
                {{ getSystemTypeIcon(selectedSystemType) }}
              </v-icon>
            </template>
            <template v-slot:item="{ item }">
              <v-icon small class="mr-2">
                {{ item.icon }}
              </v-icon>
              {{ item.text }}
            </template>
            <template v-slot:selection="{ item }">
              {{ item.text }}
            </template>
          </v-select>
        </template>
      </v-card-text>
    </v-card>

    <v-card
      v-if="lockerDetails.active && selectedSystemType === 'pareva'"
      class="my-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-locker-multiple</v-icon>
          <span class="text-h6 font-weight-bold">Schließfächer</span>
        </div>
        <div>
          <v-btn small text color="primary" @click="selectedSystemType = ''">
            <v-icon left small>mdi-swap-horizontal</v-icon>
            System-Typ ändern
          </v-btn>

          <v-btn class="ml-2" small color="primary" @click="addLockerUnit">
            <v-icon left small>mdi-plus</v-icon>
            hinzufügen
          </v-btn>
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-alert
          v-if="hasCountMismatch"
          color="warning"
          dense
          text
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="warning">
              mdi-alert-circle-outline
            </v-icon>
            <div>
              <strong>Achtung:</strong> Die Anzahl der konfigurierten
              Schließfächer ({{ lockerUnitCount }}) stimmt nicht mit der Anzahl
              der verfügbaren Buchungsobjekte ({{ model.amount }}) überein.
            </div>
          </div>
        </v-alert>

        <v-divider v-if="lockerDetails.units.length > 0" class="mb-4" />

        <div v-if="lockerDetails.units.length > 0">
          <v-card
            v-for="(unit, idx) in lockerDetails.units"
            :key="`locker-unit-${idx}`"
            class="mb-3 unit-card"
            outlined
          >
            <v-card-text class="pa-4">
              <v-row align="center">
                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="unit.id"
                    label="Produkt-ID"
                    background-color="accent"
                    filled
                    dense
                    hide-details
                    placeholder="z.B. LOCKER-001"
                  >
                  </v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model.number="unit.amount"
                    type="number"
                    label="Anzahl"
                    background-color="accent"
                    filled
                    dense
                    hide-details
                    min="1"
                  >
                  </v-text-field>
                </v-col>
                <v-col cols="12" md="1" class="text-right">
                  <v-btn icon small @click="removeLockerUnit(idx)">
                    <v-icon small>mdi-delete-outline</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-row class="mt-2">
            <v-col cols="12">
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 grey--text">
                  Konfigurierte Einheiten
                </span>
                <v-chip
                  small
                  :color="
                    lockerUnitCount == model.amount ? 'success' : 'warning'
                  "
                >
                  {{ lockerUnitCount }} / {{ model.amount }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </div>

        <div v-else class="text-center py-6">
          <v-icon large color="grey lighten-1" class="mb-2">
            mdi-locker-multiple
          </v-icon>
          <div class="text-body-1 mb-1">
            Noch keine Schließfächer konfiguriert
          </div>
          <div class="text-caption text--secondary">
            Klicken Sie auf "hinzufügen" um zu beginnen
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card
      v-if="lockerDetails.active && selectedSystemType === 'ifbs'"
      class="my-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-bicycle</v-icon>
          <span class="text-h6 font-weight-bold">Fahrradboxen</span>
        </div>
        <div>
          <v-btn small text color="primary" @click="selectedSystemType = ''">
            <v-icon left small>mdi-swap-horizontal</v-icon>
            System-Typ ändern
          </v-btn>
          <v-btn
            class="ml-2"
            small
            color="primary"
            @click="addLockerUnit"
            :disabled="loadingLocations"
          >
            <v-icon left small>mdi-plus</v-icon>
            hinzufügen
          </v-btn>
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-divider v-if="lockerDetails.units.length > 0" class="mb-4" />

        <div v-if="lockerDetails.units.length > 0">
          <v-card
            v-for="(unit, idx) in lockerDetails.units"
            :key="`locker-unit-${idx}`"
            class="mb-3 unit-card"
            outlined
          >
            <v-card-text class="pa-4">
              <v-row align="center">
                <v-col cols="12" md="11">
                  <v-select
                    v-model="unit.locationId"
                    :items="locationsFlat"
                    item-text="displayName"
                    item-value="LocationID"
                    label="Standort"
                    background-color="accent"
                    filled
                    dense
                    hide-details
                    :loading="loadingLocations"
                  >
                    <template v-slot:prepend-inner>
                      <v-icon small>mdi-map-marker</v-icon>
                    </template>
                    <template v-slot:item="{ item }">
                      <div>
                        <div class="font-weight-medium">
                          {{ item.LocationName }}
                        </div>
                        <div class="text-caption text--secondary">
                          {{ item.CityName }}
                        </div>
                      </div>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="1" class="text-right">
                  <v-btn icon small @click="removeLockerUnit(idx)">
                    <v-icon small>mdi-delete-outline</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>

        <div v-else class="text-center py-6">
          <v-icon large color="grey lighten-1" class="mb-2">
            mdi-bicycle
          </v-icon>
          <div class="text-body-1 mb-1">
            Noch keine Fahrradboxen konfiguriert
          </div>
          <div class="text-caption text--secondary">
            Klicken Sie auf "hinzufügen" um zu beginnen
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}
.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.unit-card {
  border-radius: 8px !important;
}
</style>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiLockerService from "@/services/api/ApiLockerService";
import { mapGetters } from "vuex";

export default {
  name: "BookableEditLockerSystems",
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
    validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    selectSystemType(type) {
      this.selectedSystemType = type;
    },
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
    <v-card outlined class="component-card pa-4">
      <div class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-locker-multiple</v-icon>
        <span class="text-h6">Schließfächer &amp; Fahrradboxen</span>
      </div>
      <v-divider class="mt-3 mb-4" />

      <v-switch
        v-model="lockerDetails.active"
        hide-details
        color="primary"
        class="mt-0"
      >
        <template v-slot:label>
          <div>
            <div class="font-weight-medium">Schließsysteme aktivieren</div>
            <div class="text-caption text--secondary">
              Buchungsobjekte mit Schließsystemen können automatisch geöffnet
              und geschlossen werden
            </div>
          </div>
        </template>
      </v-switch>

      <!-- System-Typ wählen -->
      <div v-if="lockerDetails.active && !selectedSystemType" class="mt-6">
        <div class="section-title mb-3">
          <v-icon small left>mdi-lock-outline</v-icon>
          <span class="font-weight-medium">System-Typ wählen</span>
        </div>

        <v-alert
          v-if="lockerSystems.length === 0 && !loading"
          color="info"
          dense
          text
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info">mdi-information-outline</v-icon>
            <div>
              Es sind keine aktiven Schließsysteme konfiguriert. Bitte fügen Sie
              zunächst ein Schließsystem in den Mandanten-Einstellungen hinzu.
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
      </div>

      <!-- Schließfächer (Pareva) -->
      <div
        v-if="lockerDetails.active && selectedSystemType === 'pareva'"
        class="mt-6"
      >
        <div
          class="section-title mb-3 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon small left>mdi-locker-multiple</v-icon>
            <span class="font-weight-medium">Schließfächer</span>
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
        </div>

        <v-alert v-if="hasCountMismatch" color="warning" dense text class="mb-4">
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

        <div v-if="lockerDetails.units.length > 0">
          <div
            v-for="(unit, idx) in lockerDetails.units"
            :key="`locker-unit-${idx}`"
            class="unit-row pa-4 mb-3"
          >
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
          </div>

          <div class="d-flex justify-space-between align-center mt-2">
            <span class="text-body-2 grey--text">
              Konfigurierte Einheiten
            </span>
            <v-chip
              small
              :color="lockerUnitCount == model.amount ? 'success' : 'warning'"
            >
              {{ lockerUnitCount }} / {{ model.amount }}
            </v-chip>
          </div>
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
      </div>

      <!-- Fahrradboxen (IFBS) -->
      <div
        v-if="lockerDetails.active && selectedSystemType === 'ifbs'"
        class="mt-6"
      >
        <div
          class="section-title mb-3 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon small left>mdi-bicycle</v-icon>
            <span class="font-weight-medium">Fahrradboxen</span>
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
        </div>

        <div v-if="lockerDetails.units.length > 0">
          <div
            v-for="(unit, idx) in lockerDetails.units"
            :key="`locker-unit-${idx}`"
            class="unit-row pa-4 mb-3"
          >
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
          </div>
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
      </div>
    </v-card>
  </v-form>
</template>

<style scoped>
.component-card {
  border-radius: 8px !important;
}
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.theme--dark .section-title {
  color: rgba(255, 255, 255, 0.8);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
.unit-row {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}
.theme--dark .unit-row {
  border-color: rgba(255, 255, 255, 0.12);
}
</style>

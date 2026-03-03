<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
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
      loading: false,
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
        .map((unit) => Number(unit.amount) || 0)
        .reduce((acc, val) => acc + val, 0);
    },
    hasCountMismatch() {
      return (
        this.lockerDetails.active &&
        this.model.amount > 0 &&
        Number(this.lockerUnitCount) !== Number(this.model.amount)
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
        console.error("Fehler beim Laden der Schließsysteme:", error);
      } finally {
        this.loading = false;
      }
    },
    addLockerUnit() {
      if (!this.lockerDetails.units) {
        this.lockerDetails.units = [];
      }
      this.lockerDetails.units.push({
        id: "",
        lockerSystem: "",
        amount: 1,
      });
    },
    removeLockerUnit(idx) {
      this.lockerDetails.units.splice(idx, 1);
    },
    getSystemIcon(system) {
      if (!system) return "mdi-lock-outline";
      if (system.title?.toLowerCase().includes("pareva")) {
        return "mdi-locker-multiple";
      }
      if (system.title?.toLowerCase().includes("parkraum")) {
        return "mdi-bicycle";
      }
      return "mdi-lock-outline";
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.fetchLockerSystems();
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
      :disabled="!model.amount"
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
      v-if="lockerDetails.active"
      class="my-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-locker</v-icon>
          <span class="text-h6 font-weight-bold">Schließfächer</span>
        </div>

        <v-btn
          v-if="lockerDetails.active && model.amount > 0"
          small
          color="primary"
          :disabled="lockerSystems.length === 0"
          @click="addLockerUnit"
        >
          <v-icon left small>mdi-plus</v-icon>
          hinzufügen
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <template v-if="!model.amount">
          <v-divider class="my-4"></v-divider>
          <v-alert color="warning" dense text class="mb-0">
            <div class="d-flex align-center">
              <v-icon class="mr-3" color="warning"> mdi-alert-outline </v-icon>
              <div>
                Um Schließsysteme zu konfigurieren, geben Sie bitte die Anzahl
                der verfügbaren Buchungsobjekte an.
              </div>
            </div>
          </v-alert>
        </template>

        <template v-else-if="lockerDetails.active">
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
                Schließfächer ({{ lockerUnitCount }}) stimmt nicht mit der
                Anzahl der verfügbaren Buchungsobjekte ({{ model.amount }})
                überein.
              </div>
            </div>
          </v-alert>

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

          <div v-if="lockerDetails.units.length > 0">
            <v-row
              v-for="(unit, idx) in lockerDetails.units"
              :key="`locker-unit-${idx}`"
              align="center"
              class="mb-3"
            >
              <v-col cols="12" md="4">
                <v-select
                  v-model="unit.lockerSystem"
                  :items="lockerSystems"
                  item-text="title"
                  item-value="id"
                  label="Schließsystem"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                  :loading="loading"
                >
                  <template v-slot:prepend-inner>
                    <v-icon small>
                      {{
                        getSystemIcon(
                          lockerSystems.find((s) => s.id === unit.lockerSystem)
                        )
                      }}
                    </v-icon>
                  </template>
                  <template v-slot:item="{ item }">
                    <v-icon small class="mr-2">
                      {{ getSystemIcon(item) }}
                    </v-icon>
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="unit.id"
                  label="Produkt-ID"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                  placeholder="z.B. BIKE-001"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="unit.amount"
                  type="number"
                  label="Anzahl"
                  background-color="accent"
                  filled
                  dense
                  hide-details
                  min="1"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2" class="text-right">
                <v-btn icon small @click="removeLockerUnit(idx)">
                  <v-icon small>mdi-delete-outline</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-row v-if="lockerDetails.active" class="mt-2">
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
              mdi-locker
            </v-icon>
            <div>Noch keine Schließfächer konfiguriert</div>
            <v-btn
              small
              text
              color="primary"
              @click="addLockerUnit"
              class="mt-2"
              :disabled="lockerSystems.length === 0"
            >
              Schließfach hinzufügen
            </v-btn>
          </div>
        </template>
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
</style>

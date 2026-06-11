<script>
import BookableEditLockerSystems from "@/components/Bookable/Edit/BookableEditLockerSystems.vue";
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mapGetters } from "vuex";

export default {
  name: "BookableEditAccessLocks",
  components: { BookableEditLockerSystems, BookableEditAccessPoints },
  props: {
    bookable: { type: Object, required: true },
    validRoot: { type: Boolean, default: true },
  },
  data() {
    return {
      tenantApps: [],
      loadingApps: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    showAccess() {
      if (!this.bookable?.id) return BookablePermissionService.allowCreate();
      return BookablePermissionService.allowUpdate(this.bookable);
    },
    lockerActive() {
      return !!this.bookable?.lockerDetails?.active;
    },
    accessActive() {
      return !!this.bookable?.accessPointDetails?.active;
    },
    activeLockerType() {
      const units = this.bookable?.lockerDetails?.units || [];
      const first = (units[0]?.lockerSystem || "").toLowerCase();
      if (first.includes("pareva")) return "pareva";
      if (first.includes("ifbs")) return "ifbs";
      return "";
    },
    availability() {
      const isActive = (predicate) =>
        this.tenantApps.some((app) => app.active && predicate(app));
      return {
        door: isActive(
          (app) => app.type === "access" && app.id === "nuki"
        ),
        pareva: isActive(
          (app) =>
            app.type === "locker" &&
            (app.id || "").toLowerCase().includes("pareva")
        ),
        ifbs: isActive(
          (app) =>
            app.type === "locker" &&
            (app.id || "").toLowerCase().includes("ifbs")
        ),
      };
    },
    guideOptions() {
      const options = [];
      if (this.showAccess) {
        options.push({
          key: "door",
          provider: "Nuki",
          icon: "mdi-door",
          title: "Smartes Türschloss",
          description:
            "Buchende öffnen und schließen die Tür während ihres Buchungszeitraums – ideal für Räume, Büros oder Gebäude.",
          active: () => this.accessActive,
        });
      }
      options.push(
        {
          key: "pareva",
          provider: "Pareva",
          icon: "mdi-locker-multiple",
          title: "Schließfach",
          description:
            "Hinterlegen Sie ein Buchungsobjekt – z. B. ein iPad oder Equipment – in einem Fach. Buchende entnehmen es selbstständig zum Zeitpunkt ihrer Buchung.",
          active: () => this.lockerActive && this.activeLockerType === "pareva",
        },
        {
          key: "ifbs",
          provider: "Parkraumservice",
          icon: "mdi-bicycle",
          title: "Fahrradbox",
          description:
            "Stellen Sie abschließbare Fahrradboxen bereit, die Buchende zum Zeitpunkt ihrer Buchung öffnen.",
          active: () => this.lockerActive && this.activeLockerType === "ifbs",
        }
      );
      return options.map((option) => ({
        ...option,
        available: !!this.availability[option.key],
      }));
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.fetchTenantApps();
      },
    },
  },
  methods: {
    async fetchTenantApps() {
      if (!this.tenantId) return;
      this.loadingApps = true;
      try {
        const tenant = await ApiTenantService.getTenant(this.tenantId);
        this.tenantApps = tenant.data.applications || [];
      } catch (error) {
        this.tenantApps = [];
      } finally {
        this.loadingApps = false;
      }
    },
    async validate() {
      const checks = [];
      if (this.$refs.locker?.validate) checks.push(this.$refs.locker.validate());
      if (this.showAccess && this.$refs.access?.validate) {
        checks.push(this.$refs.access.validate());
      }
      const results = await Promise.all(checks);
      return results.every(Boolean);
    },
    resetValidation() {
      this.$refs.locker?.resetValidation?.();
      if (this.showAccess) this.$refs.access?.resetValidation?.();
    },
    choose(option) {
      if (!option.available && !option.active()) return;
      if (option.key === "door") {
        this.activateAccess();
        this.scrollTo("accessSection");
        return;
      }
      this.activateLocker();
      this.$nextTick(() => {
        this.$refs.locker?.selectSystemType?.(option.key);
        this.scrollTo("lockerSection");
      });
    },
    activateAccess() {
      const current = this.bookable.accessPointDetails || { points: [] };
      this.$emit("update:bookable", {
        ...this.bookable,
        accessPointDetails: { points: [], ...current, active: true },
      });
    },
    activateLocker() {
      const current = this.bookable.lockerDetails || { units: [] };
      this.$emit("update:bookable", {
        ...this.bookable,
        lockerDetails: { units: [], ...current, active: true },
      });
    },
    scrollTo(refName) {
      this.$nextTick(() => {
        const el = this.$refs[refName];
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
  },
};
</script>

<template>
  <div>
    <!-- ============ GEFÜHRTE AUSWAHL ============ -->
    <v-card flat class="mb-6 guide-card">
      <v-card-title class="py-3">
        <v-icon class="mr-2" color="primary">mdi-lightbulb-on-outline</v-icon>
        <span class="text-h6">Was möchten Sie einrichten?</span>
      </v-card-title>
      <v-divider />
      <v-card-subtitle>
        <v-icon left small color="info">mdi-information-outline</v-icon>
        Wählen Sie aus, wie Buchende auf dieses Objekt zugreifen. Die passende
        Konfiguration öffnet sich darunter.
      </v-card-subtitle>
      <v-card-text>
        <v-row dense>
          <v-col
            v-for="option in guideOptions"
            :key="option.key"
            cols="12"
            :md="guideOptions.length === 3 ? 4 : 6"
          >
            <v-card
              outlined
              :hover="option.available || option.active()"
              class="guide-option fill-height d-flex flex-column"
              :class="{
                'guide-option--active': option.active(),
                'guide-option--disabled':
                  !option.available && !option.active(),
              }"
              @click="choose(option)"
            >
              <v-card-text class="d-flex flex-column" style="height: 100%">
                <div class="d-flex align-center mb-2">
                  <v-icon
                    size="32"
                    :color="
                      option.available || option.active() ? 'primary' : 'grey'
                    "
                    class="mr-3"
                  >
                    {{ option.icon }}
                  </v-icon>
                  <div>
                    <div class="font-weight-bold">{{ option.title }}</div>
                    <v-chip
                      x-small
                      label
                      outlined
                      :color="
                        option.available || option.active()
                          ? 'primary'
                          : 'grey'
                      "
                    >
                      {{ option.provider }}
                    </v-chip>
                  </div>
                  <v-spacer />
                  <v-icon v-if="option.active()" color="success">
                    mdi-check-circle
                  </v-icon>
                </div>
                <div class="text-body-2 text--secondary mb-3">
                  {{ option.description }}
                </div>
                <v-spacer />

                <!-- Nicht im Mandanten konfiguriert -->
                <v-alert
                  v-if="!option.available && !loadingApps"
                  dense
                  text
                  :type="option.active() ? 'warning' : 'info'"
                  class="mb-0 mt-1"
                >
                  <span class="text-caption">
                    <template v-if="option.active()">
                      „{{ option.provider }}" ist im Mandanten derzeit nicht
                      aktiv. Bitte aktivieren Sie den Anbieter in den
                      Mandanten-Einstellungen.
                    </template>
                    <template v-else>
                      Nicht verfügbar – „{{ option.provider }}" muss zuerst in
                      den Mandanten-Einstellungen aktiviert werden.
                    </template>
                  </span>
                </v-alert>

                <div v-else-if="option.available" class="text-right">
                  <v-btn small text color="primary">
                    <v-icon left small>
                      {{ option.active() ? "mdi-pencil" : "mdi-plus" }}
                    </v-icon>
                    {{ option.active() ? "Konfigurieren" : "Einrichten" }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ============ SCHLIESSFÄCHER & FAHRRADBOXEN ============ -->
    <div ref="lockerSection">
      <BookableEditLockerSystems
        ref="locker"
        :bookable="bookable"
        @update:bookable="$emit('update:bookable', $event)"
      />
    </div>

    <!-- ============ TÜREN / ZUGANG ============ -->
    <div v-if="showAccess" ref="accessSection" class="mt-6">
      <BookableEditAccessPoints
        ref="access"
        :bookable="bookable"
        @update:bookable="$emit('update:bookable', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.guide-card {
  background-color: unset !important;
}
.guide-option {
  border-radius: 8px !important;
  cursor: pointer;
  transition: all 0.2s ease;
}
.guide-option:hover {
  border-color: var(--v-primary-base);
}
.guide-option--active {
  border-color: var(--v-primary-base);
  border-width: 2px;
}
.guide-option--disabled {
  cursor: default;
  opacity: 0.75;
}
.guide-option--disabled:hover {
  border-color: rgba(0, 0, 0, 0.12);
}
</style>

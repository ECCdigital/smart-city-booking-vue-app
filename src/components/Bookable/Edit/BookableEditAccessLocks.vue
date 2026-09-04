<script>
import BookableEditLockerSystems from "@/components/Bookable/Edit/BookableEditLockerSystems.vue";
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { isOutOfReach } from "@/services/api/apiErrorMessage";
import { defaultAccessPointDetails } from "@/utilities/access-points";
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
      // Whether the tenant's app list could be read at all. Only tenant owners
      // may, so for everyone else availability is unknown rather than false.
      tenantAppsReadable: true,
      loadingApps: false,
      panel: null,
      // Remembers the locker type the user just switched on. The persisted
      // type is normally derived from the first unit, but right after
      // activation there are no units yet, so we need this fallback to know
      // whether "Schließfach" or "Fahrradbox" is the active locker system.
      lockerTypeOverride: "",
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
      return this.lockerTypeOverride;
    },
    availability() {
      const isActive = (predicate) =>
        this.tenantApps.some((app) => app.active && predicate(app));
      return {
        // The door covers every active access provider (Nuki, Salto KS, …).
        // Editors who may maintain bookables but not the tenant cannot read
        // the app list; locking the section on that unknown would keep them
        // from assigning access points they are allowed to assign. The access
        // point list itself is the honest gate - it is readable for them.
        door:
          !this.tenantAppsReadable || isActive((app) => app.type === "access"),
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
    methods_() {
      const list = [];
      if (this.showAccess) {
        list.push({
          key: "door",
          kind: "access",
          provider: "Nuki / Salto KS",
          icon: "mdi-door",
          title: "Smartes Türschloss",
          description:
            "Buchende öffnen und schließen die Tür während ihres Buchungszeitraums – ideal für Räume, Büros oder Gebäude.",
        });
      }
      list.push(
        {
          key: "pareva",
          kind: "locker",
          provider: "Pareva",
          icon: "mdi-locker-multiple",
          title: "Schließfach",
          description:
            "Hinterlegen Sie ein Buchungsobjekt – z. B. ein iPad oder Equipment – in einem Fach. Buchende entnehmen es selbstständig zum Zeitpunkt ihrer Buchung.",
        },
        {
          key: "ifbs",
          kind: "locker",
          provider: "Parkraumservice",
          icon: "mdi-bicycle",
          title: "Fahrradbox",
          description:
            "Stellen Sie abschließbare Fahrradboxen bereit, die Buchende zum Zeitpunkt ihrer Buchung öffnen.",
        }
      );
      return list.map((option) => ({
        ...option,
        available: !!this.availability[option.key],
        active: this.isActive(option.key),
      }));
    },
    activeCount() {
      return this.methods_.filter((m) => m.active).length;
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
        this.tenantAppsReadable = true;
      } catch (error) {
        this.tenantApps = [];
        // Out of reach means "unknown", not "empty" - reading it as an empty
        // app list would claim the provider is not configured.
        this.tenantAppsReadable = !isOutOfReach(error);
      } finally {
        this.loadingApps = false;
      }
    },
    isActive(key) {
      if (key === "door") return this.accessActive;
      if (key === "pareva")
        return this.lockerActive && this.activeLockerType === "pareva";
      if (key === "ifbs")
        return this.lockerActive && this.activeLockerType === "ifbs";
      return false;
    },
    setAccessActive(active) {
      const current = this.bookable.accessPointDetails || {};
      this.$emit("update:bookable", {
        ...this.bookable,
        accessPointDetails: {
          ...defaultAccessPointDetails(),
          ...current,
          active,
        },
      });
    },
    // Schließfach (pareva) and Fahrradbox (ifbs) share one lockerDetails
    // object and are mutually exclusive. Switching the type clears the units
    // because their definitions are not compatible.
    setLockerType(type) {
      const current = this.bookable.lockerDetails || { units: [] };
      const switching = this.activeLockerType && this.activeLockerType !== type;
      this.lockerTypeOverride = type;
      this.$emit("update:bookable", {
        ...this.bookable,
        lockerDetails: {
          ...current,
          active: true,
          units: switching ? [] : current.units || [],
        },
      });
    },
    setLockerActive(active) {
      const current = this.bookable.lockerDetails || { units: [] };
      if (!active) this.lockerTypeOverride = "";
      this.$emit("update:bookable", {
        ...this.bookable,
        lockerDetails: { units: [], ...current, active },
      });
    },
    toggleMethod(key, enabled) {
      if (key === "door") {
        this.setAccessActive(enabled);
        return;
      }
      if (enabled) {
        this.setLockerType(key);
      } else {
        this.setLockerActive(false);
      }
    },
    onToggle(method, enabled, index) {
      this.toggleMethod(method.key, enabled);
      if (enabled) {
        this.$nextTick(() => {
          this.panel = index;
        });
      }
    },
    onChildUpdate(updated) {
      this.$emit("update:bookable", updated);
    },
    statusColor(method) {
      if (method.active) return "success";
      if (!method.available) return "grey";
      return "grey darken-1";
    },
    statusLabel(method) {
      if (method.active) return "Aktiv";
      if (!method.available) return "Nicht verfügbar";
      return "Inaktiv";
    },
    childRefs() {
      return [this.$refs.locker, this.$refs.access]
        .flatMap((ref) => (Array.isArray(ref) ? ref : [ref]))
        .filter(Boolean);
    },
    async validate() {
      const checks = this.childRefs()
        .filter((child) => typeof child.validate === "function")
        .map((child) => child.validate());
      const results = await Promise.all(checks);
      return results.every(Boolean);
    },
    resetValidation() {
      this.childRefs().forEach((child) => child.resetValidation?.());
    },
  },
};
</script>

<template>
  <div>
    <div class="d-flex align-center mb-1">
      <v-icon color="primary" class="mr-2">mdi-shield-key-outline</v-icon>
      <span class="text-h6">Zugang &amp; Schließsysteme</span>
      <v-spacer />
      <v-chip small label outlined :color="activeCount ? 'success' : 'grey'">
        {{ activeCount }} aktiv
      </v-chip>
    </div>
    <div class="text-body-2 text--secondary mb-4">
      Klappen Sie einen Bereich auf, um ihn einzurichten. Alle Bereiche sind
      standardmäßig zugeklappt – so behalten Sie den Überblick.
    </div>

    <v-expansion-panels v-model="panel" accordion focusable>
      <v-expansion-panel
        v-for="(m, index) in methods_"
        :key="m.key"
        :disabled="!m.available && !m.active"
      >
        <v-expansion-panel-header>
          <v-row align="center" no-gutters>
            <v-col cols="auto" class="mr-3">
              <v-icon :color="m.active ? 'primary' : 'grey'" size="28">
                {{ m.icon }}
              </v-icon>
            </v-col>
            <v-col>
              <div class="font-weight-bold">{{ m.title }}</div>
              <div class="text-caption text--secondary">{{ m.provider }}</div>
            </v-col>
            <v-col cols="auto" class="mr-2" @click.stop>
              <div class="d-flex align-center">
                <v-chip
                  x-small
                  label
                  outlined
                  :color="statusColor(m)"
                  class="mr-3"
                >
                  {{ statusLabel(m) }}
                </v-chip>
                <v-switch
                  :input-value="m.active"
                  :disabled="!m.available && !m.active"
                  color="primary"
                  hide-details
                  dense
                  class="mt-0 pt-0"
                  @change="onToggle(m, $event, index)"
                />
              </div>
            </v-col>
          </v-row>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <div class="text-body-2 text--secondary mb-4">
            {{ m.description }}
          </div>

          <v-alert
            v-if="!m.available && !loadingApps"
            dense
            text
            :type="m.active ? 'warning' : 'info'"
            class="mb-0"
          >
            <template v-if="m.active">
              „{{ m.provider }}" ist im Mandanten derzeit nicht aktiv. Bitte
              aktivieren Sie den Anbieter in den Mandanten-Einstellungen.
            </template>
            <template v-else>
              Nicht verfügbar – „{{ m.provider }}" muss zuerst in den
              Mandanten-Einstellungen aktiviert werden.
            </template>
          </v-alert>

          <template v-else>
            <div v-if="!m.active" class="text-center py-6">
              <div class="text-body-2 text--secondary">
                Schalten Sie „{{ m.title }}" oben rechts ein, um es zu
                konfigurieren.
              </div>
            </div>

            <BookableEditAccessPoints
              v-else-if="m.kind === 'access'"
              ref="access"
              embedded
              :bookable="bookable"
              @update:bookable="onChildUpdate"
            />
            <BookableEditLockerSystems
              v-else
              ref="locker"
              :key="`locker-${m.key}`"
              embedded
              :forced-system-type="m.key"
              :bookable="bookable"
              @update:bookable="onChildUpdate"
            />
          </template>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<style scoped></style>

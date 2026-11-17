<script>
import {
  compartmentGroups,
  leavingCompartmentNote,
  leavingCompartmentsSummary,
} from "@/utilities/locker-system-compartments";

// What a tile can show, in the order the legend explains it.
const LEGEND = ["on", "off", "taken", "running", "future", "warning"];

/**
 * The Fächer of a Schließfachanlage that carries its own, chosen from the
 * provider's list (ECCdigital/tickets#1037), as tiles by Schließfachschrank
 * (ECCdigital/tickets#1178): a click on a tile takes the Fach into the
 * Anlage or out, the wrench on a chosen one takes it out of service or back.
 * A Fach another Anlage holds is a grey, locked tile that names that Anlage.
 * Dots on a tile are the bookings at the Fach, a warning edge says there is
 * a line about it under its Schrank. `v-model` is the list as the backend
 * stores it (`config.compartments`).
 */
export default {
  name: "AccessPointCompartmentPicker",
  props: {
    // The chosen Fächer, in the stored shape.
    value: { type: Array, default: () => [] },
    // The provider's listing (`listAccessPoints`).
    listing: { type: Array, default: () => [] },
    // The Fächer other Anlagen hold, with their name (`heldCompartments`).
    taken: { type: Map, default: () => new Map() },
    // Why the backend refused a Fach, by its UUID.
    errors: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    // The provider's name, for the Fach its list no longer names.
    providerTitle: { type: String, default: "" },
    // The bookings at the Fächer, as `compartmentBookings` reads them.
    bookings: { type: Array, default: () => [] },
    // The UUIDs of the Fächer the save takes out of the Anlage or out of
    // service; each says what happens to its bookings.
    leaving: { type: Array, default: () => [] },
    // The bookings could not be read, so none can be named.
    bookingsUnreadable: { type: Boolean, default: false },
  },
  computed: {
    // Each Schrank with its tiles and a line per Fach concerned.
    groups() {
      return compartmentGroups(this.listing, this.value, this.taken).map(
        (group) => ({
          ...group,
          compartments: group.compartments.map((compartment) => ({
            ...compartment,
            state: this.stateOf(compartment),
            bookings: this.bookingsAt(compartment),
            warning: !compartment.listed || !!this.errors[compartment.id],
          })),
          notes: group.compartments
            .map((compartment) => this.noteOf(compartment))
            .filter(Boolean),
        })
      );
    },
    selectedCount() {
      return this.value.length;
    },
    // What the save does to the bookings at the Fächer that leave.
    summary() {
      if (!this.leaving.length) return "";
      if (this.bookingsUnreadable) {
        return this.$t(
          "accessPoint.management.compartments.bookings.unreadable"
        );
      }
      return leavingCompartmentsSummary(this.bookings, this.leaving);
    },
    // The bookings by the UUID of the Fach they hold.
    bookingsByCompartment() {
      const map = {};
      this.bookings.forEach((booking) => {
        const id = String(booking.compartment.id);
        (map[id] = map[id] || []).push(booking);
      });
      return map;
    },
    // The states the tiles show, each explained once.
    legend() {
      const shown = new Set();
      this.groups.forEach((group) =>
        group.compartments.forEach((compartment) => {
          shown.add(compartment.state);
          compartment.bookings.forEach((booking) =>
            shown.add(booking.running ? "running" : "future")
          );
          if (compartment.warning) shown.add("warning");
        })
      );
      return LEGEND.filter((state) => shown.has(state));
    },
  },
  methods: {
    stateOf(compartment) {
      if (compartment.takenBy) return "taken";
      if (!compartment.selected) return "free";
      return compartment.outOfService ? "off" : "on";
    },
    bookingsAt(compartment) {
      return this.bookingsByCompartment[String(compartment.id)] || [];
    },
    // „Fach 3: 2 künftige Buchungen ziehen um“: what concerns a Fach, in
    // one line under its Schrank, or `null`.
    noteOf(compartment) {
      const parts = [];
      if (!compartment.listed) {
        parts.push(
          this.$t("accessPoint.management.compartments.notListed", {
            provider: this.providerTitle,
          })
        );
      }
      if (this.leaving.includes(String(compartment.id))) {
        parts.push(leavingCompartmentNote(this.bookingsAt(compartment)));
      }
      parts.push(this.errors[compartment.id]);
      const text = parts.filter(Boolean).join(" · ");
      if (!text) return null;
      return {
        id: compartment.id,
        text: this.$t("accessPoint.management.compartments.note", {
          compartment: this.compartmentName(compartment),
          text,
        }),
      };
    },
    compartmentName(compartment) {
      return this.$t("accessPoint.management.compartments.compartment", {
        number: compartment.number,
      });
    },
    serviceLabel(compartment) {
      return this.$t(
        `accessPoint.management.compartments.service.${
          compartment.outOfService ? "on" : "off"
        }`
      );
    },
    toggle(compartment) {
      if (compartment.takenBy) return;
      const others = this.value.filter((c) => c.id !== compartment.id);
      if (compartment.selected) {
        this.$emit("input", others);
        return;
      }
      this.$emit("input", [
        ...others,
        {
          id: compartment.id,
          number: compartment.number,
          lockerBank: compartment.lockerBank,
          outOfService: false,
        },
      ]);
    },
    toggleService(compartment) {
      this.$emit(
        "input",
        this.value.map((c) =>
          c.id === compartment.id ? { ...c, outOfService: !c.outOfService } : c
        )
      );
    },
  },
};
</script>

<template>
  <div class="compartment-picker">
    <div class="text-caption text--secondary mb-3">
      {{ $t("accessPoint.management.compartments.hint") }}
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-3" />

    <div
      v-else-if="groups.length === 0"
      class="compartment-empty text-body-2 text--secondary mb-3"
    >
      {{ $t("accessPoint.management.compartments.empty") }}
    </div>

    <div
      v-for="group in groups"
      :key="group.lockerBank.id || group.lockerBank.name"
      class="compartment-group mb-3"
    >
      <div class="compartment-group-title font-weight-medium mb-1">
        {{
          $t("accessPoint.management.compartments.lockerBank", {
            name: group.lockerBank.name,
          })
        }}
      </div>
      <div class="compartment-tiles">
        <div
          v-for="compartment in group.compartments"
          :key="compartment.id"
          class="compartment-tile"
          :class="[
            `compartment-tile--${compartment.state}`,
            { 'compartment-tile--warning': compartment.warning },
          ]"
          :data-compartment-id="compartment.id"
          :data-state="compartment.state"
        >
          <v-tooltip top :disabled="!compartment.takenBy">
            <template #activator="{ on, attrs }">
              <button
                type="button"
                class="compartment-tile__toggle"
                v-bind="attrs"
                :aria-label="compartmentName(compartment)"
                :aria-pressed="compartment.selected ? 'true' : 'false'"
                :aria-disabled="compartment.takenBy ? 'true' : null"
                data-test="compartment-toggle"
                v-on="on"
                @click="toggle(compartment)"
              >
                {{ compartment.number }}
                <v-icon
                  v-if="compartment.takenBy"
                  x-small
                  class="compartment-tile__lock"
                  data-test="compartment-lock"
                >
                  mdi-lock
                </v-icon>
              </button>
            </template>
            <span>
              {{
                $t("accessPoint.management.compartments.takenBy", {
                  lockerSystem: compartment.takenBy,
                })
              }}
            </span>
          </v-tooltip>
          <span
            v-if="compartment.bookings.length"
            class="compartment-tile__dots"
          >
            <span
              v-for="(booking, index) in compartment.bookings"
              :key="`${booking.id}-${index}`"
              class="compartment-dot"
              :class="`compartment-dot--${
                booking.running ? 'running' : 'future'
              }`"
              :data-state="booking.running ? 'running' : 'future'"
              data-test="booking-dot"
            />
          </span>
          <button
            v-if="compartment.selected"
            type="button"
            class="compartment-tile__service"
            :aria-label="serviceLabel(compartment)"
            :title="serviceLabel(compartment)"
            data-test="compartment-service"
            @click="toggleService(compartment)"
          >
            <v-icon x-small>mdi-wrench</v-icon>
          </button>
        </div>
      </div>
      <div
        v-for="note in group.notes"
        :key="`note-${note.id}`"
        class="compartment-note text-caption"
        :data-compartment-id="note.id"
        data-test="compartment-note"
      >
        {{ note.text }}
      </div>
    </div>

    <div
      v-if="legend.length"
      class="compartment-legend text-caption text--secondary mb-2"
      data-test="tile-legend"
    >
      <span
        v-for="state in legend"
        :key="state"
        class="compartment-legend__entry"
        data-test="tile-legend-entry"
      >
        <span
          class="compartment-swatch"
          :class="`compartment-swatch--${state}`"
          aria-hidden="true"
        />
        {{ $t(`accessPoint.management.compartments.legend.${state}`) }}
      </span>
    </div>

    <div
      v-if="summary"
      class="compartments-summary d-flex text-caption mb-2"
      data-test="compartments-summary"
    >
      <v-icon small class="mr-2">mdi-information-outline</v-icon>
      <span>{{ summary }}</span>
    </div>

    <div class="text-caption text--secondary">
      {{
        $t("accessPoint.management.compartments.selected", {
          count: selectedCount,
        })
      }}
    </div>
  </div>
</template>

<style scoped>
.compartment-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
}

.compartment-tile {
  position: relative;
  width: var(--scb-compartment-tile-size);
  height: var(--scb-compartment-tile-size);
}

.compartment-tile__toggle {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface);
  color: var(--scb-text);
  font-size: var(--scb-font-size-sm);
  cursor: pointer;
  user-select: none;
}

.compartment-tile__toggle:focus-visible,
.compartment-tile__service:focus-visible {
  outline: none;
  box-shadow: var(--scb-ring-focus);
}

.compartment-tile--on .compartment-tile__toggle {
  background: var(--v-primary-base);
  border-color: var(--v-primary-base);
  color: var(--scb-on-theme);
  font-weight: var(--scb-font-weight-semibold);
}

.compartment-tile--off .compartment-tile__toggle,
.compartment-swatch--off {
  background: repeating-linear-gradient(
    45deg,
    var(--v-warning-darken1) 0 var(--scb-space-1),
    var(--v-warning-base) var(--scb-space-1) var(--scb-space-2)
  );
  border-color: var(--v-warning-darken1);
  color: var(--scb-on-theme);
  font-weight: var(--scb-font-weight-semibold);
}

.compartment-tile--taken .compartment-tile__toggle,
.compartment-swatch--taken {
  background: var(--scb-surface-tint);
  border: 1px dashed var(--scb-text-caption);
  color: var(--scb-text-caption);
}

.compartment-tile--taken .compartment-tile__toggle {
  cursor: not-allowed;
}

.compartment-tile--warning .compartment-tile__toggle,
.compartment-swatch--warning {
  box-shadow: var(--scb-ring-warning);
}

.compartment-tile__lock {
  position: absolute;
  top: calc(var(--scb-space-1) / 2);
  right: calc(var(--scb-space-1) / 2);
  color: inherit;
}

.compartment-tile__dots {
  position: absolute;
  left: calc(var(--scb-space-1) / 2);
  bottom: calc(var(--scb-space-1) / 2);
  display: inline-flex;
  gap: calc(var(--scb-space-1) / 2);
  padding: calc(var(--scb-space-1) / 2);
  border-radius: var(--scb-radius-badge);
  background: var(--scb-surface);
  pointer-events: none;
}

.compartment-tile__service {
  position: absolute;
  right: calc(var(--scb-space-1) / 2);
  bottom: calc(var(--scb-space-1) / 2);
  width: var(--scb-space-4);
  height: var(--scb-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--scb-radius-badge);
  background: color-mix(in srgb, var(--scb-on-theme) 25%, transparent);
}

.compartment-tile__service .v-icon {
  color: var(--scb-on-theme);
}

.compartment-dot {
  display: inline-block;
  width: var(--scb-compartment-dot-size);
  height: var(--scb-compartment-dot-size);
  border-radius: 50%;
}

.compartment-dot--running,
.compartment-swatch--running {
  background: var(--v-success-base);
}

.compartment-dot--future,
.compartment-swatch--future {
  border: 2px solid var(--v-primary-base);
}

.compartment-note {
  color: var(--v-warning-darken2);
}

.compartment-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--scb-space-1) var(--scb-space-3);
}

.compartment-legend__entry {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-1);
}

.compartment-swatch {
  display: inline-block;
  width: var(--scb-space-3);
  height: var(--scb-space-3);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-badge);
  background: var(--scb-surface);
}

.compartment-swatch--on {
  background: var(--v-primary-base);
  border-color: var(--v-primary-base);
}

.compartment-swatch--running,
.compartment-swatch--future {
  width: var(--scb-compartment-dot-size);
  height: var(--scb-compartment-dot-size);
  border-radius: 50%;
}

.compartment-swatch--running {
  border: 0;
}

.compartment-swatch--future {
  background: transparent;
}
</style>

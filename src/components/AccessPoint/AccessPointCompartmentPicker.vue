<script>
import {
  compartmentGroups,
  leavingCompartmentNote,
  leavingCompartmentsSummary,
} from "@/utilities/locker-system-compartments";

/**
 * The Fächer of a Schließfachanlage that carries its own, chosen from the
 * provider's list (ECCdigital/tickets#1037): grouped by Schließfachschrank,
 * a checkbox per Fach, and at each chosen one the switch „außer Betrieb“.
 * A Fach another access point holds is not shown. `v-model` is the list as
 * the backend stores it (`config.compartments`).
 */
export default {
  name: "AccessPointCompartmentPicker",
  props: {
    // The chosen Fächer, in the stored shape.
    value: { type: Array, default: () => [] },
    // The provider's listing (`listAccessPoints`).
    listing: { type: Array, default: () => [] },
    // The UUIDs of the Fächer other access points hold.
    taken: { type: Set, default: () => new Set() },
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
    groups() {
      return compartmentGroups(this.listing, this.value, this.taken);
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
  },
  methods: {
    bookingsAt(compartment) {
      return this.bookingsByCompartment[String(compartment.id)] || [];
    },
    leavingNote(compartment) {
      if (!this.leaving.includes(String(compartment.id))) return "";
      return leavingCompartmentNote(this.bookingsAt(compartment));
    },
    toggle(compartment, checked) {
      const others = this.value.filter((c) => c.id !== compartment.id);
      if (!checked) {
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
    setOutOfService(compartment, outOfService) {
      this.$emit(
        "input",
        this.value.map((c) =>
          c.id === compartment.id ? { ...c, outOfService: !!outOfService } : c
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
      <div
        v-for="compartment in group.compartments"
        :key="compartment.id"
        class="compartment-row d-flex flex-wrap align-center"
        :data-compartment-id="compartment.id"
      >
        <v-checkbox
          :input-value="compartment.selected"
          :label="
            $t('accessPoint.management.compartments.compartment', {
              number: compartment.number,
            })
          "
          dense
          hide-details
          class="mt-0 mr-2"
          @change="toggle(compartment, $event)"
        />
        <span class="compartment-dots mr-6">
          <span
            v-for="(booking, index) in bookingsAt(compartment)"
            :key="`${booking.id}-${index}`"
            class="compartment-dot"
            :class="`compartment-dot--${
              booking.running ? 'running' : 'future'
            }`"
            :data-state="booking.running ? 'running' : 'future'"
            data-test="booking-dot"
          />
        </span>
        <v-switch
          v-if="compartment.selected"
          :input-value="compartment.outOfService"
          :label="$t('accessPoint.management.compartments.outOfService')"
          color="warning"
          dense
          hide-details
          class="mt-0"
          @change="setOutOfService(compartment, $event)"
        />
        <span
          v-if="!compartment.listed"
          class="text-caption text--secondary ml-4"
        >
          {{
            $t("accessPoint.management.compartments.notListed", {
              provider: providerTitle,
            })
          }}
        </span>
        <div
          v-if="leavingNote(compartment)"
          class="compartment-consequence text-caption"
          style="flex-basis: 100%"
          data-test="compartment-consequence"
        >
          {{ leavingNote(compartment) }}
        </div>
        <div
          v-if="errors[compartment.id]"
          class="compartment-error error--text text-caption"
          style="flex-basis: 100%"
        >
          {{ errors[compartment.id] }}
        </div>
      </div>
    </div>

    <div
      v-if="bookings.length"
      class="compartment-legend d-flex align-center text-caption text--secondary mb-2"
      data-test="dot-legend"
    >
      <span class="compartment-dot compartment-dot--running mr-1" />
      {{ $t("accessPoint.management.compartments.bookings.legendRunning") }}
      <span class="compartment-dot compartment-dot--future ml-3 mr-1" />
      {{ $t("accessPoint.management.compartments.bookings.legendFuture") }}
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
.compartment-dots {
  display: inline-flex;
  gap: 3px;
  min-width: 8px;
}

.compartment-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.compartment-dot--running {
  background: var(--v-success-base);
}

.compartment-consequence {
  color: var(--v-warning-darken2);
}

.compartment-dot--future {
  border: 2px solid var(--v-primary-base);
}
</style>

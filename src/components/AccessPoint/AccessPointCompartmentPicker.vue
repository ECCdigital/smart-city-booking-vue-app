<script>
import { compartmentGroups } from "@/utilities/locker-system-compartments";

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
  },
  computed: {
    groups() {
      return compartmentGroups(this.listing, this.value, this.taken);
    },
    selectedCount() {
      return this.value.length;
    },
  },
  methods: {
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
          class="mt-0 mr-6"
          @change="toggle(compartment, $event)"
        />
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
          v-if="errors[compartment.id]"
          class="compartment-error error--text text-caption"
          style="flex-basis: 100%"
        >
          {{ errors[compartment.id] }}
        </div>
      </div>
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

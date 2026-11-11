<script>
import FormatService from "@/services/FormatService";

/**
 * The bookings at the Fächer that leave a Schließfachanlage with a save -
 * out of service, or out of the Anlage (ECCdigital/tickets#1043).
 *
 * Before the save (`mode: "confirm"`) it names the running bookings, which
 * keep their Fach, and the future ones, which the backend gives the first
 * free Fach in service, and asks. After the save (`mode: "unmoved"`) it names
 * the future bookings no Fach was free for: they stay at the old one, for the
 * administration to solve by hand.
 */
export default {
  name: "AccessPointCompartmentBookingsDialog",
  props: {
    open: { type: Boolean, default: false },
    mode: {
      type: String,
      default: "confirm",
      validator: (value) => ["confirm", "unmoved"].includes(value),
    },
    // `{ id, name, mail, timeBegin, timeEnd, state?, compartment }`
    bookings: { type: Array, default: () => [] },
    // How many there are; the list names the first ones only.
    total: { type: Number, default: 0 },
    // The bookings could not be read - the question is asked all the same.
    unreadable: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  computed: {
    confirming() {
      return this.mode === "confirm";
    },
    rows() {
      return this.bookings.map((booking, index) => ({
        key: `${booking.id}:${booking.compartment?.id ?? index}`,
        id: booking.id,
        state: booking.state ? this.stateText(booking.state) : "",
        subtitle: [
          this.compartmentText(booking.compartment),
          booking.name,
          booking.mail,
          this.periodOf(booking),
        ]
          .filter(Boolean)
          .join(" • "),
      }));
    },
    unlistedCount() {
      return Math.max(this.total - this.bookings.length, 0);
    },
  },
  methods: {
    stateText(state) {
      return this.$t(
        `accessPoint.management.compartments.leave.states.${state}`
      );
    },
    compartmentText(compartment) {
      if (!compartment) return "";
      const parts = [];
      if (compartment.lockerBank?.name) {
        parts.push(
          this.$t("accessPoint.management.compartments.lockerBank", {
            name: compartment.lockerBank.name,
          })
        );
      }
      if (compartment.number != null) {
        parts.push(
          this.$t("accessPoint.management.compartments.compartment", {
            number: compartment.number,
          })
        );
      }
      return parts.join(", ");
    },
    periodOf(booking) {
      if (!booking.timeBegin || !booking.timeEnd) return "";
      return `${FormatService.dateTime(
        booking.timeBegin
      )} – ${FormatService.dateTime(booking.timeEnd)}`;
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="600"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="warning">mdi-alert</v-icon>
        <span class="text-h5">
          {{
            confirming
              ? $t("accessPoint.management.compartments.leave.title")
              : $t("accessPoint.management.compartments.leave.unmovedTitle")
          }}
        </span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <template v-if="confirming">
          <p v-if="unreadable" class="mb-0">
            {{ $t("accessPoint.management.compartments.leave.unreadable") }}
          </p>
          <p v-else>
            {{ $t("accessPoint.management.compartments.leave.question") }}
          </p>
        </template>
        <p v-else>
          {{ $t("accessPoint.management.compartments.leave.unmovedText") }}
        </p>

        <ul v-if="rows.length > 0" class="booking-list">
          <li v-for="row in rows" :key="row.key" class="compartment-booking">
            {{ row.id }}
            <span v-if="row.state" class="font-weight-medium">
              – {{ row.state }}
            </span>
            <div v-if="row.subtitle" class="text-caption">
              {{ row.subtitle }}
            </div>
          </li>
        </ul>
        <div v-if="unlistedCount > 0" class="text-caption mt-1">
          {{
            $t("accessPoint.management.compartments.leave.more", {
              count: unlistedCount,
            })
          }}
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <template v-if="confirming">
          <v-btn
            class="cancel-compartments-leave"
            outlined
            :disabled="saving"
            @click="$emit('close')"
          >
            {{ $t("accessPoint.management.cancel") }}
          </v-btn>
          <v-btn
            class="confirm-compartments-leave"
            color="primary"
            :loading="saving"
            @click="$emit('confirm')"
          >
            <v-icon left small>mdi-content-save</v-icon>
            {{ $t("accessPoint.management.compartments.leave.confirm") }}
          </v-btn>
        </template>
        <v-btn
          v-else
          class="close-unmoved"
          color="primary"
          @click="$emit('close')"
        >
          {{ $t("accessPoint.management.compartments.leave.ok") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.booking-list {
  margin: 0;
  padding-left: 18px;
}
</style>

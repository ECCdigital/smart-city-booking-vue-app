<script>
import ApiAccessService from "@/services/api/ApiAccessService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

/** The 409 of a Fach taken or put out of service since it was offered. */
const COMPARTMENT_TAKEN = "compartment_taken";

/**
 * „Fach umsetzen“ (ECCdigital/tickets#1044): moves a Fach the platform
 * assigned to a booking to another Fach of the same Schließfachanlage, a
 * running booking too. It offers the Fächer the backend names free for the
 * booking's period with its buffers and in service; the backend checks again
 * under the mutex of the Anlage, and a Fach taken in between is refused - the
 * dialog then stays and offers the free Fächer anew.
 *
 * Emits `moved` once the Fach is moved - its id changes, so the accesses are
 * read anew - and `close`.
 */
export default {
  name: "BookingCompartmentReassignDialog",
  props: {
    open: { type: Boolean, default: false },
    booking: { type: Object, required: true },
    // The projected entry of the Fach to move.
    entry: { type: Object, default: null },
    // The entry's title as the list shows it.
    currentTitle: { type: String, default: "" },
  },
  data() {
    return {
      compartments: [],
      chosen: null,
      loading: false,
      saving: false,
      error: null,
    };
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (open) {
          this.error = null;
          this.load();
        }
      },
    },
  },
  methods: {
    optionText(compartment) {
      return compartment.lockerBankName
        ? this.$t("accessPoint.booking.reassign.option", {
            lockerBank: compartment.lockerBankName,
            number: compartment.number,
          })
        : this.$t("accessPoint.booking.reassign.optionWithoutBank", {
            number: compartment.number,
          });
    },
    async load() {
      if (!this.entry) return;
      this.loading = true;
      this.chosen = null;
      try {
        const response = await ApiAccessService.getFreeCompartments(
          this.booking.id,
          this.entry.id,
          this.booking.tenantId
        );
        const data = response.data?.data;
        this.compartments = Array.isArray(data) ? data : [];
      } catch (error) {
        this.compartments = [];
        this.error = getApiErrorMessage(
          error,
          this.$t("accessPoint.booking.reassign.loadError")
        );
      } finally {
        this.loading = false;
      }
    },
    async confirm() {
      if (!this.chosen) return;
      this.saving = true;
      this.error = null;
      try {
        await ApiAccessService.reassignCompartment(
          this.booking.id,
          this.entry.id,
          this.chosen,
          this.booking.tenantId
        );
        this.$emit("moved");
      } catch (error) {
        this.error = getApiErrorMessage(
          error,
          this.$t("accessPoint.booking.reassign.error")
        );
        if (error?.response?.data?.code === COMPARTMENT_TAKEN) {
          await this.load();
        }
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="560"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="primary">mdi-swap-horizontal</v-icon>
        <span class="text-h5">{{
          $t("accessPoint.booking.reassign.title")
        }}</span>
        <v-spacer />
        <v-btn
          icon
          data-test="reassign-close"
          :disabled="saving"
          @click="$emit('close')"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <p class="mb-2">
          {{ $t("accessPoint.booking.reassign.current") }}
          <strong>{{ currentTitle }}</strong>
        </p>
        <p>{{ $t("accessPoint.booking.reassign.hint") }}</p>

        <v-alert
          v-if="error"
          type="error"
          text
          dense
          border="left"
          data-test="reassign-error"
        >
          {{ error }}
        </v-alert>

        <v-progress-linear v-if="loading" indeterminate class="mb-2" />
        <p
          v-else-if="compartments.length === 0"
          class="mb-0"
          data-test="reassign-none"
        >
          {{ $t("accessPoint.booking.reassign.none") }}
        </p>
        <v-list v-else dense outlined>
          <v-list-item-group v-model="chosen" color="primary">
            <v-list-item
              v-for="compartment in compartments"
              :key="compartment.id"
              :value="compartment.id"
              data-test="reassign-option"
            >
              <v-list-item-icon>
                <v-icon>mdi-locker</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{
                  optionText(compartment)
                }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined :disabled="saving" @click="$emit('close')">
          {{ $t("accessPoint.booking.reassign.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          data-test="reassign-confirm"
          :loading="saving"
          :disabled="!chosen || loading"
          @click="confirm"
        >
          <v-icon left small>mdi-swap-horizontal</v-icon>
          {{ $t("accessPoint.booking.reassign.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

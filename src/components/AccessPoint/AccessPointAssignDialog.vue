<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import { accessPointLabel } from "@/utilities/access-points";
import { carriesOwnCompartments } from "@/utilities/locker-system-compartments";

/** Whether the bookable carries the access point. */
function carries(bookable, accessPointId) {
  return (bookable.accessPointDetails?.accessPointIds || []).includes(
    accessPointId
  );
}

/**
 * The dialog Zuordnen (ECCdigital/tickets#1110): the bookables of one access
 * point, to tick. It lists the bookables the person may edit; one assigned
 * that she may not edit stays assigned and is sent along unchanged, so the
 * save never fails on a missing right. A Schließfachanlage with its own
 * Fächer belongs to one bookable, so there a tick replaces the other.
 *
 * Props: `open`, `accessPoint`, `bookables` (all the page loaded).
 * Events: `close`, `saved` (once the backend took the assignment).
 */
export default {
  name: "AccessPointAssignDialog",
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    bookables: { type: Array, default: () => [] },
  },
  data() {
    return {
      selected: [],
      saving: false,
      error: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    label() {
      return this.accessPoint ? accessPointLabel(this.accessPoint) : "";
    },
    editable() {
      return this.bookables.filter((bookable) =>
        BookablePermissionService.allowUpdate(bookable)
      );
    },
    // Assigned, but not the person's to change: kept as it is.
    kept() {
      if (!this.accessPoint) return [];
      return this.bookables
        .filter(
          (bookable) =>
            carries(bookable, this.accessPoint.id) &&
            !this.editable.includes(bookable)
        )
        .map((bookable) => bookable.id);
    },
    single() {
      return carriesOwnCompartments(this.accessPoint);
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) return;
      this.saving = false;
      this.error = "";
      this.selected = this.editable
        .filter((bookable) => carries(bookable, this.accessPoint.id))
        .map((bookable) => bookable.id);
    },
  },
  methods: {
    toggle(id, ticked) {
      const others = this.single
        ? []
        : this.selected.filter((selectedId) => selectedId !== id);
      this.selected = ticked ? [...others, id] : others;
    },
    async save() {
      this.saving = true;
      this.error = "";
      try {
        await ApiAccessPointService.assignBookables(
          this.accessPoint.id,
          [
            ...this.kept,
            ...this.editable
              .map((bookable) => bookable.id)
              .filter((id) => this.selected.includes(id)),
          ],
          this.tenantId
        );
        this.$emit("saved", this.accessPoint);
      } catch (error) {
        this.error = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.assign.error",
          forbiddenKey: "accessPoint.management.assign.forbidden",
        });
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
    max-width="480"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-link-variant</v-icon>
        <span class="text-h5">
          {{ $t("accessPoint.management.assign.title") }}
        </span>
        <v-spacer />
        <v-btn icon :disabled="saving" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-6">
        <p class="mb-1 font-weight-medium">{{ label }}</p>
        <p class="mb-4">
          {{
            $t(
              single
                ? "accessPoint.management.assign.single"
                : "accessPoint.management.assign.hint"
            )
          }}
        </p>
        <p v-if="!editable.length" class="text--secondary mb-0">
          {{ $t("accessPoint.management.assign.none") }}
        </p>
        <div
          v-for="bookable in editable"
          :key="bookable.id"
          data-test="assign-choice"
        >
          <v-checkbox
            :input-value="selected.includes(bookable.id)"
            :label="bookable.title"
            dense
            hide-details
            class="mt-1"
            @change="(ticked) => toggle(bookable.id, ticked)"
          />
        </div>
        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined :disabled="saving" @click="$emit('close')">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          data-test="assign-save"
          @click="save"
        >
          <v-icon left small>mdi-content-save</v-icon>
          {{ $t("accessPoint.management.assign.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

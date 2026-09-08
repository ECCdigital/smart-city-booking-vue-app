<script>
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import { defaultAccessPointDetails } from "@/utilities/access-points";

/**
 * The access tab of the bookable editor.
 *
 * It used to offer three provider cards - smart door lock, locker, bike box -
 * each with its own configuration below it. Since the locker fold a locker
 * system is an access point like a door, so there is one thing to configure:
 * which access points this bookable uses. The provider is a property of the
 * access point and is chosen where the access point is created.
 *
 * The tab owns the switch, the buffer and the assignment - nothing that
 * counts. The bookable's `amount` (Stückzahl) is edited on the pricing tab
 * only; it is the capacity the concurrent bookings are counted against, and a
 * booking gets one compartment per booked unit at each assigned locker system
 * regardless of it (`docs/agents/access-vocabulary.md`).
 */
export default {
  name: "BookableEditAccessLocks",
  components: { BookableEditAccessPoints },
  props: {
    bookable: { type: Object, required: true },
    validRoot: { type: Boolean, default: true },
  },
  computed: {
    // The same gate the editor itself uses. Someone who may not write this
    // bookable may not hand out access to it either.
    showAccess() {
      if (!this.bookable?.id) return BookablePermissionService.allowCreate();
      return BookablePermissionService.allowUpdate(this.bookable);
    },
    accessPointDetails() {
      return this.bookable?.accessPointDetails || {};
    },
    active: {
      get() {
        return !!this.accessPointDetails.active;
      },
      set(active) {
        this.$emit("update:bookable", {
          ...this.bookable,
          accessPointDetails: {
            ...defaultAccessPointDetails(),
            ...this.accessPointDetails,
            active,
          },
        });
      },
    },
    assignedCount() {
      return (this.accessPointDetails.accessPointIds || []).length;
    },
  },
  methods: {
    onChildUpdate(updated) {
      this.$emit("update:bookable", updated);
    },
    validate() {
      const child = this.$refs.access;
      return child?.validate ? child.validate() : true;
    },
    resetValidation() {
      this.$refs.access?.resetValidation?.();
    },
  },
};
</script>

<template>
  <div>
    <div class="d-flex align-center mb-1">
      <v-icon color="primary" class="mr-2">mdi-shield-key-outline</v-icon>
      <span class="text-h6">{{ $t("accessPoint.bookable.title") }}</span>
      <v-spacer />
      <v-chip small label outlined :color="assignedCount ? 'success' : 'grey'">
        {{ $t("accessPoint.bookable.assignedCount", { count: assignedCount }) }}
      </v-chip>
    </div>
    <div class="text-body-2 text--secondary mb-4">
      {{ $t("accessPoint.bookable.intro") }}
    </div>

    <v-alert v-if="!showAccess" dense text type="info" class="mb-0">
      {{ $t("accessPoint.bookable.writeForbidden") }}
    </v-alert>

    <template v-else>
      <v-switch v-model="active" hide-details color="primary" class="mt-0 mb-4">
        <template v-slot:label>
          <div>
            <div class="font-weight-medium">
              {{ $t("accessPoint.bookable.activate") }}
            </div>
            <div class="text-caption text--secondary">
              {{ $t("accessPoint.bookable.activateHint") }}
            </div>
          </div>
        </template>
      </v-switch>

      <template v-if="active">
        <BookableEditAccessPoints
          ref="access"
          :bookable="bookable"
          @update:bookable="onChildUpdate"
        />
      </template>
    </template>
  </div>
</template>

<style scoped></style>

<script>
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import { defaultAccessPointDetails } from "@/utilities/access-points";
import { handlesCapability } from "@/utils/bookableExternalProviders";

/**
 * The access tab of the bookable editor.
 *
 * It used to offer three provider cards - smart door lock, locker, bike box -
 * each with its own configuration below it. Since the locker fold a locker
 * system is an access point like a door, so there is one thing to configure:
 * which access points this bookable uses. The provider is a property of the
 * access point and is chosen where the access point is created.
 *
 * What the tab owns on top of the assignment is the bookable's `amount`: after
 * the fold it is the number that decides how many compartments a booking gets
 * at each assigned locker system, and it lives nowhere near this screen
 * otherwise.
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
    // An external provider may report the amount itself (iFBS reports how many
    // bike boxes a location has). The pricing tab locks the field for that
    // reason, and so does this one - two editors, one owner.
    amountOwnedExternally() {
      return handlesCapability(this.bookable, "maxAmount");
    },
  },
  methods: {
    setAmount(value) {
      const amount = value === "" || value === null ? null : Number(value);
      this.$emit("update:bookable", {
        ...this.bookable,
        amount: Number.isNaN(amount) ? null : amount,
      });
    },
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
        <v-card outlined class="mb-4">
          <v-card-text class="d-flex align-center">
            <v-icon color="primary" size="32" class="mr-4">mdi-counter</v-icon>
            <div class="flex-grow-1 mr-4">
              <div class="text-subtitle-1 font-weight-bold">
                {{ $t("accessPoint.bookable.capacity.title") }}
              </div>
              <div class="text-body-2 text--secondary">
                {{
                  amountOwnedExternally
                    ? $t("accessPoint.bookable.capacity.externalHint")
                    : $t("accessPoint.bookable.capacity.hint")
                }}
              </div>
            </div>
            <v-text-field
              class="capacity-field flex-grow-0"
              :value="bookable.amount"
              type="number"
              min="0"
              step="1"
              :disabled="amountOwnedExternally"
              :label="$t('accessPoint.bookable.capacity.label')"
              background-color="accent"
              filled
              dense
              hide-details
              style="max-width: 140px"
              @input="setAmount($event)"
            />
          </v-card-text>
        </v-card>

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

<script>
import ApiRolesService from "@/services/api/ApiRolesService";
import bookableEditing from "@/mixins/bookableEditing";

/**
 * Serienbuchung: whether bookers may book a series of dates at once, and
 * optionally only those of some roles. Zeiträume book no series - the
 * booking mode switches it off (`applyBookingMode`), here it is only shown
 * as unavailable. The area as the editing page frames it in a card and the
 * step „Weitere Einstellungen“ in a row.
 */
export default {
  name: "BookableEditGroupBooking",
  mixins: [bookableEditing],
  data() {
    return {
      availableRoles: [],
    };
  },
  computed: {
    groupBooking() {
      return this.bookable.groupBooking || { enabled: false };
    },
    permittedRoles() {
      return this.groupBooking.permittedRoles || [];
    },
    blockPeriods() {
      return !!this.bookable.isBlockPeriodRelated;
    },
  },
  methods: {
    setGroupBooking(changes) {
      this.patch({
        groupBooking: {
          ...this.groupBooking,
          permittedRoles: this.permittedRoles,
          ...changes,
        },
      });
    },
    setRoles(roles) {
      this.setGroupBooking({ permittedRoles: roles || [] });
    },
    removeRole(role) {
      this.setRoles(this.permittedRoles.filter((id) => id !== role));
    },
    roleName(id) {
      return this.availableRoles.find((role) => role.id === id)?.name;
    },
    async fetchRoles() {
      try {
        const result = await ApiRolesService.getTenantRoles(
          true,
          this.bookable.tenantId
        );
        this.availableRoles = result?.data || [];
      } catch (error) {
        console.error("Error fetching roles:", error);
        this.availableRoles = [];
      }
    },
  },
  mounted() {
    this.fetchRoles();
  },
};
</script>

<template>
  <div>
    <v-switch
      dense
      :label="$t('bookable.areas.groupBooking.allow')"
      hide-details
      :input-value="groupBooking.enabled"
      :disabled="blockPeriods"
      @change="setGroupBooking({ enabled: !!$event })"
    ></v-switch>
    <v-alert v-if="blockPeriods" color="info" dense text class="mt-3 mb-0">
      {{ $t("bookable.areas.groupBooking.notWithBlockPeriods") }}
    </v-alert>
    <p v-else class="mb-3 mt-5 text-caption" style="max-width: 700px">
      {{ $t("bookable.areas.groupBooking.explanation") }}
    </p>
    <v-row v-if="groupBooking.enabled" class="mt-4">
      <v-col cols="12">
        <v-alert color="info" dense text class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info">mdi-information-outline</v-icon>
            <div v-html="$t('bookable.areas.groupBooking.rolesNote')"></div>
          </div>
        </v-alert>

        <v-combobox
          :value="permittedRoles"
          :items="availableRoles"
          :label="$t('bookable.areas.groupBooking.roles')"
          item-text="name"
          item-value="id"
          hide-selected
          :no-data-text="$t('bookable.areas.groupBooking.noRoles')"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
          :return-object="false"
          @change="setRoles"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removeRole(item)"
            >
              <strong>{{ roleName(item) }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>
  </div>
</template>

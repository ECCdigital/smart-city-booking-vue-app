<template>
  <div data-test="flow-permission">
    <div class="flow-field">
      <div class="flow-question">
        <v-icon small>mdi-account-check-outline</v-icon>
        {{ $t("bookable.flow.permission.who") }}
      </div>
      <div class="flow-field__hint mt-0 mb-3">
        {{ $t("bookable.flow.permission.who-hint") }}
      </div>
      <OnboardingChoiceTiles
        :value="access"
        :options="accessOptions"
        :label="$t('bookable.flow.permission.who')"
        test-id="flow-access"
        @input="setAccess"
      />
    </div>

    <div
      v-if="access === 'selected'"
      class="flow-field"
      data-test="flow-selected"
    >
      <p v-if="!hasSelection" class="flow-note" data-test="flow-selected-empty">
        {{ $t("bookable.flow.permission.selected-empty") }}
      </p>
      <UserRoleSelector
        :users="bookable.permittedUsers || []"
        :roles="bookable.permittedRoles || []"
        :available-users="availableUserIds"
        :available-roles-prop="availableRoles"
        :fetch-roles-on-mount="false"
        :users-label="$t('bookable.flow.permission.users')"
        :roles-label="$t('bookable.flow.permission.roles')"
        @update:users="patch({ permittedUsers: $event })"
        @update:roles="patch({ permittedRoles: $event })"
      />
    </div>

    <!-- Price exceptions are the editor's discounts, which change the lists
         in place as in the permissions tab; expert mode only, as there. -->
    <div v-if="expertMode" class="flow-rule" data-test="flow-free-booking">
      <div class="flow-question">
        <v-icon small>mdi-ticket-percent-outline</v-icon>
        {{ $t("bookable.flow.permission.free") }}
      </div>
      <p v-if="!paid" class="flow-note mb-0" data-test="flow-free-not-paid">
        {{ $t("bookable.flow.permission.free-not-paid") }}
      </p>
      <template v-else>
        <div class="flow-field__hint mt-0 mb-3">
          {{ $t("bookable.flow.permission.free-hint") }}
        </div>
        <BookingDiscountEditor
          v-if="bookable.bookingDiscounts"
          :items="bookable.bookingDiscounts.users"
          type="user"
          :available-users="availableUsers"
          :label="$t('bookable.flow.permission.free-users')"
        />
        <BookingDiscountEditor
          v-if="bookable.bookingDiscounts"
          :items="bookable.bookingDiscounts.roles"
          type="role"
          :available-roles="availableRoles"
          :label="$t('bookable.flow.permission.free-roles')"
        />
      </template>
    </div>
  </div>
</template>

<script>
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import UserRoleSelector from "@/components/commons/UserRoleSelector.vue";
import BookingDiscountEditor from "@/components/Bookable/Edit/BookingDiscountEditor.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import bookableEditing from "@/mixins/bookableEditing";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import { tenantUserOptions } from "@/utils/tenantUsers";
import { accessOf, applyAccess, isPaid } from "@/utils/bookableFlow";

/**
 * Step 5, Berechtigung: who may book - everyone, signed-in users, or named
 * roles and people - and who books at a discount up to free of charge. The
 * choice is the step's own until roles or people are named (an empty
 * selection reads as „signed in“), so the step is kept alive by the flow.
 */
export default {
  name: "BookableFlowPermission",
  components: {
    OnboardingChoiceTiles,
    UserRoleSelector,
    BookingDiscountEditor,
  },
  mixins: [bookableEditing, bookableExpertMode],
  data() {
    return {
      access: accessOf(this.bookable),
      availableUsers: [],
      availableRoles: [],
    };
  },
  computed: {
    accessOptions() {
      return ["everyone", "signedIn", "selected"].map((value) => ({
        value,
        label: this.$t(`bookable.flow.permission.access.${value}`),
        description: this.$t(`bookable.flow.permission.access.${value}-hint`),
      }));
    },
    hasSelection() {
      return (
        (this.bookable.permittedUsers || []).length > 0 ||
        (this.bookable.permittedRoles || []).length > 0
      );
    },
    availableUserIds() {
      return this.availableUsers.map((user) => user.userId);
    },
    paid() {
      return isPaid(this.bookable);
    },
    tenantId() {
      return this.bookable.tenantId;
    },
  },
  watch: {
    tenantId: { immediate: true, handler: "fetchUsers" },
  },
  mounted() {
    this.fetchRoles();
  },
  methods: {
    setAccess(access) {
      this.access = access;
      this.apply((next) => applyAccess(next, access));
    },
    async fetchRoles() {
      try {
        const response = await ApiRolesService.getTenantRoles(true);
        this.availableRoles = response?.data || [];
      } catch (error) {
        console.error(error);
        this.availableRoles = [];
      }
    },
    async fetchUsers() {
      if (!this.tenantId) {
        this.availableUsers = [];
        return;
      }
      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.availableUsers = tenantUserOptions(response).map((user) => ({
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.label,
          hasName: !!user.name,
        }));
      } catch (error) {
        console.error(error);
        this.availableUsers = [];
      }
    },
  },
};
</script>

<template>
  <div class="bookable-permission" data-test="permission">
    <div class="bookable-permission__part" data-field="access">
      <p class="bookable-permission__hint">
        {{ $t("bookable.flow.permission.who-hint") }}
      </p>
      <OnboardingChoiceTiles
        :value="access"
        :options="accessOptions"
        :label="$t('bookable.flow.permission.who')"
        test-id="access"
        @input="setAccess"
      />
    </div>

    <div
      v-if="access === 'selected'"
      class="bookable-permission__part"
      data-test="selected"
    >
      <p
        v-if="!hasSelection"
        class="bookable-permission__note"
        data-test="selected-empty"
      >
        {{ $t("bookable.flow.permission.selected-empty") }}
      </p>
      <div data-test="permitted-roles" class="mb-4">
        <v-autocomplete
          :value="permittedRoles"
          :items="roleOptions"
          item-text="label"
          item-value="id"
          :label="$t('bookable.flow.permission.roles')"
          :no-data-text="$t('bookable.flow.permission.no-roles')"
          prepend-inner-icon="mdi-account-group"
          multiple
          hide-selected
          outlined
          dense
          hide-details
          @change="setPermitted({ permittedRoles: $event })"
        >
          <template #selection="{ item }">
            <v-chip
              small
              close
              :class="{ 'bookable-permission__unknown': item.unknown }"
              :title="item.unknown ? item.sub : undefined"
              @click:close="
                setPermitted({
                  permittedRoles: without(permittedRoles, item.id),
                })
              "
            >
              {{ item.label }}
            </v-chip>
          </template>
          <template #item="{ item }">
            <v-list-item-content>
              <v-list-item-title>{{ item.label }}</v-list-item-title>
              <v-list-item-subtitle v-if="item.sub">
                {{ item.sub }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </v-autocomplete>
      </div>
      <div data-test="permitted-users">
        <v-autocomplete
          :value="permittedUsers"
          :items="userOptions"
          item-text="label"
          item-value="id"
          :filter="matchesPerson"
          :label="$t('bookable.flow.permission.users')"
          :no-data-text="$t('bookable.flow.permission.no-users')"
          prepend-inner-icon="mdi-account"
          multiple
          hide-selected
          outlined
          dense
          hide-details
          @change="setPermitted({ permittedUsers: $event })"
        >
          <template #selection="{ item }">
            <v-chip
              small
              close
              :class="{ 'bookable-permission__unknown': item.unknown }"
              :title="item.sub || undefined"
              @click:close="
                setPermitted({
                  permittedUsers: without(permittedUsers, item.id),
                })
              "
            >
              {{ item.label }}
            </v-chip>
          </template>
          <template #item="{ item }">
            <v-list-item-content>
              <v-list-item-title>{{ item.label }}</v-list-item-title>
              <v-list-item-subtitle v-if="item.sub">
                {{ item.sub }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </v-autocomplete>
      </div>
    </div>

    <!-- An expert option (bookableExpertMode.js); the sub-navigation of the
         editing page jumps to it. -->
    <div
      v-if="expertOptionShown('bookingDiscounts')"
      :id="discountsElementId"
      class="bookable-permission__part bookable-permission__part--ruled"
      data-test="discounts"
      data-field="bookingDiscounts"
    >
      <div class="bookable-permission__question">
        <v-icon small>mdi-ticket-percent-outline</v-icon>
        {{ $t("bookable.flow.permission.discounts") }}
      </div>
      <p class="bookable-permission__hint">
        {{ $t("bookable.flow.permission.discounts-hint") }}
      </p>
      <p
        v-if="!paid"
        class="bookable-permission__note"
        data-test="discounts-not-paid"
      >
        {{ $t("bookable.flow.permission.discounts-not-paid") }}
      </p>
      <BookingDiscountList
        :items="discounts.roles"
        id-key="roleId"
        :options="roleOptions"
        :label="$t('bookable.flow.permission.roles')"
        icon="mdi-account-group"
        :add-label="$t('bookable.flow.permission.add-role')"
        :no-data-text="$t('bookable.flow.permission.no-roles')"
        :rules="fieldRules.discountPercent"
        @update:items="setDiscounts('roles', $event)"
      />
      <BookingDiscountList
        :items="discounts.users"
        id-key="userId"
        :options="userOptions"
        :label="$t('bookable.flow.permission.users')"
        icon="mdi-account"
        :add-label="$t('bookable.flow.permission.add-user')"
        :no-data-text="$t('bookable.flow.permission.no-users')"
        :rules="fieldRules.discountPercent"
        @update:items="setDiscounts('users', $event)"
      />
    </div>
  </div>
</template>

<script>
import _ from "lodash";
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import BookingDiscountList from "@/components/Bookable/Edit/BookingDiscountList.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import bookableEditing from "@/mixins/bookableEditing";
import tenantRoles from "@/mixins/tenantRoles";
import { tenantUserOptions } from "@/utils/tenantUsers";
import { bookableEditSectionElementId } from "@/utils/bookableEditSections";
import {
  accessOf,
  applyAccess,
  applyPermitted,
  isPaid,
} from "@/utils/bookableFlow";

const ACCESS = ["everyone", "signedIn", "selected"];

/**
 * „Wer darf buchen?“ and the Preisnachlass, the one component of both modes:
 * the editing page frames it as a card in the tab Berechtigungen, the guided
 * flow as its step Berechtigung.
 *
 * The choice is read from the bookable (`accessOf`) and set by `applyAccess`;
 * naming roles or people sets the login requirement in the same patch
 * (`applyPermitted`). „Nur ausgewählte“ with nobody named is the same data as
 * „Alle mit Konto“, so the tile clicked is held while the data cannot show
 * it; losing that costs nothing. Roles and people are those of the
 * bookable's tenant, loaded once; ids the tenant no longer knows stay
 * visible and removable. The Preisnachlass is rebuilt as a whole and stays
 * on a free bookable, where it acts once there is a price.
 */
export default {
  name: "BookableFlowPermission",
  components: { OnboardingChoiceTiles, BookingDiscountList },
  mixins: [bookableEditing, tenantRoles],
  data() {
    return {
      chosenAccess: null,
      people: [],
    };
  },
  computed: {
    access() {
      const stored = accessOf(this.bookable);
      return this.chosenAccess === "selected" && stored === "signedIn"
        ? "selected"
        : stored;
    },
    accessOptions() {
      return ACCESS.map((value) => ({
        value,
        label: this.$t(`bookable.flow.permission.access.${value}`),
        description: this.$t(`bookable.flow.permission.access.${value}-hint`),
      }));
    },
    permittedRoles() {
      return this.bookable.permittedRoles || [];
    },
    permittedUsers() {
      return this.bookable.permittedUsers || [];
    },
    hasSelection() {
      return this.permittedRoles.length > 0 || this.permittedUsers.length > 0;
    },
    discounts() {
      return {
        roles: this.bookable.bookingDiscounts?.roles || [],
        users: this.bookable.bookingDiscounts?.users || [],
      };
    },
    roleOptions() {
      const known = this.tenantRoles.map((role) => ({
        id: role.id,
        label: role.name || role.id,
      }));
      return withUnknown(
        known,
        [
          ...this.permittedRoles,
          ...this.discounts.roles.map((entry) => entry.roleId),
        ],
        this.unknownHint
      );
    },
    userOptions() {
      const known = this.people.map((person) => ({
        id: person.userId,
        label: person.label,
        sub: person.name ? person.userId : "",
      }));
      return withUnknown(
        known,
        [
          ...this.permittedUsers,
          ...this.discounts.users.map((entry) => entry.userId),
        ],
        this.unknownHint
      );
    },
    unknownHint() {
      return this.$t("bookable.flow.permission.unknown");
    },
    paid() {
      return isPaid(this.bookable);
    },
    tenantId() {
      return this.bookable.tenantId;
    },
    discountsElementId() {
      return bookableEditSectionElementId("permissions-discounts");
    },
  },
  watch: {
    tenantId: { immediate: true, handler: "loadPeople" },
  },
  methods: {
    setAccess(access) {
      this.chosenAccess = access;
      this.apply((next) => applyAccess(next, access));
    },
    setPermitted(lists) {
      this.chosenAccess = "selected";
      this.apply((next) => applyPermitted(next, lists));
    },
    setDiscounts(kind, items) {
      this.patch({ bookingDiscounts: { ...this.discounts, [kind]: items } });
    },
    without(list, id) {
      return list.filter((entry) => entry !== id);
    },
    // People are found by name and by id.
    matchesPerson(item, query) {
      const text = `${item.label} ${item.sub || ""}`.toLowerCase();
      return text.includes((query || "").toLowerCase());
    },
    async loadPeople() {
      if (!this.tenantId) return;
      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.people = tenantUserOptions(response);
      } catch (error) {
        console.error(error);
        this.people = [];
      }
    },
  },
};

/** The known options plus each id in `ids` they lack, marked as unknown. */
function withUnknown(known, ids, hint) {
  const knownIds = known.map((option) => option.id);
  const unknown = _.uniq(ids)
    .filter((id) => id && !knownIds.includes(id))
    .map((id) => ({ id, label: id, sub: hint, unknown: true }));
  return [...known, ...unknown];
}
</script>

<style scoped>
.bookable-permission__part + .bookable-permission__part {
  margin-top: var(--scb-space-5);
}

.bookable-permission__part--ruled {
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}

.bookable-permission__question {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-1);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.bookable-permission__hint {
  margin: 0 0 var(--scb-space-3);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.bookable-permission__note {
  margin: 0 0 var(--scb-space-4);
  padding: var(--scb-space-3) var(--scb-space-4);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
  background-color: var(--scb-selected-tint-faint);
  border-radius: var(--scb-radius-control);
}

.bookable-permission__unknown {
  font-style: italic;
}
</style>

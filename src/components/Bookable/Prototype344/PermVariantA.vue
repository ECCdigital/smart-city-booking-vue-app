<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     Variant A, Formular des Editors: a switch for the login, two pickers for
     the lists, two discount lists. Fixed to the one rule: set lists force
     the login switch on. -->
<template>
  <div>
    <div class="p344-field">
      <div class="p344-question">
        <v-icon small class="mr-1">mdi-login-variant</v-icon>
        {{ naming.loginTitle }}
      </div>
      <v-switch
        class="mt-0"
        dense
        hide-details
        :input-value="bookable.requiresLogin || hasLists"
        :disabled="hasLists"
        :label="naming.loginLabel"
        @change="setLogin"
      />
      <div v-if="hasLists" class="p344-hint">
        {{ naming.loginLocked || "Bei gewählten Rollen oder Personen immer an." }}
      </div>
    </div>

    <div class="p344-field">
      <div class="p344-question">
        <v-icon small class="mr-1">mdi-account-lock-outline</v-icon>
        {{ naming.listsTitle }}
      </div>
      <div v-if="naming.listsHint" class="p344-hint mb-3">
        {{ naming.listsHint }}
      </div>
      <PeoplePicker
        :users="users"
        :roles="roles"
        :user-items="userItems"
        :role-items="roleItems"
        :naming="naming"
        @update:users="setUsers"
        @update:roles="setRoles"
      />
    </div>

    <div v-if="showsDiscounts" class="p344-rule">
      <div class="p344-question">
        <v-icon small class="mr-1">mdi-ticket-percent-outline</v-icon>
        {{ naming.discounts }}
      </div>
      <div class="p344-hint mb-3">{{ naming.discountsHint }}</div>
      <p v-if="!paid" class="p344-note">
        {{ naming.discountsNotPaid || "Wirkt erst mit Preis." }}
      </p>
      <DiscountList
        v-for="type in ['role', 'user']"
        :key="type"
        :type="type"
        :entries="discountEntries(type)"
        :items="type === 'user' ? userItems : roleItems"
        :label="type === 'user' ? naming.discountUsers : naming.discountRoles"
        :percent-label="naming.percent"
        :label-of="(id) => labelOf(type, id)"
        @add="(id) => addDiscount(type, id)"
        @set="(i, v) => setDiscount(type, i, v)"
        @remove="(i) => removeDiscount(type, i)"
      />
    </div>
  </div>
</template>

<script>
import permVariant from "./permVariant";
import PeoplePicker from "./PeoplePicker.vue";
import DiscountList from "./DiscountList.vue";

export default {
  name: "PermVariantA",
  components: { PeoplePicker, DiscountList },
  mixins: [permVariant],
};
</script>

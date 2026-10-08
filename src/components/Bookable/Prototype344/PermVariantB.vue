<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     Variant B, Fragen des Ablaufs: three tiles for who may book, the pickers
     only for the third, then the question on discounts. -->
<template>
  <div>
    <div class="p344-field">
      <div class="p344-question">
        <v-icon small class="mr-1">mdi-account-check-outline</v-icon>
        {{ naming.who }}
      </div>
      <div v-if="naming.whoHint" class="p344-hint mt-0 mb-3">
        {{ naming.whoHint }}
      </div>
      <OnboardingChoiceTiles
        :value="access"
        :options="accessOptions"
        :label="naming.who"
        test-id="p344-access"
        @input="setAccess"
      />
    </div>

    <div v-if="access === 'selected'" class="p344-field">
      <p v-if="!hasLists && naming.selectedEmpty" class="p344-note">
        {{ naming.selectedEmpty }}
      </p>
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
      <div class="p344-hint mt-0 mb-3">{{ naming.discountsHint }}</div>
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
import OnboardingChoiceTiles from "@/components/Tenant/Onboarding/OnboardingChoiceTiles.vue";
import permVariant from "./permVariant";
import PeoplePicker from "./PeoplePicker.vue";
import DiscountList from "./DiscountList.vue";

export default {
  name: "PermVariantB",
  components: { OnboardingChoiceTiles, PeoplePicker, DiscountList },
  mixins: [permVariant],
};
</script>

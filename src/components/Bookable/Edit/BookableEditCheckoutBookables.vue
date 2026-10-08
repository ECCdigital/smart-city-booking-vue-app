<script>
import BookableCheckoutBookables from "@/components/Bookable/BookableCheckoutBookables.vue";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import bookableEditing from "@/mixins/bookableEditing";
import otherBookables from "@/mixins/otherBookables";

/**
 * Zusatzobjekte: the bookables offered alongside this one in the checkout,
 * each optional or mandatory, in order. The area as the editing page frames
 * it in a card and the step „Weitere Einstellungen“ in a row.
 */
export default {
  name: "BookableEditCheckoutBookables",
  components: { BookableCheckoutBookables, BookableTypeChip },
  mixins: [bookableEditing, otherBookables],
  computed: {
    checkoutBookableIds() {
      return this.bookable.checkoutBookableIds || [];
    },
  },
};
</script>

<template>
  <div>
    <p class="mb-3 text-caption">
      {{ $t("bookable.areas.checkoutBookables.intro") }}
    </p>
    <p v-if="bookablesForbidden" class="mb-3 text-caption text--secondary">
      {{ $t("bookable.select.forbidden") }}
    </p>
    <BookableCheckoutBookables
      :items="checkoutBookableIds"
      :available-items="bookablesWithoutSelf"
      @update:items="patch({ checkoutBookableIds: $event })"
    >
      <template v-slot:detail="{ itemObject }">
        <BookableTypeChip :type="itemObject.type" />
      </template>
    </BookableCheckoutBookables>
  </div>
</template>

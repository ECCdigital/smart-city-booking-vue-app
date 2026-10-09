<script>
import SortableList from "@/components/SortableList.vue";
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
  components: { SortableList, BookableTypeChip },
  mixins: [bookableEditing, otherBookables],
  computed: {
    checkoutBookableIds() {
      return this.bookable.checkoutBookableIds || [];
    },
  },
  methods: {
    entryId: (entry) => entry.bookableId,
    newEntry: (bookableId) => ({ bookableId, mandatory: false }),
    setMandatory(index, mandatory) {
      this.patch({
        checkoutBookableIds: this.checkoutBookableIds.map((entry, i) =>
          i === index ? { ...entry, mandatory: !!mandatory } : entry
        ),
      });
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
    <SortableList
      :items="checkoutBookableIds"
      :available-items="bookablesWithoutSelf"
      :entry-id="entryId"
      :new-entry="newEntry"
      test-id="checkout"
      @update:items="patch({ checkoutBookableIds: $event })"
    >
      <template v-slot:detail="{ itemObject }">
        <BookableTypeChip :type="itemObject.type" />
      </template>
      <template v-slot:entry="{ entry, index }">
        <v-list-item-content>
          <v-checkbox
            class="ml-6"
            dense
            :input-value="entry.mandatory"
            :label="$t('bookable.edit.list.mandatory')"
            hide-details
            data-test="checkout-mandatory"
            @change="setMandatory(index, $event)"
          ></v-checkbox>
        </v-list-item-content>
      </template>
    </SortableList>
  </div>
</template>

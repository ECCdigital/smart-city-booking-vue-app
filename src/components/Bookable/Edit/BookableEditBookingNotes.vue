<script>
import Tiptap from "@/components/Tiptap.vue";
import bookableEditing from "@/mixins/bookableEditing";

/**
 * Buchungshinweise: short notes bookers read in the checkout and in the
 * confirmation mail. The area as the editing page frames it in a card and
 * the step „Weitere Einstellungen“ in a row.
 */
export default {
  name: "BookableEditBookingNotes",
  components: { Tiptap },
  mixins: [bookableEditing],
};
</script>

<template>
  <Tiptap
    :value="bookable.bookingNotes || ''"
    :label="$t('bookable.areas.bookingNotes.title')"
    @input="patch({ bookingNotes: $event })"
  ></Tiptap>
</template>

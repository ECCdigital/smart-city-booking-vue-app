<script>
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";
import bookableEditing from "@/mixins/bookableEditing";

/**
 * Anhänge: the documents bookers get with the booking, and those they must
 * accept. The area as the editing page frames it in a card and the step
 * „Weitere Einstellungen“ in a row.
 */
export default {
  name: "BookableEditAttachments",
  components: { MediaAttachmentList },
  mixins: [bookableEditing],
  computed: {
    attachments() {
      return this.bookable.attachments || [];
    },
  },
};
</script>

<template>
  <div>
    <div class="d-flex justify-end mb-3">
      <v-btn small color="primary" @click="$refs.list.add()">
        <v-icon left small>mdi-plus</v-icon>
        {{ $t("bookable.edit.common.add") }}
      </v-btn>
    </div>
    <MediaAttachmentList
      ref="list"
      :value="attachments"
      :public-only="!!bookable.isPublic"
      :public-only-reason="$t('bookable.areas.attachments.publicOnlyReason')"
      @input="patch({ attachments: $event })"
    />
  </div>
</template>

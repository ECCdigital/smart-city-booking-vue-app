<script>
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

/**
 * The tab „Anhänge“: files to download. The images are picked under
 * „Grunddaten“, as a bookable's.
 */
export default {
  name: "EventEditMedia",
  components: { MediaAttachmentList, SectionCard },
  mixins: [eventEditing],
  computed: {
    hasAttachments() {
      return (this.form.attachments || []).length > 0;
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-attachments"
    icon="mdi-paperclip"
    :title="$t('event.edit.cards.attachments')"
    :hint="$t('event.edit.attachments.hint')"
    :badge="$t('event.edit.optional')"
  >
    <MediaAttachmentList
      ref="attachments"
      :value="form.attachments || []"
      plain
      :public-only="isPublic"
      :public-only-reason="$t('event.edit.basics.publicOnly')"
      @input="update(null, 'attachments', $event)"
    />
    <!-- With no attachment yet the list offers „Ersten Anhang hinzufügen“. -->
    <v-btn
      v-if="hasAttachments"
      small
      outlined
      color="primary"
      class="mt-2"
      data-test="event-add-attachment"
      @click="$refs.attachments.add()"
    >
      <v-icon small left>mdi-plus</v-icon>
      {{ $t("event.edit.attachments.add") }}
    </v-btn>
  </SectionCard>
</template>

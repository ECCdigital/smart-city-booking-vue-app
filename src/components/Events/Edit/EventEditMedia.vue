<script>
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

/** The tab „Bilder & Anhänge“: the gallery and the attachments. */
export default {
  name: "EventEditMedia",
  components: { MediaReferenceList, MediaAttachmentList, SectionCard },
  mixins: [eventEditing],
};
</script>

<template>
  <div>
    <SectionCard
      id="event-section-gallery"
      icon="mdi-image-multiple-outline"
      :title="$t('event.edit.cards.gallery')"
      :badge="$t('event.edit.optional')"
    >
      <MediaReferenceList
        :value="form.images || []"
        :cover-badge="false"
        :public-only="isPublic"
        :public-only-reason="$t('event.edit.basics.publicOnly')"
        :intro="$t('event.edit.gallery.intro')"
        @input="update(null, 'images', $event)"
      />
    </SectionCard>

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
      <v-btn
        small
        outlined
        color="primary"
        class="mt-2"
        @click="$refs.attachments.add()"
      >
        <v-icon small left>mdi-plus</v-icon>
        {{ $t("event.edit.attachments.add") }}
      </v-btn>
    </SectionCard>
  </div>
</template>

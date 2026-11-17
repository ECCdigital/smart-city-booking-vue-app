<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import ChipCombobox from "@/components/commons/ChipCombobox.vue";
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

/** The tab „Allgemein“: Grunddaten, Beschreibung and Merkmale. */
export default {
  name: "EventEditBasics",
  components: { Tiptap, MediaReferenceField, ChipCombobox, SectionCard },
  mixins: [eventEditing],
  computed: {
    info() {
      return this.form.information;
    },
  },
};
</script>

<template>
  <div>
    <SectionCard
      id="event-section-basics"
      icon="mdi-information-outline"
      :title="$t('event.edit.cards.basics')"
    >
      <div class="event-edit__field" data-field="name">
        <v-text-field
          :value="info.name"
          :label="$t('event.edit.basics.name') + ' *'"
          :hint="$t('event.edit.basics.nameHint')"
          :error-messages="errorsFor('name')"
          persistent-hint
          outlined
          dense
          data-test="event-name"
          @input="update('information', 'name', $event)"
        />
      </div>
      <div class="event-edit__field">
        <Tiptap
          :value="info.teaserText"
          :label="$t('event.edit.basics.teaser')"
          @input="update('information', 'teaserText', $event)"
        />
        <div class="event-edit__hint">
          {{ $t("event.edit.basics.teaserHint") }}
        </div>
      </div>
      <div class="event-edit__field">
        <MediaReferenceField
          :value="info.teaserImage"
          :label="$t('event.edit.basics.image')"
          :empty-label="$t('event.edit.basics.imageEmpty')"
          :public-only="isPublic"
          :public-only-reason="$t('event.edit.basics.publicOnly')"
          @input="update('information', 'teaserImage', $event)"
        />
        <div class="event-edit__hint">
          {{ $t("event.edit.basics.imageHint") }}
        </div>
      </div>
    </SectionCard>

    <SectionCard
      id="event-section-description"
      icon="mdi-text"
      :title="$t('event.edit.cards.description')"
      :hint="$t('event.edit.description.hint')"
      :badge="$t('event.edit.optional')"
    >
      <Tiptap
        :value="info.description"
        :label="$t('event.edit.cards.description')"
        :min-height="180"
        @input="update('information', 'description', $event)"
      />
    </SectionCard>

    <SectionCard
      id="event-section-features"
      icon="mdi-tag-outline"
      :title="$t('event.edit.cards.features')"
      :hint="$t('event.edit.features.hint')"
      :badge="$t('event.edit.optional')"
    >
      <ChipCombobox
        :value="info.flags || []"
        :label="$t('event.edit.features.label')"
        :empty-text="$t('event.edit.features.empty')"
        data-test="event-flags"
        @change="update('information', 'flags', $event)"
      />
    </SectionCard>
  </div>
</template>

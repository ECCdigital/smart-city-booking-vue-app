<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     Variant A, „Karten des Editors“: BookableEditGeneral wins. Section cards
     with `filled` fields, the same cards in the flow's panel. -->
<template>
  <div class="proto-a">
    <v-card class="mb-6 section-card" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-information-outline</v-icon>
        <span class="text-h6 font-weight-bold">Allgemeine Informationen</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <v-text-field
          :value="bookable.title"
          :label="LABELS.title + ' *'"
          :rules="titleRules"
          background-color="accent"
          filled
          dense
          hide-details="auto"
          :autofocus="frame === 'flow' && isNew"
          @input="patch({ title: $event })"
        />
        <div class="mt-4">
          <Tiptap
            :value="bookable.description"
            :label="LABELS.description"
            :min-height="frame === 'flow' ? 140 : 220"
            @input="patch({ description: $event })"
          />
        </div>
        <v-row class="mt-2">
          <v-col cols="12" :md="isTicket ? 6 : 12">
            <v-select
              :value="bookable.type"
              :items="typeItems"
              :label="LABELS.type"
              :disabled="!isNew"
              background-color="accent"
              filled
              dense
              hide-details
              @change="patch({ type: $event })"
            />
          </v-col>
          <v-col v-if="isTicket" cols="12" md="6">
            <v-select
              :value="bookable.eventId"
              :items="events"
              item-value="id"
              item-text="information.name"
              :label="LABELS.event"
              background-color="accent"
              filled
              dense
              clearable
              hide-details
              @change="patch({ eventId: $event || '' })"
            />
          </v-col>
        </v-row>
        <div class="mt-4">
          <AddressLookup
            :value="location"
            :label="LABELS.location"
            @input="patch({ location: $event })"
          />
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-6 section-card" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-image-multiple-outline</v-icon>
        <span class="text-h6 font-weight-bold">{{ LABELS.images }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <LegacyCoverNote
          v-if="legacyCoverUrl"
          :url="legacyCoverUrl"
          @adopt="adoptLegacyCover"
        />
        <MediaReferenceList
          :value="images"
          :public-only="!!bookable.isPublic"
          :public-only-reason="HINTS.publicOnly"
          @input="patch({ images: $event })"
        />
      </v-card-text>
    </v-card>

    <v-card class="mb-6 section-card" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-account-eye-outline</v-icon>
        <span class="text-h6 font-weight-bold">{{ LABELS.flags }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <p class="mb-4 text-caption">{{ HINTS.flags }}</p>
        <ChipCombobox
          :value="bookable.flags || []"
          :label="LABELS.flags"
          variant="filled"
          @change="patch({ flags: $event })"
        />
      </v-card-text>
    </v-card>

    <v-card v-if="tagsShown" class="mb-6 section-card" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-tag-multiple-outline</v-icon>
        <span class="text-h6 font-weight-bold">{{ LABELS.tags }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <p class="mb-4 text-caption">{{ HINTS.tags }}</p>
        <ChipCombobox
          :value="bookable.tags || []"
          :items="tagsAvailable"
          :label="LABELS.tags"
          variant="filled"
          @change="patch({ tags: $event })"
        />
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import basicsShared from "./basicsShared";
import ChipCombobox from "./ChipCombobox.vue";
import LegacyCoverNote from "./LegacyCoverNote.vue";

export default {
  name: "BasicsVariantA",
  components: {
    Tiptap,
    MediaReferenceList,
    AddressLookup,
    ChipCombobox,
    LegacyCoverNote,
  },
  mixins: [basicsShared],
};
</script>

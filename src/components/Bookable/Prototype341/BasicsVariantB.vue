<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     Variant B, „Feldliste des Ablaufs“: BookableFlowIdentity wins. One column
     of `outlined` fields, each with its hint beneath. The editor lays one
     section card around it; the flow's panel is the frame there. -->
<template>
  <component :is="frame === 'editor' ? cardTag : 'div'" v-bind="cardAttrs">
    <template v-if="frame === 'editor'">
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-information-outline</v-icon>
        <span class="text-h6 font-weight-bold">Grunddaten</span>
      </v-card-title>
      <v-divider />
    </template>

    <div :class="{ 'pa-4': frame === 'editor' }" class="proto-b">
      <p class="proto-b__caption">
        <v-icon small>mdi-eye-outline</v-icon>
        Das sehen Buchende im Katalog
      </p>

      <div class="proto-b__field">
        <v-text-field
          :value="bookable.title"
          :label="LABELS.title"
          :hint="HINTS.title"
          :rules="titleRules"
          placeholder="z. B. Großer Saal"
          persistent-hint
          outlined
          dense
          :autofocus="frame === 'flow' && isNew"
          @input="patch({ title: $event })"
        />
      </div>

      <div class="proto-b__field">
        <Tiptap
          :value="bookable.description"
          :label="LABELS.description"
          :min-height="frame === 'flow' ? 140 : 220"
          @input="patch({ description: $event })"
        />
      </div>

      <div class="proto-b__field">
        <ChipCombobox
          :value="bookable.flags || []"
          :label="LABELS.flags"
          :hint="HINTS.flags"
          @change="patch({ flags: $event })"
        />
      </div>

      <div class="proto-b__field">
        <div class="proto-b__label">{{ LABELS.images }}</div>
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
        <div class="proto-b__hint">{{ HINTS.images }}</div>
      </div>

      <div class="proto-b__field">
        <AddressLookup
          :value="location"
          :label="LABELS.location"
          @input="patch({ location: $event })"
        />
        <div class="proto-b__hint proto-b__hint--tight">
          {{ HINTS.location }}
        </div>
      </div>

      <p class="proto-b__caption mt-8">
        <v-icon small>mdi-eye-off-outline</v-icon>
        Nur für die Verwaltung
      </p>

      <div class="proto-b__field">
        <v-select
          :value="bookable.type"
          :items="typeItems"
          :label="LABELS.type"
          :hint="isNew ? HINTS.typeNew : HINTS.typeFixed"
          :disabled="!isNew"
          persistent-hint
          outlined
          dense
          @change="patch({ type: $event })"
        >
          <template #item="{ item }">
            <v-icon small class="mr-2">{{ item.icon }}</v-icon>
            {{ item.text }}
          </template>
        </v-select>
      </div>

      <div v-if="isTicket" class="proto-b__field">
        <v-select
          :value="bookable.eventId"
          :items="events"
          item-value="id"
          item-text="information.name"
          :label="LABELS.event"
          :hint="HINTS.event"
          persistent-hint
          clearable
          outlined
          dense
          @change="patch({ eventId: $event || '' })"
        />
      </div>

      <div v-if="tagsShown" class="proto-b__field mb-0">
        <ChipCombobox
          :value="bookable.tags || []"
          :items="tagsAvailable"
          :label="LABELS.tags"
          :hint="HINTS.tags"
          @change="patch({ tags: $event })"
        />
      </div>
    </div>
  </component>
</template>

<script>
import { VCard } from "vuetify/lib";
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import basicsShared from "./basicsShared";
import ChipCombobox from "./ChipCombobox.vue";
import LegacyCoverNote from "./LegacyCoverNote.vue";

export default {
  name: "BasicsVariantB",
  components: {
    Tiptap,
    MediaReferenceList,
    AddressLookup,
    ChipCombobox,
    LegacyCoverNote,
  },
  mixins: [basicsShared],
  computed: {
    cardTag() {
      return VCard;
    },
    cardAttrs() {
      return this.frame === "editor"
        ? { class: "mb-6 section-card", outlined: true }
        : {};
    },
  },
};
</script>

<style scoped>
.proto-b__field {
  margin-bottom: var(--scb-space-5);
}
.proto-b__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.proto-b__hint {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
.proto-b__hint--tight {
  margin-top: calc(-1 * var(--scb-space-4));
}
.proto-b__caption {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-4);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>

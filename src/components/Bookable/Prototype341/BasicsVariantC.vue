<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     Variant C, „Neu mit Katalog-Vorschau“: a new component for both modes.
     Fields in two groups (what Buchende see / how it is filed), hints only on
     focus, and beside them a live card of what the catalog will show. The
     same in the editor's tab and the flow's step. -->
<template>
  <div class="proto-c">
    <div class="proto-c__form">
      <section class="proto-c__group">
        <h3 class="proto-c__heading">
          <v-icon small>mdi-account-eye-outline</v-icon>
          Für Buchende
        </h3>
        <v-text-field
          :value="bookable.title"
          :label="LABELS.title"
          :hint="HINTS.title"
          :rules="titleRules"
          outlined
          dense
          hide-details="auto"
          class="mb-4"
          :autofocus="frame === 'flow' && isNew"
          @input="patch({ title: $event })"
        />
        <Tiptap
          :value="bookable.description"
          :label="LABELS.description"
          :min-height="180"
          @input="patch({ description: $event })"
        />
        <ChipCombobox
          class="mt-4"
          :value="bookable.flags || []"
          :label="LABELS.flags"
          :hint="HINTS.flags"
          @change="patch({ flags: $event })"
        />
        <div class="mt-4">
          <AddressLookup
            :value="location"
            :label="LABELS.location"
            @input="patch({ location: $event })"
          />
        </div>
        <div class="proto-c__label">{{ LABELS.images }}</div>
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
      </section>

      <section class="proto-c__group">
        <h3 class="proto-c__heading">
          <v-icon small>mdi-folder-outline</v-icon>
          Einordnung
          <span class="proto-c__aside">Buchende sehen das nicht</span>
        </h3>
        <div class="proto-c__pair">
          <v-select
            v-if="isNew"
            :value="bookable.type"
            :items="typeItems"
            :label="LABELS.type"
            :hint="HINTS.typeNew"
            outlined
            dense
            hide-details="auto"
            @change="patch({ type: $event })"
          >
            <template #item="{ item }">
              <v-icon small class="mr-2">{{ item.icon }}</v-icon>
              {{ item.text }}
            </template>
          </v-select>
          <div v-else class="proto-c__fact">
            <span class="proto-c__fact-label">{{ LABELS.type }}</span>
            <span
              ><v-icon small>{{ typeIcon }}</v-icon> {{ typeText }}</span
            >
          </div>
          <v-select
            v-if="isTicket"
            :value="bookable.eventId"
            :items="events"
            item-value="id"
            item-text="information.name"
            :label="LABELS.event"
            :hint="HINTS.event"
            clearable
            outlined
            dense
            hide-details="auto"
            @change="patch({ eventId: $event || '' })"
          />
        </div>
        <ChipCombobox
          v-if="tagsShown"
          class="mt-4"
          :value="bookable.tags || []"
          :items="tagsAvailable"
          :label="LABELS.tags"
          :hint="HINTS.tags"
          @change="patch({ tags: $event })"
        />
      </section>
    </div>

    <aside class="proto-c__preview">
      <div class="proto-c__preview-caption">So erscheint es im Katalog</div>
      <v-card outlined class="proto-c__card">
        <MediaReferenceImage
          v-if="coverImage"
          :reference="coverImage"
          size="sm"
          aspect-ratio="16/9"
          :height="160"
        />
        <div v-else class="proto-c__no-image">
          <v-icon large>mdi-image-off-outline</v-icon>
          <span>Noch kein Bild</span>
        </div>
        <div class="pa-4">
          <div class="proto-c__type">
            <v-icon x-small>{{ typeIcon }}</v-icon> {{ typeText }}
          </div>
          <div class="proto-c__title">
            {{ bookable.title || "Titel fehlt" }}
          </div>
          <div v-if="location.display_address" class="proto-c__address">
            <v-icon x-small>mdi-map-marker-outline</v-icon>
            {{ location.display_address }}
          </div>
          <div v-if="(bookable.flags || []).length" class="mt-2">
            <v-chip
              v-for="flag in bookable.flags"
              :key="flag"
              x-small
              class="mr-1 mb-1"
            >
              {{ flag }}
            </v-chip>
          </div>
          <p v-if="descriptionText" class="proto-c__description">
            {{ descriptionText }}
          </p>
        </div>
      </v-card>
    </aside>
  </div>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import basicsShared from "./basicsShared";
import ChipCombobox from "./ChipCombobox.vue";
import LegacyCoverNote from "./LegacyCoverNote.vue";

export default {
  name: "BasicsVariantC",
  components: {
    Tiptap,
    MediaReferenceList,
    MediaReferenceImage,
    AddressLookup,
    ChipCombobox,
    LegacyCoverNote,
  },
  mixins: [basicsShared],
  computed: {
    descriptionText() {
      const html = this.bookable.description || "";
      const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return text.length > 160 ? `${text.slice(0, 160)} …` : text;
    },
  },
};
</script>

<style scoped>
.proto-c {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--scb-space-6);
  align-items: start;
}
@media (max-width: 959px) {
  /* $scb-bp-sm */
  .proto-c {
    grid-template-columns: minmax(0, 1fr);
  }
  .proto-c__preview {
    order: -1;
  }
}
.proto-c__group + .proto-c__group {
  margin-top: var(--scb-space-6);
  padding-top: var(--scb-space-5);
  border-top: 1px solid var(--scb-rule);
}
.proto-c__heading {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-4);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.proto-c__aside {
  font-size: var(--scb-font-size-xs);
  font-weight: normal;
  color: var(--scb-text-muted);
}
.proto-c__label {
  margin: var(--scb-space-4) 0 var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
}
.proto-c__pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--scb-space-4);
}
.proto-c__fact {
  display: flex;
  flex-direction: column;
  gap: var(--scb-space-1);
  font-size: var(--scb-font-size-md);
}
.proto-c__fact-label {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.proto-c__preview {
  position: sticky;
  top: var(--scb-space-4);
}
.proto-c__preview-caption {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-caption);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
}
.proto-c__card {
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}
.proto-c__no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  gap: var(--scb-space-2);
  color: var(--scb-text-muted);
  background: var(--scb-surface-tint);
}
.proto-c__type,
.proto-c__address {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.proto-c__title {
  margin: var(--scb-space-1) 0;
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}
.proto-c__description {
  margin: var(--scb-space-2) 0 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>

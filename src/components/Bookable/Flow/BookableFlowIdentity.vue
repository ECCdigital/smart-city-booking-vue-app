<template>
  <div class="bookable-basics" data-test="flow-identity">
    <section
      :id="sectionElementId('general-catalog')"
      class="bookable-basics__group"
      data-test="basics-catalog"
    >
      <p class="bookable-basics__caption">
        <v-icon small>mdi-eye-outline</v-icon>
        {{ $t("bookable.flow.identity.catalog") }}
      </p>

      <div class="bookable-basics__field">
        <v-text-field
          :value="bookable.title"
          :label="$t('bookable.flow.identity.title')"
          :placeholder="$t('bookable.flow.identity.title-placeholder')"
          :hint="$t('bookable.flow.identity.title-hint')"
          :rules="fieldRules.title"
          :autofocus="isNew"
          persistent-hint
          hide-details="auto"
          outlined
          dense
          data-test="flow-title"
          @input="patch({ title: $event })"
        />
      </div>

      <div class="bookable-basics__field">
        <Tiptap
          :value="bookable.description"
          :label="$t('bookable.flow.identity.description')"
          :min-height="180"
          @input="patch({ description: $event })"
        />
        <div class="bookable-basics__hint">
          {{ $t("bookable.flow.identity.description-hint") }}
        </div>
      </div>

      <div class="bookable-basics__field">
        <ChipCombobox
          :value="bookable.flags || []"
          :label="$t('bookable.flow.identity.flags')"
          :hint="$t('bookable.flow.identity.flags-hint')"
          :empty-text="$t('bookable.flow.identity.chips-empty')"
          data-test="flow-flags"
          @change="patch({ flags: $event })"
        />
      </div>

      <div class="bookable-basics__field">
        <div class="bookable-basics__label">
          {{ $t("bookable.flow.identity.images") }}
        </div>
        <v-alert
          v-if="legacyCoverUrl"
          dense
          text
          type="info"
          class="text-caption"
          data-test="legacy-cover"
        >
          {{ $t("bookable.flow.identity.legacy-cover") }}
          <span class="font-weight-medium bookable-basics__url">
            {{ legacyCoverUrl }}
          </span>
          {{ $t("bookable.flow.identity.legacy-cover-active") }}
          <div class="mt-2">
            <v-btn
              x-small
              outlined
              color="info"
              data-test="legacy-cover-adopt"
              @click="adoptLegacyCover"
            >
              <v-icon x-small left>mdi-image-move</v-icon>
              {{ $t("bookable.flow.identity.legacy-cover-adopt") }}
            </v-btn>
          </div>
        </v-alert>
        <MediaReferenceList
          :value="images"
          :public-only="!!bookable.isPublic"
          :public-only-reason="$t('bookable.flow.identity.images-public-only')"
          @input="patch({ images: $event })"
        />
        <div class="bookable-basics__hint">
          {{ $t("bookable.flow.identity.images-hint") }}
        </div>
      </div>

      <div class="bookable-basics__field">
        <AddressLookup
          :value="location"
          :label="$t('bookable.flow.identity.location')"
          @input="patch({ location: $event })"
        />
        <div class="bookable-basics__hint bookable-basics__hint--tight">
          {{ $t("bookable.flow.identity.location-hint") }}
        </div>
      </div>
    </section>

    <section
      :id="sectionElementId('general-admin')"
      class="bookable-basics__group"
      data-test="basics-admin"
    >
      <p class="bookable-basics__caption">
        <v-icon small>mdi-eye-off-outline</v-icon>
        {{ $t("bookable.flow.identity.admin") }}
      </p>

      <div class="bookable-basics__field">
        <v-select
          :value="bookable.type"
          :items="typeItems"
          :label="$t('bookable.flow.identity.type')"
          :hint="
            isNew
              ? $t('bookable.flow.identity.type-hint')
              : $t('bookable.flow.identity.type-fixed')
          "
          :readonly="!isNew"
          :append-icon="isNew ? '$dropdown' : ''"
          persistent-hint
          outlined
          dense
          data-test="flow-type"
          @change="patch({ type: $event })"
        >
          <template #item="{ item }">
            <v-icon small class="mr-2">{{ item.icon }}</v-icon>
            {{ item.text }}
          </template>
        </v-select>
      </div>

      <div v-if="isTicket" class="bookable-basics__field">
        <v-select
          :value="bookable.eventId"
          :items="events"
          item-value="id"
          item-text="information.name"
          :label="$t('bookable.flow.identity.event')"
          :hint="$t('bookable.flow.identity.event-hint')"
          persistent-hint
          clearable
          outlined
          dense
          data-test="flow-event"
          @change="patch({ eventId: $event || '' })"
        />
      </div>

      <div v-if="tagsShown" class="bookable-basics__field">
        <ChipCombobox
          :value="bookable.tags || []"
          :items="tagsAvailable"
          :label="$t('bookable.flow.identity.tags')"
          :hint="$t('bookable.flow.identity.tags-hint')"
          :empty-text="$t('bookable.flow.identity.chips-empty')"
          data-test="flow-tags"
          @change="patch({ tags: $event })"
        />
      </div>
    </section>
  </div>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import ChipCombobox from "@/components/commons/ChipCombobox.vue";
import ApiEventService from "@/services/api/ApiEventService";
import ApiTagsService from "@/services/api/ApiTagsService";
import bookableEditing from "@/mixins/bookableEditing";
import { getTypeIcon, getTypeText } from "@/utils/bookables";
import { FLOW_BOOKABLE_TYPES } from "@/utils/bookableFlow";
import { bookableEditSectionElementId } from "@/utils/bookableEditSections";
import { externalReferenceOf } from "@/utils/mediaReference";

/**
 * The Grunddaten of a bookable, the same in both modes: the editing page
 * frames them as a card in the tab „Allgemein“, the guided flow as its step
 * Identität. One column of fields in two groups, „Das sehen Buchende im
 * Katalog“ (title, description, Merkmale, images, location) and „Nur für die
 * Verwaltung“ (type, the event of a ticket, Interne Tags), each with its hint
 * beneath. The groups are the sections of the tab's sub-nav.
 *
 * The type is chosen only while the bookable is created (`isNew`); after
 * that it is read only. Events and tag suggestions come from the bookable's
 * own tenant, not the one currently selected.
 */
export default {
  name: "BookableFlowIdentity",
  components: { Tiptap, MediaReferenceList, AddressLookup, ChipCombobox },
  mixins: [bookableEditing],
  props: {
    isNew: { type: Boolean, default: false },
  },
  data() {
    return { events: [], tagsAvailable: [] };
  },
  computed: {
    typeItems() {
      const types = FLOW_BOOKABLE_TYPES.includes(this.bookable.type)
        ? FLOW_BOOKABLE_TYPES
        : [...FLOW_BOOKABLE_TYPES, this.bookable.type];
      return types.map((type) => ({
        value: type,
        text: getTypeText(type),
        icon: getTypeIcon(type),
      }));
    },
    isTicket() {
      return this.bookable.type === "ticket";
    },
    tagsShown() {
      return this.expertOptionShown("tags");
    },
    /** A location stored as plain text, read as an address. */
    location() {
      const location = this.bookable.location;
      return typeof location === "string"
        ? { display_address: location }
        : location || { display_address: null, lat: null, lng: null };
    },
    images() {
      return this.bookable.images || [];
    },
    /**
     * A bookable the media import has not touched yet still carries its cover
     * in the legacy `imgUrl`. It is shown, never moved without a click on
     * „Als Bild übernehmen“.
     */
    legacyCoverUrl() {
      return this.images.length === 0 ? this.bookable.imgUrl || "" : "";
    },
  },
  watch: {
    // Loaded again each time the bookable becomes a ticket.
    isTicket: {
      immediate: true,
      handler(ticket) {
        if (ticket) this.fetchEvents();
      },
    },
    tagsShown: {
      immediate: true,
      handler(shown) {
        if (shown && !this.tagsAvailable.length) this.fetchTags();
      },
    },
  },
  methods: {
    sectionElementId(id) {
      return bookableEditSectionElementId(id);
    },
    async fetchEvents() {
      try {
        const response = await ApiEventService.getEvents(
          this.bookable.tenantId
        );
        this.events = response?.data || [];
      } catch (error) {
        console.error(error);
        this.events = [];
      }
    },
    async fetchTags() {
      try {
        const response = await ApiTagsService.getTags(this.bookable.tenantId);
        this.tagsAvailable = (response?.data || []).filter(Boolean);
      } catch (error) {
        console.error(error);
      }
    },
    // The legacy cover becomes the first image - as an external reference,
    // which is what the old address is - and `imgUrl` is retired, in one patch.
    adoptLegacyCover() {
      this.patch({
        images: [externalReferenceOf(this.legacyCoverUrl), ...this.images],
        imgUrl: "",
      });
    },
  },
};
</script>

<style scoped>
.bookable-basics__group + .bookable-basics__group {
  margin-top: var(--scb-space-6);
}
.bookable-basics__caption {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-4);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.bookable-basics__caption .v-icon {
  color: inherit;
}
.bookable-basics__field {
  margin-bottom: var(--scb-space-5);
}
.bookable-basics__group:last-child .bookable-basics__field:last-child {
  margin-bottom: 0;
}
.bookable-basics__label {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.bookable-basics__hint {
  margin-top: var(--scb-space-1);
  padding: 0 var(--scb-space-3);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
/* AddressLookup keeps room for its own (empty) details line. */
.bookable-basics__hint--tight {
  margin-top: calc(-1 * var(--scb-space-4));
}
.bookable-basics__url {
  word-break: break-all;
}
</style>

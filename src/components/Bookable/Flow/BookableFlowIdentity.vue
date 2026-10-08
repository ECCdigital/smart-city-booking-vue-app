<template>
  <div data-test="flow-identity">
    <p class="flow-caption">
      <v-icon small>mdi-eye-outline</v-icon>
      {{ $t("bookable.flow.identity.catalog") }}
    </p>

    <div class="flow-field">
      <v-text-field
        :value="bookable.title"
        :label="$t('bookable.flow.identity.title')"
        :placeholder="$t('bookable.flow.identity.title-placeholder')"
        outlined
        dense
        hide-details
        autofocus
        data-test="flow-title"
        @input="patch({ title: $event })"
      />
    </div>

    <div class="flow-field">
      <Tiptap
        :value="bookable.description"
        :label="$t('bookable.flow.identity.description')"
        :min-height="140"
        @input="patch({ description: $event })"
      />
    </div>

    <div class="flow-field">
      <v-combobox
        :value="bookable.flags || []"
        :label="$t('bookable.flow.identity.flags')"
        :hint="$t('bookable.flow.identity.flags-hint')"
        :no-data-text="$t('bookable.flow.identity.flags-empty')"
        persistent-hint
        multiple
        chips
        small-chips
        deletable-chips
        hide-selected
        outlined
        dense
        data-test="flow-flags"
        @change="patch({ flags: $event })"
      />
    </div>

    <div class="flow-field">
      <v-select
        :value="bookable.type"
        :items="typeItems"
        :label="$t('bookable.flow.identity.type')"
        :hint="$t('bookable.flow.identity.type-hint')"
        :disabled="!isNew"
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

    <div v-if="bookable.type === 'ticket'" class="flow-field">
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

    <div class="flow-field">
      <div class="flow-field__label">
        {{ $t("bookable.flow.identity.image") }}
      </div>
      <MediaReferenceList
        :value="bookable.images || []"
        :public-only="!!bookable.isPublic"
        @input="patch({ images: $event })"
      />
      <div class="flow-field__hint">
        {{ $t("bookable.flow.identity.image-hint") }}
      </div>
    </div>

    <div class="flow-field mb-0">
      <AddressLookup
        :value="location"
        :label="$t('bookable.flow.identity.location')"
        @input="patch({ location: $event })"
      />
      <div class="flow-field__hint flow-field__hint--tight">
        {{ $t("bookable.flow.identity.location-hint") }}
      </div>
    </div>
  </div>
</template>

<script>
import Tiptap from "@/components/Tiptap.vue";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import ApiEventService from "@/services/api/ApiEventService";
import bookableEditing from "@/mixins/bookableEditing";
import { getTypeIcon, getTypeText } from "@/utils/bookables";
import { FLOW_BOOKABLE_TYPES } from "@/utils/bookableFlow";

/**
 * Step 1, Identität: what the catalog shows - title, description, Merkmale
 * (`flags`), type, image and location. The type is chosen when the bookable
 * is created; the editor keeps it afterwards, as it does today.
 */
export default {
  name: "BookableFlowIdentity",
  components: { Tiptap, MediaReferenceList, AddressLookup },
  mixins: [bookableEditing],
  props: {
    isNew: { type: Boolean, default: false },
  },
  data() {
    return { events: [] };
  },
  computed: {
    typeItems() {
      return FLOW_BOOKABLE_TYPES.map((type) => ({
        value: type,
        text: getTypeText(type),
        icon: getTypeIcon(type),
      }));
    },
    /** A location stored as plain text, as the general tab reads it. */
    location() {
      const location = this.bookable.location;
      return typeof location === "string"
        ? { display_address: location }
        : location || { display_address: null, lat: null, lng: null };
    },
  },
  watch: {
    "bookable.type": {
      immediate: true,
      handler(type) {
        if (type === "ticket" && !this.events.length) this.fetchEvents();
      },
    },
  },
  methods: {
    async fetchEvents() {
      try {
        const response = await ApiEventService.getEvents(
          this.bookable.tenantId || undefined
        );
        this.events = response?.data || [];
      } catch (error) {
        console.error(error);
        this.events = [];
      }
    },
  },
};
</script>

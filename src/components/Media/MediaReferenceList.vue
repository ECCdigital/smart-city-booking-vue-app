<template>
  <div>
    <p v-if="intro" class="text-caption text--secondary mb-2">{{ intro }}</p>
    <p v-else-if="coverBadge" class="text-caption text--secondary mb-2">
      Das erste Bild ist das <strong>Titelbild</strong> — es erscheint in Listen
      und im Storefront zuerst. Reihenfolge per Ziehen ändern.
    </p>

    <v-card v-if="references.length > 0" outlined class="mb-3">
      <draggable
        :value="references"
        handle=".media-ref-list__handle"
        :animation="180"
        ghost-class="media-ref-list__ghost"
        @input="onReorder"
      >
        <div
          v-for="(reference, index) in references"
          :key="rowKey(reference, index)"
          class="media-ref-list__row d-flex align-center pa-2"
        >
          <v-icon
            class="media-ref-list__handle mr-2"
            title="Ziehen zum Sortieren"
          >
            mdi-drag
          </v-icon>

          <v-avatar tile width="64" height="48" class="rounded mr-3">
            <MediaReferenceImage
              :reference="reference"
              :scope="scope"
              size="thumb"
              :lazy-size="null"
              :height="48"
              :width="64"
            />
          </v-avatar>

          <div class="flex-grow-1 text-truncate">
            <div class="d-flex align-center text-truncate">
              <span class="font-weight-medium text-truncate">
                {{ nameOf(reference) }}
              </span>
              <v-chip
                v-if="coverBadge && index === 0"
                x-small
                color="primary"
                class="ml-2"
              >
                <v-icon x-small left>mdi-star</v-icon>
                Titelbild
              </v-chip>
              <v-chip
                v-if="isIntern(reference)"
                x-small
                color="warning"
                text-color="white"
                class="ml-2"
              >
                <v-icon x-small left>mdi-lock-outline</v-icon>
                intern
              </v-chip>
            </div>
            <div class="text-caption text--secondary text-truncate">
              {{ metaOf(reference) }}
            </div>
          </div>

          <v-btn
            v-if="coverBadge"
            icon
            small
            :disabled="index === 0"
            title="Zum Titelbild machen"
            @click="makeCover(index)"
          >
            <v-icon small>mdi-star-outline</v-icon>
          </v-btn>
          <v-btn
            icon
            small
            title="Entfernen (das Medium bleibt in der Mediathek)"
            @click="remove(index)"
          >
            <v-icon small>mdi-close</v-icon>
          </v-btn>
        </div>
      </draggable>
    </v-card>

    <v-card
      v-else
      outlined
      class="pa-6 text-center text--secondary font-italic mb-3"
    >
      Noch keine Bilder zugeordnet.
    </v-card>

    <div
      v-if="enforcePublic && hasInternReference"
      class="text-caption error--text mb-2 d-flex align-center"
    >
      <v-icon x-small color="error" class="mr-1">mdi-alert-outline</v-icon>
      {{ effectivePublicOnlyReason }}
    </div>

    <v-btn small color="primary" @click="pickerOpen = true">
      <v-icon small left>mdi-image-multiple-outline</v-icon>
      Aus Mediathek wählen
    </v-btn>

    <MediaPickerDialog
      v-model="pickerOpen"
      :scope="scope"
      kind="image"
      multiple
      :public-only="enforcePublic"
      :public-only-reason="effectivePublicOnlyReason"
      :exclude-ids="mediaIds"
      title="Bilder aus der Mediathek wählen"
      @select="onSelect"
    />
  </div>
</template>

<script>
import draggable from "vuedraggable";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import FormatService from "@/services/FormatService";
import MediaPickerDialog from "@/components/Media/MediaPickerDialog.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import {
  displayMediaId,
  externalReferenceOf,
  externalReferenceUrl,
  mediaReferenceOf,
  referencedMediaId,
  toMediaReference,
} from "@/utils/mediaReference";

/**
 * The ordered image list of a bookable (§4.8): a list of media references
 * whose first entry is the cover image — determined by position, never by a
 * field of its own. Removing an entry drops the reference, not the medium.
 */
export default {
  name: "MediaReferenceList",
  components: { draggable, MediaPickerDialog, MediaReferenceImage },
  props: {
    value: { type: Array, default: () => [] },
    scope: { type: String, default: MEDIA_SCOPE.TENANT },
    publicOnly: { type: Boolean, default: false },
    publicOnlyReason: {
      type: String,
      default:
        "Dieses Objekt ist öffentlich sichtbar — interne Medien können hier nicht gespeichert werden.",
    },
    // Legacy sites the media spec leaves untyped (§4.8) store bare addresses
    // instead of references; they pick from the library all the same.
    valueFormat: {
      type: String,
      default: "reference",
      validator: (value) => ["reference", "url"].includes(value),
    },
    // Position 0 is the cover image of a bookable — not of every list.
    coverBadge: { type: Boolean, default: true },
    intro: { type: String, default: "" },
  },
  data() {
    return {
      pickerOpen: false,
      mediaById: {},
    };
  },
  computed: {
    references() {
      return (this.value || []).map(toMediaReference).filter(Boolean);
    },
    // Media already in the list, so the picker can badge them as assigned —
    // including the ones an untyped row holds as a bare address.
    mediaIds() {
      return [...new Set(this.references.map(displayMediaId).filter(Boolean))];
    },
    hasInternReference() {
      return this.references.some((reference) => this.isIntern(reference));
    },
    // A site that stores bare addresses can only ever show public media: the
    // stored URL is fetched by the browser without credentials.
    enforcePublic() {
      return this.publicOnly || this.valueFormat === "url";
    },
    effectivePublicOnlyReason() {
      if (!this.publicOnly && this.valueFormat === "url") {
        return "Diese Liste speichert Adressen — interne Medien wären dort nicht abrufbar.";
      }
      return this.publicOnlyReason;
    },
  },
  watch: {
    mediaIds: {
      immediate: true,
      handler(ids) {
        ids.forEach((id) => this.resolve(id));
      },
    },
  },
  methods: {
    // External references have no id, so their address keeps the row stable.
    rowKey(reference, index) {
      return referencedMediaId(reference) || reference.url || index;
    },
    mediaOf(reference) {
      const mediaId = displayMediaId(reference);
      return mediaId ? this.mediaById[mediaId] : null;
    },
    isIntern(reference) {
      return this.mediaOf(reference)?.visibility === "intern";
    },
    nameOf(reference) {
      const media = this.mediaOf(reference);
      if (media) {
        return media.title || media.originalFileName;
      }
      return externalReferenceUrl(reference) || "Medium wird geladen …";
    },
    metaOf(reference) {
      const media = this.mediaOf(reference);
      if (!media) {
        return displayMediaId(reference) ? "" : "Externer Link";
      }
      return `${media.mimeType} · ${FormatService.bytes(media.size)} · ${
        media.visibility === "intern" ? "intern" : "öffentlich"
      }`;
    },
    async resolve(mediaId) {
      if (this.mediaById[mediaId]) {
        return;
      }
      const media = await MediaResolveService.resolve(this.scope, mediaId);
      if (media) {
        this.$set(this.mediaById, mediaId, media);
      }
    },
    emit(references) {
      if (this.valueFormat === "url") {
        this.$emit(
          "input",
          references.map((reference) => reference.url).filter(Boolean)
        );
        return;
      }
      this.$emit("input", references);
    },
    onReorder(references) {
      this.emit(references);
    },
    makeCover(index) {
      const references = [...this.references];
      references.unshift(references.splice(index, 1)[0]);
      this.emit(references);
    },
    remove(index) {
      const references = [...this.references];
      references.splice(index, 1);
      this.emit(references);
    },
    // How a picked medium is stored here: as a typed reference, or as the
    // address of its file at an untyped legacy site.
    referenceFor(media) {
      if (this.valueFormat === "url") {
        return externalReferenceOf(
          ApiMediaService.getMediaFilePath(this.scope, media.id)
        );
      }
      return mediaReferenceOf(media.id);
    },
    onSelect(selection) {
      // A medium already in the list is not added twice — whichever way the
      // list stores it.
      const known = new Set(
        this.references.map((reference) => this.rowKey(reference, null))
      );
      const added = [];
      selection.forEach((media) => {
        const reference = this.referenceFor(media);
        if (known.has(this.rowKey(reference, null))) {
          return;
        }
        known.add(this.rowKey(reference, null));
        MediaResolveService.prime(this.scope, media);
        this.$set(this.mediaById, media.id, media);
        added.push(reference);
      });
      this.emit([...this.references, ...added]);
    },
  },
};
</script>

<style scoped>
.media-ref-list__row + .media-ref-list__row {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.theme--dark .media-ref-list__row + .media-ref-list__row {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.media-ref-list__handle {
  cursor: grab;
}

.media-ref-list__ghost {
  opacity: 0.4;
}
</style>

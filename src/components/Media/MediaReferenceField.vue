<template>
  <div>
    <div class="text-caption text--secondary mb-1">{{ label }}</div>

    <v-sheet
      color="accent"
      rounded
      class="media-reference-field d-flex align-center pa-2"
    >
      <v-avatar tile width="56" height="42" class="rounded mr-3 flex-shrink-0">
        <MediaReferenceImage
          v-if="reference"
          :reference="reference"
          :scope="scope"
          size="thumb"
          :lazy-size="null"
          :height="42"
          :width="56"
        />
        <v-icon v-else color="grey">{{ emptyIcon }}</v-icon>
      </v-avatar>

      <div class="flex-grow-1 text-truncate">
        <template v-if="externalMode">
          <v-text-field
            :value="externalUrl"
            placeholder="https://…"
            dense
            hide-details
            solo
            flat
            background-color="transparent"
            @input="onExternalInput"
          />
        </template>
        <template v-else-if="reference">
          <div class="text-truncate font-weight-medium">{{ displayName }}</div>
          <div class="text-caption text--secondary text-truncate">
            <v-icon v-if="isIntern" x-small color="warning">
              mdi-lock-outline
            </v-icon>
            {{ displayMeta }}
          </div>
        </template>
        <template v-else>
          <span class="text--secondary font-italic">{{ emptyLabel }}</span>
        </template>
      </div>

      <v-btn small text color="primary" @click="pickerOpen = true">
        <v-icon small left>mdi-image-multiple-outline</v-icon>
        Auswählen
      </v-btn>
      <v-btn
        v-if="reference"
        icon
        small
        title="Entfernen (das Medium bleibt in der Mediathek)"
        @click="clear"
      >
        <v-icon small>mdi-close</v-icon>
      </v-btn>
    </v-sheet>

    <div v-if="hint" class="text-caption text--secondary mt-1">{{ hint }}</div>
    <div
      v-if="enforcePublic && isIntern"
      class="text-caption error--text mt-1 d-flex align-center"
    >
      <v-icon x-small color="error" class="mr-1">mdi-alert-outline</v-icon>
      {{ effectivePublicOnlyReason }}
    </div>

    <MediaPickerDialog
      v-model="pickerOpen"
      :scope="scope"
      :kind="kind"
      :public-only="enforcePublic"
      :public-only-reason="effectivePublicOnlyReason"
      :exclude-ids="excludeIds"
      :title="pickerTitle"
      @select="onSelect"
      @select-external="onSelectExternal"
    />
  </div>
</template>

<script>
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
  toMediaReference,
} from "@/utils/mediaReference";

/**
 * One reference site as a form field: teaser image, contact photo, the file of
 * an attachment. The value is a media reference — picking from the library is
 * the normal way, an external address stays possible for files that do not
 * live here (§4.8).
 */
export default {
  name: "MediaReferenceField",
  components: { MediaPickerDialog, MediaReferenceImage },
  props: {
    value: { type: [Object, String], default: null },
    label: { type: String, default: "" },
    scope: { type: String, default: MEDIA_SCOPE.TENANT },
    kind: { type: String, default: "image" },
    publicOnly: { type: Boolean, default: false },
    publicOnlyReason: {
      type: String,
      default:
        "Dieses Objekt ist öffentlich sichtbar — interne Medien sind hier nicht wählbar.",
    },
    hint: { type: String, default: "" },
    emptyLabel: { type: String, default: "Nichts ausgewählt" },
    // Legacy sites that the media spec leaves untyped (§4.8) still hold a bare
    // address. They pick from the library like everything else and store the
    // address of the chosen medium — public media only, because a plain URL
    // carries no credentials.
    valueFormat: {
      type: String,
      default: "reference",
      validator: (value) => ["reference", "url"].includes(value),
    },
  },
  data() {
    return {
      pickerOpen: false,
      media: null,
      externalMode: false,
    };
  },
  computed: {
    reference() {
      return toMediaReference(this.value);
    },
    mediaId() {
      return displayMediaId(this.value);
    },
    externalUrl() {
      return externalReferenceUrl(this.value) || "";
    },
    excludeIds() {
      return this.mediaId ? [this.mediaId] : [];
    },
    // A site that stores a bare address can only ever show public media: the
    // stored URL is fetched by the browser without credentials.
    enforcePublic() {
      return this.publicOnly || this.valueFormat === "url";
    },
    effectivePublicOnlyReason() {
      if (!this.publicOnly && this.valueFormat === "url") {
        return "Dieses Feld speichert eine Adresse — interne Medien wären dort nicht abrufbar.";
      }
      return this.publicOnlyReason;
    },
    isIntern() {
      return this.media?.visibility === "intern";
    },
    displayName() {
      if (this.media) {
        return this.media.title || this.media.originalFileName;
      }
      if (this.mediaId) {
        return "Medium wird geladen …";
      }
      return this.externalUrl;
    },
    displayMeta() {
      if (this.media) {
        const size = FormatService.bytes(this.media.size);
        return `${this.media.mimeType} · ${size} · ${
          this.isIntern ? "intern" : "öffentlich"
        }`;
      }
      return this.mediaId ? "" : "Externer Link";
    },
    emptyIcon() {
      return this.kind === "document"
        ? "mdi-file-outline"
        : "mdi-image-off-outline";
    },
    pickerTitle() {
      return this.kind === "document"
        ? "Datei aus der Mediathek wählen"
        : "Bild aus der Mediathek wählen";
    },
  },
  watch: {
    mediaId: {
      immediate: true,
      handler() {
        this.resolve();
      },
    },
    value: {
      immediate: true,
      handler() {
        // A site that holds a foreign address opens in link mode, so the value
        // stays editable where it came from. An address of our own library
        // reads as a medium and shows as one. Leaving link mode is the user's
        // call — never this watcher's.
        if (this.externalUrl && !this.mediaId) {
          this.externalMode = true;
        }
      },
    },
  },
  methods: {
    async resolve() {
      this.media = null;
      if (!this.mediaId) {
        return;
      }
      const mediaId = this.mediaId;
      const media = await MediaResolveService.resolve(this.scope, mediaId);
      if (this.mediaId === mediaId) {
        this.media = media;
      }
    },
    onSelect(selection) {
      const media = selection[0];
      if (!media) return;
      MediaResolveService.prime(this.scope, media);
      this.externalMode = false;
      if (this.valueFormat === "url") {
        this.$emit(
          "input",
          ApiMediaService.getMediaFilePath(this.scope, media.id)
        );
        return;
      }
      this.$emit("input", mediaReferenceOf(media.id));
    },
    onExternalInput(url) {
      if (this.valueFormat === "url") {
        this.$emit("input", url || "");
        return;
      }
      this.$emit("input", url ? externalReferenceOf(url) : null);
    },
    // The dialog's "Externer Link" tab hands over a finished external
    // reference — from here on it behaves like a value that arrived external.
    onSelectExternal(reference) {
      this.$emit(
        "input",
        this.valueFormat === "url" ? reference.url : reference
      );
    },
    clear() {
      this.externalMode = false;
      this.$emit("input", this.valueFormat === "url" ? "" : null);
    },
  },
};
</script>

<style scoped>
.media-reference-field {
  min-height: 58px;
}
</style>

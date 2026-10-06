<template>
  <div>
    <v-bottom-sheet
      :value="value"
      content-class="media-dialog"
      @input="$emit('input', $event)"
    >
      <v-card class="media-upload-sheet">
        <v-card-title>Dateien hochladen</v-card-title>
        <v-list>
          <template v-if="offersImages">
            <v-list-item data-test="upload-gallery" @click="choose('gallery')">
              <v-list-item-icon>
                <v-icon>mdi-image-multiple-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Aus der Galerie wählen</v-list-item-title>
            </v-list-item>
            <v-list-item data-test="upload-camera" @click="choose('camera')">
              <v-list-item-icon>
                <v-icon>mdi-camera-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Foto aufnehmen</v-list-item-title>
            </v-list-item>
          </template>
          <v-list-item data-test="upload-files" @click="choose('files')">
            <v-list-item-icon>
              <v-icon>mdi-file-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Datei wählen</v-list-item-title>
          </v-list-item>
        </v-list>
        <template v-if="visibility">
          <v-divider />
          <div class="media-upload-sheet__visibility">
            <span class="text--secondary">Sichtbarkeit</span>
            <v-btn-toggle
              :value="visibility"
              mandatory
              dense
              color="primary"
              @change="$emit('update:visibility', $event)"
            >
              <v-btn value="public">öffentlich</v-btn>
              <v-btn value="intern">intern</v-btn>
            </v-btn-toggle>
          </div>
        </template>
        <div class="media-upload-sheet__hint text--secondary">{{ hint }}</div>
      </v-card>
    </v-bottom-sheet>

    <!-- Outside the sheet, so they exist before it first opens. -->
    <input
      ref="gallery"
      type="file"
      multiple
      hidden
      accept="image/*"
      @change="onPick"
    />
    <input
      ref="camera"
      type="file"
      hidden
      accept="image/*"
      capture="environment"
      @change="onPick"
    />
    <input
      ref="files"
      type="file"
      multiple
      hidden
      :accept="accept"
      @change="onPick"
    />
  </div>
</template>

<script>
import { MEDIA_ALLOWED_TYPES_LABEL } from "@/utils/mediaUploadError";

/**
 * The upload on a phone (ECCdigital/tickets#58): nobody drags a file onto a
 * dropzone there, so a sheet from below offers the gallery, the camera and the
 * files, each through a file input of its own. The picked files come back as
 * `pick`; where they go is the caller's business.
 */
export default {
  name: "MediaUploadSheet",
  props: {
    // Whether the sheet is open (`v-model`).
    value: { type: Boolean, default: false },
    // The visibility new files get (`.sync`); without one the sheet offers no
    // choice, as in the picker, which uploads public media only.
    visibility: { type: String, default: null },
    // Restricts the file chooser; gallery and camera only appear while images
    // are allowed.
    accept: { type: String, default: undefined },
    hint: {
      type: String,
      default: `${MEDIA_ALLOWED_TYPES_LABEL} bis 15 MB · PDF bis 50 MB`,
    },
  },
  computed: {
    offersImages() {
      return !this.accept || this.accept.includes("image");
    },
  },
  methods: {
    // The chooser has to open inside the tap, or the browser blocks it.
    choose(source) {
      this.$emit("input", false);
      this.$refs[source].click();
    },
    onPick(event) {
      const files = [...event.target.files];
      event.target.value = "";
      if (files.length > 0) {
        this.$emit("pick", files);
      }
    },
  },
};
</script>

<style scoped>
.media-upload-sheet {
  border-radius: var(--scb-radius-popover) var(--scb-radius-popover) 0 0 !important;
}

.media-upload-sheet__visibility {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-3);
  padding: var(--scb-space-3) var(--scb-space-4);
}

.media-upload-sheet__hint {
  padding: 0 var(--scb-space-4)
    calc(var(--scb-space-4) + env(safe-area-inset-bottom));
  font-size: var(--scb-font-size-xs);
}
</style>

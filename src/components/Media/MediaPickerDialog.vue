<template>
  <v-dialog
    :value="value"
    max-width="900"
    scrollable
    :fullscreen="phone"
    content-class="media-dialog"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center flex-nowrap">
        <v-icon color="primary" class="mr-2">mdi-image-multiple-outline</v-icon>
        <span :class="phone ? 'text-subtitle-1 text-truncate' : 'text-h6'">
          {{ title }}
        </span>
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-tabs v-model="tab" class="flex-grow-0">
        <v-tab href="#library">Mediathek</v-tab>
        <v-tab v-if="allowCreate" href="#upload">Upload</v-tab>
        <v-tab v-if="allowExternal" href="#external">Externer Link</v-tab>
      </v-tabs>
      <v-divider />

      <v-card-text
        class="pa-4"
        style="min-height: 420px"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <template v-if="tab === 'library'">
          <!-- The search band (SearchBar) with the tag behind the funnel;
               what the picker takes in the row beneath it. -->
          <SearchBar
            v-model="searchInput"
            :fields="$t('media.search')"
            :filters="filterSections"
            @filter="onFilter"
          >
            <template v-if="kind || publicOnly" #actions>
              <v-chip v-if="kind" small label>{{ kindLabel }}</v-chip>
              <v-chip v-if="publicOnly" small label color="warning" outlined>
                <v-icon x-small left>mdi-lock-outline</v-icon>
                intern = nicht wählbar
              </v-chip>
            </template>
          </SearchBar>

          <v-skeleton-loader
            v-if="loading && items.length === 0"
            type="image"
          />

          <!-- On a phone the grid of the media library: two columns of
               square thumbnails. -->
          <div
            v-else-if="items.length > 0"
            class="media-picker__grid"
            :class="{ 'media-picker__grid--phone': phone }"
          >
            <div
              v-for="item in items"
              :key="item.id"
              class="media-picker__tile"
              :class="{
                'media-picker__tile--blocked': isBlocked(item),
                'media-picker__tile--picked': isPicked(item),
              }"
              :title="tileTooltip(item)"
              @click="toggle(item)"
            >
              <div class="media-picker__thumb">
                <MediaImage
                  :media="item"
                  :scope="scope"
                  size="sm"
                  lazy-size="thumb"
                  :height="phone ? '100%' : 120"
                />
              </div>
              <div class="media-picker__badges">
                <v-chip
                  v-if="item.visibility === 'intern'"
                  x-small
                  color="warning"
                  text-color="white"
                >
                  <v-icon x-small left>mdi-lock-outline</v-icon>
                  intern
                </v-chip>
                <v-chip v-if="isExcluded(item)" x-small color="grey" dark>
                  <v-icon x-small left>mdi-check</v-icon>
                  zugeordnet
                </v-chip>
              </div>
              <v-icon
                v-if="isPicked(item)"
                class="media-picker__check"
                color="primary"
              >
                mdi-check-circle
              </v-icon>
              <div class="media-picker__meta">
                <div class="text-truncate font-weight-medium">
                  {{ item.title || item.originalFileName }}
                </div>
                <div class="text--secondary text-truncate">
                  {{ formatBytes(item.size) }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="pa-8 text-center text--secondary font-italic">
            Keine Medien für diesen Filter.
          </div>

          <v-pagination
            v-if="pageCount > 1"
            v-model="page"
            :length="pageCount"
            total-visible="7"
            class="mt-3"
          />
        </template>

        <template v-else-if="tab === 'upload'">
          <v-alert v-if="uploadError" type="error" dense outlined class="mb-3">
            {{ uploadError }}
          </v-alert>

          <!-- On a phone nobody drops files: a button opens the gallery, the
               camera or the files. -->
          <div v-if="phone" class="media-picker__phone-upload">
            <v-btn
              block
              x-large
              depressed
              color="primary"
              :loading="uploading"
              data-test="picker-upload"
              @click="uploadSheet = true"
            >
              <v-icon left>mdi-cloud-upload-outline</v-icon>
              Dateien hochladen
            </v-btn>
            <p class="text--secondary mt-3 mb-0">
              Sie landen als öffentliches Medium in der Mediathek und sind
              direkt ausgewählt. Interne Medien lädt die Mediathek selbst hoch.
            </p>
            <MediaUploadSheet
              v-model="uploadSheet"
              :accept="acceptAttribute"
              :hint="uploadHint"
              @pick="uploadFiles"
            />
          </div>
          <div
            v-else
            class="media-picker__dropzone media-picker__dropzone--tall"
            :class="{ 'media-picker__dropzone--active': dragOver }"
          >
            <v-icon large class="mb-2">mdi-cloud-upload-outline</v-icon>
            <div class="text-center" style="max-width: 420px">
              Dateien hierher ziehen — sie landen als öffentliches Medium in der
              Mediathek und sind direkt ausgewählt. Interne Medien lädt die
              Mediathek selbst hoch.
            </div>
            <v-btn
              small
              outlined
              color="primary"
              :loading="uploading"
              class="mt-4"
              @click="$refs.fileInput.click()"
            >
              <v-icon small left>mdi-upload</v-icon>
              Dateien auswählen
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              multiple
              hidden
              :accept="acceptAttribute"
              @change="onFilePick"
            />
          </div>
        </template>

        <template v-else>
          <p class="text-caption text--secondary mb-3">
            Eine Datei einbinden, die nicht in der Mediathek liegt. Gespeichert
            wird nur die Adresse — die Datei wird nicht importiert und muss
            öffentlich erreichbar bleiben.
          </p>
          <v-text-field
            v-model="externalUrl"
            label="URL"
            placeholder="https://…"
            prepend-inner-icon="mdi-link-variant"
            dense
            solo
            flat
            hide-details
            background-color="accent"
            @keyup.enter="applyExternal"
          />
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <span v-if="tab !== 'external'" class="text--secondary ml-2">
          {{ selected.length }} ausgewählt
        </span>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" :disabled="confirmDisabled" @click="confirm">
          <v-icon small left>mdi-plus</v-icon>
          Übernehmen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaPermissionService from "@/services/permissions/MediaPermissionService";
import MediaResolveService from "@/services/MediaResolveService";
import FormatService from "@/services/FormatService";
import MediaImage from "@/components/Media/MediaImage.vue";
import MediaUploadSheet from "@/components/Media/MediaUploadSheet.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import {
  MEDIA_ALLOWED_TYPES_LABEL,
  mediaUploadErrorMessage,
} from "@/utils/mediaUploadError";
import {
  externalReferenceOf,
  isValidExternalUrl,
} from "@/utils/mediaReference";

const PAGE_SIZE = 24;

/**
 * The media picker (§4.11): a gallery grid in a modal that every editor shares.
 * Filtering and search run server-side against the listing endpoint — the same
 * endpoint the media library reads — and upload happens right here, so picking
 * an image never means leaving the form.
 *
 * Besides the library, the picker is also the single entry point for external
 * addresses: the "Externer Link" tab stores a URL as an external reference —
 * hotlinked, never imported. A site whose reference may only ever be a medium
 * of the library turns the tab off with `allowExternal`.
 *
 * In a public context `intern` media stay visible but unselectable: the save
 * would be refused by the reference guard, and a greyed-out tile with the
 * reason is more helpful than hiding the medium the user is looking for.
 */
export default {
  name: "MediaPickerDialog",
  components: { MediaImage, MediaUploadSheet, SearchBar },
  props: {
    value: { type: Boolean, default: false },
    scope: { type: String, default: MEDIA_SCOPE.TENANT },
    // Restricts the listing; null offers images and documents alike.
    kind: { type: String, default: "image" },
    multiple: { type: Boolean, default: false },
    // The referencing entity is publicly visible, so only public media may be
    // pinned to it.
    publicOnly: { type: Boolean, default: false },
    publicOnlyReason: {
      type: String,
      default:
        "Dieses Objekt ist öffentlich sichtbar — interne Medien sind hier nicht wählbar.",
    },
    // Media already referenced at the usage site; they stay selectable, the
    // badge only says they are there already.
    excludeIds: { type: Array, default: () => [] },
    title: { type: String, default: "Aus der Mediathek wählen" },
    // A few sites store a typed reference the backend refuses to point outside
    // the library — the Hero's image Blocks are one. They turn the tab off
    // rather than let an author walk into a value the save would reject.
    allowExternal: { type: Boolean, default: true },
  },
  data() {
    return {
      tab: "library",
      items: [],
      total: 0,
      page: 1,
      loading: false,
      selected: [],
      filters: { tag: null },
      searchInput: "",
      knownTags: [],
      fetchRequestId: 0,
      dragOver: false,
      uploading: false,
      uploadError: null,
      uploadSheet: false,
      externalUrl: "",
    };
  },
  computed: {
    // A phone held upright (ECCdigital/tickets#58).
    phone() {
      return this.$vuetify.breakpoint.xsOnly;
    },
    pageCount() {
      return Math.ceil(this.total / PAGE_SIZE) || 1;
    },
    allowCreate() {
      return MediaPermissionService.allowCreate(this.scope);
    },
    kindLabel() {
      return this.kind === "document" ? "Nur Dokumente" : "Nur Bilder";
    },
    uploadHint() {
      const images = `${MEDIA_ALLOWED_TYPES_LABEL} bis 15 MB`;
      if (this.kind === "image") return images;
      if (this.kind === "document") return "PDF bis 50 MB";
      return `${images} · PDF bis 50 MB`;
    },
    acceptAttribute() {
      if (this.kind === "image") return "image/*";
      if (this.kind === "document") return "application/pdf";
      return undefined;
    },
    /** The tag behind the funnel, once the listing has shown one. */
    filterSections() {
      if (this.knownTags.length === 0) return null;
      return [
        {
          key: "tag",
          label: this.$t("filter.tags"),
          multiple: false,
          selected: this.filters.tag,
          options: this.knownTags.map((tag) => ({
            value: tag,
            label: tag,
            icon: "mdi-tag-outline",
          })),
        },
      ];
    },
    externalUrlValid() {
      return isValidExternalUrl(this.externalUrl);
    },
    confirmDisabled() {
      return this.tab === "external"
        ? !this.externalUrlValid
        : this.selected.length === 0;
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.tab = "library";
        this.selected = [];
        this.uploadError = null;
        this.externalUrl = "";
        this.reload();
      }
    },
    page() {
      this.fetchMedia();
    },
    searchInput() {
      this.reload();
    },
  },
  methods: {
    formatBytes(bytes) {
      return FormatService.bytes(bytes);
    },
    close() {
      this.$emit("input", false);
    },
    onFilter(key, tag) {
      this.filters.tag = tag;
      this.reload();
    },
    reload() {
      this.page = 1;
      this.fetchMedia();
    },
    async fetchMedia() {
      // Rapid filter changes race their responses; only the latest one may
      // land in the grid.
      const requestId = ++this.fetchRequestId;
      this.loading = true;
      try {
        const response = await ApiMediaService.getMediaList(this.scope, {
          page: this.page,
          pageSize: PAGE_SIZE,
          kind: this.kind || undefined,
          tag: this.filters.tag || undefined,
          q: this.searchInput || undefined,
        });
        if (requestId !== this.fetchRequestId) {
          return;
        }
        this.items = response.data.items;
        this.total = response.data.total;
        this.collectTags(this.items);
        this.items.forEach((item) =>
          MediaResolveService.prime(this.scope, item)
        );
      } catch (error) {
        console.error(error);
        if (requestId === this.fetchRequestId) {
          this.items = [];
          this.total = 0;
        }
      } finally {
        if (requestId === this.fetchRequestId) {
          this.loading = false;
        }
      }
    },
    collectTags(items) {
      const tags = new Set(this.knownTags);
      items.forEach((item) =>
        (item.tags || []).forEach((tag) => tags.add(tag))
      );
      this.knownTags = [...tags].sort((a, b) => a.localeCompare(b, "de"));
    },
    isBlocked(media) {
      return this.publicOnly && media.visibility === "intern";
    },
    isExcluded(media) {
      return this.excludeIds.includes(media.id);
    },
    isPicked(media) {
      return this.selected.some((item) => item.id === media.id);
    },
    // Why a tile cannot be picked, or is already in use — the reason belongs
    // at the tile, not in a message the user has to go looking for.
    tileTooltip(media) {
      if (this.isBlocked(media)) return this.publicOnlyReason;
      if (this.isExcluded(media)) return "Ist hier bereits zugeordnet.";
      return undefined;
    },
    toggle(media) {
      if (this.isBlocked(media)) {
        return;
      }
      const index = this.selected.findIndex((item) => item.id === media.id);
      if (index >= 0) {
        this.selected.splice(index, 1);
        return;
      }
      // A single-value site takes the last click, not a growing list.
      this.selected = this.multiple ? [...this.selected, media] : [media];
    },
    confirm() {
      if (this.tab === "external") {
        this.applyExternal();
        return;
      }
      this.apply();
    },
    apply() {
      this.$emit("select", this.selected);
      this.close();
    },
    // Confirming the "Externer Link" tab hands out an external reference
    // instead of a media pick — the caller stores the address as it is.
    applyExternal() {
      if (!this.externalUrlValid) {
        return;
      }
      this.$emit(
        "select-external",
        externalReferenceOf(this.externalUrl.trim())
      );
      this.close();
    },
    onFilePick(event) {
      this.uploadFiles([...event.target.files]);
      event.target.value = "";
    },
    onDragOver() {
      if (this.tab === "upload") {
        this.dragOver = true;
      }
    },
    onDrop(event) {
      this.dragOver = false;
      if (this.tab !== "upload" || !this.allowCreate) return;
      this.uploadFiles([...event.dataTransfer.files]);
    },
    // One file per request; every upload that succeeds is selected right away,
    // which is the whole point of uploading from inside the picker.
    async uploadFiles(files) {
      if (files.length === 0 || this.uploading) return;
      this.uploading = true;
      this.uploadError = null;
      try {
        for (const file of files) {
          try {
            const response = await ApiMediaService.uploadMedia(this.scope, {
              file,
              visibility: "public",
            });
            const media = response.data;
            MediaResolveService.prime(this.scope, media);
            this.selected = this.multiple ? [...this.selected, media] : [media];
          } catch (error) {
            this.uploadError = mediaUploadErrorMessage(error, file.name);
          }
        }
        await this.reload();
        // Back to the grid, where the fresh uploads show up selected.
        if (!this.uploadError) {
          this.tab = "library";
        }
      } finally {
        this.uploading = false;
      }
    },
  },
};
</script>

<style scoped>
.media-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.media-picker__tile {
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: var(--media-surface-radius, 8px);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.media-picker__tile:hover {
  border-color: var(--v-primary-base);
}

.media-picker__tile--picked {
  border-color: var(--v-primary-base);
  box-shadow: 0 0 0 1px var(--v-primary-base) inset;
}

.media-picker__tile--blocked {
  opacity: 0.45;
  cursor: not-allowed;
}

.media-picker__tile--blocked:hover {
  border-color: rgba(0, 0, 0, 0.12);
}

.media-picker__badges {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  gap: 4px;
}

/* Vuetify's `.v-icon.v-icon` outranks a single class and pinned the check to
   `position: relative`. The light disc keeps it readable on dark images. */
.media-picker__tile .media-picker__check {
  position: absolute;
  top: 6px;
  right: 6px;
  border-radius: 50%;
  background: #fff;
}

.media-picker__grid--phone {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.media-picker__grid--phone .media-picker__thumb {
  aspect-ratio: 1;
}

.media-picker__phone-upload {
  padding: var(--scb-space-6) var(--scb-space-1);
  text-align: center;
}

.media-picker__meta {
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.3;
}

.media-picker__dropzone {
  display: flex;
  align-items: center;
  border: 2px dashed #b9c4cc;
  border-radius: var(--media-surface-radius, 8px);
  padding: 8px 12px;
  font-size: 13px;
}

.media-picker__dropzone--tall {
  flex-direction: column;
  justify-content: center;
  min-height: 320px;
  padding: 24px;
}

.media-picker__dropzone--active {
  border-color: var(--v-primary-base);
}
</style>

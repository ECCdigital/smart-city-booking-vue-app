<template>
  <v-dialog
    :value="value"
    max-width="900"
    scrollable
    content-class="media-dialog"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-image-multiple-outline</v-icon>
        <span class="text-h6">{{ title }}</span>
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text
        class="pa-4"
        style="min-height: 420px"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <div class="d-flex align-center flex-wrap mb-3" style="gap: 8px">
          <v-text-field
            v-model="searchInput"
            label="Suchen (Titel, Dateiname, Alt-Text) …"
            prepend-inner-icon="mdi-magnify"
            dense
            solo
            flat
            clearable
            hide-details
            background-color="accent"
            style="min-width: 220px"
          />
          <v-select
            v-if="knownTags.length > 0"
            v-model="filters.tag"
            :items="tagItems"
            label="Tag"
            dense
            solo
            flat
            clearable
            hide-details
            background-color="accent"
            style="max-width: 180px"
            @change="reload"
          />
          <v-chip v-if="kind" small label>{{ kindLabel }}</v-chip>
          <v-chip v-if="publicOnly" small label color="warning" outlined>
            <v-icon x-small left>mdi-lock-outline</v-icon>
            intern = nicht wählbar
          </v-chip>
          <v-spacer />
          <v-btn
            v-if="allowCreate"
            small
            outlined
            color="primary"
            :loading="uploading"
            @click="$refs.fileInput.click()"
          >
            <v-icon small left>mdi-upload</v-icon>
            Neu hochladen
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

        <v-alert v-if="uploadError" type="error" dense outlined class="mb-3">
          {{ uploadError }}
        </v-alert>

        <div
          v-if="allowCreate"
          class="media-picker__dropzone mb-3"
          :class="{ 'media-picker__dropzone--active': dragOver }"
        >
          <v-icon small class="mr-2">mdi-cloud-upload-outline</v-icon>
          Dateien hierher ziehen — sie landen als öffentliches Medium in der
          Mediathek und sind direkt ausgewählt. Interne Medien lädt die
          Mediathek selbst hoch.
        </div>

        <v-skeleton-loader v-if="loading && items.length === 0" type="image" />

        <div v-else-if="items.length > 0" class="media-picker__grid">
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
            <MediaImage
              :media="item"
              :scope="scope"
              size="sm"
              lazy-size="thumb"
              :height="120"
            />
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
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <span class="text--secondary ml-2">
          {{ selected.length }} ausgewählt
        </span>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" :disabled="selected.length === 0" @click="apply">
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
import { mediaUploadErrorMessage } from "@/utils/mediaUploadError";

const PAGE_SIZE = 24;

/**
 * The media picker (§4.11): a gallery grid in a modal that every editor shares.
 * Filtering and search run server-side against the listing endpoint — the same
 * endpoint the media library reads — and upload happens right here, so picking
 * an image never means leaving the form.
 *
 * In a public context `intern` media stay visible but unselectable: the save
 * would be refused by the reference guard, and a greyed-out tile with the
 * reason is more helpful than hiding the medium the user is looking for.
 */
export default {
  name: "MediaPickerDialog",
  components: { MediaImage },
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
  },
  data() {
    return {
      items: [],
      total: 0,
      page: 1,
      loading: false,
      selected: [],
      filters: { tag: null },
      searchInput: "",
      searchDebounce: null,
      knownTags: [],
      fetchRequestId: 0,
      dragOver: false,
      uploading: false,
      uploadError: null,
    };
  },
  computed: {
    pageCount() {
      return Math.ceil(this.total / PAGE_SIZE) || 1;
    },
    allowCreate() {
      return MediaPermissionService.allowCreate(this.scope);
    },
    kindLabel() {
      return this.kind === "document" ? "Nur Dokumente" : "Nur Bilder";
    },
    acceptAttribute() {
      if (this.kind === "image") return "image/*";
      if (this.kind === "document") return "application/pdf";
      return undefined;
    },
    tagItems() {
      return this.knownTags.map((tag) => ({ text: tag, value: tag }));
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.selected = [];
        this.uploadError = null;
        this.reload();
      }
    },
    page() {
      this.fetchMedia();
    },
    searchInput() {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => this.reload(), 300);
    },
  },
  beforeDestroy() {
    clearTimeout(this.searchDebounce);
  },
  methods: {
    formatBytes(bytes) {
      return FormatService.bytes(bytes);
    },
    close() {
      this.$emit("input", false);
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
    apply() {
      this.$emit("select", this.selected);
      this.close();
    },
    onFilePick(event) {
      this.uploadFiles([...event.target.files]);
      event.target.value = "";
    },
    onDrop(event) {
      this.dragOver = false;
      if (!this.allowCreate) return;
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

.media-picker__check {
  position: absolute;
  top: 6px;
  right: 6px;
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

.media-picker__dropzone--active {
  border-color: var(--v-primary-base);
}
</style>

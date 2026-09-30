<template>
  <!-- A phone held upright (ECCdigital/tickets#58): the same library as a
       grid of large thumbnails, the filters behind the search funnel, the
       upload in thumb reach at the bottom and a medium in a sheet from below.
       A phone on its side is wide enough for the columns below. -->
  <div v-if="phone" class="media-phone">
    <SearchBar
      :value="filters.q"
      :fields="$t('media.search')"
      :filters="filterSections"
      @input="onSearch"
      @filter="onFilter"
    />

    <v-skeleton-loader v-if="loading && items.length === 0" type="image@2" />
    <div v-else-if="items.length > 0" class="media-phone__grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="media-phone__tile"
        data-test="media-tile"
        @click="viewedId = item.id"
      >
        <div class="media-phone__thumb">
          <MediaImage
            :media="item"
            :scope="scope"
            size="sm"
            lazy-size="thumb"
            height="100%"
            icon-size="48"
          />
          <span
            v-if="item.visibility === 'intern'"
            class="media-phone__intern"
            title="intern"
          >
            <v-icon small color="warning">mdi-lock-outline</v-icon>
          </span>
        </div>
        <div class="media-phone__name text-truncate">
          {{ item.title || item.originalFileName }}
        </div>
        <div class="media-phone__size">{{ formatBytes(item.size) }}</div>
      </button>
    </div>
    <div v-else class="pa-8 text-center text--secondary font-italic">
      Keine Medien für diesen Filter.
    </div>

    <v-pagination
      v-if="pageCount > 1"
      v-model="page"
      :length="pageCount"
      total-visible="5"
      class="mt-3"
    />

    <template v-if="allowCreate">
      <v-sheet elevation="8" class="media-phone__bar">
        <MediaUploadQueue
          :entries="uploadQueue"
          class="media-phone__queue"
          @dismiss="dismissUpload"
        />
        <v-btn
          block
          x-large
          depressed
          color="primary"
          data-test="media-upload"
          @click="uploadSheet = true"
        >
          <v-icon left>mdi-cloud-upload-outline</v-icon>
          Dateien hochladen
        </v-btn>
      </v-sheet>
      <MediaUploadSheet
        v-model="uploadSheet"
        :visibility.sync="uploadVisibility"
        @pick="enqueueFiles"
      />
    </template>

    <v-bottom-sheet
      :value="!!viewedMedia"
      scrollable
      :fullscreen="editing"
      content-class="media-dialog"
      @input="(open) => !open && closeView()"
    >
      <v-card
        v-if="viewedMedia"
        class="media-phone__sheet"
        :class="{ 'media-phone__sheet--full': editing }"
      >
        <v-toolbar v-if="editing" flat dense class="flex-grow-0">
          <v-btn icon aria-label="Zurück zum Bild" @click="editing = false">
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
          <v-toolbar-title>Bearbeiten</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-0">
          <MediaDetailPanel
            :media="viewedMedia"
            :scope="scope"
            :mode="editing ? 'edit' : 'preview'"
            @edit="editing = true"
            @updated="onMediaUpdated"
            @deleted="onMediaDeleted"
          />
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>

  <div v-else class="media-library">
    <!-- Facets -->
    <nav class="media-library__facets" aria-label="Filter">
      <div class="media-facets__group">
        <div class="media-facets__title">Typ</div>
        <button
          v-for="option in kindOptions"
          :key="String(option.value)"
          type="button"
          class="media-facets__item"
          :class="{
            'media-facets__item--active': filters.kind === option.value,
          }"
          :aria-pressed="String(filters.kind === option.value)"
          @click="setKind(option.value)"
        >
          <v-icon>{{ option.icon }}</v-icon>
          <span>{{ option.text }}</span>
        </button>
      </div>

      <div class="media-facets__group">
        <div class="media-facets__title">Sichtbarkeit</div>
        <button
          v-for="option in visibilityOptions"
          :key="String(option.value)"
          type="button"
          class="media-facets__item"
          :class="{
            'media-facets__item--active': filters.visibility === option.value,
          }"
          :aria-pressed="String(filters.visibility === option.value)"
          @click="setVisibility(option.value)"
        >
          <span>{{ option.text }}</span>
        </button>
      </div>

      <div v-if="knownTags.length > 0" class="media-facets__group">
        <div class="media-facets__title">Tags</div>
        <button
          v-for="tag in knownTags"
          :key="tag"
          type="button"
          class="media-facets__item"
          :class="{ 'media-facets__item--active': filters.tag === tag }"
          :aria-pressed="String(filters.tag === tag)"
          @click="toggleTag(tag)"
        >
          <v-icon>mdi-tag-outline</v-icon>
          <span class="text-truncate">{{ tag }}</span>
        </button>
      </div>
    </nav>

    <!-- List column -->
    <div class="media-library__list">
      <!-- The search band (SearchBar); the facets beside it filter. -->
      <SearchBar
        :value="filters.q"
        :fields="$t('media.search')"
        @input="onSearch"
      />

      <!-- Permanent dropzone -->
      <div
        v-if="allowCreate"
        class="media-library__dropzone"
        :class="{ 'media-library__dropzone--active': dragOver }"
        @click="$refs.fileInput.click()"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <v-icon
          size="30"
          class="mr-3"
          :color="dragOver ? 'primary' : undefined"
        >
          mdi-cloud-upload-outline
        </v-icon>
        <div class="flex-grow-1">
          <strong>Dateien hierher ziehen</strong> oder klicken — landen direkt
          in der Mediathek<br />
          <span class="text--secondary" style="font-size: 12px">
            {{ allowedTypesLabel }} bis 15 MB · PDF bis 50 MB
          </span>
        </div>
        <v-select
          v-model="uploadVisibility"
          :items="uploadVisibilityItems"
          label="Sichtbarkeit"
          dense
          outlined
          hide-details
          class="media-library__dropzone-visibility"
          @click.native.stop
        />
        <input
          ref="fileInput"
          type="file"
          multiple
          hidden
          @change="onFilePick"
        />
      </div>

      <MediaUploadQueue
        :entries="uploadQueue"
        class="mb-3"
        @dismiss="dismissUpload"
      />

      <v-card outlined>
        <v-skeleton-loader
          v-if="loading && items.length === 0"
          type="list-item-avatar-two-line@6"
        />
        <v-list v-else-if="items.length > 0" two-line class="py-0">
          <template v-for="(item, index) in items">
            <v-list-item
              :key="item.id"
              :input-value="selectedId === item.id"
              color="primary"
              @click="selectedId = item.id"
            >
              <v-list-item-avatar tile width="56" height="42" class="rounded">
                <MediaImage :media="item" :scope="scope" size="thumb" />
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>
                  {{ item.title || item.originalFileName }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.mimeType }} · {{ formatBytes(item.size) }} ·
                  {{ formatDate(item.createdAt) }}
                </v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-icon v-if="item.visibility === 'intern'">
                <v-icon small color="warning">mdi-lock-outline</v-icon>
              </v-list-item-icon>
            </v-list-item>
            <v-divider v-if="index < items.length - 1" :key="`d-${item.id}`" />
          </template>
        </v-list>
        <div v-else class="pa-8 text-center text--secondary font-italic">
          Keine Medien für diesen Filter.
        </div>
      </v-card>

      <v-pagination
        v-if="pageCount > 1"
        v-model="page"
        :length="pageCount"
        total-visible="7"
        class="mt-3"
      />
    </div>

    <!-- Detail panel -->
    <div class="media-library__detail">
      <MediaDetailPanel
        v-if="selectedMedia"
        :media="selectedMedia"
        :scope="scope"
        @updated="onMediaUpdated"
        @deleted="onMediaDeleted"
      />
      <v-card
        v-else
        outlined
        class="pa-8 text-center text--secondary font-italic"
      >
        Nichts ausgewählt.
      </v-card>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import FormatService from "@/services/FormatService";
import ToastService from "@/services/ToastService";
import MediaPermissionService from "@/services/permissions/MediaPermissionService";
import MediaDetailPanel from "@/components/Media/MediaDetailPanel.vue";
import MediaImage from "@/components/Media/MediaImage.vue";
import MediaUploadQueue from "@/components/Media/MediaUploadQueue.vue";
import MediaUploadSheet from "@/components/Media/MediaUploadSheet.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import {
  MEDIA_ALLOWED_TYPES_LABEL,
  mediaUploadErrorMessage,
} from "@/utils/mediaUploadError";

const PAGE_SIZE = 25;

// The segment of the phone's type filter that restricts nothing.
const KIND_ALL = "all";

export default {
  name: "MediaLibrary",
  components: {
    MediaDetailPanel,
    MediaImage,
    MediaUploadQueue,
    MediaUploadSheet,
    SearchBar,
  },
  props: {
    scope: { type: String, required: true },
  },
  data() {
    return {
      items: [],
      total: 0,
      page: 1,
      loading: false,
      selectedId: null,
      filters: {
        kind: null,
        visibility: null,
        tag: null,
        q: "",
      },
      // The listing has no tag index; the facet collects every tag the
      // responses have shown so far.
      knownTags: [],
      kindOptions: [
        { text: "Alle Medien", value: null, icon: "mdi-view-grid-outline" },
        { text: "Bilder", value: "image", icon: "mdi-image-outline" },
        { text: "Dokumente", value: "document", icon: "mdi-file-outline" },
      ],
      visibilityOptions: [
        { text: "Alle", value: null },
        { text: "öffentlich", value: "public" },
        { text: "intern", value: "intern" },
      ],
      uploadVisibilityItems: [
        { text: "öffentlich", value: "public" },
        { text: "intern", value: "intern" },
      ],
      uploadVisibility: "public",
      uploadQueue: [],
      uploading: false,
      dragOver: false,
      fetchRequestId: 0,
      // The phone's sheets: the medium shown large, whether it is being
      // edited, and the upload.
      viewedId: null,
      editing: false,
      uploadSheet: false,
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    phone() {
      return this.$vuetify.breakpoint.xsOnly;
    },
    selectedMedia() {
      return this.items.find((item) => item.id === this.selectedId) || null;
    },
    viewedMedia() {
      return this.items.find((item) => item.id === this.viewedId) || null;
    },
    // The facets of the wide layout, as sections of the funnel's filter card.
    filterSections() {
      const sections = [
        {
          key: "kind",
          label: "Typ",
          multiple: false,
          segmented: true,
          empty: KIND_ALL,
          selected: this.filters.kind || KIND_ALL,
          options: [
            { value: KIND_ALL, label: "Alle" },
            { value: "image", label: "Bilder" },
            { value: "document", label: "Dokumente" },
          ],
        },
        {
          key: "visibility",
          label: "Sichtbarkeit",
          multiple: false,
          selected: this.filters.visibility,
          options: [
            { value: "public", label: "öffentlich", icon: "mdi-earth" },
            { value: "intern", label: "intern", icon: "mdi-lock-outline" },
          ],
        },
      ];
      if (this.knownTags.length > 0) {
        sections.push({
          key: "tag",
          label: this.$t("filter.tags"),
          multiple: false,
          selected: this.filters.tag,
          options: this.knownTags.map((tag) => ({
            value: tag,
            label: tag,
            icon: "mdi-tag-outline",
          })),
        });
      }
      return sections;
    },
    pageCount() {
      return Math.ceil(this.total / PAGE_SIZE) || 1;
    },
    allowCreate() {
      return MediaPermissionService.allowCreate(this.scope);
    },
    allowedTypesLabel() {
      return MEDIA_ALLOWED_TYPES_LABEL;
    },
  },
  watch: {
    tenantId() {
      if (this.scope === MEDIA_SCOPE.TENANT) {
        this.resetAndFetch();
      }
    },
    page() {
      this.fetchMedia();
    },
  },
  created() {
    this.fetchMedia();
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    formatBytes(bytes) {
      return FormatService.bytes(bytes);
    },
    formatDate(value) {
      return value ? FormatService.date(value, "medium") : "—";
    },
    onSearch(q) {
      this.filters.q = q;
      this.page = 1;
      this.fetchMedia();
    },
    resetAndFetch() {
      this.items = [];
      this.total = 0;
      this.page = 1;
      this.selectedId = null;
      this.knownTags = [];
      this.fetchMedia();
    },
    setKind(value) {
      this.filters.kind = value;
      this.page = 1;
      this.fetchMedia();
    },
    setVisibility(value) {
      this.filters.visibility = value;
      this.page = 1;
      this.fetchMedia();
    },
    toggleTag(tag) {
      this.setTag(this.filters.tag === tag ? null : tag);
    },
    setTag(tag) {
      this.filters.tag = tag;
      this.page = 1;
      this.fetchMedia();
    },
    onFilter(key, selection) {
      if (key === "kind") {
        this.setKind(selection === KIND_ALL ? null : selection);
      } else if (key === "visibility") {
        this.setVisibility(selection);
      } else if (key === "tag") {
        this.setTag(selection);
      }
    },
    async fetchMedia() {
      // Rapid filter changes race their responses; only the latest one may
      // land in the list.
      const requestId = ++this.fetchRequestId;
      this.loading = true;
      try {
        const response = await ApiMediaService.getMediaList(this.scope, {
          page: this.page,
          pageSize: PAGE_SIZE,
          kind: this.filters.kind || undefined,
          tag: this.filters.tag || undefined,
          q: this.filters.q || undefined,
          visibility: this.filters.visibility || undefined,
        });
        if (requestId !== this.fetchRequestId) {
          return;
        }
        this.items = response.data.items;
        this.total = response.data.total;
        this.collectTags(this.items);
        if (!this.items.some((item) => item.id === this.selectedId)) {
          this.selectedId = this.items[0]?.id || null;
        }
      } catch (error) {
        console.error(error);
        if (requestId === this.fetchRequestId) {
          this.addToast(ToastService.createToast("media.loadError", "error"));
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
    onFilePick(event) {
      this.enqueueFiles([...event.target.files]);
      event.target.value = "";
    },
    onDrop(event) {
      this.dragOver = false;
      if (!this.allowCreate) return;
      this.enqueueFiles([...event.dataTransfer.files]);
    },
    // One file per request: dropped files line up and upload one after the
    // other, each as its own POST.
    enqueueFiles(files) {
      files.forEach((file) => {
        this.uploadQueue.push({
          file,
          status: "pending",
          progress: 0,
          message: `Wartet … · ${this.formatBytes(file.size)}`,
          visibility: this.uploadVisibility,
        });
      });
      this.processQueue();
    },
    async processQueue() {
      if (this.uploading) return;
      this.uploading = true;
      try {
        // Finished entries leave the queue on a timer, so look the next
        // pending entry up fresh instead of iterating a shifting array.
        let entry;
        while ((entry = this.uploadQueue.find((e) => e.status === "pending"))) {
          await this.uploadEntry(entry);
        }
      } finally {
        this.uploading = false;
      }
    },
    async uploadEntry(entry) {
      entry.status = "uploading";
      entry.message = `Wird hochgeladen … · ${this.formatBytes(
        entry.file.size
      )}`;
      try {
        await ApiMediaService.uploadMedia(
          this.scope,
          { file: entry.file, visibility: entry.visibility },
          (event) => {
            if (event.total) {
              entry.progress = Math.round((event.loaded / event.total) * 100);
            }
          }
        );
        entry.status = "done";
        entry.message = "Fertig — ist in der Mediathek";
        setTimeout(() => {
          const index = this.uploadQueue.indexOf(entry);
          if (index >= 0) this.uploadQueue.splice(index, 1);
        }, 2500);
        await this.fetchMedia();
      } catch (error) {
        entry.status = "error";
        entry.message = mediaUploadErrorMessage(error);
      }
    },
    dismissUpload(index) {
      this.uploadQueue.splice(index, 1);
    },
    onMediaUpdated(updated) {
      const index = this.items.findIndex((item) => item.id === updated.id);
      if (index >= 0) {
        this.$set(this.items, index, updated);
      }
      this.collectTags([updated]);
    },
    onMediaDeleted() {
      this.selectedId = null;
      this.closeView();
      this.fetchMedia();
    },
    closeView() {
      this.viewedId = null;
      this.editing = false;
    },
  },
};
</script>

<style scoped>
.media-library {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

/* Borderless facet navigation: no card, active entry as a primary-tinted
   pill. The facets carry their own colours instead of Vuetify's list classes,
   so both themes are spelled out here — as tokens, so the dark overrides never
   out-specify the active entry. */
.media-library__facets {
  --facet-title-color: rgba(0, 0, 0, 0.45);
  --facet-item-color: rgba(0, 0, 0, 0.72);
  --facet-hover-bg: rgba(0, 0, 0, 0.04);

  width: 210px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-top: 2px;
}

.theme--dark .media-library__facets {
  --facet-title-color: rgba(255, 255, 255, 0.55);
  --facet-item-color: rgba(255, 255, 255, 0.8);
  --facet-hover-bg: rgba(255, 255, 255, 0.08);
}

.media-facets__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.media-facets__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--facet-title-color);
  padding: 0 10px 6px;
}

.media-facets__item {
  position: relative;
  /* Keeps the tint of ::before above the item's own background but below its
     label. */
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--media-surface-radius, 8px);
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--facet-item-color);
  text-align: left;
  cursor: pointer;
}

/* Long tag names shrink instead of pushing the pill past the column. */
.media-facets__item > span {
  min-width: 0;
}

.media-facets__item .v-icon {
  font-size: 16px;
  color: inherit;
}

.media-facets__item:hover {
  background: var(--facet-hover-bg);
}

.media-facets__item:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: -2px;
}

.media-facets__item--active {
  color: var(--v-primary-base);
  font-weight: 600;
}

.media-facets__item--active:hover {
  background: none;
}

/* The pill tint follows the theme's primary: currentColor is primary on the
   active entry, so a 10% overlay needs no second colour definition. */
.media-facets__item--active::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.1;
}

.media-library__list {
  flex: 1;
  min-width: 0;
}

.media-library__detail {
  width: 380px;
  flex: none;
  position: sticky;
  top: 0;
}

.media-library__dropzone {
  display: flex;
  align-items: center;
  border: 2px dashed #b9c4cc;
  border-radius: var(--media-surface-radius, 8px);
  padding: 12px 16px;
  margin-bottom: 12px;
  cursor: pointer;
}

.media-library__dropzone--active {
  border-color: var(--v-primary-base);
}

.media-library__dropzone-visibility {
  max-width: 160px;
  flex: none;
}

.media-phone {
  /* Clears the upload bar, which stays fixed over the end of the grid. */
  padding-bottom: 96px;
}

.media-phone__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--scb-space-4) 10px;
}

.media-phone__tile {
  display: block;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.media-phone__tile:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
}

.media-phone__thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

/* Sits on the image, so it carries its own light backing in both themes. */
.media-phone__intern {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  padding: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.media-phone__name {
  margin-top: 6px;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.media-phone__size {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.media-phone__bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  padding: 10px var(--scb-space-3) calc(10px + env(safe-area-inset-bottom));
}

.media-phone__queue {
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: var(--scb-space-2);
}

.media-phone__sheet {
  border-radius: var(--scb-radius-popover) var(--scb-radius-popover) 0 0 !important;
}

.media-phone__sheet--full {
  border-radius: 0 !important;
}

@media (max-width: 1264px) {
  .media-library__facets {
    display: none;
  }
  .media-library__detail {
    width: 320px;
  }
}
</style>

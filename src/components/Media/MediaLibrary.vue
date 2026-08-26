<template>
  <div class="media-library">
    <!-- Facets -->
    <div class="media-library__facets">
      <v-card outlined>
        <v-list dense class="py-1">
          <v-subheader>Typ</v-subheader>
          <v-list-item
            v-for="option in kindOptions"
            :key="String(option.value)"
            @click="setKind(option.value)"
            :input-value="filters.kind === option.value"
            color="primary"
          >
            <v-list-item-icon class="mr-3">
              <v-icon small>{{ option.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title>{{ option.text }}</v-list-item-title>
          </v-list-item>

          <v-subheader>Sichtbarkeit</v-subheader>
          <v-list-item
            v-for="option in visibilityOptions"
            :key="String(option.value)"
            @click="setVisibility(option.value)"
            :input-value="filters.visibility === option.value"
            color="primary"
          >
            <v-list-item-title>{{ option.text }}</v-list-item-title>
          </v-list-item>

          <template v-if="knownTags.length > 0">
            <v-subheader>Tags</v-subheader>
            <v-list-item
              v-for="tag in knownTags"
              :key="tag"
              @click="toggleTag(tag)"
              :input-value="filters.tag === tag"
              color="primary"
            >
              <v-list-item-icon class="mr-3">
                <v-icon small>mdi-tag-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-title>{{ tag }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </div>

    <!-- List column -->
    <div class="media-library__list">
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

      <!-- Upload queue -->
      <v-card v-if="uploadQueue.length > 0" outlined class="mb-3">
        <v-list dense>
          <v-list-item v-for="(entry, index) in uploadQueue" :key="index">
            <v-list-item-icon class="mr-3">
              <v-icon v-if="entry.status === 'error'" color="error">
                mdi-alert-circle-outline
              </v-icon>
              <v-icon v-else-if="entry.status === 'done'" color="success">
                mdi-check-circle-outline
              </v-icon>
              <v-icon v-else>mdi-progress-upload</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ entry.file.name }}</v-list-item-title>
              <v-list-item-subtitle
                :class="{ 'error--text': entry.status === 'error' }"
              >
                {{ entry.message }}
              </v-list-item-subtitle>
              <v-progress-linear
                v-if="entry.status === 'uploading'"
                :value="entry.progress"
                height="4"
                rounded
                class="mt-1"
              />
            </v-list-item-content>
            <v-list-item-action v-if="entry.status === 'error'">
              <v-btn icon small @click="dismissUpload(index)">
                <v-icon small>mdi-close</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card>

      <v-text-field
        v-model="searchInput"
        label="Suchen (Titel, Dateiname, Alt-Text) …"
        prepend-inner-icon="mdi-magnify"
        dense
        solo
        clearable
        hide-details
        class="mb-3"
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

const PAGE_SIZE = 25;

export default {
  name: "MediaLibrary",
  components: { MediaDetailPanel, MediaImage },
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
      searchInput: "",
      searchDebounce: null,
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
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    selectedMedia() {
      return this.items.find((item) => item.id === this.selectedId) || null;
    },
    pageCount() {
      return Math.ceil(this.total / PAGE_SIZE) || 1;
    },
    allowCreate() {
      return MediaPermissionService.allowCreate(this.scope);
    },
    // ICO is in the global allowlist of the backend (favicons), so both
    // scopes advertise it.
    allowedTypesLabel() {
      return "JPEG, PNG, WebP, GIF, SVG, ICO";
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
    searchInput(value) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => {
        this.filters.q = value || "";
        this.page = 1;
        this.fetchMedia();
      }, 300);
    },
  },
  created() {
    this.fetchMedia();
  },
  beforeDestroy() {
    clearTimeout(this.searchDebounce);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    formatBytes(bytes) {
      return FormatService.bytes(bytes);
    },
    formatDate(value) {
      return value ? FormatService.date(value, "medium") : "—";
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
      this.filters.tag = this.filters.tag === tag ? null : tag;
      this.page = 1;
      this.fetchMedia();
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
        entry.message = this.uploadErrorMessage(error);
      }
    },
    uploadErrorMessage(error) {
      const body = error.response?.data;
      switch (body?.code) {
        case "file_too_large": {
          const maxBytes = body.params?.maxBytes;
          const limit = maxBytes
            ? ` (Limit: ${this.formatBytes(maxBytes)})`
            : "";
          return `Datei ist zu groß${limit} — Upload abgelehnt.`;
        }
        case "unsupported_file_type":
          return `Dateityp wird nicht unterstützt — erlaubt sind ${this.allowedTypesLabel} und PDF.`;
        case "invalid_image":
          return "Die Bilddatei ist ungültig oder beschädigt.";
        case "empty_file":
          return "Die Datei ist leer.";
        default:
          if (error.response?.status === 413) {
            return "Datei ist zu groß — Upload abgelehnt.";
          }
          return "Upload fehlgeschlagen.";
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
      this.fetchMedia();
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

.media-library__facets {
  width: 200px;
  flex: none;
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
  border-radius: 6px;
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

@media (max-width: 1264px) {
  .media-library__facets {
    display: none;
  }
  .media-library__detail {
    width: 320px;
  }
}
</style>

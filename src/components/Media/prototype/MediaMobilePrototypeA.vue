<template>
  <!-- PROTOTYPE (ECCdigital/tickets#58), variant A "Seite": filters behind the
       search funnel, a full-width upload button on top, the large view as a
       full-screen page with Bearbeiten/Löschen beneath the image. -->
  <div class="mproto-a">
    <SearchBar
      :value="lib.filters.q"
      :fields="$t('media.search')"
      :filters="filterSections"
      @input="lib.onSearch"
      @filter="onFilter"
    />

    <template v-if="lib.allowCreate">
      <v-btn
        block
        x-large
        depressed
        color="primary"
        class="mproto-a__upload"
        @click="$refs.fileInput.click()"
      >
        <v-icon left>mdi-cloud-upload-outline</v-icon>
        Dateien hochladen
      </v-btn>
      <div class="mproto-a__upload-meta">
        <span>Galerie, Kamera oder Datei</span>
        <v-btn-toggle
          v-model="lib.uploadVisibility"
          mandatory
          dense
          color="primary"
          class="mproto-a__visibility"
        >
          <v-btn small value="public">öffentlich</v-btn>
          <v-btn small value="intern">intern</v-btn>
        </v-btn-toggle>
      </div>
      <input
        ref="fileInput"
        type="file"
        multiple
        hidden
        accept="image/*,application/pdf"
        @change="onPick"
      />
    </template>

    <v-card v-if="lib.uploadQueue.length > 0" outlined class="mb-3">
      <v-list dense>
        <v-list-item v-for="(entry, index) in lib.uploadQueue" :key="index">
          <v-list-item-content>
            <v-list-item-title>{{ entry.file.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ entry.message }}</v-list-item-subtitle>
            <v-progress-linear
              v-if="entry.status === 'uploading'"
              :value="entry.progress"
              height="4"
              rounded
            />
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card>

    <v-skeleton-loader
      v-if="lib.loading && lib.items.length === 0"
      type="image@2"
    />
    <div v-else-if="lib.items.length > 0" class="mproto-a__grid">
      <v-card
        v-for="item in lib.items"
        :key="item.id"
        outlined
        class="mproto-a__tile"
        @click="open(item)"
      >
        <div class="mproto-a__thumb">
          <MediaImage
            :media="item"
            :scope="lib.scope"
            size="sm"
            lazy-size="thumb"
            height="100%"
            icon-size="48"
          />
          <v-chip
            v-if="item.visibility === 'intern'"
            x-small
            color="warning"
            text-color="white"
            class="mproto-a__badge"
          >
            <v-icon x-small left>mdi-lock-outline</v-icon>
            intern
          </v-chip>
        </div>
        <div class="mproto-a__name text-truncate">
          {{ item.title || item.originalFileName }}
        </div>
      </v-card>
    </div>
    <div v-else class="pa-8 text-center text--secondary font-italic">
      Keine Medien für diesen Filter.
    </div>

    <v-pagination
      v-if="lib.pageCount > 1"
      v-model="lib.page"
      :length="lib.pageCount"
      total-visible="5"
      class="mt-3 mb-8"
    />

    <!-- The large view: a page of its own -->
    <v-dialog
      :value="!!current"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      content-class="media-dialog"
      @input="(open) => !open && close()"
    >
      <v-card v-if="current" tile class="mproto-a__view">
        <v-toolbar flat dense class="flex-grow-0">
          <v-btn icon aria-label="Zurück" @click="close">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <v-toolbar-title class="text-truncate">
            {{ current.title || current.originalFileName }}
          </v-toolbar-title>
        </v-toolbar>
        <div class="mproto-a__stage">
          <MediaImage
            :media="current"
            :scope="lib.scope"
            size="md"
            lazy-size="sm"
            height="100%"
            contain
            icon-size="96"
          />
        </div>
        <v-card-text class="pb-2">
          <div class="text-subtitle-1 text-break font-weight-medium">
            {{ current.title || current.originalFileName }}
          </div>
          <div class="text--secondary">
            {{ current.mimeType }} · {{ lib.formatBytes(current.size) }} ·
            {{ lib.formatDate(current.createdAt) }} ·
            {{ current.visibility === "public" ? "öffentlich" : "intern" }}
          </div>
        </v-card-text>
        <div class="mproto-a__actions">
          <v-btn x-large depressed color="primary" @click="editing = true">
            <v-icon left>mdi-pencil-outline</v-icon>
            Bearbeiten
          </v-btn>
          <v-btn x-large outlined color="error" @click="confirmDelete = true">
            <v-icon left>mdi-delete-outline</v-icon>
            Löschen
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Bearbeiten: the whole detail panel, full screen -->
    <v-dialog
      v-model="editing"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      content-class="media-dialog"
    >
      <v-card v-if="current && editing" tile>
        <v-toolbar flat dense class="flex-grow-0">
          <v-btn icon aria-label="Zurück" @click="editing = false">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <v-toolbar-title>Bearbeiten</v-toolbar-title>
        </v-toolbar>
        <MediaDetailPanel
          class="mproto-edit"
          :media="current"
          :scope="lib.scope"
          @updated="lib.onMediaUpdated"
          @deleted="onDeleted"
        />
      </v-card>
    </v-dialog>

    <!-- PROTOTYPE: deletion is stubbed, nothing is deleted -->
    <v-dialog v-model="confirmDelete" max-width="480" content-class="media-dialog">
      <v-card v-if="current">
        <v-card-title>Endgültig löschen?</v-card-title>
        <v-card-text>
          „{{ current.title || current.originalFileName }}" wird
          <strong>endgültig</strong> gelöscht — es gibt keinen Papierkorb.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDelete = false">Abbrechen</v-btn>
          <v-btn color="error" depressed @click="confirmDelete = false">
            Endgültig löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import MediaImage from "@/components/Media/MediaImage.vue";
import MediaDetailPanel from "@/components/Media/MediaDetailPanel.vue";
import SearchBar from "@/components/commons/SearchBar.vue";

export default {
  name: "MediaMobilePrototypeA",
  components: { MediaImage, MediaDetailPanel, SearchBar },
  props: {
    // The MediaLibrary instance: its state and methods, read as they are.
    lib: { type: Object, required: true },
  },
  data() {
    return { currentId: null, editing: false, confirmDelete: false };
  },
  computed: {
    current() {
      return this.lib.items.find((item) => item.id === this.currentId) || null;
    },
    filterSections() {
      const sections = [
        {
          key: "kind",
          label: "Typ",
          multiple: false,
          segmented: true,
          empty: "all",
          selected: this.lib.filters.kind || "all",
          options: [
            { value: "all", label: "Alle" },
            { value: "image", label: "Bilder" },
            { value: "document", label: "Dokumente" },
          ],
        },
        {
          key: "visibility",
          label: "Sichtbarkeit",
          multiple: false,
          selected: this.lib.filters.visibility,
          options: [
            { value: "public", label: "öffentlich", icon: "mdi-earth" },
            { value: "intern", label: "intern", icon: "mdi-lock-outline" },
          ],
        },
      ];
      if (this.lib.knownTags.length > 0) {
        sections.push({
          key: "tag",
          label: "Tags",
          multiple: false,
          selected: this.lib.filters.tag,
          options: this.lib.knownTags.map((tag) => ({
            value: tag,
            label: tag,
            icon: "mdi-tag-outline",
          })),
        });
      }
      return sections;
    },
  },
  methods: {
    onFilter(key, value) {
      if (key === "kind") this.lib.setKind(value === "all" ? null : value);
      if (key === "visibility") this.lib.setVisibility(value);
      if (key === "tag") {
        this.lib.filters.tag = value;
        this.lib.page = 1;
        this.lib.fetchMedia();
      }
    },
    onPick(event) {
      this.lib.enqueueFiles([...event.target.files]);
      event.target.value = "";
    },
    open(item) {
      this.currentId = item.id;
    },
    close() {
      this.currentId = null;
      this.editing = false;
    },
    onDeleted() {
      this.close();
      this.lib.onMediaDeleted();
    },
  },
};
</script>

<style scoped>
.mproto-a {
  padding-bottom: 48px;
}

.mproto-a__upload {
  margin-top: 4px;
}

.mproto-a__upload-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.mproto-a__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mproto-a__tile {
  overflow: hidden;
  border-radius: 8px !important;
}

.mproto-a__thumb {
  position: relative;
  aspect-ratio: 1;
}

.mproto-a__badge {
  position: absolute;
  top: 6px;
  left: 6px;
}

.mproto-a__name {
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
}

.mproto-a__view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mproto-a__stage {
  flex: 1;
  min-height: 0;
  background: rgba(0, 0, 0, 0.04);
}

.mproto-a__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 8px 16px 24px;
}
</style>

<style>
/* PROTOTYPE: the edit view comes from the large view, so the panel's own image
   would only repeat it. */
.mproto-edit > .v-image,
.mproto-edit > .v-sheet:first-child {
  display: none;
}
</style>

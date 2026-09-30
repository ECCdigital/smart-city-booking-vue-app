<template>
  <!-- PROTOTYPE (ECCdigital/tickets#58), variant C "Lightbox": a type switch
       on top, a tight photo-app grid, a floating upload button that asks for
       the visibility after picking, the large view as a dark lightbox that
       swipes from image to image. -->
  <div class="mproto-c">
    <v-btn-toggle
      :value="lib.filters.kind || 'all'"
      mandatory
      color="primary"
      class="mproto-c__kind"
      @change="(value) => lib.setKind(value === 'all' ? null : value)"
    >
      <v-btn value="all">Alle</v-btn>
      <v-btn value="image">Bilder</v-btn>
      <v-btn value="document">Dokumente</v-btn>
    </v-btn-toggle>

    <SearchBar
      :value="lib.filters.q"
      :fields="$t('media.search')"
      :filters="filterSections"
      @input="lib.onSearch"
      @filter="onFilter"
    />

    <v-skeleton-loader
      v-if="lib.loading && lib.items.length === 0"
      type="image@2"
    />
    <div v-else-if="lib.items.length > 0" class="mproto-c__grid">
      <button
        v-for="(item, index) in lib.items"
        :key="item.id"
        type="button"
        class="mproto-c__tile"
        @click="currentIndex = index"
      >
        <div class="mproto-c__thumb">
          <MediaImage
            :media="item"
            :scope="lib.scope"
            size="sm"
            lazy-size="thumb"
            height="100%"
            icon-size="48"
          />
          <span v-if="item.visibility === 'intern'" class="mproto-c__intern">
            <v-icon x-small dark>mdi-lock-outline</v-icon>
          </span>
        </div>
        <div class="mproto-c__name text-truncate">
          {{ item.title || item.originalFileName }}
        </div>
      </button>
    </div>
    <div v-else class="pa-8 text-center text--secondary font-italic">
      Keine Medien für diesen Filter.
    </div>

    <v-pagination
      v-if="lib.pageCount > 1"
      v-model="lib.page"
      :length="lib.pageCount"
      total-visible="5"
      class="mt-3"
    />

    <!-- Floating upload button -->
    <v-btn
      v-if="lib.allowCreate"
      fixed
      bottom
      right
      x-large
      rounded
      color="primary"
      class="mproto-c__fab"
      @click="$refs.fileInput.click()"
    >
      <v-progress-circular
        v-if="activeUploads.length > 0"
        indeterminate
        size="20"
        width="2"
        class="mr-2"
      />
      <v-icon v-else left>mdi-plus</v-icon>
      {{
        activeUploads.length > 0
          ? `${activeUploads.length} wird hochgeladen`
          : "Dateien hochladen"
      }}
    </v-btn>
    <input
      ref="fileInput"
      type="file"
      multiple
      hidden
      accept="image/*,application/pdf"
      @change="onPick"
    />

    <!-- After picking: where do the files go? -->
    <v-dialog v-model="askVisibility" max-width="400" content-class="media-dialog">
      <v-card>
        <v-card-title>
          {{ pending.length }}
          {{ pending.length === 1 ? "Datei" : "Dateien" }} hochladen
        </v-card-title>
        <v-card-text>
          <v-radio-group v-model="lib.uploadVisibility" hide-details class="mt-0">
            <v-radio value="public" label="öffentlich — für alle sichtbar" />
            <v-radio value="intern" label="intern — nur angemeldete Nutzer" />
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="askVisibility = false">Abbrechen</v-btn>
          <v-btn color="primary" depressed @click="startUpload">
            Hochladen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- The large view: a dark lightbox -->
    <v-dialog
      :value="!!current"
      fullscreen
      transition="fade-transition"
      content-class="media-dialog"
      @input="(open) => !open && close()"
    >
      <div
        v-if="current"
        class="mproto-c__lightbox"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <div class="mproto-c__top">
          <v-btn icon dark aria-label="Schließen" @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <span>{{ currentIndex + 1 }} / {{ lib.items.length }}</span>
          <span style="width: 36px" />
        </div>
        <div class="mproto-c__stage">
          <MediaImage
            :key="current.id"
            :media="current"
            :scope="lib.scope"
            size="md"
            lazy-size="sm"
            height="100%"
            contain
            icon-size="96"
          />
          <v-btn
            icon
            dark
            class="mproto-c__nav mproto-c__nav--prev"
            aria-label="Voriges Bild"
            @click="step(-1)"
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <v-btn
            icon
            dark
            class="mproto-c__nav mproto-c__nav--next"
            aria-label="Nächstes Bild"
            @click="step(1)"
          >
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
        <div class="mproto-c__caption">
          <div class="text-subtitle-1 text-break font-weight-medium">
            {{ current.title || current.originalFileName }}
          </div>
          <div class="mproto-c__muted">
            {{ lib.formatBytes(current.size) }} ·
            {{ lib.formatDate(current.createdAt) }} ·
            {{ current.visibility === "public" ? "öffentlich" : "intern" }}
          </div>
        </div>
        <div class="mproto-c__actions">
          <v-btn x-large depressed color="white" light @click="editing = true">
            <v-icon left>mdi-pencil-outline</v-icon>
            Bearbeiten
          </v-btn>
          <v-btn x-large outlined dark color="red lighten-2" @click="confirmDelete = true">
            <v-icon left>mdi-delete-outline</v-icon>
            Löschen
          </v-btn>
        </div>
      </div>
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
        <v-toolbar flat dense>
          <v-btn icon aria-label="Zurück" @click="editing = false">
            <v-icon>mdi-close</v-icon>
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
  name: "MediaMobilePrototypeC",
  components: { MediaImage, MediaDetailPanel, SearchBar },
  props: {
    // The MediaLibrary instance: its state and methods, read as they are.
    lib: { type: Object, required: true },
  },
  data() {
    return {
      currentIndex: -1,
      editing: false,
      confirmDelete: false,
      askVisibility: false,
      pending: [],
      touchX: null,
    };
  },
  computed: {
    current() {
      return this.lib.items[this.currentIndex] || null;
    },
    activeUploads() {
      return this.lib.uploadQueue.filter((entry) => entry.status !== "done");
    },
    filterSections() {
      const sections = [
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
      if (key === "visibility") this.lib.setVisibility(value);
      if (key === "tag") {
        this.lib.filters.tag = value;
        this.lib.page = 1;
        this.lib.fetchMedia();
      }
    },
    onPick(event) {
      this.pending = [...event.target.files];
      event.target.value = "";
      if (this.pending.length > 0) this.askVisibility = true;
    },
    startUpload() {
      this.askVisibility = false;
      this.lib.enqueueFiles(this.pending);
      this.pending = [];
    },
    step(delta) {
      const count = this.lib.items.length;
      this.currentIndex = (this.currentIndex + delta + count) % count;
    },
    onTouchStart(event) {
      this.touchX = event.changedTouches[0].clientX;
    },
    onTouchEnd(event) {
      if (this.touchX === null) return;
      const delta = event.changedTouches[0].clientX - this.touchX;
      this.touchX = null;
      if (Math.abs(delta) > 50) this.step(delta < 0 ? 1 : -1);
    },
    close() {
      this.currentIndex = -1;
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
.mproto-c {
  padding-bottom: 96px;
}

.mproto-c__kind {
  display: flex;
  width: 100%;
  margin-bottom: 12px;
}

.mproto-c__kind .v-btn {
  flex: 1;
}

.mproto-c__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.mproto-c__tile {
  display: block;
  min-width: 0;
  padding: 0 0 8px;
  border: 0;
  background: none;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.mproto-c__thumb {
  position: relative;
  aspect-ratio: 1;
}

.mproto-c__intern {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  padding: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
}

.mproto-c__name {
  padding: 4px 8px 0;
  font-size: 12px;
}

.mproto-c__fab {
  margin-bottom: 36px;
}

.mproto-c__lightbox {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111;
  color: #fff;
}

.mproto-c__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 0;
  font-size: 14px;
}

.mproto-c__stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.mproto-c__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.35);
}

.mproto-c__nav--prev {
  left: 4px;
}

.mproto-c__nav--next {
  right: 4px;
}

.mproto-c__caption {
  padding: 12px 16px 4px;
}

.mproto-c__muted {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
}

.mproto-c__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px calc(40px + env(safe-area-inset-bottom));
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

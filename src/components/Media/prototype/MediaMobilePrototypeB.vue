<template>
  <!-- PROTOTYPE (ECCdigital/tickets#58), variant B "Daumenzone": filters as a
       swipeable chip row, the upload button fixed at the bottom in thumb reach
       with a sheet offering Galerie/Kamera/Datei, the large view as a bottom
       sheet that grows into the edit form. -->
  <div class="mproto-b">
    <SearchBar
      :value="lib.filters.q"
      :fields="$t('media.search')"
      @input="lib.onSearch"
    />

    <div class="mproto-b__chips">
      <v-chip
        v-for="option in kindChips"
        :key="option.text"
        :input-value="lib.filters.kind === option.value"
        filter
        outlined
        active-class="primary--text"
        @click="lib.setKind(option.value)"
      >
        {{ option.text }}
      </v-chip>
      <span class="mproto-b__sep" />
      <v-chip
        v-for="option in visibilityChips"
        :key="option.value"
        :input-value="lib.filters.visibility === option.value"
        filter
        outlined
        active-class="primary--text"
        @click="
          lib.setVisibility(
            lib.filters.visibility === option.value ? null : option.value
          )
        "
      >
        {{ option.text }}
      </v-chip>
      <template v-if="lib.knownTags.length > 0">
        <span class="mproto-b__sep" />
        <v-chip
          v-for="tag in lib.knownTags"
          :key="tag"
          :input-value="lib.filters.tag === tag"
          filter
          outlined
          active-class="primary--text"
          @click="lib.toggleTag(tag)"
        >
          <v-icon small left>mdi-tag-outline</v-icon>
          {{ tag }}
        </v-chip>
      </template>
    </div>

    <v-skeleton-loader
      v-if="lib.loading && lib.items.length === 0"
      type="image@2"
    />
    <div v-else-if="lib.items.length > 0" class="mproto-b__grid">
      <button
        v-for="item in lib.items"
        :key="item.id"
        type="button"
        class="mproto-b__tile"
        @click="currentId = item.id"
      >
        <div class="mproto-b__thumb">
          <MediaImage
            :media="item"
            :scope="lib.scope"
            size="sm"
            lazy-size="thumb"
            height="100%"
            icon-size="48"
          />
          <v-icon
            v-if="item.visibility === 'intern'"
            small
            class="mproto-b__lock"
          >
            mdi-lock-outline
          </v-icon>
        </div>
        <div class="mproto-b__name text-truncate">
          {{ item.title || item.originalFileName }}
        </div>
        <div class="mproto-b__size">{{ lib.formatBytes(item.size) }}</div>
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

    <!-- Upload bar, fixed in thumb reach -->
    <div v-if="lib.allowCreate" class="mproto-b__bar">
      <div v-if="activeUploads.length > 0" class="mproto-b__progress">
        <span class="text-truncate">
          {{ activeUploads[0].file.name }} · {{ activeUploads[0].message }}
        </span>
        <v-progress-linear
          :value="activeUploads[0].progress"
          height="4"
          rounded
        />
      </div>
      <v-btn
        block
        x-large
        depressed
        color="primary"
        @click="uploadSheet = true"
      >
        <v-icon left>mdi-cloud-upload-outline</v-icon>
        Dateien hochladen
      </v-btn>
    </div>

    <v-bottom-sheet v-model="uploadSheet" content-class="media-dialog">
      <v-card class="mproto-b__sheet">
        <div class="mproto-b__grip" />
        <v-card-title class="pt-2">Dateien hochladen</v-card-title>
        <v-list>
          <v-list-item @click="pick('gallery')">
            <v-list-item-icon>
              <v-icon>mdi-image-multiple-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Aus der Galerie wählen</v-list-item-title>
          </v-list-item>
          <v-list-item @click="pick('camera')">
            <v-list-item-icon><v-icon>mdi-camera-outline</v-icon></v-list-item-icon>
            <v-list-item-title>Foto aufnehmen</v-list-item-title>
          </v-list-item>
          <v-list-item @click="pick('file')">
            <v-list-item-icon>
              <v-icon>mdi-file-pdf-box</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Datei wählen (PDF)</v-list-item-title>
          </v-list-item>
        </v-list>
        <v-divider />
        <div class="d-flex align-center justify-space-between px-4 py-3">
          <span class="text--secondary">Sichtbarkeit</span>
          <v-btn-toggle
            v-model="lib.uploadVisibility"
            mandatory
            dense
            color="primary"
          >
            <v-btn value="public">öffentlich</v-btn>
            <v-btn value="intern">intern</v-btn>
          </v-btn-toggle>
        </div>
        <div class="px-4 pb-4 caption text--secondary">
          {{ lib.allowedTypesLabel }} bis 15 MB · PDF bis 50 MB
        </div>
      </v-card>
    </v-bottom-sheet>
    <input
      ref="galleryInput"
      type="file"
      multiple
      hidden
      accept="image/*"
      @change="onPick"
    />
    <input
      ref="cameraInput"
      type="file"
      hidden
      accept="image/*"
      capture="environment"
      @change="onPick"
    />
    <input
      ref="fileInput"
      type="file"
      multiple
      hidden
      accept="application/pdf"
      @change="onPick"
    />

    <!-- The large view: a sheet from below, grows into the edit form -->
    <v-bottom-sheet
      :value="!!current"
      scrollable
      :fullscreen="editing"
      content-class="media-dialog"
      @input="(open) => !open && close()"
    >
      <v-card v-if="current" class="mproto-b__sheet">
        <div class="mproto-b__grip" />
        <template v-if="!editing">
          <div class="mproto-b__stage">
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
              {{ lib.formatBytes(current.size) }} ·
              {{ lib.formatDate(current.createdAt) }} ·
              {{ current.visibility === "public" ? "öffentlich" : "intern" }}
            </div>
          </v-card-text>
          <div class="mproto-b__actions">
            <v-btn x-large depressed color="primary" @click="editing = true">
              <v-icon left>mdi-pencil-outline</v-icon>
              Bearbeiten
            </v-btn>
            <v-btn
              x-large
              depressed
              color="error"
              outlined
              @click="confirmDelete = true"
            >
              <v-icon left>mdi-delete-outline</v-icon>
              Löschen
            </v-btn>
          </div>
        </template>
        <template v-else>
          <v-toolbar flat dense class="flex-grow-0">
            <v-btn icon aria-label="Zurück" @click="editing = false">
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
            <v-toolbar-title>Bearbeiten</v-toolbar-title>
          </v-toolbar>
          <v-card-text class="pa-0">
            <MediaDetailPanel
              class="mproto-edit"
              :media="current"
              :scope="lib.scope"
              @updated="lib.onMediaUpdated"
              @deleted="onDeleted"
            />
          </v-card-text>
        </template>
      </v-card>
    </v-bottom-sheet>

    <!-- PROTOTYPE: deletion is stubbed, nothing is deleted -->
    <v-bottom-sheet v-model="confirmDelete" content-class="media-dialog">
      <v-card v-if="current" class="mproto-b__sheet pb-4">
        <v-card-title>Endgültig löschen?</v-card-title>
        <v-card-text>
          „{{ current.title || current.originalFileName }}" wird
          <strong>endgültig</strong> gelöscht — es gibt keinen Papierkorb.
        </v-card-text>
        <div class="mproto-b__actions">
          <v-btn x-large text @click="confirmDelete = false">Abbrechen</v-btn>
          <v-btn x-large depressed color="error" @click="confirmDelete = false">
            Löschen
          </v-btn>
        </div>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script>
import MediaImage from "@/components/Media/MediaImage.vue";
import MediaDetailPanel from "@/components/Media/MediaDetailPanel.vue";
import SearchBar from "@/components/commons/SearchBar.vue";

export default {
  name: "MediaMobilePrototypeB",
  components: { MediaImage, MediaDetailPanel, SearchBar },
  props: {
    // The MediaLibrary instance: its state and methods, read as they are.
    lib: { type: Object, required: true },
  },
  data() {
    return {
      currentId: null,
      editing: false,
      confirmDelete: false,
      uploadSheet: false,
      kindChips: [
        { text: "Alle", value: null },
        { text: "Bilder", value: "image" },
        { text: "Dokumente", value: "document" },
      ],
      visibilityChips: [
        { text: "öffentlich", value: "public" },
        { text: "intern", value: "intern" },
      ],
    };
  },
  computed: {
    current() {
      return this.lib.items.find((item) => item.id === this.currentId) || null;
    },
    activeUploads() {
      return this.lib.uploadQueue.filter((entry) => entry.status !== "done");
    },
  },
  methods: {
    pick(source) {
      this.uploadSheet = false;
      const ref = {
        gallery: "galleryInput",
        camera: "cameraInput",
        file: "fileInput",
      }[source];
      this.$refs[ref].click();
    },
    onPick(event) {
      this.lib.enqueueFiles([...event.target.files]);
      event.target.value = "";
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
.mproto-b {
  padding-bottom: 120px;
}

.mproto-b__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  margin: 0 -12px 12px;
  padding: 2px 12px 6px;
  scrollbar-width: none;
}

.mproto-b__chips .v-chip {
  flex: none;
}

.mproto-b__sep {
  flex: none;
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.12);
}

.mproto-b__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 10px;
}

.mproto-b__tile {
  display: block;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.mproto-b__thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
}

.mproto-b__lock {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.mproto-b__name {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
}

.mproto-b__size {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.mproto-b__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.12);
}

.mproto-b__progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 12px;
}

.mproto-b__sheet {
  border-radius: 16px 16px 0 0 !important;
}

.mproto-b__grip {
  width: 40px;
  height: 4px;
  margin: 8px auto 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.2);
  flex: none;
}

.mproto-b__stage {
  height: 42vh;
  margin: 4px 16px 0;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}

.mproto-b__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
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

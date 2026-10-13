<template>
  <SubSection
    class="mt-7"
    title="Schrift"
    icon="mdi-format-font"
    description="Die Schrift des Portals auf allen Seiten. Jede Kachel zeigt die Schrift selbst."
    no-margin
  >
    <div class="portal-font__grid" role="radiogroup" aria-label="Schrift">
      <!-- Tiles rather than buttons: the own font carries the link
           „ändern“, and a link may not sit inside a button. -->
      <div
        v-for="preset in presets"
        :key="preset.key"
        data-test="font-tile"
        role="radio"
        tabindex="0"
        :aria-checked="String(preset.checked)"
        class="portal-font__tile"
        :class="{ 'portal-font__tile--on': preset.checked }"
        @click="choose(preset.font)"
        @keydown.enter.prevent="choose(preset.font)"
        @keydown.space.prevent="choose(preset.font)"
      >
        <div class="portal-font__aa" :style="{ fontFamily: preset.family }">
          Aa
        </div>
        <div class="portal-font__name">{{ preset.name }}</div>
        <div class="portal-font__sample" :style="{ fontFamily: preset.family }">
          {{ sample }}
        </div>
        <div class="portal-font__meta">{{ preset.meta }}</div>
        <v-icon
          v-if="preset.checked"
          class="portal-font__check"
          color="primary"
        >
          mdi-check-circle
        </v-icon>
      </div>

      <div
        data-test="font-tile"
        role="radio"
        tabindex="0"
        :aria-checked="String(isMedia)"
        class="portal-font__tile"
        :class="{
          'portal-font__tile--on': isMedia,
          'portal-font__tile--empty': !ownFont,
        }"
        @click="chooseOwn"
        @keydown.enter.self.prevent="chooseOwn"
        @keydown.space.self.prevent="chooseOwn"
      >
        <template v-if="ownFont">
          <div class="portal-font__aa" :style="{ fontFamily: ownFamily }">
            Aa
          </div>
          <div class="portal-font__name">{{ ownName }}</div>
          <div class="portal-font__sample" :style="{ fontFamily: ownFamily }">
            {{ sample }}
          </div>
          <div class="portal-font__meta">
            {{ ownMeta }} ·
            <a href="#" data-test="font-change" @click.stop.prevent="openPicker"
              >ändern</a
            >
          </div>
        </template>
        <template v-else>
          <v-icon large class="mb-1">mdi-upload</v-icon>
          <div class="portal-font__name">Eigene Schrift</div>
          <div class="portal-font__meta">
            woff2 aus der Mediathek wählen oder hochladen
          </div>
        </template>
        <v-icon v-if="isMedia" class="portal-font__check" color="primary">
          mdi-check-circle
        </v-icon>
      </div>
    </div>

    <v-alert
      v-if="savedNote"
      data-test="font-saved"
      type="success"
      text
      dense
      class="text-body-2 mt-3 mb-0"
    >
      {{ savedText }}
    </v-alert>

    <div v-if="isMedia" class="mt-3">
      <v-alert
        v-for="hint in hints"
        :key="hint"
        data-test="font-hint"
        type="warning"
        text
        dense
        class="text-body-2 mb-1"
      >
        {{ hint }}
      </v-alert>
      <div data-test="font-license">
        <v-checkbox
          :input-value="licenseConfirmed"
          :error-messages="licenseError ? [licenseRequired] : []"
          class="mt-1"
          @change="setLicense"
        >
          <template #label>
            <span class="text-body-2">{{ licenseText }}</span>
          </template>
        </v-checkbox>
      </div>
    </div>

    <MediaPickerDialog
      v-model="pickerOpen"
      :scope="mediaScope"
      kind="font"
      public-only
      :public-only-reason="publicOnlyReason"
      :allow-external="false"
      :exclude-ids="ownMediaId ? [ownMediaId] : []"
      title="Eigene Schrift wählen"
      @select="onPick"
    />
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import MediaPickerDialog from "@/components/Media/MediaPickerDialog.vue";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import FormatService from "@/services/FormatService";
import { mediaReferenceOf } from "@/utils/mediaReference";
import {
  CURATED_FONTS,
  FONT_SIZE_HINT_BYTES,
  FONT_SOURCE,
  fontDefaultWeight,
  fontLicenseConfirmed,
  SYSTEM_FONT_STACK,
  previewFontFamily,
  previewFontUrl,
} from "@/utils/instanceFonts";

// The font is served to every visitor of the portal, so it may only ever be a
// public medium — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Die Schrift wird öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

const WEIGHT_NAMES = Object.freeze({
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
});

// The storefront measures its fallback against the default instance; at
// another weight than 400 it fits the text set at 400 less well.
const DEFAULT_WEIGHT = 400;

function sizeHint(size) {
  return `Die Datei hat ${FormatService.bytes(size)}. Ab ${FormatService.bytes(
    FONT_SIZE_HINT_BYTES
  )} kommt die Schrift bei langsamem Netz öfter zu spät, dann bleibt beim ersten Besuch die Ersatzschrift. Eine verkleinerte Datei, etwa nur mit lateinischen Zeichen, hilft.`;
}

function weightHint(weight) {
  const name = WEIGHT_NAMES[weight] ? ` (${WEIGHT_NAMES[weight]})` : "";
  return `Die Grundeinstellung dieser Variable Font ist das Gewicht ${weight}${name}, nicht ${DEFAULT_WEIGHT}. Die Ersatzschrift beim Laden passt dann schlechter, Absätze können kürzer oder länger umbrechen.`;
}

const LICENSE_TEXT =
  "Wir haben eine Lizenz, die die Schrift als Webfont auf unserer Website erlaubt.";
const LICENSE_REQUIRED = "Ohne Bestätigung nicht speicherbar";

// Where the backend refuses an own font without the tick.
const LICENSE_FIELD = "branding.font.license";

const SAVED_TEXT =
  "Die Schrift ist gespeichert. Das Portal zeigt sie ab dem nächsten Aufruf einer Seite, wer es gerade offen hat, erst nach dem Neuladen.";

const SAMPLE_TEXT =
  "Räume, Sportplätze und Lastenräder buchen – ab 12,50 € je Stunde.";

/**
 * The section „Schrift“ of the Portal tab: the system font, the fonts of the
 * curated list and an own woff2 of the instance library, each a tile that
 * shows the font itself. Like every section it gets the branding and changes
 * it only through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalFont",
  components: { SubSection, MediaPickerDialog },
  props: {
    branding: { type: Object, required: true },
  },
  data() {
    return {
      sample: SAMPLE_TEXT,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
      pickerOpen: false,
      // The own font last chosen, licence included: the tile keeps it while
      // another tile is chosen, and choosing it again brings it back as it was.
      ownFont: null,
      // The medium behind `ownFont` and what its file tells.
      ownMedia: null,
      ownFamily: SYSTEM_FONT_STACK,
      // Null while unknown: a static font, or a browser that cannot unpack
      // the woff2 (`fontDefaultWeight`).
      ownDefaultWeight: null,
      licenseText: LICENSE_TEXT,
      licenseRequired: LICENSE_REQUIRED,
      licenseError: false,
      // Whether the font changed since the last save, and whether the note
      // after a save that changed it stands.
      fontChanged: false,
      savedNote: false,
      savedText: SAVED_TEXT,
    };
  },
  computed: {
    font() {
      return this.branding.font || null;
    },
    isMedia() {
      return this.font?.source === FONT_SOURCE.MEDIA;
    },
    ownMediaId() {
      return this.ownFont?.reference?.mediaId || null;
    },
    ownName() {
      return (
        this.ownMedia?.title ||
        this.ownMedia?.originalFileName ||
        "Eigene Schrift"
      );
    },
    licenseConfirmed() {
      return fontLicenseConfirmed(this.font);
    },
    hints() {
      const hints = [];
      if (this.ownMedia?.size >= FONT_SIZE_HINT_BYTES) {
        hints.push(sizeHint(this.ownMedia.size));
      }
      const weight = this.ownDefaultWeight;
      if (weight !== null && weight !== DEFAULT_WEIGHT) {
        hints.push(weightHint(weight));
      }
      return hints;
    },
    /**
     * The system font and the fonts of the list. The preview files load with
     * the first render of this section, so only the Portal tab fetches them.
     */
    presets() {
      const system = {
        key: "system",
        name: "Systemschrift",
        family: SYSTEM_FONT_STACK,
        meta: "Standard · lädt nichts nach",
        font: null,
        checked: !this.font,
      };
      const curated = CURATED_FONTS.map(({ id, name, kind }) => ({
        key: id,
        name,
        family: previewFontFamily(`scb-font-${id}`, previewFontUrl(id)),
        meta: kind,
        font: { source: FONT_SOURCE.CURATED, id },
        checked:
          this.font?.source === FONT_SOURCE.CURATED && this.font.id === id,
      }));
      return [system, ...curated];
    },
    ownMeta() {
      return this.ownMedia
        ? `Eigene Schrift · ${FormatService.bytes(this.ownMedia.size)}`
        : "Eigene Schrift";
    },
  },
  watch: {
    font: {
      immediate: true,
      handler(font) {
        if (font?.source === FONT_SOURCE.MEDIA) {
          this.ownFont = font;
        }
      },
    },
    ownMediaId: {
      immediate: true,
      handler(mediaId) {
        this.loadOwnMedia(mediaId);
      },
    },
  },
  // The tab sits in a keep-alive: the note belongs to the save just made.
  deactivated() {
    this.savedNote = false;
  },
  methods: {
    choose(font) {
      this.licenseError = false;
      this.fontChanged = true;
      this.savedNote = false;
      this.$emit("patch", { font });
    },
    // The tick alone; person and moment are the backend's (`brandingForSave`).
    setLicense(confirmed) {
      this.choose({ ...this.font, license: confirmed ? { confirmed } : null });
    },
    /** An own font saves only with its licence confirmed (story 35). */
    validate() {
      this.licenseError = this.isMedia && !this.licenseConfirmed;
      return !this.licenseError;
    },
    /**
     * The tab is saved (`notifySaved` of the view). A changed font reaches
     * open pages only with their next load: the note says so.
     */
    onSaved() {
      this.savedNote = this.fontChanged;
      this.fontChanged = false;
    },
    resetValidation() {
      this.licenseError = false;
    },
    showApiErrors(details) {
      this.licenseError = (details || []).some(
        (detail) => detail?.field === LICENSE_FIELD
      );
    },
    chooseOwn() {
      if (this.ownFont) {
        this.choose(this.ownFont);
      } else {
        this.openPicker();
      }
    },
    openPicker() {
      this.pickerOpen = true;
    },
    // A new file needs its own confirmation of the licence (map #510, story
    // 35), so the font starts without one.
    onPick([media]) {
      if (!media) return;
      this.ownMedia = media;
      this.choose({
        source: FONT_SOURCE.MEDIA,
        reference: mediaReferenceOf(media.id),
        license: null,
      });
    },
    /**
     * The medium of the own font and its file: the name and size for the
     * tile, the face for its preview.
     */
    async loadOwnMedia(mediaId) {
      this.ownDefaultWeight = null;
      if (!mediaId) {
        this.ownMedia = null;
        this.ownFamily = SYSTEM_FONT_STACK;
        return;
      }
      const media =
        this.ownMedia?.id === mediaId
          ? this.ownMedia
          : await MediaResolveService.resolve(this.mediaScope, mediaId);
      if (mediaId !== this.ownMediaId) return;
      this.ownMedia = media;

      try {
        const response = await ApiMediaService.getMediaFileBlob(
          this.mediaScope,
          mediaId
        );
        const bytes = await response.data.arrayBuffer();
        if (mediaId !== this.ownMediaId) return;
        // The face gets a copy: the reader below still needs the bytes.
        this.ownFamily = previewFontFamily(
          `scb-font-media-${mediaId}`,
          bytes.slice(0)
        );
        const weight = await fontDefaultWeight(bytes);
        if (mediaId !== this.ownMediaId) return;
        this.ownDefaultWeight = weight;
      } catch (error) {
        // Without its file the tile shows the system font; the name stays.
        console.error(error);
      }
    },
  },
};
</script>

<style scoped>
/* The tiles stand for the portal, not for this app: like the previews of the
   colours they keep their own light surface in both themes. */
.portal-font__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--scb-space-3);
}

.portal-font__tile {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 150px;
  padding: var(--scb-space-3) 14px;
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: var(--scb-radius-surface);
  background: #ffffff;
  color: rgba(0, 0, 0, 0.87);
  cursor: pointer;
}

.portal-font__tile:hover,
.portal-font__tile:focus-visible {
  border-color: rgba(0, 0, 0, 0.35);
}

.portal-font__tile--on {
  padding: 11px 13px;
  border: 2px solid var(--v-primary-base);
}

/* The own tile before a font is chosen: an invitation, not a sample. */
.portal-font__tile--empty {
  align-items: center;
  justify-content: center;
  text-align: center;
  border-style: dashed;
}

.portal-font__aa {
  font-size: 34px;
  line-height: 1.1;
}

.portal-font__name {
  margin-top: 2px;
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
}

.portal-font__sample {
  flex-grow: 1;
  margin-top: 6px;
  font-size: var(--scb-font-size-sm);
  line-height: 1.35;
}

.portal-font__meta {
  margin-top: 6px;
  font-size: var(--scb-font-size-caption);
  color: rgba(0, 0, 0, 0.6);
}

.portal-font__tile .portal-font__check {
  position: absolute;
  top: var(--scb-space-2);
  right: var(--scb-space-2);
}
</style>

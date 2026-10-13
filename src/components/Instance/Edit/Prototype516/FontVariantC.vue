<template>
  <!-- PROTOTYPE (ECCdigital/tickets#516) Variante C: links nur die Namen,
       rechts eine kleine Storefront in Theme-Farben und gewählter Schrift,
       schon vor dem Speichern. Upload direkt im Formular. -->
  <div class="font-c">
    <div class="font-c__list">
      <v-radio-group
        :value="radioValue"
        class="mt-0"
        hide-details
        @change="onRadio"
      >
        <v-radio value="system" label="Systemschrift (Standard)" />
        <div class="font-c__group">Freie Schriften</div>
        <v-radio
          v-for="f in curated"
          :key="f.id"
          :value="f.id"
          :label="f.name"
        />
        <div class="font-c__group">Eigene Schrift</div>
        <v-radio value="media" label="Eigene Datei (woff2)" />
      </v-radio-group>

      <div v-if="radioValue === 'media'" class="font-c__own">
        <template v-if="media">
          <div class="d-flex align-center">
            <v-icon small class="mr-2">mdi-file-outline</v-icon>
            <div class="flex-grow-1 text-truncate text-body-2">
              {{ media.fileName }}
              <span class="text--secondary">· {{ media.sizeKB }} KB</span>
            </div>
            <v-btn x-small text color="primary" @click="picker = true">
              Mediathek
            </v-btn>
          </div>
          <v-alert
            v-for="w in warnings"
            :key="w"
            type="warning"
            text
            dense
            class="text-caption mt-2 mb-0"
          >
            {{ w }}
          </v-alert>
        </template>
        <template v-else>
          <v-checkbox v-model="license" class="mt-0" hide-details>
            <template #label>
              <span class="text-caption">
                Wir haben eine Lizenz für die Nutzung als Webfont.
              </span>
            </template>
          </v-checkbox>
          <div
            class="font-c__drop mt-2"
            :class="{ 'font-c__drop--off': !license }"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <div class="text-caption mb-1">woff2 bis 500 KB hierher ziehen</div>
            <v-btn
              x-small
              color="primary"
              :disabled="!license"
              :loading="uploading"
              @click="$refs.file.click()"
            >
              Datei wählen
            </v-btn>
            <input
              ref="file"
              type="file"
              accept=".woff2,font/woff2"
              hidden
              @change="onFile"
            />
          </div>
          <div class="text-caption mt-1">
            oder
            <a href="#" @click.prevent="picker = true">aus der Mediathek</a>
          </div>
          <div v-if="error" class="text-caption error--text mt-1">
            {{ error }}
          </div>
        </template>
      </div>
    </div>

    <div class="font-c__preview">
      <div class="d-flex align-center mb-2">
        <span class="text-caption text--secondary">
          Vorschau · {{ label }}
          <template v-if="dirty"> · noch nicht gespeichert</template>
        </span>
        <v-spacer />
        <v-btn-toggle v-model="mode" mandatory dense>
          <v-btn x-small value="light">Hell</v-btn>
          <v-btn x-small value="dark">Dunkel</v-btn>
        </v-btn-toggle>
      </div>

      <div
        class="font-c__site"
        :class="`font-c__site--${mode}`"
        :style="{ fontFamily: family }"
      >
        <div class="font-c__header" :style="{ background: primary }">
          <span class="font-c__logo" :style="{ color: onPrimary }">
            {{ portalName || "Portal" }}
          </span>
          <span class="font-c__nav" :style="{ color: onPrimary }">
            Angebote · Meine Buchungen · Anmelden
          </span>
        </div>
        <div class="font-c__body">
          <div class="font-c__h1">Räume und Plätze in Ihrer Stadt</div>
          <div class="font-c__lead">
            Finden Sie freie Termine und buchen Sie direkt online.
          </div>
          <div class="font-c__card">
            <div class="font-c__img" />
            <div class="font-c__card-body">
              <span class="font-c__badge" :style="{ background: secondary }">
                Sport
              </span>
              <div class="font-c__title">Sporthalle Nord, Halle 2</div>
              <div class="font-c__text">
                Dreifeldhalle mit Tribüne, barrierefrei. Größe 45 × 27 m, für
                bis zu 120 Personen.
              </div>
              <div class="d-flex align-center mt-2">
                <span class="font-c__price">ab 12,50 € / Std.</span>
                <v-spacer />
                <span
                  class="font-c__btn"
                  :style="{ background: primary, color: onPrimary }"
                >
                  Jetzt buchen
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <FontPickerDialog
      v-model="picker"
      :selected-id="media && media.id"
      license-in-upload
      @select="onPickMedia"
    />
  </div>
</template>

<script>
import FontPickerDialog from "./FontPickerDialog.vue";
import {
  CURATED_FONTS,
  familyFor,
  fontLabel,
  isDirty,
  mediaById,
  referenceOf,
  setDraft,
  store,
  uploadFontFile,
  warningsFor,
} from "./fontPrototype";

function onColor(hex) {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || "");
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#111" : "#fff";
}

export default {
  name: "FontVariantC",
  components: { FontPickerDialog },
  props: {
    colors: { type: Object, default: () => ({}) },
    portalName: { type: String, default: "" },
  },
  data() {
    return {
      picker: false,
      license: false,
      uploading: false,
      error: null,
      mode: "light",
      mediaRadio: false,
    };
  },
  computed: {
    draft() {
      return store.draft;
    },
    curated() {
      return CURATED_FONTS;
    },
    radioValue() {
      if (this.mediaRadio || this.draft?.source === "media") return "media";
      return this.draft?.id || "system";
    },
    media() {
      return this.draft?.source === "media"
        ? mediaById(this.draft.reference.mediaId)
        : null;
    },
    warnings() {
      return warningsFor(this.media);
    },
    family() {
      return familyFor(this.draft);
    },
    label() {
      return fontLabel(this.draft);
    },
    dirty() {
      return isDirty();
    },
    primary() {
      return this.colors.primary || "#1565c0";
    },
    secondary() {
      return this.colors.secondary || "#ef6c00";
    },
    onPrimary() {
      return onColor(this.primary);
    },
  },
  methods: {
    onRadio(value) {
      this.mediaRadio = value === "media";
      if (value === "media") return;
      setDraft(value === "system" ? null : { source: "curated", id: value });
    },
    onPickMedia(m) {
      this.mediaRadio = true;
      setDraft({ source: "media", reference: referenceOf(m) });
    },
    onDrop(event) {
      if (this.license) this.upload(event.dataTransfer.files[0]);
    },
    onFile(event) {
      this.upload(event.target.files[0]);
      event.target.value = "";
    },
    async upload(file) {
      if (!file) return;
      this.uploading = true;
      this.error = null;
      try {
        const m = await uploadFontFile(file);
        this.$set(store.licenseConfirmed, m.id, new Date().toISOString());
        this.onPickMedia(m);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.uploading = false;
      }
    },
  },
};
</script>

<style scoped>
.font-c {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 2fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 960px) {
  .font-c {
    grid-template-columns: 1fr;
  }
}
.font-c__group {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  margin: 10px 0 4px;
}
.font-c__own {
  margin: 8px 0 0 32px;
}
.font-c__drop {
  border: 2px dashed rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}
.font-c__drop--off {
  opacity: 0.55;
}
.font-c__preview {
  position: sticky;
  top: 80px;
}
.font-c__site {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
.font-c__site--light {
  background: #f9fafb;
  color: #111827;
}
.font-c__site--dark {
  background: #111827;
  color: #f3f4f6;
}
.font-c__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}
.font-c__logo {
  font-weight: 700;
  font-size: 16px;
}
.font-c__nav {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.9;
}
.font-c__body {
  padding: 18px 16px 20px;
}
.font-c__h1 {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}
.font-c__lead {
  font-size: 14px;
  margin-top: 4px;
  opacity: 0.8;
}
.font-c__card {
  display: flex;
  margin-top: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.font-c__site--dark .font-c__card {
  background: #1f2937;
  color: #f3f4f6;
}
.font-c__img {
  width: 110px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
}
.font-c__card-body {
  padding: 12px 14px;
  flex-grow: 1;
}
.font-c__badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  color: #fff;
}
.font-c__title {
  font-weight: 600;
  font-size: 16px;
  margin-top: 6px;
}
.font-c__text {
  font-size: 13px;
  line-height: 1.45;
  margin-top: 2px;
  opacity: 0.85;
}
.font-c__price {
  font-weight: 600;
  font-size: 14px;
}
.font-c__btn {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
}
</style>

<template>
  <!-- PROTOTYPE (ECCdigital/tickets#516) Variante B: Schriftmuster als
       Kacheln. Jede Kachel zeigt die Schrift selbst. Die eigene Schrift ist
       die letzte Kachel. Lizenz im Formular, nicht beim Upload. -->
  <div>
    <div class="font-b__grid">
      <button
        type="button"
        class="font-b__tile"
        :class="{ 'font-b__tile--on': !draft }"
        @click="choose(null)"
      >
        <div class="font-b__aa" :style="{ fontFamily: systemStack }">Aa</div>
        <div class="font-b__name">Systemschrift</div>
        <div class="font-b__line" :style="{ fontFamily: systemStack }">
          {{ sample }}
        </div>
        <div class="font-b__meta">Standard · lädt nichts nach</div>
        <v-icon v-if="!draft" class="font-b__check" color="primary">
          mdi-check-circle
        </v-icon>
      </button>

      <button
        v-for="f in curated"
        :key="f.id"
        type="button"
        class="font-b__tile"
        :class="{ 'font-b__tile--on': isCurated(f.id) }"
        @click="choose({ source: 'curated', id: f.id })"
      >
        <div class="font-b__aa" :style="{ fontFamily: f.family }">Aa</div>
        <div class="font-b__name">{{ f.name }}</div>
        <div class="font-b__line" :style="{ fontFamily: f.family }">
          {{ sample }}
        </div>
        <div class="font-b__meta">{{ f.kind }}</div>
        <v-icon v-if="isCurated(f.id)" class="font-b__check" color="primary">
          mdi-check-circle
        </v-icon>
      </button>

      <button
        type="button"
        class="font-b__tile font-b__tile--own"
        :class="{ 'font-b__tile--on': isMedia }"
        @click="onOwnTile"
      >
        <template v-if="lastMedia">
          <div class="font-b__aa" :style="{ fontFamily: mediaFamily }">Aa</div>
          <div class="font-b__name">{{ lastMedia.name }}</div>
          <div class="font-b__line" :style="{ fontFamily: mediaFamily }">
            {{ sample }}
          </div>
          <div class="font-b__meta">
            Eigene Schrift · {{ lastMedia.sizeKB }} KB ·
            <a href="#" @click.stop.prevent="picker = true">ändern</a>
          </div>
        </template>
        <template v-else>
          <v-icon large class="mb-1">mdi-upload</v-icon>
          <div class="font-b__name">Eigene Schrift</div>
          <div class="font-b__meta">
            woff2 aus der Mediathek hochladen oder wählen
          </div>
        </template>
        <v-icon v-if="isMedia" class="font-b__check" color="primary">
          mdi-check-circle
        </v-icon>
      </button>
    </div>

    <div v-if="isMedia" class="mt-3">
      <v-alert
        v-for="w in warnings"
        :key="w"
        type="warning"
        text
        dense
        class="text-body-2 mb-1"
      >
        {{ w }}
      </v-alert>
      <v-checkbox
        :input-value="licenseOk"
        class="mt-1"
        :error-messages="licenseOk ? [] : ['Ohne Bestätigung nicht speicherbar']"
        @change="setLicense"
      >
        <template #label>
          <span class="text-body-2">
            Wir haben eine Lizenz, die „{{ lastMedia && lastMedia.name }}“ als
            Webfont auf unserer Website erlaubt.
          </span>
        </template>
      </v-checkbox>
    </div>

    <FontPickerDialog
      v-model="picker"
      :selected-id="lastMedia && lastMedia.id"
      :license-in-upload="false"
      @select="onPickMedia"
    />
  </div>
</template>

<script>
import FontPickerDialog from "./FontPickerDialog.vue";
import {
  CURATED_FONTS,
  SAMPLE_TEXT,
  SYSTEM_STACK,
  curatedFamily,
  mediaById,
  mediaFamily,
  referenceOf,
  setDraft,
  store,
  warningsFor,
} from "./fontPrototype";

export default {
  name: "FontVariantB",
  components: { FontPickerDialog },
  data() {
    return {
      picker: false,
      sample: SAMPLE_TEXT,
      systemStack: SYSTEM_STACK,
      lastMediaId: null,
    };
  },
  computed: {
    draft() {
      return store.draft;
    },
    curated() {
      return CURATED_FONTS.map((f) => ({ ...f, family: curatedFamily(f.id) }));
    },
    isMedia() {
      return this.draft?.source === "media";
    },
    lastMedia() {
      const id = this.isMedia
        ? this.draft.reference.mediaId
        : this.lastMediaId || store.saved?.reference?.mediaId;
      return id ? mediaById(id) : null;
    },
    mediaFamily() {
      return this.lastMedia ? mediaFamily(this.lastMedia) : SYSTEM_STACK;
    },
    warnings() {
      return warningsFor(this.lastMedia);
    },
    licenseOk() {
      return !!(this.lastMedia && store.licenseConfirmed[this.lastMedia.id]);
    },
  },
  methods: {
    isCurated(id) {
      return this.draft?.source === "curated" && this.draft.id === id;
    },
    choose(font) {
      setDraft(font);
    },
    onOwnTile() {
      if (this.lastMedia) {
        setDraft({ source: "media", reference: referenceOf(this.lastMedia) });
      } else {
        this.picker = true;
      }
    },
    onPickMedia(m) {
      this.lastMediaId = m.id;
      setDraft({ source: "media", reference: referenceOf(m) });
    },
    setLicense(on) {
      if (!this.lastMedia) return;
      if (on) {
        this.$set(
          store.licenseConfirmed,
          this.lastMedia.id,
          new Date().toISOString()
        );
      } else {
        this.$delete(store.licenseConfirmed, this.lastMedia.id);
      }
    },
  },
};
</script>

<style scoped>
.font-b__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.font-b__tile {
  position: relative;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
  cursor: pointer;
  min-height: 150px;
  display: flex;
  flex-direction: column;
}
.font-b__tile:hover {
  border-color: rgba(0, 0, 0, 0.35);
}
.font-b__tile--on {
  border: 2px solid var(--v-primary-base);
  padding: 11px 13px;
}
.font-b__tile--own {
  border-style: dashed;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.font-b__tile--own.font-b__tile--on {
  border-style: solid;
  align-items: stretch;
  text-align: left;
}
.font-b__aa {
  font-size: 34px;
  line-height: 1.1;
}
.font-b__name {
  font-weight: 600;
  font-size: 14px;
  margin-top: 2px;
}
.font-b__line {
  font-size: 13px;
  line-height: 1.35;
  margin-top: 6px;
  flex-grow: 1;
}
.font-b__meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.55);
  margin-top: 6px;
}
.font-b__check {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>

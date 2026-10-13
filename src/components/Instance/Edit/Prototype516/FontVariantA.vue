<template>
  <!-- PROTOTYPE (ECCdigital/tickets#516) Variante A: ein Auswahlfeld wie die
       übrigen Felder des Tabs. Jede Schrift steht in sich selbst, darunter
       eine Zeile Vorschau. Lizenz beim Upload. -->
  <div>
    <v-row>
      <v-col cols="12" md="6">
        <v-select
          :value="selectValue"
          :items="items"
          label="Schrift"
          background-color="accent"
          filled
          dense
          hint="Gilt für alle Texte des Portals."
          persistent-hint
          :menu-props="{ maxHeight: 420 }"
          @change="onSelect"
        >
          <template #selection="{ item }">
            <span :style="{ fontFamily: item.family }">{{ item.text }}</span>
          </template>
          <template #item="{ item }">
            <v-list-item-content>
              <v-list-item-title :style="{ fontFamily: item.family }">
                {{ item.text }}
              </v-list-item-title>
              <v-list-item-subtitle v-if="item.sub">
                {{ item.sub }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </v-select>
      </v-col>

      <v-col v-if="isMedia" cols="12" md="6">
        <div class="text-caption text--secondary mb-1">Schriftdatei</div>
        <v-sheet color="accent" rounded class="d-flex align-center pa-2">
          <div
            class="mr-3 text-h5"
            style="width: 56px; text-align: center"
            :style="{ fontFamily: family }"
          >
            Aa
          </div>
          <div class="flex-grow-1 text-truncate">
            <template v-if="media">
              <div class="text-truncate font-weight-medium">
                {{ media.name }}
              </div>
              <div class="text-caption text--secondary">
                {{ media.fileName }} · {{ media.sizeKB }} KB
              </div>
            </template>
            <span v-else class="text--secondary font-italic">
              Keine Datei ausgewählt
            </span>
          </div>
          <v-btn small text color="primary" @click="picker = true">
            <v-icon small left>mdi-format-font</v-icon>
            Auswählen
          </v-btn>
        </v-sheet>
        <div class="text-caption text--secondary mt-1">
          woff2, eine Datei, am besten eine Variable Font, bis 500 KB.
        </div>
      </v-col>
    </v-row>

    <v-row v-if="warnings.length" class="mt-0">
      <v-col cols="12" class="pt-0">
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
      </v-col>
    </v-row>

    <v-row class="mt-0">
      <v-col cols="12" class="pt-0">
        <div class="font-a__sample" :style="{ fontFamily: family }">
          <span class="font-a__sample-label">Vorschau</span>
          <span style="font-weight: 400">{{ sample }}</span>
          <span style="font-weight: 600">Jetzt buchen</span>
          <span style="font-weight: 700">Sporthalle Nord</span>
        </div>
      </v-col>
    </v-row>

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
  SAMPLE_TEXT,
  SYSTEM_STACK,
  curatedFamily,
  familyFor,
  mediaById,
  referenceOf,
  setDraft,
  store,
  warningsFor,
} from "./fontPrototype";

const MEDIA_ITEM = "__media__";

export default {
  name: "FontVariantA",
  components: { FontPickerDialog },
  data() {
    return { picker: false, sample: SAMPLE_TEXT, mediaChosen: false };
  },
  computed: {
    draft() {
      return store.draft;
    },
    isMedia() {
      return this.mediaChosen || this.draft?.source === "media";
    },
    media() {
      return this.draft?.source === "media"
        ? mediaById(this.draft.reference.mediaId)
        : null;
    },
    family() {
      return familyFor(this.draft);
    },
    warnings() {
      return warningsFor(this.media);
    },
    selectValue() {
      if (this.isMedia) return MEDIA_ITEM;
      return this.draft?.id || null;
    },
    items() {
      return [
        {
          text: "Systemschrift",
          sub: "Standard, wie heute",
          value: null,
          family: SYSTEM_STACK,
        },
        { divider: true },
        { header: "Freie Schriften, vom Portal ausgeliefert" },
        ...CURATED_FONTS.map((f) => ({
          text: f.name,
          sub: f.kind,
          value: f.id,
          family: curatedFamily(f.id),
        })),
        { divider: true },
        {
          text: "Eigene Schrift aus der Mediathek …",
          sub: "woff2-Datei mit Web-Lizenz",
          value: MEDIA_ITEM,
          family: SYSTEM_STACK,
        },
      ];
    },
  },
  methods: {
    onSelect(value) {
      if (value === MEDIA_ITEM) {
        this.mediaChosen = true;
        if (!this.media) this.picker = true;
        return;
      }
      this.mediaChosen = false;
      setDraft(value ? { source: "curated", id: value } : null);
    },
    onPickMedia(m) {
      this.mediaChosen = true;
      setDraft({ source: "media", reference: referenceOf(m) });
    },
  },
};
</script>

<style scoped>
.font-a__sample {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 16px;
  padding: 12px 16px;
  border-radius: var(--scb-radius-surface, 6px);
  border: 1px solid var(--scb-surface-border, rgba(0, 0, 0, 0.12));
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
  font-size: 16px;
}
.font-a__sample-label {
  font-family: var(--scb-font-family, inherit);
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  width: 100%;
}
</style>

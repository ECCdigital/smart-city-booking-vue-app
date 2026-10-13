<template>
  <!-- PROTOTYPE (ECCdigital/tickets#516): the media picker with the new kind
       `font`, as a stub. Nothing reaches the backend. -->
  <v-dialog
    :value="value"
    max-width="760"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center flex-nowrap">
        <v-icon color="primary" class="mr-2">mdi-format-font</v-icon>
        <span class="text-h6">Schrift aus der Mediathek wählen</span>
        <v-spacer />
        <v-btn icon @click="$emit('input', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-tabs v-model="tab" class="flex-grow-0">
        <v-tab href="#library">Mediathek</v-tab>
        <v-tab href="#upload">Upload</v-tab>
      </v-tabs>
      <v-divider />

      <v-card-text class="pa-4" style="min-height: 380px">
        <template v-if="tab === 'library'">
          <div class="d-flex align-center mb-3" style="gap: 8px">
            <v-chip small label>Nur Schriften</v-chip>
            <v-chip small label color="warning" outlined>
              <v-icon x-small left>mdi-lock-outline</v-icon>
              intern = nicht wählbar
            </v-chip>
          </div>

          <v-list two-line class="pa-0">
            <v-list-item
              v-for="m in media"
              :key="m.id"
              :disabled="m.visibility === 'intern'"
              :class="{ 'font-picker__row--picked': m.id === selectedId }"
              class="font-picker__row"
              @click="pick(m)"
            >
              <div
                class="font-picker__specimen mr-4"
                :style="{ fontFamily: family(m) }"
              >
                Aa
              </div>
              <v-list-item-content>
                <v-list-item-title :style="{ fontFamily: family(m) }">
                  {{ sample }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <v-icon
                    v-if="m.visibility === 'intern'"
                    x-small
                    color="warning"
                  >
                    mdi-lock-outline
                  </v-icon>
                  {{ m.fileName }} · {{ m.sizeKB }} KB
                  <template v-if="m.variable"> · Variable Font</template>
                  <template v-if="m.visibility === 'intern'">
                    · intern, Schriften werden öffentlich ausgeliefert
                  </template>
                </v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action v-if="m.id === selectedId">
                <v-icon color="primary">mdi-check-circle</v-icon>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </template>

        <template v-else>
          <v-alert v-if="error" type="error" dense outlined class="mb-3">
            {{ error }}
          </v-alert>

          <v-checkbox
            v-if="licenseInUpload"
            v-model="license"
            class="mt-0 mb-2"
            hide-details
          >
            <template #label>
              <span class="text-body-2">
                Wir haben eine Lizenz, die diese Schrift für die Nutzung als
                Webfont auf unserer Website erlaubt.
              </span>
            </template>
          </v-checkbox>

          <div
            class="font-picker__drop pa-8 text-center"
            :class="{ 'font-picker__drop--off': !canUpload }"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <v-icon large class="mb-2">mdi-cloud-upload-outline</v-icon>
            <div class="text-body-1 mb-1">Schriftdatei hierher ziehen</div>
            <div class="text-caption text--secondary mb-3">
              Eine woff2-Datei, am besten eine Variable Font, bis
              {{ maxKB }} KB.
            </div>
            <v-btn
              color="primary"
              :disabled="!canUpload"
              :loading="uploading"
              @click="$refs.file.click()"
            >
              <v-icon small left>mdi-upload</v-icon>
              Datei wählen
            </v-btn>
            <input
              ref="file"
              type="file"
              accept=".woff2,font/woff2"
              hidden
              @change="onFile"
            />
            <div v-if="!canUpload" class="text-caption mt-3">
              Bitte zuerst die Lizenz bestätigen.
            </div>
          </div>
          <div class="text-caption text--secondary mt-3">
            TTF oder OTF? Mit einem Konverter in woff2 umwandeln. Schriften
            werden immer öffentlich ausgeliefert.
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  MAX_KB,
  SAMPLE_TEXT,
  mediaFamily,
  store,
  uploadFontFile,
} from "./fontPrototype";

export default {
  name: "FontPickerDialog",
  props: {
    value: { type: Boolean, default: false },
    selectedId: { type: String, default: null },
    // Where the licence is confirmed: here, before the upload, or in the form.
    licenseInUpload: { type: Boolean, default: true },
  },
  data() {
    return {
      tab: "library",
      license: false,
      error: null,
      uploading: false,
      sample: SAMPLE_TEXT,
      maxKB: MAX_KB,
    };
  },
  computed: {
    media() {
      return store.media;
    },
    canUpload() {
      return !this.licenseInUpload || this.license;
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.error = null;
        this.license = false;
      }
    },
  },
  methods: {
    family(m) {
      return mediaFamily(m);
    },
    pick(m) {
      if (m.visibility === "intern") return;
      this.$emit("select", m);
      this.$emit("input", false);
    },
    onDrop(event) {
      if (!this.canUpload) return;
      this.upload(event.dataTransfer.files[0]);
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
        if (this.licenseInUpload) {
          this.$set(store.licenseConfirmed, m.id, new Date().toISOString());
        }
        this.pick(m);
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
.font-picker__row {
  border-radius: 6px;
}
.font-picker__row--picked {
  background: rgba(var(--v-primary-base-rgb, 25, 118, 210), 0.08);
}
.font-picker__specimen {
  font-size: 32px;
  width: 56px;
  text-align: center;
  line-height: 1;
}
.font-picker__drop {
  border: 2px dashed rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}
.font-picker__drop--off {
  opacity: 0.6;
}
</style>

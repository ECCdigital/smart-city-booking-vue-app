<template>
  <div>
    <v-list v-if="!isLoading">
      <template v-for="(url, i) in value">
        <v-list-item :key="url">
          <v-list-item-content>
            <v-list-item-title>
              {{ rewriteUrl(url) }}
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action title="Link öffnen...">
            <v-btn icon small @click="openLink(url)">
              <v-icon color="grey lighten-1">mdi-link</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action title="Entfernen">
            <v-btn icon small @click="remove(url)">
              <v-icon color="grey lighten-1">mdi-delete</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider :key="url" v-if="i < value.length - 1"></v-divider>
      </template>
    </v-list>

    <div
      class="font-italic text-center grey--text my-5"
      v-if="!value || value.length === 0"
    >
      Es sind keine Einträge vorhanden.
    </div>

    <div v-if="isLoading" class="font-italic text-center grey--text my-5">
      <v-progress-circular
        indeterminate
        size="20"
        class="mr-2"
      ></v-progress-circular>
      Dateien werden geladen...
    </div>

    <ChooseFile
      label="Datei"
      :tenant-id="tenant"
      :allowed-extensions="allowedExtensions"
      :images-only="imagesOnly"
      v-model="selectedUrl"
      @update="fetchFiles()"
      :forced-subdirectory="forcedSubdirectory"
    >
      <template v-slot:append>
        <v-btn
          small
          color="primary"
          @click="add(selectedUrl)"
          :disabled="!selectedUrl"
        >
          <v-icon left>mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </template>
    </ChooseFile>
  </div>
</template>

<script>
import ChooseFile from "@/components/Files/ChooseFile";
import ApiFileService from "@/services/api/ApiFileService";

export default {
  name: "FileTest",
  components: {
    ChooseFile,
  },
  data() {
    return {
      selectedUrl: null,
      items: [],
      files: [],
      isLoading: false,
    };
  },
  props: {
    tenant: {
      type: String,
      required: true,
    },
    value: {
      type: Array,
    },
    allowedExtensions: {
      type: String,
      default: undefined,
    },
    imagesOnly: {
      type: Boolean,
      default: false,
    },
    forcedSubdirectory: {
      type: String,
      default: "",
    },
  },
  async mounted() {
    await this.fetchFiles();
  },
  methods: {
    async fetchFiles() {
      try {
        this.isLoading = true;
        const response = await ApiFileService.getFiles(this.tenant);
        this.files = response.data;
      } finally {
        this.isLoading = false;
      }
    },
    add(url) {
      if (!!url && !this.value.includes(url)) {
        this.$emit("input", [...this.value, url]);
        this.selectedUrl = null;
      }
    },
    remove(url) {
      this.$emit(
        "input",
        this.value.filter((u) => u !== url)
      );
    },
    rewriteUrl(url) {
      return (
        this.files.find((f) => f.link === url)?.basename || "Extern: " + url
      );
    },
    openLink(url) {
      window.open(url, "_blank");
    },
  },
};
</script>

<style scoped></style>

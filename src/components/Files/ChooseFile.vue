<template>
  <div>
    <v-autocomplete
      v-if="showUrl === false"
      :loading="isFetching"
      item-value="link"
      item-text="filename"
      no-data-text="Keine Dateien vorhanden"
      hide-details
      :value="value"
      :items="files"
      :background-color="backgroundColor"
      :filled="filled"
      :label="label"
      @input="$emit('input', $event)"
    >
      <template v-slot:prepend-item>
        <v-list-item ripple @click="dialog = true">
          <v-list-item-action>
            <v-icon> mdi-upload </v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> Datei hochladen ... </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider class="mt-2"></v-divider>
      </template>
      <template v-slot:prepend>
        <v-btn small icon @click="showUrl = !showUrl" title="URL anzeigen">
          <v-icon> mdi-paperclip </v-icon>
        </v-btn>
      </template>
      <template v-slot:append-outer>
        <slot name="append"></slot>
      </template>
    </v-autocomplete>

    <v-text-field
      v-if="showUrl === true"
      hide-details
      placeholder="https://..."
      :value="value"
      :background-color="backgroundColor"
      :filled="filled"
      :label="label"
      @input="$emit('input', $event)"
    >
      <template v-slot:prepend v-if="!isExternalUrl">
        <v-btn small icon @click="showUrl = false" title="Datei anzeigen">
          <v-icon> mdi-link </v-icon>
        </v-btn>
      </template>
      <template v-slot:append-outer>
        <slot name="append"></slot>
      </template>
    </v-text-field>
    <v-dialog v-model="dialog" width="500" persistent>
      <v-card>
        <v-card-title class="text-h6 grey lighten-2">
          Datei hochladen
        </v-card-title>

        <v-card-text>
          <v-alert type="error" class="mt-5" outlined v-if="isUploadError">
            Fehler beim Hochladen der Datei
            <small>
              Leider konnte die Datei nicht hochgeladen werden. Bitte versuchen
              Sie es später erneut oder wenden Sie sich an Ihren Administrator.
            </small>
          </v-alert>
          <v-alert
            type="warning"
            class="mt-5"
            outlined
            v-if="!!uploadFile && validate() !== true"
          >
            {{ validate() }}
          </v-alert>
          <v-file-input
            hide-details
            name="file"
            v-model="uploadFile"
            :disabled="isLoading"
          ></v-file-input>
          <div v-if="showAllowedExtensions === true" class="mt-2">
            Erlaubte Dateiendungen: {{ allowedExtensions }}
          </div>

          <section v-if="allowProtected">
            <div class="caption mt-5">Wer darf diese Datei sehen?</div>
            <v-radio-group v-model="accessLevel">
              <v-radio label="Jeder" value="public"></v-radio>
              <v-radio
                label="Nur angemeldete Benutzer"
                value="protected"
              ></v-radio>
            </v-radio-group>
          </section>

          <div class="mt-3">
            <div class="text-center">
              <v-btn
                v-if="hideDetails === true"
                text
                small
                @click="hideDetails = false"
              >
                Weitere Details anzeigen
              </v-btn>
            </div>

            <section v-if="hideDetails === false">
              <v-text-field
                v-model="customDirectory"
                label="Unterverzeichnis"
                :disabled="isLoading"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-folder</v-icon>
                </template>
                <template v-slot:prepend-inner>
                  <div class="ml-2 mt-1">
                    {{ accessLevel === "public" ? "public" : "protected" }}/{{
                      forcedSubdirectory.length > 0
                        ? forcedSubdirectory + "/"
                        : ""
                    }}
                  </div>
                </template>
              </v-text-field>
            </section>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="primary" text @click="dialog = false">
            Abbrechen
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click="runUpload"
            :disabled="!allowUpload"
            :loading="isLoading"
          >
            Hochladen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import ApiFileService from "@/services/api/ApiFileService";

const defaultExtensions = process.env.VUE_APP_ALLOWED_EXT_DEFAULT;
const imageExtensions = process.env.VUE_APP_ALLOWED_EXT_IMAGES;

export default {
  name: "ChooseFile",
  components: {},
  data() {
    return {
      dialog: false,
      uploadFile: null,
      accessLevel: "public",
      customDirectory: "",
      isLoading: false,
      isFetching: false,
      isUploadError: false,
      files: [],
      showUrl: false,
      hideDetails: true,
    };
  },
  props: {
    tenantId: {
      type: String,
      required: true,
    },
    value: {
      type: String,
    },
    label: {
      type: String,
      default: undefined,
    },
    allowedExtensions: {
      type: String,
      default: defaultExtensions,
    },
    imagesOnly: {
      type: Boolean,
      default: false,
    },
    allowProtected: {
      type: Boolean,
      default: true,
    },
    showAllowedExtensions: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
      default: null,
    },
    filled: {
      type: Boolean,
      default: null,
    },
    forcedSubdirectory: {
      type: String,
      default: "",
    },
  },
  async mounted() {
    await this.fetchFiles();

    if (this.isExternalUrl) this.showUrl = true;
  },
  methods: {
    async fetchFiles() {
      try {
        this.isFetching = true;
        if (!this.tenantId) return [];

        const response = await ApiFileService.getFiles(
          this.tenantId,
          this.allowProtected
        );
        this.files = response.data.filter((file) => {
          const extension = file.filename.toLowerCase().split(".").pop();
          return this.extensionFilter.includes(extension);
        });

      } finally {
        this.isFetching = false;
      }
    },
    link(accessLevel, filename) {
      if (!filename) return undefined;
      return `${process.env.VUE_APP_SERVER_BASE_URL}/api/${this.tenantId}/files/get?name=/${accessLevel}/${filename}`;
    },
    async runUpload() {
      this.isLoading = true;

      try {
        if (this.uploadFile) {
          let path = [this.forcedSubdirectory, this.customDirectory]
            .filter(Boolean)
            .join("/");

          const formData = new FormData();
          formData.append("file", this.uploadFile);
          formData.append("accessLevel", this.accessLevel);
          formData.append("customDirectory", path);
          await ApiFileService.createFile(this.tenantId, formData);
          await this.fetchFiles();
          this.$emit(
            "input",
            this.link(this.accessLevel, `${path}/${this.uploadFile.name}`)
          );
          this.uploadFile = null;
          this.customDirectory = "";
          this.hideDetails = true;
          this.dialog = false;
          this.emitUpdate();
        }
      } catch (err) {
        this.isUploadError = true;
        console.log(err);
      } finally {
        this.isLoading = false;
      }
    },
    validate() {
      if (!this.uploadFile) {
        return "Bitte wählen Sie eine Datei aus";
      }

      const extension = this.uploadFile.name.toLowerCase().split(".").pop();
      if (!this.extensionFilter.includes(extension)) {
        return `Die Dateiendung "${extension}" ist nicht erlaubt`;
      }

      if (!!this.uploadFile && this.uploadFile.size > 10000000) {
        return "Die maximale Dateigröße beträgt 10 MB";
      }

      return true;
    },
    emitUpdate() {
      this.$emit("update");
    },
  },
  computed: {
    allowUpload() {
      return this.validate() === true;
    },
    isExternalUrl() {
      return (
        this.value &&
        !this.value.startsWith(process.env.VUE_APP_SERVER_BASE_URL)
      );
    },
    extensionFilter() {
      if (this.imagesOnly === true)
        return imageExtensions.toLowerCase().split(",");
      if (!this.allowedExtensions)
        return defaultExtensions.toLowerCase().split(",");
      return this.allowedExtensions.toLowerCase().split(",");
    },
  },
};
</script>

<style scoped></style>

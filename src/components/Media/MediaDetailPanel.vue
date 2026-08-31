<template>
  <v-card class="d-flex flex-column media-detail">
    <MediaImage
      :media="media"
      :scope="scope"
      size="md"
      height="220"
      :key="media.id"
    />
    <v-card-text>
      <div class="text-h6 text-break mb-2">{{ displayTitle }}</div>
      <div class="d-flex flex-wrap mb-3" style="gap: 6px">
        <v-chip
          small
          :color="media.visibility === 'public' ? 'success' : 'warning'"
          outlined
        >
          <v-icon left small>
            {{
              media.visibility === "public" ? "mdi-earth" : "mdi-lock-outline"
            }}
          </v-icon>
          {{ media.visibility === "public" ? "öffentlich" : "intern" }}
        </v-chip>
        <v-chip small outlined>{{ media.mimeType }}</v-chip>
        <v-chip v-for="tag in media.tags" :key="tag" small>
          <v-icon left small>mdi-tag-outline</v-icon>
          {{ tag }}
        </v-chip>
      </div>

      <div class="media-detail__facts mb-4">
        <div class="d-flex justify-space-between">
          <span class="text--secondary">Dateiname</span>
          <span class="text-break text-right">{{
            media.originalFileName
          }}</span>
        </div>
        <div class="d-flex justify-space-between">
          <span class="text--secondary">Größe</span>
          <span>{{ formatBytes(media.size) }}</span>
        </div>
        <div class="d-flex justify-space-between">
          <span class="text--secondary">Hochgeladen</span>
          <span>{{ formatDate(media.createdAt) }}</span>
        </div>
        <div v-if="media.uploadedBy" class="d-flex justify-space-between">
          <span class="text--secondary">Von</span>
          <span class="text-break text-right">{{ media.uploadedBy }}</span>
        </div>
      </div>

      <template v-if="media.variants && media.variants.length > 0">
        <div class="text-overline">Größenvarianten</div>
        <v-simple-table dense class="mb-4">
          <template v-slot:default>
            <thead>
              <tr>
                <th>Preset</th>
                <th>Maße</th>
                <th>Format</th>
                <th class="text-right">Größe</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="variant in media.variants" :key="variant.name">
                <td>{{ variant.name }}</td>
                <td>{{ variant.width }} × {{ variant.height }} px</td>
                <td>{{ variant.format }}</td>
                <td class="text-right">{{ formatBytes(variant.size) }}</td>
              </tr>
            </tbody>
          </template>
        </v-simple-table>
      </template>

      <div class="text-overline">Metadaten</div>
      <v-text-field
        v-model="form.title"
        label="Titel"
        dense
        outlined
        hide-details="auto"
        class="mb-3"
        :disabled="!allowUpdate"
      />
      <v-text-field
        v-model="form.altText"
        label="Alt-Text"
        dense
        outlined
        hide-details="auto"
        class="mb-3"
        :disabled="!allowUpdate"
      />
      <v-combobox
        v-model="form.tags"
        label="Tags"
        multiple
        small-chips
        deletable-chips
        dense
        outlined
        hide-details="auto"
        class="mb-3"
        :disabled="!allowUpdate"
      />
      <v-select
        v-model="form.visibility"
        :items="visibilityItems"
        label="Sichtbarkeit"
        dense
        outlined
        hide-details="auto"
        class="mb-3"
        :disabled="!allowUpdate"
      />
      <v-btn
        color="primary"
        small
        depressed
        :loading="saving"
        :disabled="!allowUpdate || !isDirty"
        @click="saveMetadata"
      >
        <v-icon left small>mdi-content-save-outline</v-icon>
        Speichern
      </v-btn>

      <div class="text-overline mt-4">Verwendung</div>
      <v-sheet outlined rounded class="pa-3">
        <div v-if="usageLoading" class="text--secondary">
          <v-progress-circular indeterminate size="16" width="2" class="mr-2" />
          Verwendung wird geprüft …
        </div>
        <div v-else-if="usageError" class="error--text d-flex align-center">
          <v-icon color="error" small class="mr-2"
            >mdi-alert-circle-outline</v-icon
          >
          Verwendung konnte nicht geladen werden.
        </div>
        <div
          v-else-if="usage.length === 0"
          class="success--text d-flex align-center"
        >
          <v-icon color="success" small class="mr-2"
            >mdi-check-circle-outline</v-icon
          >
          Wird nirgends verwendet.
        </div>
        <div v-else>
          <div
            v-for="(entry, index) in usage"
            :key="index"
            class="d-flex align-center py-1"
          >
            <v-icon small class="mr-2">{{ usageIcon(entry.type) }}</v-icon>
            <span class="mr-1 text--secondary"
              >{{ usageLabel(entry.type) }}:</span
            >
            <router-link
              v-if="entry.route"
              :to="entry.route"
              class="text-truncate"
            >
              {{ entry.title || entry.id }}
            </router-link>
            <span v-else class="text-truncate">{{
              entry.title || entry.id
            }}</span>
          </div>
        </div>
      </v-sheet>

      <div class="d-flex mt-4">
        <v-btn small text @click="copyUrl">
          <v-icon left small>mdi-link-variant</v-icon>
          URL kopieren
        </v-btn>
        <v-spacer />
        <v-btn
          small
          text
          color="error"
          :disabled="!allowDelete"
          @click="confirmDialog = true"
        >
          <v-icon left small>mdi-delete-outline</v-icon>
          Löschen
        </v-btn>
      </div>
    </v-card-text>

    <!-- Confirm deletion of an unused medium -->
    <v-dialog
      v-model="confirmDialog"
      max-width="480"
      content-class="media-dialog"
    >
      <v-card>
        <v-card-title>Endgültig löschen?</v-card-title>
        <v-card-text>
          „{{ displayTitle }}" wird <strong>endgültig</strong> gelöscht — es
          gibt keinen Papierkorb.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDialog = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            depressed
            :loading="deleting"
            @click="deleteMedia"
          >
            Endgültig löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Deletion blocked: the medium is still referenced (409) -->
    <v-dialog
      v-model="blockedDialog"
      max-width="520"
      content-class="media-dialog"
    >
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="mr-2">mdi-alert-outline</v-icon>
          Löschen nicht möglich
        </v-card-title>
        <v-card-text>
          <p>
            „{{ displayTitle }}" wird noch verwendet und kann deshalb nicht
            gelöscht werden. Entferne zuerst diese Verwendungen:
          </p>
          <v-sheet outlined rounded class="pa-3">
            <div
              v-for="(entry, index) in blockingUsage"
              :key="index"
              class="d-flex align-center py-1"
            >
              <v-icon small class="mr-2">{{ usageIcon(entry.type) }}</v-icon>
              <span class="mr-1 text--secondary"
                >{{ usageLabel(entry.type) }}:</span
              >
              <span class="text-truncate">{{ entry.title || entry.id }}</span>
            </div>
          </v-sheet>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" depressed @click="blockedDialog = false">
            Verstanden
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import { mapActions } from "vuex";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import MediaPermissionService from "@/services/permissions/MediaPermissionService";
import MediaImage from "@/components/Media/MediaImage.vue";
import FormatService from "@/services/FormatService";
import ToastService from "@/services/ToastService";

const BOOKABLE_EDIT_ROUTES = {
  room: "room-edit",
  resource: "resource-edit",
  ticket: "ticket-edit",
  "event-location": "location-edit",
};

const USAGE_PRESENTATION = {
  bookable: { icon: "mdi-cube-outline", label: "Buchungsobjekt" },
  event: { icon: "mdi-calendar", label: "Veranstaltung" },
  booking: { icon: "mdi-book-outline", label: "Buchung" },
  instance: { icon: "mdi-home-edit-outline", label: "Instanz" },
};

export default {
  name: "MediaDetailPanel",
  components: { MediaImage },
  props: {
    media: { type: Object, required: true },
    scope: { type: String, required: true },
  },
  data() {
    return {
      form: {
        title: "",
        altText: "",
        tags: [],
        visibility: "public",
      },
      visibilityItems: [
        { text: "öffentlich — für alle sichtbar", value: "public" },
        { text: "intern — nur angemeldete Nutzer", value: "intern" },
      ],
      usage: [],
      usageLoading: false,
      usageError: false,
      saving: false,
      deleting: false,
      confirmDialog: false,
      blockedDialog: false,
      blockingUsage: [],
    };
  },
  computed: {
    displayTitle() {
      return this.media.title || this.media.originalFileName;
    },
    allowUpdate() {
      return MediaPermissionService.allowUpdate(this.media, this.scope);
    },
    allowDelete() {
      return MediaPermissionService.allowDelete(this.media, this.scope);
    },
    isDirty() {
      return (
        this.form.title !== (this.media.title || "") ||
        this.form.altText !== (this.media.altText || "") ||
        this.form.visibility !== this.media.visibility ||
        JSON.stringify(this.form.tags) !== JSON.stringify(this.media.tags || [])
      );
    },
  },
  watch: {
    "media.id": {
      immediate: true,
      handler() {
        this.resetForm();
        this.fetchUsage();
      },
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    resetForm() {
      this.form = {
        title: this.media.title || "",
        altText: this.media.altText || "",
        tags: [...(this.media.tags || [])],
        visibility: this.media.visibility,
      };
    },
    formatBytes(bytes) {
      return FormatService.bytes(bytes);
    },
    formatDate(value) {
      return value ? FormatService.date(value, "medium") : "—";
    },
    usageIcon(type) {
      return USAGE_PRESENTATION[type]?.icon || "mdi-link-variant";
    },
    usageLabel(type) {
      return USAGE_PRESENTATION[type]?.label || type;
    },
    async fetchUsage() {
      this.usageLoading = true;
      this.usageError = false;
      this.usage = [];
      const mediaId = this.media.id;
      try {
        const response = await ApiMediaService.getMediaUsage(
          this.scope,
          mediaId
        );
        if (this.media.id !== mediaId) {
          return;
        }
        this.usage = await this.resolveUsageRoutes(response.data);
      } catch (error) {
        console.error(error);
        if (this.media.id === mediaId) {
          this.usageError = true;
        }
      } finally {
        if (this.media.id === mediaId) {
          this.usageLoading = false;
        }
      }
    },
    // A usage entry only names type and id; a bookable's edit route depends on
    // its bookableType, which takes one extra lookup per entry.
    async resolveUsageRoutes(entries) {
      return Promise.all(
        entries.map(async (entry) => {
          const route = await this.routeForUsage(entry);
          return { ...entry, route };
        })
      );
    },
    async routeForUsage(entry) {
      if (this.scope === MEDIA_SCOPE.INSTANCE) {
        return entry.type === "instance" ? { name: "instances" } : null;
      }
      switch (entry.type) {
        case "event":
          return { name: "event-edit", query: { id: entry.id } };
        case "booking":
          return { name: "booking-edit", params: { bookingId: entry.id } };
        case "instance":
          return MediaPermissionService.isInstanceOwner()
            ? { name: "instances" }
            : null;
        case "bookable":
          try {
            const response = await ApiBookablesService.getBookable(entry.id);
            const routeName = BOOKABLE_EDIT_ROUTES[response.data?.type];
            return routeName
              ? { name: routeName, query: { id: entry.id } }
              : null;
          } catch {
            return null;
          }
        default:
          return null;
      }
    },
    async saveMetadata() {
      this.saving = true;
      try {
        const response = await ApiMediaService.updateMedia(
          this.scope,
          this.media.id,
          {
            title: this.form.title,
            altText: this.form.altText,
            tags: this.form.tags,
            visibility: this.form.visibility,
          }
        );
        this.$emit("updated", response.data);
        this.addToast(
          ToastService.createToast("media.updateSuccess", "success")
        );
      } catch (error) {
        console.error(error);
        this.addToast(ToastService.createToast("media.updateError", "error"));
      } finally {
        this.saving = false;
      }
    },
    async deleteMedia() {
      this.deleting = true;
      try {
        await ApiMediaService.deleteMedia(this.scope, this.media.id);
        this.confirmDialog = false;
        this.$emit("deleted", this.media.id);
        this.addToast(
          ToastService.createToast("media.deleteSuccess", "success")
        );
      } catch (error) {
        this.confirmDialog = false;
        // 409 carries the usage proof as its body — the same list the usage
        // endpoint answers, rendered in the blocked dialog.
        if (error.response?.status === 409) {
          this.blockingUsage = Array.isArray(error.response.data)
            ? error.response.data
            : [];
          this.usage = await this.resolveUsageRoutes(this.blockingUsage);
          this.blockedDialog = true;
        } else {
          console.error(error);
          this.addToast(ToastService.createToast("media.deleteError", "error"));
        }
      } finally {
        this.deleting = false;
      }
    },
    async copyUrl() {
      const url = ApiMediaService.getAbsoluteMediaUrl(this.media);
      try {
        await navigator.clipboard.writeText(url);
        // A non-public medium copies fine, but the link only answers to a
        // login — the toast says so instead of promising a public URL.
        const toastKey =
          this.media.visibility === "public"
            ? "media.copySuccess"
            : "media.copySuccessIntern";
        this.addToast(ToastService.createToast(toastKey, "success"));
      } catch (error) {
        console.error(error);
      }
    },
  },
};
</script>

<style scoped>
.media-detail__facts {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

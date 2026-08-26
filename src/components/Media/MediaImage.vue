<template>
  <v-img
    v-if="objectUrl"
    :src="objectUrl"
    :height="height"
    :width="width"
    :contain="contain"
    :class="rounded ? 'rounded' : ''"
  />
  <v-sheet
    v-else
    :height="height"
    :width="width"
    color="accent"
    :class="[
      'd-flex',
      'align-center',
      'justify-center',
      rounded ? 'rounded' : '',
    ]"
  >
    <v-icon :size="iconSize" color="grey">{{ placeholderIcon }}</v-icon>
  </v-sheet>
</template>

<script>
import ApiMediaService from "@/services/api/ApiMediaService";

/**
 * Renders the file of a medium through the API client, so that `intern` media
 * load with credentials. Documents and failed loads fall back to an icon.
 */
export default {
  name: "MediaImage",
  props: {
    media: { type: Object, required: true },
    scope: { type: String, required: true },
    size: { type: String, default: "thumb" },
    height: { type: [Number, String], default: undefined },
    width: { type: [Number, String], default: undefined },
    contain: { type: Boolean, default: false },
    rounded: { type: Boolean, default: false },
    iconSize: { type: [Number, String], default: 32 },
  },
  data() {
    return {
      objectUrl: null,
    };
  },
  computed: {
    placeholderIcon() {
      if (this.media.kind === "document") {
        return this.media.mimeType === "application/pdf"
          ? "mdi-file-pdf-box"
          : "mdi-file-outline";
      }
      return "mdi-image-off-outline";
    },
  },
  watch: {
    "media.id": {
      immediate: true,
      handler() {
        this.load();
      },
    },
  },
  beforeDestroy() {
    this.revoke();
  },
  methods: {
    revoke() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
    },
    async load() {
      this.revoke();
      if (this.media.kind !== "image") {
        return;
      }
      const mediaId = this.media.id;
      try {
        const response = await ApiMediaService.getMediaFileBlob(
          this.scope,
          mediaId,
          this.size
        );
        // The selection may have moved on while the bytes were in flight.
        if (this.media.id !== mediaId) {
          return;
        }
        this.objectUrl = URL.createObjectURL(response.data);
      } catch (error) {
        console.error(error);
      }
    },
  },
};
</script>

<template>
  <v-img
    v-if="src"
    :src="src"
    :lazy-src="lazySrc"
    :height="height"
    :width="width"
    :aspect-ratio="aspectRatio"
    :contain="contain"
    :class="rounded ? 'rounded' : ''"
  >
    <slot></slot>
  </v-img>
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
 * Renders the file of a medium in a fixed preset (§4.11): public media come
 * straight from the binary route, so the browser caches them under the headers
 * of §4.6; `intern` media go through the API client, because a plain <img src>
 * would carry no credentials. Documents and failed loads fall back to an icon.
 */
export default {
  name: "MediaImage",
  props: {
    media: { type: Object, required: true },
    scope: { type: String, required: true },
    size: { type: String, default: "thumb" },
    // The preset shown while `size` is still loading — v-img's `lazy-src`.
    lazySize: { type: String, default: null },
    height: { type: [Number, String], default: undefined },
    width: { type: [Number, String], default: undefined },
    aspectRatio: { type: [Number, String], default: undefined },
    contain: { type: Boolean, default: false },
    rounded: { type: Boolean, default: false },
    iconSize: { type: [Number, String], default: 32 },
  },
  data() {
    return {
      objectUrl: null,
      lazyObjectUrl: null,
    };
  },
  computed: {
    isImage() {
      return this.media.kind === "image";
    },
    // Only `intern` media need the credentialed detour through the API client.
    servedDirectly() {
      return this.media.visibility === "public";
    },
    src() {
      if (!this.isImage) {
        return null;
      }
      return this.servedDirectly
        ? ApiMediaService.getMediaFileUrl(this.scope, this.media.id, this.size)
        : this.objectUrl;
    },
    lazySrc() {
      if (!this.isImage || !this.lazySize) {
        return undefined;
      }
      if (this.servedDirectly) {
        return ApiMediaService.getMediaFileUrl(
          this.scope,
          this.media.id,
          this.lazySize
        );
      }
      return this.lazyObjectUrl || undefined;
    },
    placeholderIcon() {
      if (this.media.kind === "document") {
        return this.media.mimeType === "application/pdf"
          ? "mdi-file-pdf-box"
          : "mdi-file-outline";
      }
      return "mdi-image-off-outline";
    },
    // Visibility decides how the bytes are fetched, so a medium that changes
    // it has to reload just like a different medium would.
    loadKey() {
      return `${this.media.id}:${this.media.visibility}:${this.size}:${this.lazySize}`;
    },
  },
  watch: {
    loadKey: {
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
      [this.objectUrl, this.lazyObjectUrl]
        .filter(Boolean)
        .forEach((url) => URL.revokeObjectURL(url));
      this.objectUrl = null;
      this.lazyObjectUrl = null;
    },
    async load() {
      this.revoke();
      if (!this.isImage || this.servedDirectly) {
        return;
      }
      const key = this.loadKey;
      try {
        const response = await ApiMediaService.getMediaFileBlob(
          this.scope,
          this.media.id,
          this.size
        );
        // The selection may have moved on while the bytes were in flight.
        if (this.loadKey !== key) {
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

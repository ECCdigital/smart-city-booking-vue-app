<template>
  <MediaImage
    v-if="media"
    :media="media"
    :scope="scope"
    :size="size"
    :lazy-size="lazySize"
    :height="height"
    :width="width"
    :aspect-ratio="aspectRatio"
    :contain="contain"
    :rounded="rounded"
  >
    <slot></slot>
  </MediaImage>

  <!-- An external or not-yet-imported address has no presets to choose from. -->
  <v-img
    v-else-if="externalUrl"
    :src="externalUrl"
    :lazy-src="externalUrl"
    :height="height"
    :width="width"
    :aspect-ratio="aspectRatio"
    :contain="contain"
    :class="rounded ? 'rounded' : ''"
  >
    <slot></slot>
  </v-img>

  <v-sheet
    v-else-if="!loading"
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
    <v-icon color="grey">mdi-image-off-outline</v-icon>
  </v-sheet>
</template>

<script>
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import MediaImage from "@/components/Media/MediaImage.vue";
import { displayMediaId, externalReferenceUrl } from "@/utils/mediaReference";

/**
 * Renders whatever a reference site holds: a medium of the library in the
 * requested presets, an external address as it stands, or a placeholder when
 * the site is empty. Legacy plain URLs read as external references, so the
 * component works on unmigrated entities too.
 */
export default {
  name: "MediaReferenceImage",
  components: { MediaImage },
  props: {
    reference: { type: [Object, String], default: null },
    scope: { type: String, default: MEDIA_SCOPE.TENANT },
    size: { type: String, default: "sm" },
    lazySize: { type: String, default: "thumb" },
    height: { type: [Number, String], default: undefined },
    width: { type: [Number, String], default: undefined },
    aspectRatio: { type: [Number, String], default: undefined },
    contain: { type: Boolean, default: false },
    rounded: { type: Boolean, default: false },
  },
  data() {
    return {
      media: null,
      loading: false,
    };
  },
  computed: {
    mediaId() {
      return displayMediaId(this.reference);
    },
    externalUrl() {
      return externalReferenceUrl(this.reference);
    },
  },
  watch: {
    mediaId: {
      immediate: true,
      handler() {
        this.resolve();
      },
    },
  },
  methods: {
    async resolve() {
      this.media = null;
      if (!this.mediaId) {
        return;
      }
      const mediaId = this.mediaId;
      this.loading = true;
      try {
        const media = await MediaResolveService.resolve(this.scope, mediaId);
        // The reference may have moved on while the metadata was in flight.
        if (this.mediaId === mediaId) {
          this.media = media;
        }
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

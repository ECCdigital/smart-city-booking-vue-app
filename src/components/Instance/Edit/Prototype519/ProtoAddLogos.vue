<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): Logos aus der Mediathek an die Liste
       der Footer-Logos anhängen, mehrere auf einmal. -->
  <span>
    <slot :open="open">
      <v-btn small outlined color="primary" @click="open">
        <v-icon small left>mdi-plus</v-icon>
        Logos hinzufügen
      </v-btn>
    </slot>
    <MediaPickerDialog
      v-model="pickerOpen"
      :scope="scope"
      kind="image"
      multiple
      public-only
      :public-only-reason="reason"
      :allow-external="false"
      :exclude-ids="excludeIds"
      title="Logos für den Fußbereich wählen"
      @select="onSelect"
    />
  </span>
</template>

<script>
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import MediaPickerDialog from "@/components/Media/MediaPickerDialog.vue";
import { mediaReferenceOf } from "@/utils/mediaReference";
import { newFooterLogo, store } from "./appearancePrototype";

export default {
  name: "ProtoAddLogos",
  components: { MediaPickerDialog },
  data() {
    return {
      pickerOpen: false,
      scope: MEDIA_SCOPE.INSTANCE,
      reason:
        "Die Logos im Fußbereich werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.",
    };
  },
  computed: {
    excludeIds() {
      return store.draft.footerLogos
        .map((logo) => logo.image && logo.image.mediaId)
        .filter(Boolean);
    },
  },
  methods: {
    open() {
      this.pickerOpen = true;
    },
    onSelect(selection) {
      (selection || []).forEach((media) => {
        MediaResolveService.prime(this.scope, media);
        store.draft.footerLogos.push(
          newFooterLogo(media, mediaReferenceOf(media.id))
        );
      });
      this.$emit("added", store.draft.footerLogos.length - 1);
    },
  },
};
</script>

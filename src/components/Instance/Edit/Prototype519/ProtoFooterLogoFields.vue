<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): die Felder eines Footer-Logos.
       `layout="row"` für eine Tabellenzeile, sonst untereinander. -->
  <div class="proto-fl-fields" :class="`proto-fl-fields--${layout}`">
    <div class="proto-fl-fields__size">
      <div class="text-caption text--secondary mb-1">Größe</div>
      <v-btn-toggle
        :value="logo.size"
        mandatory
        dense
        color="primary"
        @change="logo.size = $event"
      >
        <v-btn
          v-for="step in sizes"
          :key="step.value"
          :value="step.value"
          :title="step.text"
          small
        >
          {{ step.value }}
        </v-btn>
      </v-btn-toggle>
    </div>
    <v-text-field
      v-model="logo.link"
      class="proto-fl-fields__link"
      label="Link (optional)"
      placeholder="https://…"
      background-color="accent"
      filled
      dense
      hide-details
      clearable
    />
    <div class="proto-fl-fields__dark">
      <MediaReferenceField
        v-model="logo.imageDark"
        :scope="scope"
        label="Variante für den Dunkelmodus (optional)"
        public-only
        :allow-external="false"
        empty-label="Ohne: weiße Platte im Dunkelmodus"
      />
    </div>
  </div>
</template>

<script>
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import { FOOTER_LOGO_SIZES } from "./appearancePrototype";

export default {
  name: "ProtoFooterLogoFields",
  components: { MediaReferenceField },
  props: {
    logo: { type: Object, required: true },
    layout: { type: String, default: "stack" },
  },
  data() {
    return { sizes: FOOTER_LOGO_SIZES, scope: MEDIA_SCOPE.INSTANCE };
  },
};
</script>

<style scoped>
.proto-fl-fields {
  display: grid;
  gap: 12px;
}

.proto-fl-fields--row {
  grid-template-columns: auto minmax(160px, 1fr) minmax(220px, 1.4fr);
  align-items: end;
}
</style>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";

export default {
  name: "BookableEditAttachments",
  components: { MediaAttachmentList, BaseSection },
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    attachments: {
      get() {
        return this.model.attachments || [];
      },
      set(value) {
        this.$set(this.model, "attachments", value);
      },
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Anhänge" icon="mdi-paperclip" />

    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-paperclip</v-icon>
          <span class="text-h6 font-weight-bold">Anhänge verwalten</span>
        </div>
        <v-btn small color="primary" @click="$refs.list.add()">
          <v-icon left small>mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <MediaAttachmentList
          ref="list"
          v-model="attachments"
          :public-only="!!model.isPublic"
          public-only-reason="Dieses Buchungsobjekt ist öffentlich sichtbar — interne Medien können hier nicht gespeichert werden."
        />
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}
</style>

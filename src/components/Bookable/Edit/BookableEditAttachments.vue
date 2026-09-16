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

    <v-card class="mb-6 section-card" outlined>
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

<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <MediaReferenceList
            v-model="images"
            :cover-badge="false"
            :public-only="isPublic"
            public-only-reason="Diese Veranstaltung ist öffentlich sichtbar — interne Medien können hier nicht gespeichert werden."
            intro="Weitere Bilder der Veranstaltung. Das Titelbild wird im Schritt „Informationen“ gepflegt."
          />
        </v-container>
        <Pager :invalid="invalid" />
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapActions } from "vuex";
import { ValidationObserver } from "vee-validate";
import Pager from "@/components/Events/Form/Pager";
import MediaReferenceList from "@/components/Media/MediaReferenceList.vue";

export default {
  components: {
    MediaReferenceList,
    Pager,
    ValidationObserver,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
  },
  computed: {
    isPublic() {
      return Boolean(this.$store.state.events.form.isPublic);
    },
    // The image list holds media references (§4.8 of the media spec), so the
    // usage record finds them. Bare addresses from before the media import
    // still read as external references and keep their preview.
    images: {
      get() {
        return this.$store.state.events.form.images;
      },
      set(value) {
        this.updateValue({ parent: null, field: "images", value: value });
      },
    },
  },
};
</script>

<style scoped></style>

<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <v-container>
            <FileList
              v-model="images"
              :tenant="tenantId"
              images-only
              forced-subdirectory="events/images"
            ></FileList>
          </v-container>
        </v-container>
        <Pager :invalid="invalid" />
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import { ValidationObserver } from "vee-validate";
import Pager from "@/components/Events/Form/Pager";
import FileList from "@/components/Files/FileList.vue";

export default {
  components: {
    FileList,
    Pager,
    ValidationObserver,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
  },
  computed: {
    ...mapGetters({
      images: "events/images",
      tenantId: "tenants/currentTenantId",
    }),
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

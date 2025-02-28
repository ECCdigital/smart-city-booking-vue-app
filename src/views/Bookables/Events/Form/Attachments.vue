<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <FileList :tenant="tenantId" v-model="attachments" forced-subdirectory="events/attachments"></FileList>
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
    Pager,
    ValidationObserver,
    FileList,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
  },
  computed: {
    ...mapGetters({
      attachments: "events/attachments",
      tenantId: "tenants/currentTenantId",
    }),
    attachments: {
      get() {
        return this.$store.state.events.form.attachments;
      },
      set(value) {
        this.updateValue({ parent: null, field: "attachments", value: value });
      },
    },
  },
};
</script>

<style scoped></style>

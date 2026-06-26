<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";

export default {
  name: "BookableEditSettings",
  components: { CustomFieldList, BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: true,
    };
  },
  methods: {
    onFieldsChanged(fields) {
      this.$emit("update:bookable", {
        ...this.bookable,
        customFieldDefinitions: fields,
      });
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Einstellungen" icon="mdi-cog-outline" />
    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-form-textbox</v-icon>
          <span class="text-h6 font-weight-bold"
            >Benutzerdefinierte Felder</span
          >
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <CustomFieldList
          :fields="bookable.customFieldDefinitions || []"
          description="Zusätzliche Felder, die nur für dieses Buchungsobjekt gelten."
          hide-override
          @update:fields="onFieldsChanged"
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

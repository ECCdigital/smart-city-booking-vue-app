<template>
  <div>
    <v-alert
      :type="hasTemplate ? 'success' : 'warning'"
      dense
      text
      class="mb-3"
    >
      {{
        hasTemplate
          ? "E-Mail-Vorlage ist hinterlegt."
          : "Noch keine E-Mail-Vorlage hinterlegt."
      }}
    </v-alert>

    <v-btn color="primary" @click="dialogOpen = true">
      <v-icon left>mdi-pencil</v-icon>
      {{ hasTemplate ? "Vorlage bearbeiten" : "Vorlage anlegen" }}
    </v-btn>

    <MailTemplateDialog
      :open="dialogOpen"
      :mail-template="mailTemplate"
      @submit="onSubmit"
      @close="dialogOpen = false"
    />
  </div>
</template>

<script>
import MailTemplateDialog from "@/components/Tenant/MailTemplateDialog.vue";

export default {
  name: "MailTemplateStatus",
  components: { MailTemplateDialog },
  props: {
    mailTemplate: { type: String, default: "" },
  },
  data: () => ({
    dialogOpen: false,
  }),
  computed: {
    hasTemplate() {
      return !!(this.mailTemplate && String(this.mailTemplate).trim());
    },
  },
  methods: {
    onSubmit(newTemplate) {
      this.dialogOpen = false;
      this.$emit("submit", newTemplate);
    },
  },
};
</script>

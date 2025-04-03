<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Zahlungsbeleg Vorlage bearbeiten</span>
      </v-card-title>
      <v-card-subtitle>
        <div class="mt-6 text--info info--text">
          <v-icon color="info"> mdi-information-outline </v-icon>
          <span>
            Die Vorlage muss in einem validen HTML-Format geschrieben sein.
          </span>
        </div>
      </v-card-subtitle>
      <v-card-text>
        <v-textarea filled v-model="internalTemplate" rows="20"> </v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">abbrechen</v-btn>
        <v-btn color="primary" @click="onSave">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "ReceiptTemplateDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    receiptTemplate: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      internalTemplate: "",
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    onSave() {
      this.$emit("submit", this.internalTemplate);
    },
  },
  watch: {
    open() {
      this.internalTemplate = this.receiptTemplate;
    },
  },
};
</script>

<style scoped></style>

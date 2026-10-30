<template>
  <v-dialog
    :value="open"
    max-width="480"
    persistent
    scrollable
    @input="onDialogInput"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-email-outline</v-icon>
        <span class="text-h5">E-Mail-Link</span>
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <div class="text-caption grey--text mb-3">
          Empfänger als feste Adresse oder mit Variablen, z.&nbsp;B.
          <code>{{ supportEmailExample }}</code
          >.
        </div>

        <MailVariableTextField
          ref="addressField"
          v-model="address"
          label="E-Mail-Adresse / Empfänger"
          placeholder="z. B. info@beispiel.de"
          outlined
          dense
          hide-details="auto"
          class="mb-2"
          field="url"
          :variables="variables"
          :tenant="tenant"
          @keydown.enter.prevent="onApply"
        />

        <div v-if="presetVariables.length" class="mb-3">
          <v-chip
            v-for="v in presetVariables"
            :key="'preset-' + v.name"
            small
            class="mr-1 mb-1"
            @click="address = '{{' + v.name + '}}'"
          >
            <v-icon left x-small>mdi-email-outline</v-icon>
            {{ v.label || v.name }}
          </v-chip>
        </div>

        <v-text-field
          v-if="showLinkText"
          v-model="linkText"
          label="Link-Text"
          hint="Wird verwendet, wenn im Editor nichts markiert ist."
          persistent-hint
          outlined
          dense
          class="mb-2"
        />

        <div class="text-caption grey--text mt-2">
          Ergebnis:
          <code class="mailto-preview">{{ previewHref || "—" }}</code>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="close">Abbrechen</v-btn>
        <v-btn color="primary" :disabled="!previewHref" @click="onApply">
          <v-icon left small>mdi-check</v-icon>
          Übernehmen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  toMailtoHref,
  mailtoAddressFromHref,
} from "@/components/Mail/templateVariables.js";
import MailVariableTextField from "@/components/Mail/MailVariableTextField.vue";
import {
  filterVariablesForField,
  isCatalogLoadable,
} from "@/components/Mail/mailVariableCatalog.js";

export default {
  name: "MailtoLinkDialog",
  components: { MailVariableTextField },
  props: {
    open: { type: Boolean, default: false },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    initialHref: { type: String, default: "" },
    initialLinkText: { type: String, default: "kontaktieren" },
    showLinkText: { type: Boolean, default: true },
  },
  data() {
    return {
      address: "",
      linkText: "kontaktieren",
      supportEmailExample: "{{supportEmail}}",
    };
  },
  computed: {
    /** Quick picks: the catalog's email-ish variables, as the whole address. */
    presetVariables() {
      if (!isCatalogLoadable(this.variables)) return [];
      return filterVariablesForField(this.variables, "line").filter((v) =>
        /email|mail/i.test(v.name || "")
      );
    },
    previewHref() {
      return toMailtoHref(this.address);
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(v) {
        if (!v) return;
        this.address = mailtoAddressFromHref(this.initialHref);
        this.linkText = this.initialLinkText || "kontaktieren";
        this.$nextTick(() => {
          const input = this.$refs.addressField;
          if (input && input.focus) input.focus();
        });
      },
    },
  },
  methods: {
    onDialogInput(v) {
      if (!v) this.close();
    },
    close() {
      this.$emit("close");
    },
    onApply() {
      const href = this.previewHref;
      if (!href) return;
      this.$emit("apply", {
        href,
        linkText: (this.linkText || "").trim() || "kontaktieren",
      });
      this.close();
    },
  },
};
</script>

<style scoped>
.mailto-preview {
  display: inline-block;
  max-width: 100%;
  word-break: break-all;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  color: #c2185b;
}
</style>

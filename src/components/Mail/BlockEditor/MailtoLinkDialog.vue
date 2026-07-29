<template>
  <v-dialog
    :value="open"
    max-width="480"
    persistent
    @input="onDialogInput"
  >
    <v-card>
      <v-card-title class="subtitle-1">
        E-Mail-Link
      </v-card-title>
      <v-card-text>
        <div class="text-caption grey--text mb-3">
          Empfänger als feste Adresse oder mit Variablen, z.&nbsp;B.
          <code>{{ supportEmailExample }}</code>.
        </div>

        <v-text-field
          ref="addressField"
          v-model="address"
          label="E-Mail-Adresse / Empfänger"
          placeholder="z. B. info@beispiel.de"
          outlined
          dense
          hide-details="auto"
          class="mb-2"
          @keydown.enter.prevent="onApply"
        >
          <template v-if="insertableVariables.length" #append>
            <v-menu
              offset-y
              left
              :close-on-content-click="true"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  x-small
                  v-bind="attrs"
                  v-on="on"
                  title="Variable einfügen"
                >
                  <v-icon small>mdi-code-tags</v-icon>
                </v-btn>
              </template>
              <v-list dense style="max-height: 280px; overflow-y: auto;">
                <v-list-item
                  v-for="v in insertableVariables"
                  :key="v.name"
                  @click="insertVariable(v)"
                >
                  <v-list-item-content>
                    <v-list-item-title>
                      {{ v.label || v.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <code>{{ variableToken(v) }}</code>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-text-field>

        <div v-if="presetVariables.length" class="mb-3">
          <v-chip
            v-for="v in presetVariables"
            :key="'preset-' + v.name"
            small
            class="mr-1 mb-1"
            @click="address = variableToken(v)"
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
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" :disabled="!previewHref" @click="onApply">
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

export default {
  name: "MailtoLinkDialog",
  props: {
    open: { type: Boolean, default: false },
    variables: { type: Array, default: () => [] },
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
    insertableVariables() {
      return (this.variables || []).filter((v) => {
        if (!v || !v.placeholder) return false;
        // Skip control-flow helpers; only simple/value placeholders.
        return !/^\{\{[#^/]/.test(String(v.placeholder).trim());
      });
    },
    presetVariables() {
      return this.insertableVariables.filter((v) =>
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
    variableToken(v) {
      if (!v) return "";
      const placeholder = String(v.placeholder || "").trim();
      const simple = placeholder.match(/^\{\{\{?\s*([\w.]+)\s*\}?\}\}$/);
      if (simple) return `{{${simple[1]}}}`;
      if (placeholder) return placeholder;
      return `{{${v.name}}}`;
    },
    insertVariable(v) {
      const token = this.variableToken(v);
      if (!token) return;
      this.address = `${this.address || ""}${token}`;
    },
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

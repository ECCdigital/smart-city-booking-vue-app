<template>
  <div>
    <AppPanel
      v-for="snippet in catalog"
      :key="snippet.key"
      :title="snippet.title"
      :icon="snippet.icon"
      :active="hasAnyOverride(snippet.key)"
      class="mb-2"
    >
      <template #badges>
        <v-chip
          v-if="hasSubjectOverride(snippet.key)"
          small
          color="info"
          text-color="white"
          label
          class="ml-1"
          title="Eigener Mail-Betreff"
        >
          Betreff
        </v-chip>
      </template>

      <v-row>
        <v-col cols="12">
          <p class="text-body-2 mb-0">{{ snippet.description }}</p>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" class="d-flex flex-wrap align-center">
          <v-btn
            small
            outlined
            color="primary"
            class="mr-2 mb-1"
            @click="onEdit(snippet.key)"
          >
            <v-icon small left>mdi-pencil</v-icon>
            Bearbeiten
          </v-btn>
          <v-btn
            small
            text
            color="error"
            class="mb-1"
            :disabled="!hasAnyOverride(snippet.key)"
            @click="onReset(snippet.key)"
          >
            <v-icon small left>mdi-restore</v-icon>
            Auf Standard zurücksetzen
          </v-btn>
        </v-col>
      </v-row>
    </AppPanel>

    <SnippetEditorDialog
      :open="dialogOpen"
      :snippet-key="activeKey"
      :value="activeValue"
      :subject="activeSubject"
      :layout-template="layoutTemplate"
      @close="dialogOpen = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script>
import { SNIPPET_CATALOG } from "./snippetCatalog.js";
import SnippetEditorDialog from "./SnippetEditorDialog.vue";
import AppPanel from "@/components/AppPanel.vue";

export default {
  name: "SnippetList",
  components: { SnippetEditorDialog, AppPanel },
  props: {
    mailSnippets: { type: Object, default: () => ({}) },
    mailSubjects: { type: Object, default: () => ({}) },
    layoutTemplate: { type: String, default: "" },
  },
  data: () => ({
    catalog: SNIPPET_CATALOG,
    dialogOpen: false,
    activeKey: "",
  }),
  computed: {
    activeValue() {
      return this.mailSnippets ? this.mailSnippets[this.activeKey] || "" : "";
    },
    activeSubject() {
      return this.mailSubjects ? this.mailSubjects[this.activeKey] || "" : "";
    },
  },
  methods: {
    hasBodyOverride(key) {
      const v = this.mailSnippets ? this.mailSnippets[key] : "";
      return !!(v && v.trim());
    },
    hasSubjectOverride(key) {
      const v = this.mailSubjects ? this.mailSubjects[key] : "";
      return !!(v && v.trim());
    },
    hasAnyOverride(key) {
      return this.hasBodyOverride(key) || this.hasSubjectOverride(key);
    },
    onEdit(key) {
      this.activeKey = key;
      this.dialogOpen = true;
    },
    onReset(key) {
      const nextSnippets = { ...(this.mailSnippets || {}) };
      delete nextSnippets[key];
      const nextSubjects = { ...(this.mailSubjects || {}) };
      delete nextSubjects[key];
      this.$emit("update", {
        mailSnippets: nextSnippets,
        mailSubjects: nextSubjects,
      });
    },
    onSubmit({ key, value, subject }) {
      const nextSnippets = { ...(this.mailSnippets || {}) };
      if (value && value.trim()) {
        nextSnippets[key] = value;
      } else {
        delete nextSnippets[key];
      }
      const nextSubjects = { ...(this.mailSubjects || {}) };
      if (subject && subject.trim()) {
        nextSubjects[key] = subject;
      } else {
        delete nextSubjects[key];
      }
      this.dialogOpen = false;
      this.$emit("update", {
        mailSnippets: nextSnippets,
        mailSubjects: nextSubjects,
      });
    },
  },
};
</script>

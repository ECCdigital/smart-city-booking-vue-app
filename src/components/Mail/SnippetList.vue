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
        <v-chip
          v-if="hasAfterOverride(snippet.key)"
          small
          color="secondary"
          text-color="white"
          label
          class="ml-1"
          title="Eigener Abschluss-Text"
        >
          Abschluss
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
        </v-col>
      </v-row>
    </AppPanel>

    <SnippetEditorDialog
      :open="dialogOpen"
      :snippet-key="activeKey"
      :value="activeValue"
      :value-after="activeValueAfter"
      :subject="activeSubject"
      :default-mail-snippets="defaultMailSnippets"
      :layout-template="layoutTemplate"
      :tenant-name="tenantName"
      :show-support-footer="showSupportFooter"
      :booking-period-format="bookingPeriodFormat"
      @close="dialogOpen = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script>
import {
  SNIPPET_CATALOG,
  afterSnippetKey,
} from "./snippetCatalog.js";
import SnippetEditorDialog from "./SnippetEditorDialog.vue";
import AppPanel from "@/components/AppPanel.vue";

export default {
  name: "SnippetList",
  components: { SnippetEditorDialog, AppPanel },
  props: {
    mailSnippets: { type: Object, default: () => ({}) },
    mailSubjects: { type: Object, default: () => ({}) },
    defaultMailSnippets: { type: Object, default: () => ({}) },
    layoutTemplate: { type: String, default: "" },
    tenantName: { type: String, default: "" },
    showSupportFooter: { type: Boolean, default: true },
    bookingPeriodFormat: { type: String, default: "default" },
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
    activeValueAfter() {
      if (!this.mailSnippets || !this.activeKey) return "";
      return this.mailSnippets[afterSnippetKey(this.activeKey)] || "";
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
    hasAfterOverride(key) {
      const v = this.mailSnippets
        ? this.mailSnippets[afterSnippetKey(key)]
        : "";
      return !!(v && v.trim());
    },
    hasSubjectOverride(key) {
      const v = this.mailSubjects ? this.mailSubjects[key] : "";
      return !!(v && v.trim());
    },
    hasAnyOverride(key) {
      return (
        this.hasBodyOverride(key) ||
        this.hasAfterOverride(key) ||
        this.hasSubjectOverride(key)
      );
    },
    onEdit(key) {
      this.activeKey = key;
      this.dialogOpen = true;
    },
    onReset(key) {
      const nextSnippets = { ...(this.mailSnippets || {}) };
      delete nextSnippets[key];
      delete nextSnippets[afterSnippetKey(key)];
      const nextSubjects = { ...(this.mailSubjects || {}) };
      delete nextSubjects[key];
      this.$emit("update", {
        mailSnippets: nextSnippets,
        mailSubjects: nextSubjects,
      });
    },
    onSubmit({ key, value, valueAfter, subject }) {
      const nextSnippets = { ...(this.mailSnippets || {}) };
      if (value && value.trim()) {
        nextSnippets[key] = value;
      } else {
        delete nextSnippets[key];
      }
      const afterKey = afterSnippetKey(key);
      if (valueAfter && valueAfter.trim()) {
        nextSnippets[afterKey] = valueAfter;
      } else {
        delete nextSnippets[afterKey];
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

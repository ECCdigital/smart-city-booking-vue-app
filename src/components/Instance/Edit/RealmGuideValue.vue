<template>
  <span
    class="realm-guide-value"
    :class="{ 'realm-guide-value--missing': value.missing }"
    data-test="guide-value"
  >
    <span v-if="value.none" class="realm-guide-value__none">{{
      value.text
    }}</span>
    <code v-else>{{ value.text }}</code>
    <v-btn
      v-if="copyable"
      icon
      x-small
      class="realm-guide-value__copy"
      :color="copied ? 'success' : undefined"
      :title="copied ? $t('instance.edit.sso.guide.copied') : copyTitle"
      :aria-label="copyTitle"
      @click.stop="copyValue"
    >
      <v-icon x-small>{{ copied ? "mdi-check" : "mdi-content-copy" }}</v-icon>
    </v-btn>
  </span>
</template>

<script>
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";

const COPIED_MS = 1500;

/**
 * One value of the Anleitung, to copy on its own. A placeholder for a missing
 * value is shown, but there is nothing to copy.
 */
export default {
  name: "RealmGuideValue",
  props: {
    value: { type: Object, required: true },
    copy: { type: Boolean, default: true },
  },
  data() {
    return { copied: false, copiedTimer: null };
  },
  computed: {
    copyable() {
      return this.copy && !this.value.missing && !this.value.none;
    },
    copyTitle() {
      return this.$t("instance.edit.sso.guide.copy", {
        value: this.value.text,
      });
    },
  },
  beforeDestroy() {
    clearTimeout(this.copiedTimer);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    /** The clipboard may refuse (permission, insecure context); then it toasts. */
    async copyValue() {
      try {
        await navigator.clipboard.writeText(this.value.text);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        return;
      }
      this.copied = true;
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => {
        this.copied = false;
      }, COPIED_MS);
    },
  },
};
</script>

<style scoped>
.realm-guide-value {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  vertical-align: middle;
}

.realm-guide-value code {
  background: var(--scb-surface-tint);
  color: var(--scb-text);
  font-size: var(--scb-font-size-sm);
  padding: 1px var(--scb-space-2);
  border-radius: var(--scb-radius-control);
  overflow-wrap: anywhere;
  box-shadow: none;
}

.realm-guide-value--missing code {
  background: var(--scb-warning-tint);
  color: var(--scb-text-muted);
  font-style: italic;
}

.realm-guide-value__none {
  color: var(--scb-text-muted);
  font-style: italic;
}

.realm-guide-value__copy {
  margin-left: var(--scb-space-1);
}
</style>

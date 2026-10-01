<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): a value with a copy button. -->
  <span class="kc-value" :class="{ 'kc-value--missing': missing }">
    <code>{{ text }}</code>
    <v-tooltip v-if="copy && !missing" bottom>
      <template #activator="{ on }">
        <v-btn icon x-small class="ml-1" v-on="on" @click.stop="doCopy">
          <v-icon x-small>{{ copied ? "mdi-check" : "mdi-content-copy" }}</v-icon>
        </v-btn>
      </template>
      <span>{{ copied ? "Kopiert" : "Kopieren" }}</span>
    </v-tooltip>
  </span>
</template>

<script>
export default {
  name: "KcValue",
  props: {
    text: { type: String, required: true },
    missing: { type: Boolean, default: false },
    copy: { type: Boolean, default: true },
  },
  data() {
    return { copied: false };
  },
  methods: {
    async doCopy() {
      try {
        await navigator.clipboard.writeText(this.text);
      } catch (e) {
        // prototype: ignore
      }
      this.copied = true;
      setTimeout(() => (this.copied = false), 1200);
    },
  },
};
</script>

<style scoped>
.kc-value {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}
.kc-value code {
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
  font-size: 0.8125rem;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
.kc-value--missing code {
  background: rgba(255, 152, 0, 0.15);
  color: #b26a00;
  font-style: italic;
}
</style>

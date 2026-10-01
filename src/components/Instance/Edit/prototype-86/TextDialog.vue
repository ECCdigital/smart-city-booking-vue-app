<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): shows the text that "Als Text
       kopieren" puts on the clipboard, so its shape can be judged. -->
  <v-dialog :value="value" max-width="760" scrollable @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="text-subtitle-1">
        {{ title }}
        <v-spacer />
        <v-btn icon @click="$emit('input', false)"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text--secondary mb-2">
          Das liegt jetzt in der Zwischenablage, etwa für eine Mail an die IT.
        </p>
        <pre class="text-dialog__pre">{{ text }}</pre>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "TextDialog",
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: "Als Text kopiert" },
    text: { type: String, default: "" },
  },
  watch: {
    value(open) {
      if (open && navigator.clipboard) {
        navigator.clipboard.writeText(this.text).catch(() => {});
      }
    },
  },
};
</script>

<style scoped>
.text-dialog__pre {
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.04);
  padding: 12px;
  border-radius: 6px;
}
</style>

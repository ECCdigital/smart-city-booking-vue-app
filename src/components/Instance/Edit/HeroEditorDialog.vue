<template>
  <v-dialog
    :value="value"
    fullscreen
    hide-overlay
    persistent
    no-click-animation
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
  >
    <v-card tile>
      <v-toolbar flat>
        <v-toolbar-title>Kopfbereich</v-toolbar-title>
        <v-spacer />
        <v-btn text @click="close">Schließen</v-btn>
      </v-toolbar>
      <!--
        The editor body (load and save cycle, height, blocks, background and
        the live preview) follows with the Hero Editor shell.
      -->
      <v-card-text />
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * The full-screen dialog the Portal tab opens for the Hero Editor. It has
 * its own load/save cycle and never touches the tab's global SaveBar; the
 * tab refetches instance and catalog on `closed`, so its status line is
 * current afterwards.
 */
export default {
  name: "HeroEditorDialog",
  props: {
    value: { type: Boolean, default: false },
  },
  methods: {
    close() {
      this.$emit("input", false);
      this.$emit("closed");
    },
  },
};
</script>

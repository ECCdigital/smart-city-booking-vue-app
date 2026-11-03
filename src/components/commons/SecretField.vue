<template>
  <!-- A password, token or other secret, write only.
       A stored value is never drawn: the empty input shows a fixed row of
       dots, whatever its length. What the admin types replaces it, an
       emptied input keeps it, the cross removes it. Only a value being typed
       can be shown, through the eye. Attributes and listeners other than
       `input` go on to the text field. -->
  <v-text-field
    v-bind="$attrs"
    v-on="listeners"
    :value="draft"
    :disabled="disabled"
    :type="visible ? 'text' : 'password'"
    autocomplete="new-password"
    :placeholder="hasStored ? mask : $attrs.placeholder"
    :persistent-placeholder="hasStored"
    @input="onInput"
  >
    <template v-if="draft && !disabled" #append>
      <v-btn
        icon
        small
        data-test="secret-visibility"
        :aria-label="$t(visible ? 'secretField.hide' : 'secretField.show')"
        :title="$t(visible ? 'secretField.hide' : 'secretField.show')"
        :aria-pressed="String(visible)"
        @click="visible = !visible"
      >
        <v-icon small>{{ visible ? "mdi-eye" : "mdi-eye-off" }}</v-icon>
      </v-btn>
    </template>
    <template v-else-if="hasStored && !disabled" #append>
      <v-btn
        icon
        small
        data-test="secret-remove"
        :aria-label="$t('secretField.remove')"
        :title="$t('secretField.remove')"
        @click="remove"
      >
        <v-icon small>mdi-close-circle</v-icon>
      </v-btn>
    </template>
  </v-text-field>
</template>

<script>
/** The same dots for every stored secret, so they tell nothing of its length. */
export const SECRET_MASK = "••••••••";

export default {
  name: "SecretField",
  inheritAttrs: false,
  props: {
    /** The stored secret, handed back unchanged until the admin types. */
    value: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  },
  data() {
    return {
      mask: SECRET_MASK,
      stored: this.value || "",
      draft: "",
      emitted: this.value || "",
      visible: false,
    };
  },
  computed: {
    hasStored() {
      return !!this.stored && !this.draft;
    },
    listeners() {
      // eslint-disable-next-line no-unused-vars
      const { input, ...rest } = this.$listeners;
      return rest;
    },
  },
  watch: {
    value(v) {
      // A value this field did not hand on is another stored secret, e.g.
      // the dialog opened for another app: start over from it.
      if ((v || "") === this.emitted) return;
      this.stored = v || "";
      this.draft = "";
      this.visible = false;
      this.emitted = this.stored;
    },
  },
  methods: {
    emit(v) {
      this.emitted = v;
      this.$emit("input", v);
    },
    onInput(v) {
      this.draft = v || "";
      if (!this.draft) this.visible = false;
      this.emit(this.draft || this.stored);
    },
    remove() {
      this.stored = "";
      this.draft = "";
      this.emit("");
    },
  },
};
</script>

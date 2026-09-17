<template>
  <div class="mail-variable-text-field">
    <component
      :is="multiline ? 'v-textarea' : 'v-text-field'"
      ref="field"
      :value="value"
      :style="fieldStyle"
      v-bind="$attrs"
      v-on="$listeners"
    >
      <template #append>
        <MailVariablePicker
          :variables="variables"
          :tenant="tenant"
          :field="field"
          icon
          @insert="insertVariable"
        />
        <slot name="append" />
      </template>
      <template v-for="name in passthroughSlots()" #[name]>
        <slot :name="name" />
      </template>
    </component>
    <ConditionalVariableAlert
      :value="value || ''"
      :variables="variables"
      :tenant="tenant"
    />
    <slot />
  </div>
</template>

<script>
import MailVariablePicker from "./MailVariablePicker.vue";
import ConditionalVariableAlert from "./ConditionalVariableAlert.vue";
import { insertIntoField } from "./fieldInsert.js";

/**
 * A `v-text-field` (or `v-textarea` with `multiline`) that carries the mail
 * variable picker in its append slot, inserts the picked expression at the
 * caret and shows the conditional-variable warning underneath. Everything
 * else (label, hint, rules, dense, outlined, …) passes through to the field;
 * the default slot renders below the warning, `append` beside the picker.
 */
export default {
  name: "MailVariableTextField",
  components: { ConditionalVariableAlert, MailVariablePicker },
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    field: {
      type: String,
      required: true,
      validator: (v) => ["url", "line", "html", "subject"].includes(v),
    },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    multiline: { type: Boolean, default: false },
    /** Inline style for the field itself; `style` on the component lands on the wrapper. */
    fieldStyle: { type: [Object, String, Array], default: null },
  },
  methods: {
    /** Slots handed on to the field; `$scopedSlots` is not reactive, so no computed. */
    passthroughSlots() {
      return Object.keys(this.$scopedSlots).filter(
        (name) => name !== "append" && name !== "default"
      );
    },
    focus() {
      const field = this.$refs.field;
      if (field && field.focus) field.focus();
    },
    insertVariable(expr) {
      insertIntoField(this.$refs.field, expr, (v) => this.$emit("input", v));
    },
  },
};
</script>

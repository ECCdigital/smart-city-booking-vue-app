<template>
  <component :is="wrapperTag" v-bind="wrapperProps" class="custom-field-input">
    <v-text-field
      v-if="field.inputType === 'string'"
      :value="value"
      @input="$emit('input', $event)"
      :label="fieldLabel"
      :placeholder="field.placeholder || ''"
      :rules="rules"
      background-color="accent"
      filled
      :hide-details="hideDetails"
      clearable
      @click:clear="$emit('input', null)"
    />

    <v-textarea
      v-else-if="field.inputType === 'text'"
      :value="value"
      @input="$emit('input', $event)"
      :label="fieldLabel"
      :placeholder="field.placeholder || ''"
      :rules="rules"
      background-color="accent"
      filled
      :hide-details="hideDetails"
      rows="3"
      auto-grow
      clearable
      @click:clear="$emit('input', null)"
    />

    <v-text-field
      v-else-if="field.inputType === 'numeric'"
      :value="value"
      @input="
        $emit(
          'input',
          $event !== '' && $event !== null ? Number($event) : null
        )
      "
      :label="fieldLabel"
      :placeholder="field.placeholder || ''"
      :rules="rules"
      type="number"
      background-color="accent"
      filled
      :hide-details="hideDetails"
      clearable
      @click:clear="$emit('input', null)"
    />

    <v-switch
      v-else-if="field.inputType === 'boolean'"
      :input-value="value"
      @change="$emit('input', $event)"
      :label="field.caption"
      :hide-details="hideDetails"
      dense
    />

    <v-select
      v-else-if="field.inputType === 'select'"
      :value="value"
      @input="$emit('input', $event)"
      :items="field.options || []"
      item-text="caption"
      item-value="value"
      :label="fieldLabel"
      :placeholder="field.placeholder || ''"
      :rules="rules"
      background-color="accent"
      filled
      :hide-details="hideDetails"
      clearable
      @click:clear="$emit('input', null)"
    />
  </component>
</template>

<script>
export default {
  name: "CustomFieldInput",
  props: {
    field: { type: Object, required: true },
    value: { default: null },
    required: { type: Boolean, default: false },
    hideDetails: { type: [Boolean, String], default: "auto" },
    inline: { type: Boolean, default: false },
    cols: { type: [String, Number], default: "12" },
    md: { type: [String, Number], default: null },
    lg: { type: [String, Number], default: null },
  },
  computed: {
    wrapperTag() {
      return this.inline ? "div" : "v-col";
    },
    wrapperProps() {
      if (this.inline) return {};
      const props = { cols: this.cols };
      if (this.md != null) props.md = this.md;
      if (this.lg != null) props.lg = this.lg;
      return props;
    },
    fieldLabel() {
      return this.required ? `${this.field.caption} *` : this.field.caption;
    },
    rules() {
      if (!this.required) return [];
      return [
        (v) =>
          (v !== null && v !== undefined && v !== "") ||
          `${this.field.caption} ist erforderlich`,
      ];
    },
  },
};
</script>

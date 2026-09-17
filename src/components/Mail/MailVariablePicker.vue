<template>
  <v-menu offset-y content-class="mail-variable-picker-content">
    <template #activator="{ on, attrs }">
      <slot name="activator" :on="on" :attrs="attrs">
        <v-btn x-small v-bind="attrs" v-on="on" title="Variable einfügen">
          <v-icon x-small>mdi-code-tags</v-icon>
        </v-btn>
      </slot>
    </template>
    <v-list dense class="mail-variable-picker">
      <v-list-item v-if="!loadable" disabled>
        <v-list-item-content>
          <v-list-item-title>
            Variablen konnten nicht geladen werden
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item
        v-for="entry in entries"
        v-else
        :key="entry.name"
        @click="$emit('insert', entry.expr, entry)"
      >
        <v-list-item-content>
          <v-list-item-title>{{ entry.label }}</v-list-item-title>
          <v-list-item-subtitle>
            <code class="mail-variable-picker__expr">{{ entry.expr }}</code>
            <span class="ml-1 grey--text">{{ entry.description }}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import {
  expressionForField,
  filterVariablesForField,
  isCatalogLoadable,
} from "./mailVariableCatalog.js";

/**
 * One picker for every text- or URL-bearing field of a mail template. It
 * filters the (already snippet-filtered) catalog by the field's kind, builds
 * the expression and emits `insert(expr, entry)`; how the field inserts it
 * is the field's business. `tenant` is the live tenant for the conditional-variable
 * warnings that come with `requires`.
 */
export default {
  name: "MailVariablePicker",
  props: {
    variables: { type: Array, default: () => [] },
    field: {
      type: String,
      required: true,
      validator: (v) => ["url", "line", "text", "html", "subject"].includes(v),
    },
    tenant: { type: Object, default: () => ({}) },
  },
  computed: {
    loadable() {
      return isCatalogLoadable(this.variables);
    },
    entries() {
      if (!this.loadable) return [];
      return filterVariablesForField(this.variables, this.field).map((v) => ({
        ...v,
        expr: expressionForField(v, this.field),
      }));
    },
  },
};
</script>

<style scoped>
.mail-variable-picker {
  max-height: 320px;
  overflow-y: auto;
  background: #fff !important;
}
.mail-variable-picker__expr {
  font-family: "Courier New", monospace;
  font-size: 11px;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  color: #c2185b;
}
</style>

<template>
  <v-menu offset-y content-class="mail-variable-picker-content">
    <template #activator="{ on, attrs }">
      <slot name="activator" :on="on" :attrs="attrs">
        <v-btn
          x-small
          :icon="icon"
          class="mail-variable-picker-activator"
          v-bind="attrs"
          v-on="on"
          title="Variable einfügen"
        >
          <v-icon :small="icon" :x-small="!icon">mdi-code-tags</v-icon>
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
      <v-list-item v-else-if="!entries.length" disabled>
        <v-list-item-content>
          <v-list-item-title>Keine Variablen für dieses Feld</v-list-item-title>
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
          <v-list-item-subtitle
            v-if="entry.requirement"
            class="mail-variable-picker__requires"
            :class="levelClass(entry.requirement)"
          >
            <v-icon x-small :color="levelColor(entry.requirement)" class="mr-1">
              {{ entry.requirement.icon }}
            </v-icon>
            <strong v-if="entry.requirement.lead">{{
              entry.requirement.lead
            }}</strong
            >{{ requirementRest(entry.requirement) }}
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
  requirementFor,
} from "./mailVariableCatalog.js";

/**
 * One picker for every text- or URL-bearing field of a mail template. It
 * filters the (already snippet-filtered) catalog by the field's kind, builds
 * the expression and emits `insert(expr, entry)`; how the field inserts it
 * is the field's business. `tenant` is the live tenant for the conditional-variable
 * warnings that come with `requires`. `icon` renders the default activator as
 * an icon button, the shape for the append slot of a text field.
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
    icon: { type: Boolean, default: false },
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
        requirement: requirementFor(v, this.tenant),
      }));
    },
  },
  methods: {
    levelColor(requirement) {
      return requirement.level === "warning" ? "warning" : "grey darken-1";
    },
    levelClass(requirement) {
      return requirement.level === "warning"
        ? "warning--text text--darken-2"
        : "grey--text";
    },
    /** The sentence after the bold lead. */
    requirementRest(requirement) {
      return requirement.text.slice(requirement.lead.length);
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
.mail-variable-picker__requires {
  white-space: normal;
  font-size: 11px;
}
</style>

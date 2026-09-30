<template>
  <!-- A further action in the row beneath the search band (ToolbarRow's
       `actions` slot): a text button with its icon and label, muted until
       the pointer comes; one that opens a menu carries a chevron. `to`,
       `disabled`, a menu's activator bindings and the click go on to the
       button. -->
  <v-btn
    text
    small
    class="scb-toolbar-row__action"
    :class="{ 'scb-toolbar-row__action--active': active }"
    :aria-pressed="active === null ? undefined : String(active)"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <v-icon left small>{{ icon }}</v-icon>
    <slot />
    <v-icon v-if="menu" right x-small>mdi-chevron-down</v-icon>
  </v-btn>
</template>

<script>
export default {
  name: "ToolbarAction",
  inheritAttrs: false,
  props: {
    icon: { type: String, required: true },
    /** Whether the switch the action toggles is on; null, not a switch. */
    active: { type: Boolean, default: null },
    /** The action opens a menu. */
    menu: { type: Boolean, default: false },
  },
};
</script>

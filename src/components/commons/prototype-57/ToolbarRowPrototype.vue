<template>
  <!-- PROTOTYPE (#57): the row beneath the search band in variant A, B or C.
       Every variant takes the same description of the row:

       views    [{ value, label, icon }] or null      the view switch (left)
       view     the value of the active view; `view` event on a switch
       sort     { options: [{ text, value }], by, dir } or null   (right)
                `sort-by` / `sort-dir` events on a change
       actions  [{ key, label, icon, active, disabled, to, onClick,
                   menu: [{ label, icon, disabled, onClick }] }]   (right)
       primary  { label, icon, to, disabled, onClick } or null  (far right)

       A slot the page has nothing for stays empty; the others keep their
       place. -->
  <component
    :is="component"
    class="proto-row"
    v-bind="$attrs"
    v-on="$listeners"
  />
</template>

<script>
import ToolbarRowA from "./ToolbarRowA.vue";
import ToolbarRowB from "./ToolbarRowB.vue";
import ToolbarRowC from "./ToolbarRowC.vue";

export default {
  name: "ToolbarRowPrototype",
  inheritAttrs: false,
  props: {
    variant: { type: String, required: true },
  },
  computed: {
    component() {
      return { A: ToolbarRowA, B: ToolbarRowB, C: ToolbarRowC }[this.variant];
    },
  },
};
</script>

<style>
/* The prototype row takes the whole width of SearchBar's row. */
.scb-toolbar > .proto-row {
  flex: 1 1 100%;
}
</style>

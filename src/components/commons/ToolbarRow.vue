<template>
  <!-- The row beneath the search band (ECCdigital/tickets#57, „Register“):
       it stands on a hairline and heads the content beneath it. Every
       element has its place - the views left, sorting and the further
       actions right; one a page does not have leaves its place empty.
       The look is toolbar.scss. -->
  <div class="scb-toolbar-row">
    <div class="scb-toolbar-row__start" data-test="row-start">
      <div
        v-if="views"
        role="group"
        :aria-label="$t('toolbar.views')"
        class="scb-toolbar-row__views"
      >
        <button
          v-for="item in views"
          :key="item.value"
          type="button"
          class="scb-toolbar-row__view"
          :class="{ 'scb-toolbar-row__view--active': item.value === view }"
          :aria-pressed="String(item.value === view)"
          :data-test="`view-${item.value}`"
          @click="pickView(item.value)"
        >
          <v-icon small>{{ item.icon }}</v-icon>
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="scb-toolbar-row__end" data-test="row-end">
      <!-- Sorting spelled out: the active field bold with its direction;
           clicked again it turns, the cross resets. -->
      <div
        v-if="sortOptions"
        role="group"
        :aria-label="$t('toolbar.sort.caption')"
        class="scb-toolbar-row__sort"
        data-test="sort"
      >
        <span class="scb-toolbar-row__caption" aria-hidden="true">
          {{ $t("toolbar.sort.caption") }}
        </span>
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          class="scb-toolbar-row__field"
          :class="{
            'scb-toolbar-row__field--active': option.value === sortBy,
          }"
          :aria-pressed="String(option.value === sortBy)"
          :aria-label="fieldAriaLabel(option)"
          :title="fieldTooltip(option)"
          data-test="sort-field"
          @click="pickField(option.value)"
        >
          {{ option.text }}
          <v-icon v-if="option.value === sortBy" x-small>
            {{ sortDir === "desc" ? "mdi-arrow-down" : "mdi-arrow-up" }}
          </v-icon>
        </button>
        <button
          v-if="sortBy"
          type="button"
          class="scb-toolbar-row__reset"
          :title="$t('toolbar.sort.reset')"
          :aria-label="$t('toolbar.sort.reset')"
          data-test="sort-reset"
          @click="resetSort"
        >
          <v-icon x-small>mdi-close</v-icon>
        </button>
      </div>

      <!-- The further actions, as ToolbarAction text buttons. -->
      <div v-if="$slots.actions" class="scb-toolbar-row__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ToolbarRow",
  props: {
    /** The views, `[{ value, label, icon }]`, as tabs on the left; none, none. */
    views: { type: Array, default: null },
    /** The value of the view shown; a click on another is `update:view`. */
    view: { type: String, default: null },
    /** The fields to sort by, `[{ text, value }]`, on the right; none, none. */
    sortOptions: { type: Array, default: null },
    /** The field sorted by, or null; a change is `update:sortBy`. */
    sortBy: { type: String, default: null },
    /** "asc" or "desc"; a change is `update:sortDir`. */
    sortDir: { type: String, default: "asc" },
  },
  methods: {
    // One view is always shown, so the active tab clicked again stays.
    pickView(value) {
      if (value !== this.view) this.$emit("update:view", value);
    },
    // Another field sorts by it in the direction set; the active one turns.
    pickField(value) {
      if (value !== this.sortBy) {
        this.$emit("update:sortBy", value);
        return;
      }
      this.$emit("update:sortDir", this.sortDir === "desc" ? "asc" : "desc");
    },
    resetSort() {
      this.$emit("update:sortBy", null);
    },
    // The active field names its direction, which only its arrow shows.
    fieldAriaLabel(option) {
      if (option.value !== this.sortBy) return option.text;
      return `${option.text}, ${this.$t(`toolbar.sort.${this.sortDir}`)}`;
    },
    fieldTooltip(option) {
      return option.value === this.sortBy
        ? this.$t("toolbar.sort.turn")
        : this.$t("toolbar.sort.by", { field: option.text });
    },
  },
};
</script>

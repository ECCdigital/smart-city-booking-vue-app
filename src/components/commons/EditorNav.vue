<script>
/**
 * The navigation of an editing page: its tabs as a list left, the sections
 * of the open tab under it; below Vuetify's md the tabs as a bar with the
 * sections as links beneath. The bookable editor and the event editor use
 * it. It only shows and reports: `go(tabKey, sectionId?)` asks the page to
 * open a tab, or a section in it.
 */
export default {
  name: "EditorNav",
  props: {
    // [{ key, icon, label }]
    tabs: { type: Array, required: true },
    activeKey: { type: String, default: null },
    // The sections of the open tab: [{ id, label }].
    sections: { type: Array, default: () => [] },
    activeSectionId: { type: String, default: null },
    // The keys of the tabs that hold a missing required field: a red dot.
    alertKeys: { type: Array, default: () => [] },
    alertLabel: { type: String, default: "" },
    ariaLabel: { type: String, required: true },
    sectionsAriaLabel: { type: String, required: true },
  },
  computed: {
    activeIndex() {
      const index = this.tabs.findIndex((tab) => tab.key === this.activeKey);
      return index < 0 ? 0 : index;
    },
    showSections() {
      return this.sections.length > 1;
    },
  },
  methods: {
    onTabChange(index) {
      const tab = this.tabs[index];
      if (tab) this.$emit("go", tab.key);
    },
  },
};
</script>

<template>
  <nav
    v-if="$vuetify.breakpoint.mdAndUp"
    class="editor-nav"
    :aria-label="ariaLabel"
  >
    <div
      v-for="t in tabs"
      :key="t.key"
      class="editor-nav__group"
      :class="{ 'editor-nav__group--active': activeKey === t.key }"
    >
      <button
        type="button"
        class="editor-nav__tab"
        :class="{ 'editor-nav__tab--active': activeKey === t.key }"
        :aria-current="activeKey === t.key ? 'page' : null"
        :data-test="`editor-tab-${t.key}`"
        @click="$emit('go', t.key)"
      >
        <v-icon small class="editor-nav__tab-icon">{{ t.icon }}</v-icon>
        <span class="editor-nav__tab-label">{{ t.label }}</span>
        <span
          v-if="alertKeys.includes(t.key)"
          class="editor-nav__dot"
          :title="alertLabel"
        />
      </button>

      <div
        v-if="activeKey === t.key && showSections"
        class="editor-nav__sections"
      >
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          class="editor-nav__section"
          :class="{
            'editor-nav__section--active': activeSectionId === section.id,
          }"
          @click="$emit('go', t.key, section.id)"
        >
          {{ section.label }}
        </button>
      </div>
    </div>
  </nav>

  <div v-else>
    <v-tabs
      :value="activeIndex"
      color="primary"
      show-arrows
      @change="onTabChange"
    >
      <v-tab
        v-for="t in tabs"
        :key="t.key"
        class="d-flex justify-start"
        style="text-transform: none"
      >
        <v-icon left small>{{ t.icon }}</v-icon>
        {{ t.label }}
      </v-tab>
    </v-tabs>
    <div
      v-if="showSections"
      class="editor-nav__subnav"
      role="navigation"
      :aria-label="sectionsAriaLabel"
    >
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        class="editor-nav__sublink"
        :class="{
          'editor-nav__sublink--active': activeSectionId === section.id,
        }"
        @click="$emit('go', activeKey, section.id)"
      >
        {{ section.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-nav {
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
  padding: 2px 0;
}

.editor-nav__group {
  margin-bottom: 2px;
}

.editor-nav__group--active {
  margin-bottom: var(--scb-space-2);
}

/* The active tab is a tinted pill, with no bar at its left edge - as the
   guided flow's step list. */
.editor-nav__tab {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--scb-nav-item-height);
  margin: 0;
  padding: var(--scb-space-2) var(--scb-space-3);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.editor-nav__tab:hover {
  background-color: var(--scb-hover-tint);
}

.editor-nav__tab--active {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
  font-weight: var(--scb-font-weight-medium);
}

.editor-nav__tab--active .editor-nav__tab-icon {
  color: var(--v-primary-base);
}

.editor-nav__tab-icon {
  flex: 0 0 auto;
  margin-right: 10px;
  opacity: 0.85;
}

.editor-nav__tab-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--scb-font-size-md);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-nav__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-left: var(--scb-space-2);
  border-radius: 50%;
  background-color: var(--v-error-base);
}

.editor-nav__sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 0 24px;
  padding: 2px 0 2px var(--scb-space-3);
  border-left: 1px solid var(--scb-surface-border);
}

.editor-nav__section {
  display: block;
  width: 100%;
  margin: 0;
  padding: 5px var(--scb-space-2);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  color: var(--scb-text-muted);
  font: inherit;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-tight);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.editor-nav__section:hover {
  color: var(--scb-text-hover);
  background-color: var(--scb-hover-tint);
}

.editor-nav__section--active {
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
  background-color: var(--scb-selected-tint);
}

.theme--dark .editor-nav__section--active {
  color: var(--v-primary-base);
}

.editor-nav__subnav {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--scb-space-1);
  margin: 0;
  padding: 6px var(--scb-space-1) var(--scb-space-2);
  overflow-x: auto;
  border-bottom: 1px solid var(--scb-rule-strong);
  scrollbar-width: thin;
}

.editor-nav__sublink {
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--scb-radius-pill);
  background: transparent;
  color: var(--scb-text-muted);
  font: inherit;
  font-size: var(--scb-font-size-sm);
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.editor-nav__sublink:hover {
  color: var(--scb-text-hover);
  background-color: var(--scb-hover-tint-strong);
}

.editor-nav__sublink--active {
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
  background-color: var(--scb-selected-tint-strong);
}

.theme--dark .editor-nav__sublink--active {
  color: var(--v-primary-base);
}
</style>

<script>
/**
 * The bar over a guided flow: the way back to the editing page, what is
 * edited - its type and name, „Neuer …“ before it has one - with its ID to
 * copy, and the page's switches (slot `actions`). It stands in for the page
 * title, the meta row and the publication band. The bookable editor and the
 * event editor use it; it only shows and reports (`leave`, `copy-id`).
 */
export default {
  name: "FlowBar",
  props: {
    // What is edited, as „Raum“ or „Veranstaltung“, and its name.
    typeLabel: { type: String, required: true },
    name: { type: String, default: "" },
    // Shown alone while something new has no name yet, as „Neuer Raum“.
    newLabel: { type: String, required: true },
    // The ID; without one there is nothing to copy.
    id: { type: String, default: null },
    // The way back; off once the flow is done.
    showBack: { type: Boolean, default: true },
    // From xl: the back cell as wide as the step list beneath it.
    stepsColumn: { type: Boolean, default: false },
  },
};
</script>

<template>
  <header
    class="flow-bar"
    :class="{ 'flow-bar--steps': stepsColumn }"
    data-test="flow-bar"
  >
    <div class="flow-bar__back">
      <v-btn
        v-if="showBack"
        small
        text
        class="flow-bar__back-btn"
        data-test="flow-leave"
        @click="$emit('leave')"
      >
        <v-icon left small>mdi-arrow-left</v-icon>
        {{ $t("bookable.flow.leave") }}
      </v-btn>
    </div>
    <div class="flow-bar__object">
      <h1 class="flow-bar__name" data-test="flow-bar-name">
        <template v-if="!id && !name">{{ newLabel }}</template>
        <template v-else>
          <span class="flow-bar__type">{{ typeLabel }}</span>
          <span class="flow-bar__title">
            {{ name || $t("bookable.edit.untitled") }}
          </span>
        </template>
      </h1>
      <v-tooltip v-if="id" bottom>
        <template v-slot:activator="{ on, attrs }">
          <span
            class="flow-bar__id text--secondary"
            v-bind="attrs"
            v-on="on"
            data-test="flow-bar-id"
            @click="$emit('copy-id')"
          >
            <span class="flow-bar__id-text">{{
              $t("bookable.edit.id", { id })
            }}</span>
            <v-icon x-small class="ml-1 flex-shrink-0">mdi-content-copy</v-icon>
          </span>
        </template>
        <span>{{ $t("bookable.edit.copyId.tooltip") }}</span>
      </v-tooltip>
    </div>
    <div class="flow-bar__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
/* The guided flow's bar: one line across the page, closed by a rule, as wide
   as the editor's row - the actions end at the right edge. From xl the back
   cell is as wide as the step list, so the name starts over the step column;
   below that the line is plain. */
.flow-bar {
  display: flex;
  align-items: center;
  gap: var(--scb-gap-columns);
  min-height: 40px;
  margin-bottom: var(--scb-space-4);
  padding-bottom: var(--scb-space-2);
  border-bottom: 1px solid var(--scb-rule);
}

.flow-bar__back {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  min-width: 0;
}

.flow-bar--steps .flow-bar__back {
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
}

/* Flush with the step list below; the page body clips what reaches past
   its left edge, so no negative margin here. */
.flow-bar__back-btn {
  margin-left: 0;
  color: var(--scb-text-muted);
}

.flow-bar__object {
  display: flex;
  align-items: baseline;
  flex: 1 1 auto;
  min-width: 0;
  gap: var(--scb-space-4);
}

.flow-bar__name {
  flex: 0 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 1.125rem;
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-bar__id {
  flex: 0 1 auto;
  font-size: var(--scb-font-size-sm);
}

.flow-bar__type {
  margin-right: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: normal;
  color: var(--scb-text-muted);
}

.flow-bar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: var(--scb-space-2);
  margin-left: auto;
}

@media (max-width: 599px) {
  .flow-bar {
    flex-wrap: wrap;
    gap: var(--scb-space-2) var(--scb-space-3);
  }

  .flow-bar__object {
    flex: 1 1 100%;
    flex-wrap: wrap;
    order: 3;
    gap: var(--scb-space-1) var(--scb-space-3);
  }

  .flow-bar__name {
    flex: 1 1 100%;
    white-space: normal;
  }
}

/* The ID to copy, as the editor's meta row shows it. */
.flow-bar__id {
  display: inline-flex;
  align-items: center;
  max-width: min(100%, 280px);
  min-width: 0;
  margin: -2px -6px;
  padding: 2px 6px;
  border-radius: var(--scb-radius-control);
  cursor: pointer;
  transition: background-color var(--scb-motion-base),
    color var(--scb-motion-base);
}

.flow-bar__id:hover {
  background-color: var(--scb-hover-tint-strong);
  color: var(--v-primary-base);
}

.flow-bar__id-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

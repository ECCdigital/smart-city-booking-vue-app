<template>
  <div
    class="app-list"
    :class="{ 'app-list--loading': loading }"
    :style="{ '--app-list-columns': gridColumns }"
    data-test="app-list"
  >
    <p v-if="lead" class="app-list__lead">{{ lead }}</p>

    <div v-if="$slots.toolbar" class="app-list__toolbar">
      <slot name="toolbar" />
    </div>

    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      height="2"
      class="app-list__progress"
    />

    <v-alert
      v-if="errorMessage"
      type="warning"
      text
      dense
      class="app-list__error"
      data-test="list-error"
    >
      <div class="app-list__error-body">
        <span>{{ errorMessage }}</span>
        <v-btn
          v-if="$listeners.retry"
          text
          small
          color="warning"
          class="app-list__retry"
          :disabled="loading"
          data-test="list-retry"
          @click="$emit('retry')"
        >
          {{ $t("list.retry") }}
        </v-btn>
      </div>
    </v-alert>

    <div v-else-if="items.length > 0" role="table" class="app-list__table">
      <div role="row" class="app-list__head">
        <div
          v-for="column in columns"
          :key="column.key"
          role="columnheader"
          class="app-list__th"
          :class="alignClass(column)"
        >
          {{ column.label }}
        </div>
      </div>
      <div role="rowgroup" class="app-list__rows">
        <div
          v-for="item in items"
          :key="item[itemKey]"
          role="row"
          class="app-list__row"
          data-test="list-row"
        >
          <div
            v-for="column in columns"
            :key="column.key"
            role="cell"
            class="app-list__cell"
            :class="alignClass(column)"
            :data-label="column.label"
          >
            <!-- One body per cell, so the folded row has exactly the
                 label and the content side by side. -->
            <div class="app-list__cell-body">
              <slot
                :name="`cell.${column.key}`"
                :item="item"
                :value="item[column.key]"
              >
                {{ item[column.key] }}
              </slot>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-else-if="!loading" class="app-list__empty" data-test="list-empty">
      <slot name="empty">{{ emptyText }}</slot>
    </p>

    <div v-if="paged" class="app-list__footer">
      <span class="app-list__range" data-test="list-range">
        {{ $t("list.range", { from: rangeFrom, to: rangeTo, total }) }}
      </span>
      <div class="app-list__pager">
        <v-btn
          icon
          small
          :disabled="loading || page <= 1"
          :aria-label="$t('list.previous')"
          data-test="list-previous"
          @click="$emit('update:page', page - 1)"
        >
          <v-icon small>mdi-chevron-left</v-icon>
        </v-btn>
        <span class="app-list__page">
          {{ $t("list.page", { page, pages: pageCount }) }}
        </span>
        <v-btn
          icon
          small
          :disabled="loading || page >= pageCount"
          :aria-label="$t('list.next')"
          data-test="list-next"
          @click="$emit('update:page', page + 1)"
        >
          <v-icon small>mdi-chevron-right</v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * The shared list: hairline rows on a grid of named columns, as the
 * "Prüfliste", the booking page and the instance's tenant list already draw
 * their rows - the replacement for `v-simple-table` and `v-data-table`,
 * rolled out list by list.
 *
 * The component draws; the caller owns the data. It hands in the rows, the
 * loading and error state, and the page it is on; the list asks for another
 * page through `update:page` and for another try through `retry` (the error
 * offers "Erneut laden" only when someone listens).
 *
 * A column is `{ key, label, width, align }`: `width` a grid track
 * ("96px", "minmax(160px, 1.5fr)"; default one fraction), `align` "start" or
 * "end". A cell shows `item[key]`, or what the `cell.<key>` slot renders.
 *
 * While a reload runs, the rows stay and dim; only the first load shows the
 * bare progress line. Below the `$scb-bp-sm` breakpoint the grid folds:
 * every row becomes a stack, each cell prefixed with its column's name.
 */
export default {
  name: "AppList",
  props: {
    columns: { type: Array, required: true },
    items: { type: Array, default: () => [] },
    itemKey: { type: String, default: "id" },
    loading: { type: Boolean, default: false },
    errorMessage: { type: String, default: "" },
    emptyText: { type: String, default: "" },
    // A sentence over the list, naming what it holds.
    lead: { type: String, default: "" },
    // Paging on the server; without a `pageSize` the list has no footer.
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  computed: {
    gridColumns() {
      return this.columns
        .map((column) => column.width || "minmax(0, 1fr)")
        .join(" ");
    },
    pageCount() {
      if (!this.pageSize) return 1;
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
    paged() {
      return this.pageSize > 0 && this.total > this.pageSize;
    },
    rangeFrom() {
      return (this.page - 1) * this.pageSize + 1;
    },
    rangeTo() {
      return Math.min(this.page * this.pageSize, this.total);
    },
  },
  methods: {
    alignClass(column) {
      return column.align === "end" ? "app-list__cell--end" : null;
    },
  },
};
</script>

<style scoped>
.app-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-list__lead {
  margin: 0 0 var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.app-list__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
}

.app-list__progress {
  margin-bottom: -2px;
}

.app-list__error {
  margin: var(--scb-space-2) 0 0;
}

.app-list__error-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
}

.app-list__retry {
  margin-left: auto;
}

/* The head and every row share one grid, so the cells line up as columns. */
.app-list__head,
.app-list__row {
  display: grid;
  grid-template-columns: var(--app-list-columns);
  column-gap: var(--scb-space-4);
  align-items: start;
}

.app-list__head {
  padding: var(--scb-space-2) 0 6px;
  border-bottom: 1px solid var(--scb-rule-strong);
}

.app-list__th {
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
  line-height: var(--scb-line-height-tight);
  min-width: 0;
}

.app-list__rows {
  display: flex;
  flex-direction: column;
  transition: opacity var(--scb-motion-fast);
}

.app-list--loading .app-list__rows {
  opacity: 0.55;
  pointer-events: none;
}

.app-list__row {
  min-height: var(--scb-row-height);
  padding: 10px 0;
  border-bottom: 1px solid var(--scb-rule);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.app-list__row:last-child {
  border-bottom: 0;
}

.app-list__cell,
.app-list__cell-body {
  min-width: 0;
  overflow-wrap: anywhere;
}

.app-list__cell--end {
  text-align: right;
}

.app-list__empty {
  margin: var(--scb-space-4) 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.app-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-3);
  padding-top: var(--scb-space-2);
  border-top: 1px solid var(--scb-rule-strong);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.app-list__pager {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
}

.app-list__page {
  min-width: 0;
}

/* Below $scb-bp-sm (959px) the grid folds into stacked rows. */
@media (max-width: 959px) {
  .app-list__head {
    display: none;
  }

  .app-list__row {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--scb-space-1);
  }

  .app-list__cell {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    column-gap: var(--scb-space-3);
  }

  .app-list__cell--end {
    text-align: left;
  }

  .app-list__cell::before {
    content: attr(data-label);
    font-size: var(--scb-font-size-xs);
    color: var(--scb-text-caption);
    padding-top: 1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-list__rows {
    transition: none;
  }
}
</style>

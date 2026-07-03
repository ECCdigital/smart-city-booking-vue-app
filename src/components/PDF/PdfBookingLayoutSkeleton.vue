<template>
  <div
    class="layout-skeleton"
    :class="`layout-skeleton--${layout}`"
    aria-hidden="true"
  >
    <template v-if="layout === 'summary'">
      <div class="layout-skeleton__kv-table">
        <div
          v-for="(row, index) in summaryRows"
          :key="`summary-${row.key}-${index}`"
          class="layout-skeleton__kv-row"
          :class="{ 'layout-skeleton__kv-row--dimmed': row.dimmed }"
        >
          <span
            class="layout-skeleton__bar layout-skeleton__bar--label"
            :style="row.labelStyle"
          />
          <span
            class="layout-skeleton__bar layout-skeleton__bar--value"
            :style="row.valueStyle"
          />
        </div>
      </div>
    </template>

    <template v-else-if="layout === 'compact'">
      <div
        v-if="showCompactMetaLine"
        class="layout-skeleton__meta layout-skeleton__meta--single"
      >
        <span
          v-for="(segment, index) in compactMetaSegments"
          :key="`compact-meta-${index}`"
          class="layout-skeleton__bar layout-skeleton__bar--meta-segment"
          :style="segment.style"
        />
      </div>
      <div
        class="layout-skeleton__table"
        :class="
          compactTableColumnCount === 4
            ? 'layout-skeleton__table--4col'
            : 'layout-skeleton__table--3col'
        "
      >
        <div class="layout-skeleton__table-head">
          <span
            v-for="col in compactTableColumnCount"
            :key="`compact-head-${col}`"
          />
        </div>
        <div
          v-for="row in 3"
          :key="`compact-${row}`"
          class="layout-skeleton__table-row"
        >
          <span class="layout-skeleton__bar layout-skeleton__bar--wide" />
          <span class="layout-skeleton__bar layout-skeleton__bar--short" />
          <span
            v-if="compactTableColumnCount >= 3"
            class="layout-skeleton__bar layout-skeleton__bar--short"
          />
          <span
            v-if="compactTableColumnCount >= 4"
            class="layout-skeleton__bar layout-skeleton__bar--short"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-if="visibleDetailedMetaRows.length"
        class="layout-skeleton__meta layout-skeleton__meta--multi"
      >
        <div
          v-for="row in visibleDetailedMetaRows"
          :key="`detailed-meta-${row.key}`"
          class="layout-skeleton__meta-line"
        >
          <span class="layout-skeleton__bar layout-skeleton__bar--meta-label" />
          <span class="layout-skeleton__bar layout-skeleton__bar--meta-value" />
        </div>
      </div>
      <div class="layout-skeleton__table layout-skeleton__table--4col">
        <div class="layout-skeleton__table-head">
          <span /><span /><span /><span />
        </div>
        <div
          v-for="row in 2"
          :key="`detailed-${row}`"
          class="layout-skeleton__table-row"
        >
          <span class="layout-skeleton__bar layout-skeleton__bar--wide" />
          <span class="layout-skeleton__bar layout-skeleton__bar--tiny" />
          <span class="layout-skeleton__bar layout-skeleton__bar--short" />
          <span class="layout-skeleton__bar layout-skeleton__bar--short" />
        </div>
        <div class="layout-skeleton__table-total">
          <span class="layout-skeleton__bar layout-skeleton__bar--total" />
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { normalizePdfBookingTableMeta } from "@/components/PDF/pdfBookingTableMeta.js";

const META_ROW_DEFS = [
  { key: "showBookingId", labelWidth: "38%", valueWidth: "22%" },
  { key: "showBookingPeriod", labelWidth: "44%", valueWidth: "34%" },
  { key: "showPaymentDate", labelWidth: "40%", valueWidth: "26%" },
  { key: "showPaymentMethod", labelWidth: "46%", valueWidth: "30%" },
];

const STATIC_SUMMARY_ROWS = [
  { key: "netto", labelWidth: "42%", valueWidth: "28%" },
  { key: "vat", labelWidth: "34%", valueWidth: "24%" },
  { key: "brutto", labelWidth: "42%", valueWidth: "28%" },
  { key: "objects", labelWidth: "38%", valueWidth: "52%" },
];

export default {
  name: "PdfBookingLayoutSkeleton",
  props: {
    layout: {
      type: String,
      required: true,
    },
    tableMeta: {
      type: Object,
      default: () => ({}),
    },
  },
  computed: {
    meta() {
      return normalizePdfBookingTableMeta(this.tableMeta);
    },
    visibleMetaKeys() {
      return META_ROW_DEFS.filter((row) => this.meta[row.key]).map(
        (row) => row.key,
      );
    },
    visibleDetailedMetaRows() {
      return META_ROW_DEFS.filter((row) => this.meta[row.key]);
    },
    showCompactMetaLine() {
      return this.visibleMetaKeys.length > 0;
    },
    compactMetaSegments() {
      const widths = ["18%", "24%", "20%", "16%"];
      return this.visibleMetaKeys.map((key, index) => ({
        key,
        style: { width: widths[index % widths.length] },
      }));
    },
    compactTableColumnCount() {
      return this.layout === "compact" && this.visibleMetaKeys.length >= 3
        ? 4
        : 3;
    },
    summaryRows() {
      const metaRows = META_ROW_DEFS.filter((row) => this.meta[row.key]).map(
        (row) => ({
          key: row.key,
          dimmed: false,
          labelStyle: { width: row.labelWidth, maxWidth: "96px" },
          valueStyle: { width: row.valueWidth, maxWidth: "72px" },
        }),
      );

      const staticRows = STATIC_SUMMARY_ROWS.map((row) => ({
        key: row.key,
        dimmed: false,
        labelStyle: { width: row.labelWidth, maxWidth: "96px" },
        valueStyle: { width: row.valueWidth, maxWidth: "72px" },
      }));

      return [...metaRows, ...staticRows];
    },
  },
};
</script>

<style scoped>
.layout-skeleton {
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 6px;
  padding: 12px;
  min-height: 148px;
}

.layout-skeleton__bar {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #e4e4e4 0%, #ededed 50%, #e4e4e4 100%);
  transition: opacity 0.2s ease, width 0.2s ease;
}

.layout-skeleton__kv-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout-skeleton__kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
  transition: opacity 0.2s ease;
}

.layout-skeleton__kv-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.layout-skeleton__kv-row--dimmed {
  opacity: 0.35;
}

.layout-skeleton__bar--label {
  width: 42%;
  max-width: 96px;
}

.layout-skeleton__bar--value {
  width: 28%;
  max-width: 64px;
  margin-left: auto;
}

.layout-skeleton__meta {
  margin-bottom: 10px;
}

.layout-skeleton__meta--single {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.layout-skeleton__bar--meta-segment {
  height: 7px;
  flex: 0 0 auto;
}

.layout-skeleton__meta--multi {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layout-skeleton__meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layout-skeleton__bar--meta-label {
  width: 34%;
  max-width: 72px;
  height: 5px;
  opacity: 0.85;
}

.layout-skeleton__bar--meta-value {
  width: 52%;
  height: 5px;
}

.layout-skeleton__table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.layout-skeleton__table-head {
  display: grid;
  gap: 6px;
  padding: 6px 8px;
  background: #eeeeee;
  border-bottom: 1px solid #e0e0e0;
}

.layout-skeleton__table--3col .layout-skeleton__table-head {
  grid-template-columns: 1.4fr 1fr 1fr;
}

.layout-skeleton__table--4col .layout-skeleton__table-head {
  grid-template-columns: 1.5fr 0.6fr 0.8fr 0.8fr;
}

.layout-skeleton__table-head span {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: #d5d5d5;
}

.layout-skeleton__table-row {
  display: grid;
  gap: 6px;
  padding: 7px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.layout-skeleton__table--3col .layout-skeleton__table-row {
  grid-template-columns: 1.4fr 1fr 1fr;
}

.layout-skeleton__table--4col .layout-skeleton__table-row {
  grid-template-columns: 1.5fr 0.6fr 0.8fr 0.8fr;
}

.layout-skeleton__table-row:nth-child(even) {
  background: #f7f7f7;
}

.layout-skeleton__bar--wide {
  width: 88%;
}

.layout-skeleton__bar--short {
  width: 72%;
  margin-left: auto;
}

.layout-skeleton__bar--tiny {
  width: 55%;
  margin-left: auto;
}

.layout-skeleton__table-total {
  padding: 8px;
  border-top: 2px solid #333;
}

.layout-skeleton__bar--total {
  width: 36%;
  height: 7px;
  margin-left: auto;
}
</style>

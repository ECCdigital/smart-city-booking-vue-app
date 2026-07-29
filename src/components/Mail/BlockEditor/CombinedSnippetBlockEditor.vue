<template>
  <div class="combined-snippet-editor">
    <v-row no-gutters>
      <v-col cols="12" md="3" class="pr-md-2">
        <BlockPalette
          :variables="variables"
          @add-block="onAddBlock"
          @add-row="onAddRow"
        />
        <div class="zone-hint text-caption grey--text mt-3 px-1">
          Neue Bausteine landen im aktiven Bereich
          (<strong>{{
            activeZone === "intro" ? "Einleitung" : "Abschluss"
          }}</strong
          >). Klicke in einen Bereich, um ihn zu aktivieren.
        </div>
      </v-col>

      <v-col cols="12" md="6" class="px-md-2">
        <div class="editor-canvas">
          <div
            class="zone"
            :class="{ 'zone--active': activeZone === 'intro' }"
            @click.self="setActiveZone('intro')"
          >
            <div class="zone-header" @click="setActiveZone('intro')">
              <v-icon small left>mdi-text-box-outline</v-icon>
              Einleitung
              <span class="zone-header__hint">vor Buchungsdetails</span>
            </div>

            <div
              v-if="!localIntro.length"
              class="canvas-empty canvas-empty--compact"
              @click="setActiveZone('intro')"
            >
              <div class="grey--text">
                Einleitung bearbeiten – Bausteine links hinzufügen
              </div>
            </div>

            <draggable
              :list="localIntro"
              handle=".drag-handle"
              :animation="180"
              group="snippet-rows"
              ghost-class="ghost-row"
              @change="onIntroDragChange"
              @start="setActiveZone('intro')"
            >
              <RowBlock
                v-for="row in localIntro"
                :key="row.id"
                :block="row"
                :variables="variables"
                :selected="activeZone === 'intro' && selectedId === row.id"
                :selected-block-id="
                  activeZone === 'intro' ? selectedChildId : ''
                "
                @select="onSelect('intro', row.id, '')"
                @select-block="(id) => onSelect('intro', row.id, id)"
                @update="(r) => onUpdateRow('intro', row.id, r)"
                @duplicate="onDuplicateRow('intro', row.id)"
                @remove="onRemoveRow('intro', row.id)"
              />
            </draggable>
          </div>

          <div class="system-mock" aria-hidden="true">
            <div class="system-mock__badge">
              <v-icon x-small left>mdi-lock-outline</v-icon>
              Vom System eingefügt (Beispiel)
            </div>
            <div class="system-mock__body" v-html="systemMockHtml"></div>
          </div>

          <div
            class="zone"
            :class="{ 'zone--active': activeZone === 'after' }"
            @click.self="setActiveZone('after')"
          >
            <div class="zone-header" @click="setActiveZone('after')">
              <v-icon small left>mdi-text-box-plus-outline</v-icon>
              Abschluss
              <span class="zone-header__hint"
                >nach System-Inhalten, optional</span
              >
              <v-spacer />
              <v-btn
                v-if="localAfter.length"
                x-small
                text
                class="mr-n1"
                @click.stop="clearAfter"
              >
                <v-icon x-small left>mdi-delete-outline</v-icon>
                Leeren
              </v-btn>
            </div>

            <div
              v-if="!localAfter.length"
              class="canvas-empty canvas-empty--compact"
              @click="setActiveZone('after')"
            >
              <div class="grey--text">
                Optional: Abschluss nach den System-Inhalten
              </div>
            </div>

            <draggable
              :list="localAfter"
              handle=".drag-handle"
              :animation="180"
              group="snippet-rows"
              ghost-class="ghost-row"
              @change="onAfterDragChange"
              @start="setActiveZone('after')"
            >
              <RowBlock
                v-for="row in localAfter"
                :key="row.id"
                :block="row"
                :variables="variables"
                :selected="activeZone === 'after' && selectedId === row.id"
                :selected-block-id="
                  activeZone === 'after' ? selectedChildId : ''
                "
                @select="onSelect('after', row.id, '')"
                @select-block="(id) => onSelect('after', row.id, id)"
                @update="(r) => onUpdateRow('after', row.id, r)"
                @duplicate="onDuplicateRow('after', row.id)"
                @remove="onRemoveRow('after', row.id)"
              />
            </draggable>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="3" class="pl-md-2">
        <BlockPropertiesPanel
          :selected-block="selectedBlock"
          :variables="variables"
          @update="onUpdateSelected"
        />
      </v-col>
    </v-row>

    <v-alert v-if="overSize" type="warning" text dense class="mt-3">
      Ein Bereich ist sehr groß (Einleitung
      {{ Math.round(introSizeBytes / 1024) }} KB · Abschluss
      {{ Math.round(afterSizeBytes / 1024) }} KB · max. 50 KB je Bereich).
    </v-alert>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import BlockPalette from "./BlockPalette.vue";
import BlockPropertiesPanel from "./BlockPropertiesPanel.vue";
import RowBlock from "./blocks/RowBlock.vue";
import { createBlock, createRow } from "./blockFactory.js";
import {
  renderBlocksToHtml,
  cryptoRandomId,
} from "./render/renderBlocksToHtml.js";
import { SOFT_WARN_SIZE_BYTES } from "@/components/Mail/snippetCatalog.js";
import { buildSnippetPreviewExtrasHtml } from "@/components/Mail/snippetPreviewExtras.js";

function cloneBlocks(blocks) {
  return JSON.parse(JSON.stringify(blocks || []));
}

function sameBlocks(a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || []);
}

export default {
  name: "CombinedSnippetBlockEditor",
  components: { draggable, BlockPalette, BlockPropertiesPanel, RowBlock },
  props: {
    introBlocks: { type: Array, default: () => [] },
    afterBlocks: { type: Array, default: () => [] },
    variables: { type: Array, default: () => [] },
    snippetKey: { type: String, default: "" },
    showSupportFooter: { type: Boolean, default: true },
  },
  data() {
    return {
      localIntro: [],
      localAfter: [],
      activeZone: "intro",
      selectedId: "",
      selectedChildId: "",
      syncingFromProps: false,
    };
  },
  computed: {
    systemMockHtml() {
      return (
        buildSnippetPreviewExtrasHtml(this.snippetKey, {
          showSupportFooter: this.showSupportFooter,
        }) ||
        "<p style=\"margin:0;color:#666;\">Buchungsdetails und weitere System-Inhalte</p>"
      );
    },
    selectedBlock() {
      if (!this.selectedId) return null;
      const list =
        this.activeZone === "after" ? this.localAfter : this.localIntro;
      const row = list.find((b) => b.id === this.selectedId);
      if (!row) return null;
      if (!this.selectedChildId) return row;
      for (const col of row.columns || []) {
        const found = (col.blocks || []).find(
          (b) => b.id === this.selectedChildId
        );
        if (found) return found;
      }
      return row;
    },
    introHtml() {
      return renderBlocksToHtml(this.localIntro);
    },
    afterHtml() {
      return renderBlocksToHtml(this.localAfter);
    },
    introSizeBytes() {
      return new Blob([this.introHtml]).size;
    },
    afterSizeBytes() {
      return new Blob([this.afterHtml]).size;
    },
    overSize() {
      return (
        this.introSizeBytes > SOFT_WARN_SIZE_BYTES ||
        this.afterSizeBytes > SOFT_WARN_SIZE_BYTES
      );
    },
  },
  watch: {
    introBlocks: {
      immediate: true,
      handler(newVal) {
        if (sameBlocks(newVal, this.localIntro)) return;
        this.syncingFromProps = true;
        this.localIntro = cloneBlocks(newVal);
        this.$nextTick(() => {
          this.syncingFromProps = false;
        });
      },
    },
    afterBlocks: {
      immediate: true,
      handler(newVal) {
        if (sameBlocks(newVal, this.localAfter)) return;
        this.syncingFromProps = true;
        this.localAfter = cloneBlocks(newVal);
        this.$nextTick(() => {
          this.syncingFromProps = false;
        });
      },
    },
    snippetKey() {
      this.activeZone = "intro";
      this.selectedId = "";
      this.selectedChildId = "";
    },
    localIntro: {
      deep: true,
      handler(newVal) {
        if (this.syncingFromProps) return;
        this.$emit("update:introBlocks", cloneBlocks(newVal));
        this.emitChange("intro");
      },
    },
    localAfter: {
      deep: true,
      handler(newVal) {
        if (this.syncingFromProps) return;
        this.$emit("update:afterBlocks", cloneBlocks(newVal));
        this.emitChange("after");
      },
    },
  },
  methods: {
    emitChange(zone) {
      this.$emit("change", {
        zone,
        introBlocks: cloneBlocks(this.localIntro),
        afterBlocks: cloneBlocks(this.localAfter),
        introHtml: this.introHtml,
        afterHtml: this.afterHtml,
      });
    },
    setActiveZone(zone) {
      if (this.activeZone === zone) return;
      this.activeZone = zone;
      this.selectedId = "";
      this.selectedChildId = "";
    },
    getLocal(zone) {
      return zone === "after" ? this.localAfter : this.localIntro;
    },
    setLocal(zone, blocks) {
      if (zone === "after") {
        this.localAfter = blocks;
      } else {
        this.localIntro = blocks;
      }
    },
    onSelect(zone, rowId, childId) {
      this.activeZone = zone;
      this.selectedId = rowId;
      this.selectedChildId = childId || "";
    },
    onAddRow(layout) {
      const zone = this.activeZone;
      const row = createRow(layout);
      this.setLocal(zone, [...this.getLocal(zone), row]);
      this.selectedId = row.id;
      this.selectedChildId = "";
    },
    onAddBlock(type) {
      const zone = this.activeZone;
      const block = createBlock(type);
      if (!block) return;

      let list = [...this.getLocal(zone)];
      let targetRowId = this.selectedId;
      let row = list.find((b) => b.id === targetRowId);

      if (!row) {
        row = createRow([12]);
        list = [...list, row];
        targetRowId = row.id;
      }

      const colIdx =
        row.columns && row.columns.length > 1 && this.selectedChildId
          ? this.findColumnIndex(row, this.selectedChildId)
          : 0;

      const newRow = {
        ...row,
        columns: row.columns.map((c, idx) =>
          idx === colIdx ? { ...c, blocks: [...(c.blocks || []), block] } : c
        ),
      };
      list = list.map((b) => (b.id === targetRowId ? newRow : b));
      this.setLocal(zone, list);
      this.selectedId = targetRowId;
      this.selectedChildId = block.id;
    },
    findColumnIndex(row, blockId) {
      for (let i = 0; i < (row.columns || []).length; i++) {
        if ((row.columns[i].blocks || []).some((b) => b.id === blockId)) {
          return i;
        }
      }
      return 0;
    },
    onUpdateRow(zone, rowId, updated) {
      this.setLocal(
        zone,
        this.getLocal(zone).map((b) =>
          b.id === rowId ? { ...updated, id: rowId } : b
        )
      );
    },
    onDuplicateRow(zone, rowId) {
      const list = this.getLocal(zone);
      const idx = list.findIndex((b) => b.id === rowId);
      if (idx < 0) return;
      const clone = cloneBlocks([list[idx]])[0];
      clone.id = cryptoRandomId();
      (clone.columns || []).forEach((c) => {
        (c.blocks || []).forEach((b) => (b.id = cryptoRandomId()));
      });
      const next = [...list];
      next.splice(idx + 1, 0, clone);
      this.setLocal(zone, next);
    },
    onRemoveRow(zone, rowId) {
      this.setLocal(
        zone,
        this.getLocal(zone).filter((b) => b.id !== rowId)
      );
      if (this.activeZone === zone && this.selectedId === rowId) {
        this.selectedId = "";
        this.selectedChildId = "";
      }
    },
    onIntroDragChange() {
      this.localIntro = [...this.localIntro];
      // Cross-list drag also mutates localAfter via shared group
      this.localAfter = [...this.localAfter];
    },
    onAfterDragChange() {
      this.localAfter = [...this.localAfter];
      this.localIntro = [...this.localIntro];
    },
    clearAfter() {
      this.localAfter = [];
      if (this.activeZone === "after") {
        this.selectedId = "";
        this.selectedChildId = "";
      }
      this.$emit("clear-after");
    },
    onUpdateSelected(updated) {
      if (!this.selectedBlock) return;
      const zone = this.activeZone;
      if (!this.selectedChildId) {
        this.onUpdateRow(zone, this.selectedId, updated);
        return;
      }
      const next = this.getLocal(zone).map((row) => {
        if (row.id !== this.selectedId) return row;
        return {
          ...row,
          columns: row.columns.map((c) => ({
            ...c,
            blocks: (c.blocks || []).map((b) =>
              b.id === this.selectedChildId
                ? { ...updated, id: this.selectedChildId }
                : b
            ),
          })),
        };
      });
      this.setLocal(zone, next);
    },
  },
};
</script>

<style scoped>
.combined-snippet-editor {
  display: flex;
  flex-direction: column;
}
.zone-hint {
  line-height: 1.4;
}
.editor-canvas {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  min-height: 400px;
}
.zone {
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 8px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.zone--active {
  border-color: var(--v-primary-base);
  background: rgba(25, 118, 210, 0.03);
}
.zone-header {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
}
.zone-header__hint {
  margin-left: 8px;
  font-weight: 400;
  color: #9e9e9e;
  font-size: 12px;
}
.canvas-empty {
  text-align: center;
  padding: 60px 16px;
  color: #aaa;
}
.canvas-empty--compact {
  padding: 28px 12px;
  border: 1px dashed #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
}
.system-mock {
  margin: 10px 8px;
  padding: 10px 12px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    -45deg,
    #fafafa,
    #fafafa 8px,
    #f3f3f3 8px,
    #f3f3f3 16px
  );
  border: 1px dashed #bdbdbd;
  pointer-events: none;
  user-select: none;
}
.system-mock__badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #616161;
  margin-bottom: 8px;
}
.system-mock__body {
  font-size: 14px;
  line-height: 1.45;
  color: #616161;
  opacity: 0.92;
}
.ghost-row {
  opacity: 0.4;
  background: var(--v-primary-lighten4);
  border: 2px dashed var(--v-primary-base);
}
</style>

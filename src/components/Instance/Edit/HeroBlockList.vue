<template>
  <div class="hero-block-list">
    <v-card outlined class="hero-block-list__card rounded-lg">
      <div class="hero-block-list__head d-flex align-center px-4">
        <v-icon small class="mr-3" color="grey">mdi-view-dashboard</v-icon>
        <span class="text-subtitle-2 flex-grow-1">Blöcke</span>
        <span class="text-caption text--secondary hero-block-list__count">
          {{ countLabel }}
        </span>
      </div>

      <template v-if="groups.length > 0">
        <div v-for="group in groups" :key="group.zone" class="hero-block-group">
          <!-- The group carries the arrow of its Zone, so the list reads
               like the Position grid it mirrors. -->
          <div
            class="hero-block-group__label text-caption text--secondary d-flex align-center px-4 pt-2 pb-1"
          >
            <v-icon x-small class="mr-1">{{ iconOf(group.zone) }}</v-icon>
            {{ group.label }}
          </div>

          <draggable
            :value="group.blocks"
            :data-zone="group.zone"
            :animation="180"
            group="hero-blocks"
            handle=".hero-block-row__handle"
            ghost-class="hero-block-row--ghost"
            @change="onDrag(group.zone, $event)"
          >
            <div
              v-for="block in group.blocks"
              :key="block.id"
              :data-id="block.id"
              class="hero-block-row d-flex align-center px-3 py-1"
              :class="{
                'hero-block-row--selected': block.id === selectedBlockId,
              }"
              @click="select(block.id)"
            >
              <v-icon
                small
                class="hero-block-row__handle mr-2"
                title="Ziehen zum Sortieren"
              >
                mdi-drag
              </v-icon>

              <v-icon small class="mr-2">{{ typeOf(block).icon }}</v-icon>

              <div class="flex-grow-1 text-truncate text-body-2">
                <span v-if="summaryOf(block)">{{ summaryOf(block) }}</span>
                <span v-else class="text--secondary font-italic">
                  {{ typeOf(block).label }}
                </span>
              </div>

              <!-- Where the warnings of the Preview Report and the backend's
                 field errors land. -->
              <slot name="badge" :block="block" />

              <v-icon
                v-if="block.homeOnly"
                x-small
                class="hero-block-row__flag ml-1"
                title="Nur auf der Startseite"
              >
                mdi-home-outline
              </v-icon>
              <v-icon
                v-if="block.hideOnMobile"
                x-small
                class="hero-block-row__flag ml-1"
                title="Auf Mobilgeräten ausgeblendet"
              >
                mdi-cellphone-off
              </v-icon>

              <!-- Acting on a row through its menu is not selecting it. -->
              <div class="hero-block-row__menu ml-1" @click.stop>
                <v-menu offset-y left>
                  <template #activator="{ on, attrs }">
                    <v-btn icon small v-bind="attrs" v-on="on">
                      <v-icon small>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list dense>
                    <v-list-item
                      :disabled="!canMove(block.id, 'up')"
                      @click="move(block.id, 'up')"
                    >
                      <v-list-item-title>Nach oben</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      :disabled="!canMove(block.id, 'down')"
                      @click="move(block.id, 'down')"
                    >
                      <v-list-item-title>Nach unten</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      :disabled="atMaxBlocks"
                      @click="duplicate(block.id)"
                    >
                      <v-list-item-title>Duplizieren</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="remove(block.id)">
                      <v-list-item-title>Löschen</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </draggable>
        </div>
      </template>

      <p
        v-else
        class="hero-block-list__empty text--secondary text-body-2 px-4 py-3 mb-0"
      >
        Noch keine Blöcke.
      </p>

      <!-- Adding is a row of the list itself, where the new Block will land. -->
      <div class="hero-block-list__foot">
        <v-menu offset-y>
          <template #activator="{ on, attrs }">
            <v-btn
              block
              text
              color="primary"
              class="hero-block-list__add"
              :disabled="atMaxBlocks"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon small left>mdi-plus</v-icon>
              Block hinzufügen
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item
              v-for="type in blockTypes"
              :key="type.value"
              @click="add(type.value)"
            >
              <v-list-item-title>{{ type.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <p
          v-if="atMaxBlocks"
          class="text--secondary text-caption px-4 pb-2 mb-0"
        >
          Mehr als {{ maxBlocks }} Blöcke sind nicht möglich.
        </p>
      </div>
    </v-card>

    <p class="text--secondary text-caption mt-2 mb-0">
      Auf Mobilgeräten erscheinen die Blöcke zentriert untereinander: Reihe für
      Reihe, links vor rechts, innerhalb einer Position in Listenreihenfolge.
    </p>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import {
  HERO_BLOCK_TYPES,
  HERO_ZONE_ICONS,
  MAX_HERO_BLOCKS,
  canMoveHeroBlock,
  duplicateHeroBlock,
  heroBlockGroups,
  heroBlockSummary,
  heroBlockType,
  insertHeroBlock,
  moveHeroBlock,
  removeHeroBlock,
  setHeroBlockZone,
} from "@/utils/heroBlocks";

/**
 * The „Blöcke“ section of the Hero Editor: one outlined box with the count in
 * its head, the Blocks in nine groups by Zone, the ⋮ menu of a row and
 * „Block hinzufügen“ as the list's last row.
 *
 * Every rule the list follows lives in `@/utils/heroBlocks` — this component
 * reads the groups off the array it is given and hands the answer of a rule
 * back up, so the array the editor holds is always in canonical order.
 */
export default {
  name: "HeroBlockList",
  components: { draggable },
  model: { prop: "blocks", event: "input" },
  props: {
    blocks: { type: Array, required: true },
    selectedBlockId: { type: String, default: null },
  },
  data() {
    return { blockTypes: HERO_BLOCK_TYPES, maxBlocks: MAX_HERO_BLOCKS };
  },
  computed: {
    groups() {
      return heroBlockGroups(this.blocks);
    },
    atMaxBlocks() {
      return this.blocks.length >= MAX_HERO_BLOCKS;
    },
    /** How full the layout is, against the cap the backend enforces. */
    countLabel() {
      return `${this.blocks.length} von ${this.maxBlocks}`;
    },
  },
  methods: {
    iconOf(zone) {
      return HERO_ZONE_ICONS[zone];
    },
    typeOf(block) {
      return heroBlockType(block.type);
    },
    summaryOf(block) {
      return heroBlockSummary(block);
    },
    canMove(id, direction) {
      return canMoveHeroBlock(this.blocks, id, direction);
    },
    select(id) {
      this.$emit("update:selectedBlockId", id);
    },
    move(id, direction) {
      if (!this.canMove(id, direction)) {
        return;
      }
      this.$emit("input", moveHeroBlock(this.blocks, id, direction));
    },
    duplicate(id) {
      if (this.atMaxBlocks) {
        return;
      }
      this.apply(duplicateHeroBlock(this.blocks, id, this.selectedBlockId));
    },
    remove(id) {
      this.apply(removeHeroBlock(this.blocks, id, this.selectedBlockId));
    },
    add(type) {
      if (this.atMaxBlocks) {
        return;
      }
      this.apply(
        insertHeroBlock(this.blocks, type, { after: this.selectedBlockId })
      );
    },
    /**
     * A drop. The group a Block lands in reports it, so `added` carries the
     * whole move and the `removed` of the group it left needs no handling —
     * acting on it as well would take the Block out of the layout.
     */
    onDrag(zone, event) {
      const change = event.added || event.moved;
      if (!change) {
        return;
      }
      this.$emit(
        "input",
        setHeroBlockZone(this.blocks, change.element.id, zone, change.newIndex)
      );
    },
    apply({ blocks, selectedBlockId }) {
      this.$emit("input", blocks);
      if (selectedBlockId !== this.selectedBlockId) {
        this.$emit("update:selectedBlockId", selectedBlockId);
      }
    },
  },
};
</script>

<style scoped>
.hero-block-list__head {
  min-height: 44px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.hero-block-group + .hero-block-group {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.hero-block-list__foot {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

/* „Block hinzufügen“ is a row, so it sits on the row's left edge and takes
   the row's shape rather than a button's. */
.hero-block-list__add.v-btn {
  height: 40px;
  padding: 0 16px;
  justify-content: flex-start;
  border-radius: 0;
}

.hero-block-row {
  cursor: pointer;
  border-left: 3px solid transparent;
}

.hero-block-row:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

/* The selected row is the one thing in the list painted in the theme: the
   primary rule on its left is the rule the detail card below continues. */
.hero-block-row--selected {
  border-left-color: var(--v-primary-base);
  background-color: var(--v-accent-base);
}

/* The separators and the two tints are ink on a light sheet; on a dark one
   they have to be light, or the group and the selection disappear. */
.theme--dark .hero-block-list__head,
.theme--dark .hero-block-list__foot,
.theme--dark .hero-block-group + .hero-block-group {
  border-color: rgba(255, 255, 255, 0.08);
}

.theme--dark .hero-block-row:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.theme--dark .hero-block-row--selected {
  background-color: rgba(255, 255, 255, 0.08);
}

.hero-block-row--ghost {
  opacity: 0.4;
}

.hero-block-row__handle {
  cursor: grab;
}
</style>

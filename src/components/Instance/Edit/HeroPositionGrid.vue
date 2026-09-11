<template>
  <div>
    <div class="hero-position-grid">
      <v-btn
        v-for="cell in cells"
        :key="cell.zone"
        :data-zone="cell.zone"
        class="hero-position-grid__cell"
        :color="cell.active ? 'primary' : undefined"
        :outlined="!cell.active"
        :title="cell.label"
        :aria-label="cell.label"
        :aria-pressed="String(cell.active)"
        depressed
        small
        @click="choose(cell)"
      >
        <v-icon small>{{ cell.icon }}</v-icon>
        <span v-if="cell.count > 0" class="hero-position-grid__count ml-1">
          {{ cell.count }}
        </span>
      </v-btn>
    </div>

    <p class="text--secondary text-caption mt-2 mb-0">
      Auf Mobilgeräten werden alle Blöcke zentriert untereinander gezeigt: erst
      obere, dann mittlere, dann untere Reihe.
    </p>
  </div>
</template>

<script>
import {
  HERO_ZONES,
  HERO_ZONE_ICONS,
  HERO_ZONE_LABELS,
  heroBlockZoneCounts,
} from "@/utils/heroBlocks";

/**
 * The „Position“ section of the Block detail form: the nine Zones as a 3x3
 * grid of toggle buttons.
 *
 * A cell counts the **other** Blocks that already sit in that Zone, so the
 * author sees where the crowd is before moving anything. Choosing a cell asks
 * for the move; the editor is what puts the Block at the end of that Zone's
 * stack, the same effect a Zone click in the Live Preview has (hero layout
 * spec §3). Clicking the Block's own cell changes nothing.
 */
export default {
  name: "HeroPositionGrid",
  props: {
    /** The Block being moved — it does not count itself. */
    block: { type: Object, required: true },
    /** Every Block of the layout, the moved one included. */
    blocks: { type: Array, required: true },
  },
  computed: {
    cells() {
      const counts = heroBlockZoneCounts(this.blocks, this.block.id);

      return HERO_ZONES.map((zone) => ({
        zone,
        label: HERO_ZONE_LABELS[zone],
        icon: HERO_ZONE_ICONS[zone],
        active: zone === this.block.zone,
        count: counts[zone],
      }));
    },
  },
  methods: {
    choose(cell) {
      if (cell.active) {
        return;
      }
      this.$emit("input", cell.zone);
    },
  },
};
</script>

<style scoped>
.hero-position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 240px;
}

/* The cells are square and equal — a `v-btn` sizes itself by its content, so
   the grid has to overrule its width and height. */
.hero-position-grid__cell.v-btn {
  min-width: 0;
  width: 100%;
  height: 40px;
  padding: 0;
}

.hero-position-grid__count {
  font-size: 11px;
  line-height: 1;
}
</style>

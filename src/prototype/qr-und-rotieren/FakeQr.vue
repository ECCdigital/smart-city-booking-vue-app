<script>
/**
 * PROTOTYPE (tickets#1094) — a QR-Code to look at, not to scan. The pattern
 * follows the Scan-Code, so Rotieren visibly changes it. `stale` greys it out
 * and crosses it, for the sticker that no longer works.
 */
import { qrPath } from "./qr";

export default {
  name: "FakeQr",
  props: {
    seed: { type: String, required: true },
    size: { type: Number, default: 120 },
    stale: { type: Boolean, default: false },
  },
  computed: {
    path() {
      return qrPath(this.seed);
    },
  },
};
</script>

<template>
  <svg
    class="fake-qr"
    :class="{ 'fake-qr--stale': stale }"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${path.size} ${path.size}`"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="`QR-Code ${seed}`"
  >
    <rect :width="path.size" :height="path.size" fill="#fff" />
    <path :d="path.d" fill="#111" />
    <line
      v-if="stale"
      x1="1"
      y1="1"
      :x2="path.size - 1"
      :y2="path.size - 1"
      stroke="#c62828"
      stroke-width="0.8"
    />
  </svg>
</template>

<style scoped>
.fake-qr {
  display: block;
  flex: none;
}

.fake-qr--stale path {
  fill: #bdbdbd;
}
</style>

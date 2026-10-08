<!-- PROTOTYPE (ECCdigital/tickets#342), throwaway: never merge.
     Variant A, „Radio-Liste des Editors“: one flat list of every offered
     mode, each with icon, name and what the booker does. -->
<template>
  <v-radio-group
    :value="mode"
    class="mt-0 proto-a"
    hide-details
    @change="$emit('choose', $event)"
  >
    <v-radio v-for="m in modes" :key="m" :value="m" class="proto-a__radio">
      <template #label>
        <div>
          <div class="proto-a__name">
            <v-icon small class="mr-2">{{ ICONS[m] }}</v-icon>
            {{ naming.labels[m] }}
            <span v-if="expertOnly(m)" class="proto-a__badge">Experte</span>
          </div>
          <div class="proto-a__explain">{{ EXPLAIN[m] }}</div>
        </div>
      </template>
    </v-radio>
  </v-radio-group>
</template>

<script>
import { EXPLAIN, ICONS } from "./bookingModeShared";
import { isBookableExpertOnlyBookingType } from "@/utils/bookableExpertMode";

export default {
  name: "ModeVariantA",
  props: {
    mode: { type: String, required: true },
    modes: { type: Array, required: true },
    naming: { type: Object, required: true },
  },
  data: () => ({ EXPLAIN, ICONS }),
  methods: {
    expertOnly: isBookableExpertOnlyBookingType,
  },
};
</script>

<style scoped>
.proto-a__radio {
  align-items: flex-start;
  margin-bottom: var(--scb-space-3) !important;
}
.proto-a__name {
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}
.proto-a__explain {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.proto-a__badge {
  margin-left: var(--scb-space-2);
  padding: 0 6px;
  font-size: var(--scb-font-size-caption);
  background: var(--scb-warning-tint);
  border-radius: var(--scb-radius-badge);
}
</style>

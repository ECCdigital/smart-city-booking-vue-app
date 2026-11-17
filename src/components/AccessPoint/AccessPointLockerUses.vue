<script>
// The bookable type whose example is the key to a room; every other type
// reads the bicycle boxes and devices.
const ROOM_TYPE = "room";

/**
 * On top of the dialog of an Open Locker Schließfachanlage
 * (ECCdigital/tickets#1166): what an Anlage does in one sentence, and two
 * examples of an Einsatzfall instead of the mechanism - the key to a room,
 * and bicycle boxes or devices. The example that fits the bookable chosen
 * is highlighted, none without a bookable.
 */
export default {
  name: "AccessPointLockerUses",
  props: {
    // The bookable chosen in the dialog, with its `type`, or `null`.
    bookable: { type: Object, default: null },
  },
  computed: {
    uses() {
      const key = (name) => `accessPoint.management.dialog.uses.${name}`;
      return [
        {
          use: "room",
          icon: "mdi-key-variant",
          title: this.$t(key("room")),
          hint: this.$t(key("roomHint")),
        },
        {
          use: "item",
          icon: "mdi-bike",
          title: this.$t(key("item")),
          hint: this.$t(key("itemHint")),
        },
      ];
    },
    active() {
      if (!this.bookable) return null;
      return this.bookable.type === ROOM_TYPE ? "room" : "item";
    },
  },
};
</script>

<template>
  <div class="locker-uses" data-test="locker-uses">
    <div class="locker-uses__lead mb-2">
      {{ $t("accessPoint.management.dialog.uses.lead") }}
    </div>
    <div
      v-for="item in uses"
      :key="item.use"
      class="locker-use"
      :class="{ 'locker-use--active': active === item.use }"
      data-test="locker-use"
    >
      <v-icon small class="locker-use__icon">{{ item.icon }}</v-icon>
      <div>
        <div class="locker-use__title" data-test="locker-use-title">
          {{ item.title }}
        </div>
        <div class="locker-use__hint">{{ item.hint }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.locker-uses__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text);
}
.locker-use {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-3);
  padding: var(--scb-space-2) var(--scb-space-3);
  border-radius: var(--scb-radius-surface);
  transition: background var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
}
.locker-use + .locker-use {
  margin-top: var(--scb-space-1);
}
.locker-use--active {
  background: var(--scb-selected-tint);
  box-shadow: var(--scb-ring-selected);
}
/* Half a step down, onto the first line of the title. */
.locker-use__icon {
  margin-top: calc(var(--scb-space-1) / 2);
}
.locker-use--active .locker-use__icon {
  color: var(--v-primary-base);
}
.locker-use__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-medium);
}
.locker-use__hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>

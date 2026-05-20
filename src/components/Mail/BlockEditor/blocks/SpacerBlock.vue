<template>
  <div
    class="spacer-block"
    :class="{ selected }"
    :style="{ height: (block.height || 16) + 'px' }"
  >
    <span v-if="selected" class="text-caption grey--text">
      Abstand {{ block.height || 16 }}px
    </span>
  </div>
</template>

<script>
export default {
  name: "SpacerBlock",
  props: {
    block: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.spacer-block {
  background: repeating-linear-gradient(
    45deg,
    #fafafa,
    #fafafa 6px,
    #f0f0f0 6px,
    #f0f0f0 12px
  );
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spacer-block.selected {
  outline: 2px solid var(--v-primary-base);
}
</style>

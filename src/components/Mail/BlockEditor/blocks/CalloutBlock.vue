<template>
  <div class="callout-block" :class="['variant-' + variant, { selected }]">
    <div v-if="block.title" class="font-weight-medium mb-1">
      {{ block.title }}
    </div>
    <TextBlock
      :block="textProxy"
      :variables="variables"
      @update="onInner"
    />
  </div>
</template>

<script>
import TextBlock from "./TextBlock.vue";
export default {
  name: "CalloutBlock",
  components: { TextBlock },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    selected: { type: Boolean, default: false },
  },
  computed: {
    variant() {
      return this.block.variant || "info";
    },
    textProxy() {
      return { ...this.block, type: "text" };
    },
  },
  methods: {
    onInner(updated) {
      this.$emit("update", { ...this.block, html: updated.html });
    },
  },
};
</script>

<style scoped>
.callout-block {
  border-left: 4px solid;
  padding: 12px 16px;
  border-radius: 2px;
}
.callout-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.callout-block.variant-info {
  border-color: #1976d2;
  background: #e3f2fd;
  color: #0d3c61;
}
.callout-block.variant-success {
  border-color: #2e7d32;
  background: #e8f5e9;
  color: #1b5e20;
}
.callout-block.variant-warning {
  border-color: #ed6c02;
  background: #fff4e5;
  color: #7a3c00;
}
</style>

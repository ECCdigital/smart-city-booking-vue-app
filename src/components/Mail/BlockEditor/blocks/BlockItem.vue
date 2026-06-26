<template>
  <div
    class="block-item"
    :class="{ selected }"
    @click.stop="$emit('select')"
  >
    <div class="block-controls" v-if="selected">
      <v-btn icon x-small class="drag-handle" title="Verschieben">
        <v-icon x-small>mdi-drag</v-icon>
      </v-btn>
      <v-btn icon x-small @click.stop="$emit('duplicate')" title="Duplizieren">
        <v-icon x-small>mdi-content-copy</v-icon>
      </v-btn>
      <v-btn icon x-small @click.stop="$emit('remove')" title="Entfernen">
        <v-icon x-small color="error">mdi-delete</v-icon>
      </v-btn>
    </div>
    <component
      :is="componentForType"
      :block="block"
      :variables="variables"
      :selected="selected"
      @update="(b) => $emit('update', b)"
    />
  </div>
</template>

<script>
import TextBlock from "./TextBlock.vue";
import HeadingBlock from "./HeadingBlock.vue";
import ImageBlock from "./ImageBlock.vue";
import ButtonBlock from "./ButtonBlock.vue";
import DividerBlock from "./DividerBlock.vue";
import SpacerBlock from "./SpacerBlock.vue";
import CalloutBlock from "./CalloutBlock.vue";
import QuoteBlock from "./QuoteBlock.vue";
import ListBlock from "./ListBlock.vue";
import RawHtmlBlock from "./RawHtmlBlock.vue";

export default {
  name: "BlockItem",
  components: {
    TextBlock,
    HeadingBlock,
    ImageBlock,
    ButtonBlock,
    DividerBlock,
    SpacerBlock,
    CalloutBlock,
    QuoteBlock,
    ListBlock,
    RawHtmlBlock,
  },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    selected: { type: Boolean, default: false },
  },
  computed: {
    componentForType() {
      const map = {
        text: "TextBlock",
        heading: "HeadingBlock",
        image: "ImageBlock",
        button: "ButtonBlock",
        divider: "DividerBlock",
        spacer: "SpacerBlock",
        callout: "CalloutBlock",
        quote: "QuoteBlock",
        list: "ListBlock",
        rawHtml: "RawHtmlBlock",
      };
      return map[this.block.type] || "div";
    },
  },
};
</script>

<style scoped>
.block-item {
  position: relative;
  border-radius: 4px;
  transition: background 0.15s ease;
  margin: 4px 0;
}
.block-item:hover {
  background: rgba(25, 118, 210, 0.04);
}
.block-controls {
  position: absolute;
  top: -10px;
  right: 4px;
  background: white;
  border-radius: 12px;
  padding: 2px 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  display: flex;
  gap: 2px;
  z-index: 2;
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
</style>

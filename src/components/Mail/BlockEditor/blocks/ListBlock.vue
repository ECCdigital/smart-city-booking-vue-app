<template>
  <div class="list-block" :class="{ selected }">
    <component :is="block.ordered ? 'ol' : 'ul'" class="list-items">
      <li v-for="(item, idx) in block.items || []" :key="idx">
        <MailVariableTextField
          :value="item || ''"
          dense
          hide-details
          flat
          solo
          background-color="transparent"
          placeholder="Listenpunkt…"
          field="line"
          :variables="variables"
          :tenant="tenant"
          @input="(v) => onItem(idx, v)"
        >
          <template #append>
            <v-btn icon x-small @click.stop="removeItem(idx)">
              <v-icon x-small>mdi-close</v-icon>
            </v-btn>
          </template>
        </MailVariableTextField>
      </li>
    </component>
    <v-btn x-small text color="primary" @click="addItem">
      <v-icon x-small left>mdi-plus</v-icon>
      Punkt hinzufügen
    </v-btn>
  </div>
</template>

<script>
import MailVariableTextField from "@/components/Mail/MailVariableTextField.vue";

export default {
  name: "ListBlock",
  components: { MailVariableTextField },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    tenant: { type: Object, default: () => ({}) },
    selected: { type: Boolean, default: false },
  },
  methods: {
    onItem(idx, val) {
      const items = [...(this.block.items || [])];
      items[idx] = val;
      this.$emit("update", { ...this.block, items });
    },
    addItem() {
      const items = [...(this.block.items || []), ""];
      this.$emit("update", { ...this.block, items });
    },
    removeItem(idx) {
      const items = [...(this.block.items || [])];
      items.splice(idx, 1);
      this.$emit("update", { ...this.block, items });
    },
  },
};
</script>

<style scoped>
.list-block {
  padding: 6px;
  background: white;
  border-radius: 4px;
}
.list-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.list-items {
  padding-left: 24px;
  margin: 0 0 6px;
}
.list-items li {
  margin: 4px 0;
}
</style>

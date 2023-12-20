<template>
  <div>
    <v-list>
      <template
        v-for="(item, i) in items"
        v-if="itemObject(item) !== undefined"
      >
        <v-list-item :key="i">
          <v-list-item-content>
            <v-list-item-title>
              <slot name="text" :itemObject="itemObject(item)">
                <span>{{ itemObject(item)[itemText] }}</span>
              </slot>
            </v-list-item-title>
            <v-list-item-subtitle>
              <slot name="detail" :itemObject="itemObject(item)">
                <span>{{ itemObject(item)[itemDetail] }}</span>
              </slot>
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action title="Nach oben verschieben">
            <v-btn icon small @click="moveUp(i)" v-if="i > 0">
              <v-icon color="grey lighten-1"> mdi-chevron-up</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action title="Nach unten verschieben">
            <v-btn icon small @click="moveDown(i)" v-if="i < items.length - 1">
              <v-icon color="grey lighten-1"> mdi-chevron-down</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action title="Löschen">
            <v-btn icon small @click="remove(i)">
              <v-icon color="grey lighten-1"> mdi-close</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider v-if="i < items.length - 1"></v-divider>
      </template>
    </v-list>

    <div
      class="font-italic text-center grey--text my-5"
      v-if="!items || items.length === 0"
    >
      Es sind keine Einträge vorhanden.
    </div>

    <v-autocomplete
      hide-details
      placeholder="Ein weiteres Element Hinzufügen"
      v-model="addItemValue"
      :items="unselectedItems"
      :item-value="itemValue"
      :item-text="itemText"
    >
      <template v-slot:append-outer>
        <v-btn small color="primary" @click="add">
          <v-icon left> mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </template>
    </v-autocomplete>
  </div>
</template>

<script>
export default {
  name: "SortableList",
  props: ["items", "availableItems", "itemValue", "itemText", "itemDetail"],

  data() {
    return {
      addItemValue: null,
    };
  },

  methods: {
    moveUp(index) {
      if (index > 0) {
        const item = this.items[index];
        this.items.splice(index, 1);
        this.items.splice(index - 1, 0, item);
      }
    },
    moveDown(index) {
      if (index < this.items.length - 1) {
        const item = this.items[index];
        this.items.splice(index, 1);
        this.items.splice(index + 1, 0, item);
      }
    },
    remove(index) {
      this.items.splice(index, 1);
    },
    add() {
      if (this.addItemValue != null) {
        this.items.push(this.addItemValue);
        this.addItemValue = null;
      }
    },
    itemObject(id) {
      return this.availableItems.find((item) => item[this.itemValue] === id);
    },
  },

  computed: {
    unselectedItems() {
      return this.availableItems.filter(
        (item) => !this.items.includes(item[this.itemValue])
      );
    },
  },
};
</script>

<style scoped></style>

<template>
  <div>
    <v-list>
      <template v-for="{ item, i } in knownItems">
        <v-list-item :key="`item-${i}`">
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
        <v-divider
          v-if="i < items.length - 1"
          :key="`divider-${i}`"
        ></v-divider>
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
      <template v-slot:item="{ item }">
        <v-list-item-avatar>
          <v-icon :color="getTypeColor(item.type)">
            {{ getTypeIcon(item.type) }}
          </v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <v-list-item-subtitle class="text--disabled">{{
            getTypeText(item.type)
          }}</v-list-item-subtitle>
        </v-list-item-content>
      </template>

      <template v-slot:selection="{ item }">
        <v-icon small left :color="getTypeIcon(item.type)">
          {{ getTypeIcon(item.type) }}
        </v-icon>
        <span>{{ item.title }}</span>
      </template>

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
import { getTypeColor, getTypeIcon, getTypeText } from "@/utils/bookables";

/** `items` with the entries at `a` and `b` swapped, as a new list. */
function swapped(items, a, b) {
  const next = [...items];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export default {
  name: "SortableList",
  props: ["items", "availableItems", "itemValue", "itemText", "itemDetail"],

  data() {
    return {
      addItemValue: null,
    };
  },

  methods: {
    getTypeIcon,
    getTypeText,
    getTypeColor,
    // The list is the parent's: every change goes out as a new list.
    emitItems(items) {
      this.$emit("update:items", items);
    },
    moveUp(index) {
      if (index > 0) this.emitItems(swapped(this.items, index - 1, index));
    },
    moveDown(index) {
      if (index < this.items.length - 1) {
        this.emitItems(swapped(this.items, index, index + 1));
      }
    },
    remove(index) {
      this.emitItems(this.items.filter((_, i) => i !== index));
    },
    add() {
      if (this.addItemValue != null) {
        this.emitItems([...this.items, this.addItemValue]);
        this.addItemValue = null;
      }
    },
    itemObject(id) {
      return this.availableItems.find((item) => item[this.itemValue] === id);
    },
  },

  computed: {
    // The entries with an object to show, each with its place in `items`.
    knownItems() {
      return (this.items || [])
        .map((item, i) => ({ item, i }))
        .filter(({ item }) => this.itemObject(item) !== undefined);
    },
    unselectedItems() {
      return this.availableItems.filter(
        (item) => !this.items.includes(item[this.itemValue])
      );
    },
  },
};
</script>

<style scoped></style>

<template>
  <div>
    <v-list>
      <template v-for="{ entry, object, i } in shownEntries">
        <v-list-item :key="`item-${i}`">
          <v-list-item-content>
            <v-list-item-title>
              <slot name="text" :itemObject="object">
                <span>{{ object[itemText] }}</span>
              </slot>
            </v-list-item-title>
            <v-list-item-subtitle>
              <slot name="detail" :itemObject="object">
                <span>{{ object[itemDetail] }}</span>
              </slot>
            </v-list-item-subtitle>
          </v-list-item-content>
          <slot name="entry" :entry="entry" :index="i" />
          <v-list-item-action :title="$t('bookable.edit.list.up')">
            <v-btn icon small @click="moveUp(i)" v-if="i > 0">
              <v-icon color="grey lighten-1"> mdi-chevron-up</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action :title="$t('bookable.edit.list.down')">
            <v-btn icon small @click="moveDown(i)" v-if="i < items.length - 1">
              <v-icon color="grey lighten-1"> mdi-chevron-down</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action :title="$t('bookable.edit.common.remove')">
            <v-btn
              icon
              small
              :data-test="`${testId}-remove`"
              @click="remove(i)"
            >
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
      {{ $t("bookable.edit.list.empty") }}
    </div>

    <v-autocomplete
      hide-details
      :placeholder="$t('bookable.edit.list.add-placeholder')"
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
          {{ $t("bookable.edit.common.add") }}
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

/**
 * An ordered list of entries that each point at one of `availableItems`:
 * up, down, remove, and a picker to add one not listed yet. The list is the
 * parent's - every change goes out as `update:items` with the new list.
 *
 * An entry is the item's id (`itemValue`) by default; `entryId` reads the id
 * from an entry of another shape and `newEntry` builds one for an added id.
 * The slot `entry` adds controls of an entry beside its name.
 */
export default {
  name: "SortableList",
  props: {
    items: { type: Array, default: () => [] },
    availableItems: { type: Array, default: () => [] },
    itemValue: { type: String, default: "id" },
    itemText: { type: String, default: "title" },
    itemDetail: { type: String, default: null },
    entryId: { type: Function, default: (entry) => entry },
    newEntry: { type: Function, default: (id) => id },
    /** The prefix of the `data-test` hooks. */
    testId: { type: String, default: "sortable" },
  },

  data() {
    return {
      addItemValue: null,
    };
  },

  methods: {
    getTypeIcon,
    getTypeText,
    getTypeColor,
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
        this.emitItems([...this.items, this.newEntry(this.addItemValue)]);
        this.addItemValue = null;
      }
    },
    itemObject(id) {
      return this.availableItems.find((item) => item[this.itemValue] === id);
    },
  },

  computed: {
    // The entries with an item to show, each with its place in `items`.
    shownEntries() {
      return this.items
        .map((entry, i) => ({
          entry,
          object: this.itemObject(this.entryId(entry)),
          i,
        }))
        .filter(({ object }) => object !== undefined);
    },
    unselectedItems() {
      const listed = this.items.map((entry) => this.entryId(entry));
      return this.availableItems.filter(
        (item) => !listed.includes(item[this.itemValue])
      );
    },
  },
};
</script>

<style scoped></style>

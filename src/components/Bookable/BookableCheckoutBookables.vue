<template>
  <div>
    <v-list>
      <template v-for="(item, i) in items">
        <div
          v-if="itemObject(item.bookableId) !== undefined"
          :key="item.bookableId"
        >
          <v-list-item :key="item.bookableId">
            <v-list-item-content>
              <v-list-item-title>
                <slot name="text" :itemObject="itemObject(item.bookableId)">
                  <span>{{ itemObject(item.bookableId).title }}</span>
                </slot>
              </v-list-item-title>
              <v-list-item-subtitle>
                <slot name="detail" :itemObject="itemObject(item.bookableId)">
                  <span>{{
                    getTypeText(itemObject(item.bookableId).type)
                  }}</span>
                </slot>
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-content>
              <v-checkbox
                class="ml-6"
                dense
                :input-value="item.mandatory"
                :label="$t('bookable.edit.list.mandatory')"
                hide-details
                data-test="checkout-mandatory"
                @change="setMandatory(i, $event)"
              ></v-checkbox>
            </v-list-item-content>
            <v-list-item-action :title="$t('bookable.edit.list.up')">
              <v-btn icon small @click="moveUp(i)" v-if="i > 0">
                <v-icon color="grey lighten-1"> mdi-chevron-up</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action :title="$t('bookable.edit.list.down')">
              <v-btn
                icon
                small
                @click="moveDown(i)"
                v-if="i < items.length - 1"
              >
                <v-icon color="grey lighten-1"> mdi-chevron-down</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action :title="$t('bookable.edit.common.remove')">
              <v-btn icon small data-test="checkout-remove" @click="remove(i)">
                <v-icon color="grey lighten-1"> mdi-close</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
          <v-divider v-if="i < items.length - 1"></v-divider>
        </div>
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
      item-value="id"
      item-text="title"
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

export default {
  name: "BookableCheckoutBookables",
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    availableItems: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      addItemValue: null,
    };
  },

  methods: {
    getTypeColor,
    getTypeText,
    getTypeIcon,
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
    setMandatory(index, mandatory) {
      this.emitItems(
        this.items.map((item, i) =>
          i === index ? { ...item, mandatory: !!mandatory } : item
        )
      );
    },
    add() {
      if (this.addItemValue != null) {
        this.emitItems([
          ...this.items,
          { bookableId: this.addItemValue, mandatory: false },
        ]);
        this.addItemValue = null;
      }
    },
    itemObject(id) {
      return this.availableItems.find((item) => item.id === id);
    },
  },

  computed: {
    unselectedItems() {
      return this.availableItems.filter(
        (item) => !this.items.some((entry) => entry.bookableId === item.id)
      );
    },
  },
};
</script>

<style scoped></style>

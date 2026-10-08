<script>
/**
 * One list of the Preisnachlass (roles or people) as rows: name, percent,
 * remove, and a field to add an entry at 100 %. It never changes `items`:
 * every change goes out as the rebuilt list (`update:items`).
 *
 * `options` are `{ id, label, sub?, unknown? }`: what the tenant knows, plus
 * the ids it no longer knows (shown, removable, not offered to add).
 */
export default {
  name: "BookingDiscountList",
  props: {
    items: { type: Array, default: () => [] },
    /** `roleId` or `userId`: the id field of an entry. */
    idKey: { type: String, required: true },
    options: { type: Array, default: () => [] },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    addLabel: { type: String, required: true },
    noDataText: { type: String, default: "" },
    /** The rule of the percent, from `bookableValidation`. */
    rules: { type: Array, default: () => [] },
  },
  data() {
    // Bumped after an add, so the add field starts empty again.
    return { addKey: 0 };
  },
  computed: {
    rows() {
      return this.items.map((entry) => ({
        entry,
        option: this.optionOf(entry[this.idKey]),
      }));
    },
    addable() {
      const taken = this.items.map((entry) => entry[this.idKey]);
      return this.options.filter(
        (option) => !option.unknown && !taken.includes(option.id)
      );
    },
  },
  methods: {
    optionOf(id) {
      return this.options.find((option) => option.id === id) || { label: id };
    },
    setPercent(index, value) {
      const discountPercent = value === "" || value == null ? "" : +value;
      this.$emit(
        "update:items",
        this.items.map((entry, i) =>
          i === index ? { ...entry, discountPercent } : entry
        )
      );
    },
    remove(index) {
      this.$emit(
        "update:items",
        this.items.filter((_, i) => i !== index)
      );
    },
    add(id) {
      if (!id) return;
      this.addKey += 1;
      this.$emit("update:items", [
        ...this.items,
        { [this.idKey]: id, discountPercent: 100 },
      ]);
    },
  },
};
</script>

<template>
  <div class="discount-list">
    <div class="discount-list__label">
      <v-icon small>{{ icon }}</v-icon>
      {{ label }}
    </div>
    <div
      v-for="(row, index) in rows"
      :key="row.entry[idKey] || index"
      class="discount-list__row"
      data-test="discount-row"
    >
      <div class="discount-list__name">
        <span data-test="discount-name">{{ row.option.label }}</span>
        <span v-if="row.option.sub" class="discount-list__sub">
          {{ row.option.sub }}
        </span>
      </div>
      <v-text-field
        class="discount-list__percent"
        :value="row.entry.discountPercent"
        :aria-label="$t('bookable.flow.permission.percent')"
        :rules="rules"
        type="number"
        min="0"
        max="100"
        step="1"
        suffix="%"
        outlined
        dense
        hide-details="auto"
        @input="setPercent(index, $event)"
      />
      <v-btn
        icon
        small
        :title="$t('bookable.flow.permission.remove')"
        :aria-label="$t('bookable.flow.permission.remove')"
        data-test="discount-remove"
        @click="remove(index)"
      >
        <v-icon small>mdi-close</v-icon>
      </v-btn>
    </div>
    <v-autocomplete
      :key="addKey"
      class="discount-list__add"
      :items="addable"
      item-text="label"
      item-value="id"
      :label="addLabel"
      :no-data-text="noDataText"
      prepend-inner-icon="mdi-plus"
      outlined
      dense
      hide-details
      @change="add"
    >
      <template #item="{ item }">
        <v-list-item-content>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
          <v-list-item-subtitle v-if="item.sub">
            {{ item.sub }}
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-autocomplete>
  </div>
</template>

<style scoped>
.discount-list + .discount-list {
  margin-top: var(--scb-space-5);
}

.discount-list__label {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.discount-list__row {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-space-3);
  padding: var(--scb-space-2) 0;
  border-bottom: 1px solid var(--scb-rule);
}

.discount-list__name {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  min-height: 40px;
  min-width: 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}

.discount-list__sub {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.discount-list__percent {
  flex: 0 0 120px;
}

.discount-list__row .v-btn {
  margin-top: 6px;
}

.discount-list__add {
  margin-top: var(--scb-space-3);
}
</style>

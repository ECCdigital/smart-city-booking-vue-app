<script>
import debounce from "lodash/debounce";
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookableEditTags",
  components: { BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return { valid: false, tagsAvailable: [], flagsAvailable: [] };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this._emitDebounced(val);
      },
    },
  },
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:bookable", { ...val });
    }, 200);
  },
  methods: {
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    removeTags(item) {
      this.tags.splice(this.tags.indexOf(item), 1);
    },
    removeFlags(item) {
      this.flags.splice(this.flags.indexOf(item), 1);
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Tags & Flags" icon="mdi-tag-multiple-outline">
      <v-row>
        <v-col cols="12" md="6">
          <v-combobox
            v-model="model.tags"
            :items="tagsAvailable"
            label="Tags"
            hide-selected
            no-data-text="Keine Tags angelegt"
            multiple
            background-color="accent"
            clearable
            chips
            filled
            dense
          >
            <template v-slot:selection="{ attrs, item, select, selected }">
              <v-chip
                v-bind="attrs"
                :input-value="selected"
                close
                small
                color="secondary"
                @click="select"
                @click:close="removeTags(item)"
              >
                <strong>{{ item }}</strong>
              </v-chip>
            </template>
          </v-combobox>
        </v-col>
        <v-col cols="12" md="6">
          <v-combobox
            v-model="model.flags"
            :items="flagsAvailable"
            label="Flags"
            hide-selected
            no-data-text="Keine Flags angelegt"
            multiple
            background-color="accent"
            clearable
            chips
            filled
            dense
          >
            <template v-slot:selection="{ attrs, item, select, selected }">
              <v-chip
                v-bind="attrs"
                :input-value="selected"
                close
                small
                color="secondary"
                @click="select"
                @click:close="removeFlags(item)"
              >
                <strong>{{ item }}</strong>
              </v-chip>
            </template>
          </v-combobox>
        </v-col>
      </v-row>
    </BaseSection>
  </v-form>
</template>

<style scoped></style>

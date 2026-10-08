<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Variant C: a chosen area as a step of its own - the editor's section,
     embedded, in the step's panel. -->
<template>
  <SectionSlice
    :area="area"
    :bookable="bookable"
    @update:bookable="$emit('update:bookable', $event)"
  />
</template>

<script>
import SectionSlice from "./SectionSlice.vue";
import { areaByKey } from "./areas346";

export default {
  name: "AreaStepC",
  components: { SectionSlice },
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
    areaKey: { type: String, required: true },
  },
  computed: {
    area() {
      return areaByKey(this.areaKey);
    },
  },
};
</script>

<script>
import { mapGetters } from "vuex";
import Utils from "@/utils/Utils";

export default {
  name: "ContactInformation",
  data() {
    return {};
  },

  computed: {
    Utils() {
      return Utils;
    },
    ...mapGetters({
      instance: "instance/instance",
    }),
  },
};
</script>

<template>
  <p class="text-left mt-5">
    <small v-if="instance?.contactAddress">
      Dieser Service wird bereitgestellt vom {{ instance?.contactAddress }}.
      Weitere Informationen und Kontaktmöglichkeiten finden Sie unter
      <a
        :href="'https://' + Utils.sanitizeUrl(instance?.contactUrl)"
        target="_blank"
        >{{ Utils.sanitizeUrl(instance?.contactUrl) }}</a
      >.</small
    >
  </p>
</template>

<style scoped></style>

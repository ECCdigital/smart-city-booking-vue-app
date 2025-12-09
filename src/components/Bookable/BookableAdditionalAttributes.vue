<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import Tiptap from "@/components/Tiptap.vue";

export default {
  name: "BookableAdditionalAttributes",
  components: { Tiptap, BaseSection },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
    };
  },
  computed: {
    companyRequired: {
      get() {
        return this.localBookable.requiredFields?.includes("company");
      },
      set(v) {
        if (v) {
          if (!this.localBookable.requiredFields?.includes("company")) {
            this.localBookable.requiredFields.push("company");
          }
        } else {
          this.localBookable.requiredFields =
            this.localBookable.requiredFields.filter(
              (field) => field !== "company"
            );
        }
        this.emitUpdate();
      },
    },
    commentRequired: {
      get() {
        return this.localBookable.requiredFields?.includes("comment");
      },
      set(v) {
        if (v) {
          if (!this.localBookable.requiredFields?.includes("comment")) {
            this.localBookable.requiredFields.push("comment");
          }
        } else {
          this.localBookable.requiredFields =
            this.localBookable.requiredFields.filter(
              (field) => field !== "comment"
            );
        }
        this.emitUpdate();
      },
    },
  },
  watch: {
    bookable: {
      handler(v) {
        this.localBookable = { ...v };
      },
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:bookable", this.localBookable);
    },
  },
};
</script>

<template>
  <BaseSection title="Zusätzliches" icon="mdi-dots-horizontal">
    <h3 class="mt-10 mb-4">Buchungsangaben</h3>

    <v-row>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Firma erforderlich"
          hide-details
          v-model="companyRequired"
        ></v-switch>
      </v-col>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Kommentarfeld erforderlich"
          hide-details
          v-model="commentRequired"
        ></v-switch>
      </v-col>
    </v-row>

    <h3 class="mt-10 mb-4">Buchungshinweise</h3>
    <v-row>
      <v-col>
        <Tiptap v-model="bookingNotes" label="Buchungshinweise"></Tiptap>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>

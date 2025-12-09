<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import BookableCheckoutBookables from "@/components/Bookable/BookableCheckoutBookables.vue";
import _ from "lodash";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import SortableList from "@/components/SortableList.vue";

export default {
  name: "BookableRelationsAttributes",
  components: { SortableList, BookableCheckoutBookables, BaseSection },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
      bookables: [],
    };
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
    async fetchBookables() {
      await ApiBookablesService.getBookables().then((result) => {
        this.bookables = result?.data;
      });
    },
    itemLabel(key) {
      return this.$i18n.t(key);
    },
  },
  computed: {
    bookablesWithoutSelf: function () {
      if (_.isNil(this.id)) {
        return this.bookables;
      } else {
        return this.bookables.filter((b) => b.id !== this.id);
      }
    },
  },
  mounted() {
    this.fetchBookables();
  },
};
</script>

<template>
  <BaseSection title="Abhängige Objekte" icon="mdi-link-variant">
    <h3 class="mt-5">Zusätzliche Buchungsoptionen</h3>
    <p>
      Buchungsobjekte, die Sie als zusätzliche Buchungsoptionen definieren,
      werden ihren Kund*innen beim Checkout als ergänzende Buchungsobjekte
      angezeigt.
    </p>
    <v-row>
      <v-col>
        <BookableCheckoutBookables
          :items="localBookable.checkoutBookableIds"
          :available-items="bookablesWithoutSelf"
        >
        </BookableCheckoutBookables>
      </v-col>
    </v-row>

    <h3 class="mt-10">Abhängige Objekte (Hierarchie)</h3>
    <p>
      Es gibt abhängige Buchungsobjekte, die darauf basieren, dass eine Buchung
      nur durchgeführt werden kann, wenn das dazugehörige Elternobjekt noch
      verfügbar ist und das zugehörige Kinderobjekt noch keine gleichzeitige
      Buchung hat.
    </p>
    <p>
      Dieses Buchungsobjekte wird über die Schnittstelle mit allen hier
      definierten abhängigen Objekten ausgegeben.
    </p>
    <v-row>
      <v-col>
        <SortableList
          :items="localBookable.relatedBookableIds"
          :available-items="bookablesWithoutSelf"
          item-value="id"
          item-text="title"
          item-detail="type"
        >
          <template v-slot:detail="{ itemObject }">
            {{ itemLabel(`editBookables.types.${itemObject.type}`) }}
          </template>
        </SortableList>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>

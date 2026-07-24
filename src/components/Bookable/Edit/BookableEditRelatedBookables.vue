<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import BookableCheckoutBookables from "@/components/Bookable/BookableCheckoutBookables.vue";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import SortableList from "@/components/SortableList.vue";

export default {
  name: "BookableEditRelatedBookables",
  components: {
    SortableList,
    BookableTypeChip,
    BookableCheckoutBookables,
    BaseSection,
  },
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      bookables: [],
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    bookablesWithoutSelf() {
      return this.bookables.filter((b) => b.id !== this.model.id);
    },
  },
  methods: {
    async fetchBookables() {
      await ApiBookablesService.getBookables().then((result) => {
        this.bookables = result?.data;
      });
    },
  },
  mounted() {
    this.fetchBookables();
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Abhängigkeiten" icon="mdi-link-variant" />
    <v-card
      id="be-section-related-checkout"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon small class="mr-2">mdi-cart-plus</v-icon>
        Zusätzliche Buchungsoptionen
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <p class="mb-3 text-caption">
          Buchungsobjekte, die Sie als zusätzliche Buchungsoptionen definieren,
          werden ihren Kund*innen beim Checkout als ergänzende Buchungsobjekte
          angezeigt.
        </p>
        <BookableCheckoutBookables
          :items="model.checkoutBookableIds"
          :available-items="bookablesWithoutSelf"
        >
          <template v-slot:detail="{ itemObject }">
            <BookableTypeChip :type="itemObject.type" />
          </template>
        </BookableCheckoutBookables>
      </v-card-text>
    </v-card>

    <v-card
      id="be-section-related-hierarchy"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon small class="mr-2">mdi-file-tree</v-icon>
        Abhängige Objekte (Hierarchie)
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-alert
          color="info"
          text
          dense
          class="mb-4"
          icon="mdi-information-outline"
        >
          <div class="text-subtitle-1 font-weight-medium mb-2">
            Wie funktioniert die Hierarchie?
          </div>
          <div class="text-body-2">
            Das aktuell bearbeitete Objekt ist das
            <strong>Elternobjekt</strong>. Hier legen Sie die untergeordneten
            <strong>Kinderobjekte</strong> fest.
          </div>
        </v-alert>

        <v-row>
          <v-col cols="12" md="6">
            <v-card outlined class="h-100">
              <v-card-subtitle
                class="pb-2"
                style="background-color: var(--v-success-lighten4)"
              >
                <v-icon small color="success" class="mr-2"
                  >mdi-check-circle</v-icon
                >
                <span class="font-weight-medium">Buchungsregeln</span>
              </v-card-subtitle>
              <v-card-text>
                <v-list dense>
                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="success">mdi-arrow-right</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        Kinderobjekte sind nur buchbar, wenn das Elternobjekt im
                        gewählten Zeitraum verfügbar ist
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="success">mdi-arrow-right</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        Mehrere Kinderobjekte sind unabhängig voneinander
                        buchbar
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="success">mdi-arrow-right</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        Bei Buchung eines Kindes bleiben andere Kinder verfügbar
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card outlined class="h-100">
              <v-card-subtitle
                class="pb-2"
                style="background-color: var(--v-warning-lighten4)"
              >
                <v-icon small color="warning" class="mr-2"
                  >mdi-alert-circle</v-icon
                >
                <span class="font-weight-medium">Wichtige Hinweise</span>
              </v-card-subtitle>
              <v-card-text>
                <v-list dense>
                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="warning">mdi-lock</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        <strong>Elternobjekt gebucht:</strong> Alle
                        Kinderobjekte werden im selben Zeitraum blockiert
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="warning">mdi-lock-outline</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        <strong>Kindobjekt gebucht:</strong> Das Elternobjekt
                        wird im selben Zeitraum blockiert
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="orange"
                        >mdi-ticket-confirmation-outline</v-icon
                      >
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        <strong>Sonderfall Ticket:</strong> Die Buchung eines
                        Tickets blockiert alle weiteren Tickets des
                        Elternobjekts
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-icon class="mr-3">
                      <v-icon small color="info">mdi-api</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-subtitle class="text-wrap">
                        <strong>API-Ausgabe:</strong> Elternobjekt wird zusammen
                        mit allen Kinderobjekten ausgeliefert
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-divider class="my-5"></v-divider>
        <v-row>
          <v-col>
            <SortableList
              :items="model.relatedBookableIds"
              :available-items="bookablesWithoutSelf"
              item-value="id"
              item-text="title"
              item-detail="type"
            >
              <template v-slot:detail="{ itemObject }">
                <BookableTypeChip :type="itemObject.type" />
              </template>
            </SortableList>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}
.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}
</style>

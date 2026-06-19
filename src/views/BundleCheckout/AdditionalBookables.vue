<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn
        outlined
        small
        @click="back"
        :disabled="
          !leadItem.bookable.isScheduleRelated &&
          !leadItem.bookable.isTimePeriodRelated &&
          !leadItem.bookable.isLongRange &&
          !leadItem.bookable.isBlockPeriodRelated
        "
      >
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn color="primary" class="px-10" small @click="submit">
        Weiter
        <v-icon right small>mdi-arrow-right</v-icon>
      </v-btn>
    </div>

    <h2>Weitere Buchungsobjekte hinzufügen</h2>
    <p>
      Die folgenden Objekte passen zu Ihrer Buchung. Möchten Sie diese
      hinzufügen?
    </p>

    <div v-if="subsequentItems.length > 0" class="mb-6">
      <h3 class="mb-2">Ausgewählte Ergänzungen</h3>
      <v-card outlined class="mb-2 rounded-sm" v-for="item in subsequentItems" :key="'selected-' + item.bookableId">
        <v-card-text class="d-flex align-center py-2">
          <div class="flex-grow-1">
            <strong>{{ item.bookable?.title || item.bookableId }}</strong>
            <span v-if="item.mandatory" class="ml-2 grey--text text--darken-1">
              (Pflicht)
            </span>
          </div>
          <v-btn
            v-if="!item.mandatory"
            icon
            small
            color="error"
            @click="removeItem(item)"
          >
            <v-icon small>mdi-close</v-icon>
          </v-btn>
          <v-chip v-else x-small class="ml-2" color="grey lighten-2">
            Erforderlich
          </v-chip>
        </v-card-text>
      </v-card>
    </div>

    <v-divider v-if="subsequentItems.length > 0 && selectableItems.length > 0" class="mb-6"></v-divider>

    <p class="font-italic mt-4" v-if="selectableItems.length === 0 && subsequentItems.length === 0">
      Derzeit gibt es keine weiteren Objekte, die zu Ihrer Buchung passen.
    </p>

    <p class="font-italic mt-4" v-else-if="selectableItems.length === 0 && subsequentItems.length > 0">
      Alle verfügbaren Ergänzungen wurden bereits hinzugefügt.
    </p>

    <v-list three-line v-if="selectableItems.length > 0">
      <h3 class="mb-2">Verfügbare Ergänzungen</h3>
      <template v-for="item in selectableItems">
        <v-list-item :key="item.bookable.id">
          <v-list-item-content>
            <v-list-item-title>{{ item.bookable.title }}</v-list-item-title>
            <v-list-item-subtitle
              v-if="item.isAvailable === false"
              class="font-italic error--text"
            >
              {{ item.error }}
            </v-list-item-subtitle>
            <v-list-item-subtitle
              v-else
              v-html="item.bookable.description"
            ></v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-btn
              text
              color="primary"
              @click="notifySelectedItem(item.bookable, 1)"
              :loading="item.isAvailable === null"
              :disabled="item.isAvailable === false"
            >
              {{ item.isAvailable ? "Hinzufügen" : "Nicht verfügbar" }}
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider :key="'div-' + item.bookable.id"></v-divider>
      </template>
    </v-list>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import { formatCheckoutValidationError } from "@/utils/checkoutErrors";

export default {
  name: "AdditionalBookables",

  props: {
    trace: {
      type: Boolean,
    },
    leadItem: {
      type: Object,
      required: true,
    },
    subsequentItems: {
      type: Array,
    },
    timeBegin: {
      type: Number,
    },
    timeEnd: {
      type: Number,
    },
  },

  data() {
    return {
      items: [],
    };
  },

  methods: {
    async fetchBookables() {
      try {
        const response = await ApiBookablesService.getPublicBookables(
          this.leadItem.bookable.tenantId
        );

        this.items = response.data
          .filter((bookable) => {
            return this.leadItem.bookable.checkoutBookableIds.find(
              (cb) => cb.bookableId === bookable.id
            );
          })
          .map((bookable) => {
            const checkoutInfo =
              this.leadItem.bookable.checkoutBookableIds.find(
                (cb) => cb.bookableId === bookable.id
              );

            return {
              bookable: bookable,
              isAvailable: null,
              mandatory: checkoutInfo?.mandatory ?? false,
            };
          });

        for (const item of this.items) {
          if (item.mandatory) {
            this.selectMandatoryItem(item.bookable, this.leadItem.amount);
          }
        }
      } catch (error) {
        console.error(error);
      }
    },

    selectMandatoryItem(bookable, amount = 1) {
      this.$emit("item-selected", {
        bookableId: bookable.id,
        amount: amount,
        valid: true,
        mandatory: true,
      });
    },

    async checkBookableAvailability() {
      for (const item of this.items) {
        try {
          await ApiCheckoutService.validateCheckoutItem(
            item.bookable.tenantId,
            {
              bookableId: item.bookable.id,
              amount: 1,
            },
            this.timeBegin,
            this.timeEnd
          );

          item.isAvailable = true;
          item.error = null;
        } catch (error) {
          console.log(error);
          item.isAvailable = false;
          item.error = formatCheckoutValidationError(error.response?.data);
        }
      }
    },

    notifySelectedItem(bookable, amount) {
      this.$emit("item-selected", {
        bookableId: bookable.id,
        amount: amount,
        valid: null,
      });
    },

    removeItem(item) {
      this.$emit("item-removed", item.bookableId);
    },

    back() {
      this.$emit("back");
    },

    submit() {
      this.$emit("submit");
    },
  },

  computed: {
    selectableItems() {
      return this.items.filter((item) => {
        return (
          item.bookable.id !== this.leadItem.bookable.id &&
          !this.subsequentItems.some(
            (subsequentItem) =>
              subsequentItem.bookableId === item.bookable.id
          )
        );
      });
    },
  },

  async mounted() {
    await this.fetchBookables();
    await this.checkBookableAvailability();
  },
};
</script>

<style scoped></style>

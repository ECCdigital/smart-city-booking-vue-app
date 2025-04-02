<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn
        outlined
        small
        @click="back"
        :disabled="
          !this.leadItem.bookable.isScheduleRelated &&
          !this.leadItem.bookable.isTimePeriodRelated &&
          !this.leadItem.bookable.isLongRange
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

    <p class="font-italic mt-10" v-if="selectableItems.length === 0">
      Derzeit gibt es keine weiteren Objekte, die zu Ihrer Buchung passen.
    </p>

    <v-list three-line>
      <template v-for="item in selectableItems">
        <v-list-item :key="item.bookable.id">
          <v-list-item-content>
            <v-list-item-title>{{ item.bookable.title }}</v-list-item-title>
            <v-list-item-subtitle
              v-if="item.isAvailable === false"
              class="font-italic"
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
              >{{ item.isAvailable ? "Hinzufügen" : "Nicht verfügbar" }}</v-btn
            >
          </v-list-item-action>
        </v-list-item>
        <v-divider></v-divider>
      </template>
    </v-list>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";

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
      // A list of bookable objects that can be added to the booking
      items: [],
    };
  },

  methods: {
    // Add a bookable to the booking
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
          const response = await ApiCheckoutService.validateCheckoutItem(
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
          item.error = error.response.data;
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
            (subsequentItem) => subsequentItem.bookableId === item.bookable.id
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

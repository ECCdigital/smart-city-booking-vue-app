<template>
<div>
  helooo
  </br>

  <v-btn @click="validateItems(bookingAttempts)">
    <v-icon>mdi-bookmark</v-icon>
    <span>Book</span>
  </v-btn>

  <div
  v-for="(item, index) in bookingAttempts"
  :key="index"
  >
    {{index}}
    </br>
    <div v-for="(bookableItem, index) in item.bookableItems" :key="index">
      <div v-if="bookableItem.valid">
        <p>Valid</p>
        <p>Regular Price: {{ bookableItem.regularPriceEur }}</p>
        <p>User Price: {{ bookableItem.userPriceEur }}</p>
        <p>Regular Gross Price: {{ bookableItem.regularGrossPriceEur }}</p>
        <p>User Gross Price: {{ bookableItem.userGrossPriceEur }}</p>
      </div>
      <div v-else-if="bookableItem.error">
        <p>Error: {{ bookableItem.error }}</p>
      </div>
      <div v-else>
        <p>Not Valid</p>
      </div>

    </div>
  </div>
  <v-btn @click="performGroupCheckout">
    <v-icon>mdi-bookmark</v-icon>
    <span>Checkout</span>
  </v-btn>
</div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";

export default {
  name: "CheckoutGroupBooking",
  data() {
    return {
      leadItem: {
        bookableId: null,
        amount: null,
        bookable: null,
        valid: null,
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      },
      tenantId: null,
      bookingAttempts: [],
      start: 1744200000000,
      end: 17442108000001,
    };
  },
  methods: {
    async fetchLeadBookable() {
      try {
        const response = await ApiBookablesService.getPublicBookable(
          this.leadItem.bookableId,
          this.tenantId
        );

        if (response.data.id) {
          this.leadItem.bookable = response.data;
          if (
            this.leadItem.bookable.permittedRoles?.length > 0 ||
            this.leadItem.bookable.permittedUsers?.length > 0
          ) {
            this.loginRequired = true;
          }
        }
      } catch (error) {
        this.leadItem.bookable = null;
      }
    },

    async validateItems(bookingAttempts) {
      for ( const bookingAttempt of bookingAttempts) {
        for (const item of bookingAttempt.bookableItems) {
          if (
            (item.bookable?.isScheduleRelated ||
              item.bookable?.isTimePeriodRelated ||
              item.bookable?.isLongRange) &&
            (bookingAttempt.timeBegin == null || bookingAttempt.timeEnd == null)
          ) {

            item.valid = null;
            delete item.error;
          } else {
            try {
              const response = await ApiCheckoutService.validateCheckoutItem(
                this.tenantId,
                item,
                bookingAttempt.timeBegin,
                bookingAttempt.timeEnd,
                this.coupon?.id
              );

              console.log(response);

              if (response.status === 200) {
                item.regularPriceEur = response.data.regularPriceEur;
                item.userPriceEur = response.data.userPriceEur;
                item.regularGrossPriceEur = response.data.regularGrossPriceEur;
                item.userGrossPriceEur = response.data.userGrossPriceEur;
                item.valid = true;
                delete item.error;
              }
            } catch (error) {
              item.regularPriceEur = null;
              item.userPriceEur = null;
              item.regurlarGroosPriceEur = null;
              item.userGrossPriceEur = null;

              item.valid = false;
              item.error = error.response.data;
            }
          }
        }
      }
    },
    async performGroupCheckout() {
      const response = await ApiCheckoutService.groupCheckout(
        this.tenantId,
        {
          contactData: {
            mail: "marvin.anders@e-c-crew.de"
          },
          bookingAttempts: this.bookingAttempts,
          paymentProvider: "pmPayment",
        },
        false
      );
      if (response.status !== 200) throw new Error("Checkout service failed");
    },
  },
  mounted() {
    this.tenantId = this.$route.query.tenant;
    this.leadItem.bookableId = this.$route.query.id;
    this.leadItem.amount = parseInt(this.$route.query.amount || 1);
    this.fetchLeadBookable();
    this.bookingAttempts.push(...[{
      bookableItems: [this.leadItem],
      timeBegin: this.start,
      timeEnd: this.end,
      regularPriceEur: null,
      userPriceEur: null,
      regularGrossPriceEur: null,
      userGrossPriceEur: null,
    },
    {
      bookableItems: [this.leadItem],
      timeBegin: this.start,
      timeEnd: this.end,
      regularPriceEur: null,
      userPriceEur: null,
      regularGrossPriceEur: null,
      userGrossPriceEur: null,
    }]
    );
  },
}
</script>

<style scoped>

</style>

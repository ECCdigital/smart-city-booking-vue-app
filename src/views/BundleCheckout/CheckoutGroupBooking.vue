<template>
<div>
  <v-container>
    <h1 class="mb-4">Mehrfachbuchung</h1>
    <p class="mb-6">Hier können Sie mehrere Buchungen mit den gleichen Kontaktdaten erstellen.</p>

    <v-stepper v-model="currentStep" vertical>
      <!-- Step 1: Booking Attempts -->
      <v-stepper-step :complete="currentStep > 1" step="1">
        Buchungen auswählen
      </v-stepper-step>
      <v-stepper-content step="1">
        <v-card flat>
          <v-card-text>
            <div v-for="(attempt, index) in bookingAttempts" :key="index" class="mb-6">
              <v-card outlined class="mb-2">
                <v-card-title class="d-flex justify-space-between">
                  <span>Buchung {{ index + 1 }}</span>
                  <v-btn icon @click="removeBookingAttempt(index)" v-if="bookingAttempts.length > 1">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <checkout-time-selector
                    :lead-item="leadItem"
                    :subsequent-items="[]"
                    :time-begin="attempt.timeBegin"
                    :time-end="attempt.timeEnd"
                    :show-back="false"
                    @booking-time-selected="(time) => updateBookingTime(index, time)"
                  ></checkout-time-selector>
                </v-card-text>
              </v-card>
            </div>

            <v-btn color="primary" @click="addBookingAttempt" class="mb-4">
              <v-icon left>mdi-plus</v-icon>
              Weitere Buchung hinzufügen
            </v-btn>

            <v-btn color="primary" @click="validateAndContinue" block>
              Weiter
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-text>
        </v-card>
      </v-stepper-content>

      <!-- Step 2: Contact Details -->
      <v-stepper-step :complete="currentStep > 2" step="2">
        Kontaktdaten
      </v-stepper-step>
      <v-stepper-content step="2">
        <v-card flat>
          <v-card-text>
            hello
            {{leadItem}}
            <checkout-contact-details
              :lead-item="leadItem"
              :me="me"
              :contact-details="contactDetails"
              @back="currentStep = 1"
              @submit="currentStep = 3"
            ></checkout-contact-details>
            hello
          </v-card-text>
        </v-card>
      </v-stepper-content>

      <!-- Step 3: Payment Provider -->
      <v-stepper-step :complete="currentStep > 3" step="3">
        Zahlungsmethode
      </v-stepper-step>
      <v-stepper-content step="3">
        <v-card flat>
          <v-card-text>
            <checkout-payment-provider
              :active-payment-apps="activePaymentApps"
              @back="currentStep = 2"
              @submit="setPaymentApp"
            ></checkout-payment-provider>
          </v-card-text>
        </v-card>
      </v-stepper-content>

      <!-- Step 4: Summary -->
      <v-stepper-step step="4">
        Zusammenfassung
      </v-stepper-step>
      <v-stepper-content step="4">
        <v-card flat>
          <v-card-text>
            <h2 class="mb-4">Zusammenfassung Ihrer Buchungen</h2>

            <div v-for="(attempt, index) in bookingAttempts" :key="index" class="mb-4">
              <v-card outlined>
                <v-card-title>Buchung {{ index + 1 }}</v-card-title>
                <v-card-text>
                  <div v-if="attempt.timeBegin && attempt.timeEnd">
                    <p><strong>Zeitraum:</strong> {{ formatDateTime(attempt.timeBegin) }} - {{ formatDateTime(attempt.timeEnd) }}</p>
                  </div>

                  <div v-for="(bookableItem, itemIndex) in attempt.bookableItems" :key="itemIndex">
                    <div v-if="bookableItem.valid">
                      <p><strong>{{ bookableItem.bookable?.title }}</strong></p>
                      <p>Preis: {{ formatCurrency(bookableItem.userPriceEur) }}</p>
                    </div>
                    <div v-else-if="bookableItem.error" class="red--text">
                      <p>Fehler: {{ bookableItem.error }}</p>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <v-divider class="my-4"></v-divider>

            <h3>Kontaktdaten</h3>
            <p><strong>Name:</strong> {{ contactDetails.name }}</p>
            <p v-if="contactDetails.company"><strong>Firma:</strong> {{ contactDetails.company }}</p>
            <p><strong>E-Mail:</strong> {{ contactDetails.mail }}</p>
            <p v-if="contactDetails.phone"><strong>Telefon:</strong> {{ contactDetails.phone }}</p>
            <p><strong>Adresse:</strong> {{ contactDetails.street }}, {{ contactDetails.zipCode }} {{ contactDetails.location }}</p>
            <p v-if="contactDetails.comment"><strong>Hinweise:</strong> {{ contactDetails.comment }}</p>

            <v-divider class="my-4"></v-divider>

            <h3>Zahlungsmethode</h3>
            <p><strong>{{ getSelectedPaymentAppTitle() }}</strong></p>

            <v-btn color="primary" @click="performGroupCheckout" block class="mt-6" :loading="isSubmitting">
              Jetzt verbindlich buchen
            </v-btn>

            <v-btn text @click="currentStep = 3" class="mt-2">
              Zurück
            </v-btn>
          </v-card-text>
        </v-card>
      </v-stepper-content>
    </v-stepper>
  </v-container>
</div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiTenantService from "@/services/api/ApiTenantService";
import CheckoutTimeSelector from "@/views/BundleCheckout/CheckoutTimeSelector.vue";
import CheckoutContactDetails from "@/views/BundleCheckout/CheckoutContactDetails.vue";
import CheckoutPaymentProvider from "@/views/BundleCheckout/CheckoutPaymentProvider.vue";
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import { mapGetters } from "vuex";

export default {
  name: "CheckoutGroupBooking",
  components: {
    CheckoutTimeSelector,
    CheckoutContactDetails,
    CheckoutPaymentProvider
  },
  data() {
    return {
      currentStep: 1,
      isSubmitting: false,
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
      me: null,
      contactDetails: {
        name: null,
        company: null,
        mail: null,
        phone: null,
        street: null,
        zipCode: null,
        location: null,
        comment: null,
      },
      activePaymentApps: [],
      selectedPaymentApp: null,
    };
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
    }),
  },
  methods: {
    async fetchMe() {
      try {
        const { data } = await ApiAuthService.me(true);
        this.me = data.user;
        this.contactDetails.mail = this.me.id;
        this.contactDetails.name = this.me.firstName + " " + this.me.lastName;
        this.contactDetails.phone = this.me.phone;
        this.contactDetails.street = this.me.address;
        this.contactDetails.zipCode = this.me.zipCode;
        this.contactDetails.location = this.me.city;
        this.contactDetails.company = this.me.company;
      } catch (error) {
        this.me = null;
      }
    },

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

    async fetchActivePaymentApps() {
      try {
        const response = await ApiTenantService.getTenantActivePaymentApps(
          this.tenantId
        );
        this.activePaymentApps = response.data;

        if (this.activePaymentApps.length === 1) {
          this.selectedPaymentApp = this.activePaymentApps[0].id;
        }
      } catch (error) {
        console.log("Error while fetching active payment apps");
      }
    },

    addBookingAttempt() {
      const newAttempt = {
        bookableItems: [{...this.leadItem}],
        timeBegin: null,
        timeEnd: null,
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      };
      this.bookingAttempts.push(newAttempt);
    },

    removeBookingAttempt(index) {
      this.bookingAttempts.splice(index, 1);
    },

    updateBookingTime(index, time) {
      this.bookingAttempts[index].timeBegin = time.begin;
      this.bookingAttempts[index].timeEnd = time.end;
    },

    async validateAndContinue() {
      // Validate all booking attempts
      await this.validateItems(this.bookingAttempts);

      // Check if all items are valid
      const allValid = this.bookingAttempts.every(attempt =>
        attempt.bookableItems.every(item => item.valid)
      );

      if (allValid) {
        this.currentStep = 2;
      } else {
        // Show error message
        alert("Bitte korrigieren Sie die Fehler in Ihren Buchungen.");
      }
    },

    setPaymentApp(app) {
      this.selectedPaymentApp = app;
      this.currentStep = 4;
    },

    getSelectedPaymentAppTitle() {
      const app = this.activePaymentApps.find(app => app.id === this.selectedPaymentApp);
      return app ? app.title : "";
    },

    formatDateTime(timestamp) {
      return checkoutUtils.dateToLocaleString(timestamp);
    },

    formatCurrency(value) {
      return checkoutUtils.formatCurrency(value);
    },

    async validateItems(bookingAttempts) {
      for (const bookingAttempt of bookingAttempts) {
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
              item.regularGrossPriceEur = null;
              item.userGrossPriceEur = null;

              item.valid = false;
              item.error = error.response.data;
            }
          }
        }
      }
    },

    async performGroupCheckout() {
      this.isSubmitting = true;
      try {
        const response = await ApiCheckoutService.groupCheckout(
          this.tenantId,
          {
            contactData: this.contactDetails,
            bookingAttempts: this.bookingAttempts,
            paymentProvider: this.selectedPaymentApp,
          },
          false
        );

        if (response.status === 200) {
          // Redirect to success page or show success message
          this.$router.push({
            name: "booking-status",
            query: {
              tenant: this.tenantId,
              status: "success",
              bookingId: response.data.id
            }
          });
        } else {
          throw new Error("Checkout service failed");
        }
      } catch (error) {
        console.error("Error during checkout:", error);
        alert("Bei der Buchung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
      } finally {
        this.isSubmitting = false;
      }
    },
  },

  async mounted() {
    this.tenantId = this.$route.query.tenant;
    this.leadItem.bookableId = this.$route.query.id;
    this.leadItem.amount = parseInt(this.$route.query.amount || 1);

    await this.fetchLeadBookable();
    await this.fetchMe();
    await this.fetchActivePaymentApps();

    // Initialize with one booking attempt
    this.bookingAttempts = [{
      bookableItems: [{...this.leadItem}],
      timeBegin: null,
      timeEnd: null,
      regularPriceEur: null,
      userPriceEur: null,
      regularGrossPriceEur: null,
      userGrossPriceEur: null,
    }];
  },
}
</script>

<style scoped>

</style>

<template>
  <div>
    <v-container>
      <h1 class="mb-4">Serienbuchung</h1>
      <p class="mb-6">
        Hier können Sie eine Serienbuchung für das ausgewählte Buchungsobjekt erstellen.
      </p>
      <div>
        <v-stepper v-model="currentStep">
          <!-- Step 1: Booking Attempts -->
          <v-stepper-step :complete="currentStep > 1" step="1">
            Serienbuchung erstellen
          </v-stepper-step>
          <v-stepper-content step="1">
            <v-card flat class="rounded-sm">
              <v-card-text>
                <v-card outlined class="rounded-sm mb-6">
                  <v-card-title class="d-flex justify-space-between">
                    <span>
                      {{ leadItem.bookable.title }}
                    </span>
                    <v-btn outlined> ändern </v-btn>
                  </v-card-title>

                  <v-card-text>
                    <v-row>
                      <v-col>
                        <v-text-field
                          v-model="dateBeginModel"
                          label="Startdatum"
                          prepend-icon="mdi-calendar"
                          disabled
                        ></v-text-field>
                      </v-col>
                      <v-col>
                        <v-text-field
                          v-model="timeBeginModel"
                          label="Startzeit"
                          prepend-icon="mdi-clock-time-four-outline"
                          disabled
                        ></v-text-field>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col>
                        <v-text-field
                          v-model="dateEndModel"
                          label="Enddatum"
                          prepend-icon="mdi-calendar"
                          disabled
                        ></v-text-field>
                      </v-col>
                      <v-col>
                        <v-text-field
                          v-model="timeEndModel"
                          label="Endzeit"
                          prepend-icon="mdi-clock-time-four-outline"
                          disabled
                        ></v-text-field>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <v-card outlined class="rounded-sm mb-6">
                  <v-card-title>Serienbuchung erstellen</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-menu
                          ref="startDateMenu"
                          v-model="startDateMenu"
                          :close-on-content-click="false"
                          transition="scale-transition"
                          offset-y
                          min-width="auto"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              v-model="seriesStartDate"
                              label="Startdatum"
                              prepend-icon="mdi-calendar"
                              readonly
                              v-bind="attrs"
                              v-on="on"
                              :rules="[
                                (v) => !!v || 'Startdatum ist erforderlich',
                              ]"
                            ></v-text-field>
                          </template>
                          <v-date-picker
                            v-model="seriesStartDate"
                            no-title
                            scrollable
                            color="primary"
                            locale="de"
                            :first-day-of-week="1"
                            :min="minBookingDate"
                            @input="startDateMenu = false"
                          >
                          </v-date-picker>
                        </v-menu>
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-menu
                          ref="endDateMenu"
                          v-model="endDateMenu"
                          :close-on-content-click="false"
                          transition="scale-transition"
                          offset-y
                          min-width="auto"
                        >
                          <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                              v-model="seriesEndDate"
                              label="Enddatum"
                              prepend-icon="mdi-calendar"
                              readonly
                              v-bind="attrs"
                              v-on="on"
                              :rules="[
                                (v) => !!v || 'Enddatum ist erforderlich',
                                (v) =>
                                  new Date(v) >= new Date(seriesStartDate) ||
                                  'Enddatum muss nach dem Startdatum liegen',
                              ]"
                            ></v-text-field>
                          </template>
                          <v-date-picker
                            v-model="seriesEndDate"
                            no-title
                            scrollable
                            color="primary"
                            locale="de"
                            :first-day-of-week="1"
                            :min="seriesStartDate"
                            @input="endDateMenu = false"
                          >
                          </v-date-picker>
                        </v-menu>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="seriesFrequency"
                          :items="frequencyOptions"
                          label="Häufigkeit"
                          item-text="text"
                          item-value="value"
                          prepend-icon="mdi-calendar-sync"
                        ></v-select>
                      </v-col>
                    </v-row>
                    <v-btn
                      color="primary"
                      @click="generateSeriesBookings"
                      class="mt-4"
                    >
                      <v-icon left>mdi-calendar-multiple</v-icon>
                      Serie generieren
                    </v-btn>
                  </v-card-text>
                </v-card>

                <div v-if="bookingAttempts.length > 0">
                  <h3 class="mb-4">Generierte Buchungen</h3>

                  <v-card outlined class="rounded-sm mb-6">
                    <v-data-table
                      :headers="headers"
                      :items="bookingAttempts"
                      disable-pagination
                      hide-default-footer
                      hide-default-header
                      class="rounded-sm"
                    >
                      <template v-slot:header="{ props }">
                        <tr>
                          <th v-for="header in props.headers" :key="header.value">
                            {{ header.text }}
                          </th>
                        </tr>
                      </template>

                      <template v-slot:item.timeBegin="{ item }">
                        {{ formatDateTime(item.timeBegin) }}
                      </template>
                      <template v-slot:item.timeEnd="{ item }">
                        {{ formatDateTime(item.timeEnd) }}
                      </template>

                      <template v-slot:item.price="{ item }">
                        {{ formatCurrency(item.userPriceEur) }}
                      </template>

                      <template v-slot:item.valid="{ item }">
                        <v-icon
                          v-if="item.valid"
                          color="green"
                          size="24"
                          class="mr-2"
                        >
                          mdi-check-circle
                        </v-icon>
                        <v-icon
                          v-else-if="item.error"
                          color="red"
                          size="24"
                          class="mr-2"
                        >
                          mdi-alert-circle
                        </v-icon>
                        <span v-if="item.error">{{ item.error }}</span>
                        <span v-else>verfügbar</span>
                      </template>

                      <template v-slot:item.actions="{ item, index }">
                        <v-btn icon @click="removeBookingAttempt(index)">
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </template>
                    </v-data-table>
                  </v-card>
                </div>

                <v-btn
                  color="primary"
                  @click="validateAndContinue"
                  block
                  class="mt-6"
                >
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
                <checkout-contact-details
                  :lead-item="leadItem"
                  :me="me"
                  :contact-details="contactDetails"
                  @back="currentStep = 1"
                  @submit="currentStep = 3"
                ></checkout-contact-details>
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
          <v-stepper-step step="4"> Zusammenfassung </v-stepper-step>
          <v-stepper-content step="4">
            <v-card flat>
              <v-card-text>
                <h2 class="mb-4">Zusammenfassung Ihrer Buchungen</h2>

                <div
                  v-for="(attempt, index) in bookingAttempts"
                  :key="index"
                  class="mb-4"
                >
                  <v-card outlined>
                    <v-card-title>Buchung {{ index + 1 }}</v-card-title>
                    <v-card-text>
                      <div v-if="attempt.timeBegin && attempt.timeEnd">
                        <p>
                          <strong>Zeitraum:</strong>
                          {{ formatDateTime(attempt.timeBegin) }} -
                          {{ formatDateTime(attempt.timeEnd) }}
                        </p>
                      </div>

                      <div
                        v-for="(
                          bookableItem, itemIndex
                        ) in attempt.bookableItems"
                        :key="itemIndex"
                      >
                        <div v-if="bookableItem.valid">
                          <p>
                            <strong>{{ bookableItem.bookable?.title }}</strong>
                          </p>
                          <p>
                            Preis:
                            {{ formatCurrency(bookableItem.userPriceEur) }}
                          </p>
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
                <p v-if="contactDetails.company">
                  <strong>Firma:</strong> {{ contactDetails.company }}
                </p>
                <p><strong>E-Mail:</strong> {{ contactDetails.mail }}</p>
                <p v-if="contactDetails.phone">
                  <strong>Telefon:</strong> {{ contactDetails.phone }}
                </p>
                <p>
                  <strong>Adresse:</strong> {{ contactDetails.street }},
                  {{ contactDetails.zipCode }} {{ contactDetails.location }}
                </p>
                <p v-if="contactDetails.comment">
                  <strong>Hinweise:</strong> {{ contactDetails.comment }}
                </p>

                <v-divider class="my-4"></v-divider>

                <h3>Zahlungsmethode</h3>
                <p>
                  <strong>{{ getSelectedPaymentAppTitle() }}</strong>
                </p>

                <v-btn
                  color="primary"
                  @click="performGroupCheckout"
                  block
                  class="mt-6"
                  :loading="isSubmitting"
                >
                  Jetzt verbindlich buchen
                </v-btn>

                <v-btn text @click="currentStep = 3" class="mt-2">
                  Zurück
                </v-btn>
              </v-card-text>
            </v-card>
          </v-stepper-content>
        </v-stepper>
      </div>
    </v-container>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiTenantService from "@/services/api/ApiTenantService";
import CheckoutContactDetails from "@/views/BundleCheckout/CheckoutContactDetails.vue";
import CheckoutPaymentProvider from "@/views/BundleCheckout/CheckoutPaymentProvider.vue";
import checkoutUtils from "@/views/MultiCheckout/CheckoutUtils";
import { mapGetters } from "vuex";

export default {
  name: "CheckoutGroupBooking",
  components: {
    CheckoutContactDetails,
    CheckoutPaymentProvider,
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

      // First booking data
      dateBeginModel: null,
      dateEndModel: null,
      timeBeginModel: null,
      timeEndModel: null,

      // Series booking data
      startDateMenu: false,
      endDateMenu: false,
      seriesStartDate: null,
      seriesEndDate: null,
      seriesFrequency: "weekly",
      frequencyOptions: [{ text: "Wöchentlich", value: "weekly" }],

      headers: [
        { text: "Startzeit", value: "timeBegin" },
        { text: "Endzeit", value: "timeEnd" },
        { text: "Preis", value: "price" },
        { text: "Buchbar", value: "valid" },
        { text: "Aktionen", value: "actions", sortable: false },
      ],
    };
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
    }),
    minBookingDate() {
      return new Date().toISOString().split("T")[0];
    },
  },
  methods: {
    async generateSeriesBookings() {
      this.bookingAttempts = [];

      if (
        !this.firstBookingDate ||
        !this.timeBeginModel ||
        !this.timeEndModel ||
        !this.seriesStartDate ||
        !this.seriesEndDate
      ) {
        alert("Bitte füllen Sie alle Felder aus.");
        return;
      }

      const startDate = new Date(this.seriesStartDate);
      const endDate = new Date(this.seriesEndDate);

      if (startDate > endDate) {
        alert("Das Startdatum muss vor dem Enddatum liegen.");
        return;
      }

      // Add the first booking
      const firstBookingDate = new Date(this.firstBookingDate);
      const [firstHours, firstMinutes] = this.timeBeginModel
        .split(":")
        .map(Number);
      const [endHours, endMinutes] = this.timeEndModel.split(":").map(Number);

      const firstTimeBegin = new Date(firstBookingDate);
      firstTimeBegin.setHours(firstHours, firstMinutes, 0, 0);

      const firstTimeEnd = new Date(firstBookingDate);
      firstTimeEnd.setHours(endHours, endMinutes, 0, 0);

      const attempts = [];

      const firstBookingAttempt = {
        bookableItems: [{ ...this.leadItem }],
        timeBegin: firstTimeBegin.getTime(),
        timeEnd: firstTimeEnd.getTime(),
        regularPriceEur: null,
        userPriceEur: null,
        regularGrossPriceEur: null,
        userGrossPriceEur: null,
      };

      attempts.push(firstBookingAttempt);

      // Generate dates based on frequency
      const dates = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Skip the first booking date if it's in the series range
        if (currentDate.toDateString() !== firstBookingDate.toDateString()) {
          dates.push(new Date(currentDate));
        }

        // Add days based on frequency
        if (this.seriesFrequency === "weekly") {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }

      // Create booking attempts for each date in the series


      for (const date of dates) {
        const timeBegin = new Date(date);
        timeBegin.setHours(firstHours, firstMinutes, 0, 0);

        const timeEnd = new Date(date);
        timeEnd.setHours(endHours, endMinutes, 0, 0);

        const bookingAttempt = {
          bookableItems: [{ ...this.leadItem }],
          timeBegin: timeBegin.getTime(),
          timeEnd: timeEnd.getTime(),
          regularPriceEur: null,
          userPriceEur: null,
          regularGrossPriceEur: null,
          userGrossPriceEur: null,
        };
        attempts.push(bookingAttempt);
      }
      await this.validateItems(attempts);
      this.bookingAttempts = attempts;

    },

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

    removeBookingAttempt(index) {
      this.bookingAttempts.splice(index, 1);
    },

    async validateAndContinue() {
      // Validate all booking attempts
      await this.validateItems(this.bookingAttempts);

      // Check if all items are valid
      const allValid = this.bookingAttempts.every((attempt) =>
        attempt.bookableItems.every((item) => item.valid)
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
      const app = this.activePaymentApps.find(
        (app) => app.id === this.selectedPaymentApp
      );
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

        bookingAttempt.valid = bookingAttempt.bookableItems.every(
          (item) => item.valid
        );
        bookingAttempt.regularPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.regularPriceEur || 0),
          0
        );
        bookingAttempt.userPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.userPriceEur || 0),
          0
        );
        bookingAttempt.regularGrossPriceEur =
          bookingAttempt.bookableItems.reduce(
            (sum, item) => sum + (item.regularGrossPriceEur || 0),
            0
          );
        bookingAttempt.userGrossPriceEur = bookingAttempt.bookableItems.reduce(
          (sum, item) => sum + (item.userGrossPriceEur || 0),
          0
        );
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
          await this.$router.push({
            name: "booking-status",
            query: {
              tenant: this.tenantId,
              status: "success",
              bookingId: response.data.id,
            },
          });
        } else {
          throw new Error("Checkout service failed");
        }
      } catch (error) {
        console.error("Error during checkout:", error);
        alert(
          "Bei der Buchung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
        );
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

    const today = new Date();
    this.firstBookingDate = today.toISOString().split("T")[0];

    if (this.$route.query.timeBegin && this.$route.query.timeEnd) {
      const timeBegin = new Date(parseInt(this.$route.query.timeBegin));
      const timeEnd = new Date(parseInt(this.$route.query.timeEnd));

      this.dateBeginModel = timeBegin.toISOString().split("T")[0];
      this.dateEndModel = timeEnd.toISOString().split("T")[0];

      this.timeBeginModel = timeBegin.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      this.timeEndModel = timeEnd.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (this.dateBeginModel) {
      this.seriesStartDate = this.dateBeginModel;
    } else {
      this.seriesStartDate = new Date().toISOString().split("T")[0];
    }

    const endDate = new Date(this.firstBookingDate);
    endDate.setMonth(endDate.getMonth() + 1);
    this.seriesEndDate = endDate.toISOString().split("T")[0];

    this.bookingAttempts = [];
  },
};
</script>

<style scoped></style>

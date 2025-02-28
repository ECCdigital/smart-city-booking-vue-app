<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-form ref="form" v-model="valid">
        <v-card>
          <v-card-title class="mx-3">
            <span v-if="selectedBooking.id" class="text-h5"
              >Buchung bearbeiten</span
            >
            <span v-else class="text-h5">Neue Buchung anlegen</span>
          </v-card-title>
          <v-divider class="mx-9" />
          <v-card-text>
            <v-container>
              <v-row class="mt-5">
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="ID"
                    readonly
                    disabled
                    v-model="selectedBooking.id"
                  ></v-text-field>
                </v-col>
                <v-col class="col-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Mandant"
                    v-model="selectedBooking.tenantId"
                    readonly
                    disabled
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col v-if="selectedBooking._populated && workflow.active">
                  <v-select
                    :items="[
                      ...workflow.states,
                      { name: 'Archive', id: 'archive' },
                    ]"
                    v-model="selectedBooking._populated.workflowStatus"
                    label="Workflow Status"
                    item-text="name"
                    item-value="id"
                  >
                    <template #selection="{ item }">
                      <v-chip small text-color="black" color="secondary">{{
                        item.name
                      }}</v-chip>
                    </template>
                  </v-select>
                </v-col>
                <v-col>
                  <v-checkbox
                    label="Ist bezahlt"
                    v-model="selectedBooking.isPayed"
                    color="primary"
                  ></v-checkbox>
                </v-col>
                <v-col>
                  <v-checkbox
                    label="Ist freigegeben"
                    v-model="selectedBooking.isCommitted"
                    color="primary"
                  ></v-checkbox>
                </v-col>
                <v-col>
                  <v-checkbox
                    label="Ist storniert"
                    v-model="selectedBooking.isRejected"
                    color="error"
                  ></v-checkbox>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-select
                    :items="activePaymentApps"
                    v-model="selectedBooking.paymentProvider"
                    label="Zahlungsmethode"
                    item-text="title"
                    item-value="id"
                  >
                  </v-select>
                </v-col>
                <v-col>
                  <v-select
                    :items="paymentMethod"
                    v-model="selectedBooking.paymentMethod"
                    label="Bezahlt mit"
                    item-text="title"
                    item-value="type"
                  ></v-select>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    v-if="!!selectedBooking.couponCode"
                    background-color="accent"
                    filled
                    hide-details
                    label="genutzter Gutschein"
                    v-model="selectedBooking._couponUsed.id"
                    readonly
                    disabled
                    :placeholder="selectedBooking._couponUsed.id"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    v-if="!!selectedBooking.couponCode"
                    background-color="accent"
                    filled
                    hide-details
                    label="Rabatt"
                    v-model.number="selectedBooking._couponUsed.discount"
                    readonly
                    disabled
                    :placeholder="selectedBooking._couponUsed.discount"
                    :suffix="
                      selectedBooking._couponUsed.type === 'percentage'
                        ? '%'
                        : '€'
                    "
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row>
                <v-col>
                  <p class="text-uppercase">
                    <strong>Gebuchte Objekte</strong>
                  </p>
                </v-col>
              </v-row>
              <v-divider class="" />
              <v-list>
                <v-list-item
                  v-for="bookableItem in bookableItems"
                  :key="bookableItem.id"
                >
                  <v-list-item-content>
                    <v-list-item-title class="d-flex">
                      <v-row class="align-center">
                        <v-col class="col-auto">
                          {{ bookableItem._bookableUsed.title }}
                        </v-col>
                        <v-spacer></v-spacer>
                        <v-col class="col-4">
                          <v-text-field
                            v-model="bookableItem._bookableUsed.priceEur"
                            filled
                            prefix="€"
                            background-color="accent"
                            hide-details
                            :label="isTimeRelated(bookableItem._bookableUsed)"
                            type="number"
                          ></v-text-field>
                        </v-col>
                        <v-col class="col-auto">
                          <div class="d-flex">
                            <v-btn
                              icon
                              x-small
                              @click="decreaseAmount(bookableItem)"
                            >
                              <v-icon>mdi-minus</v-icon>
                            </v-btn>
                            <div class="px-1">{{ bookableItem.amount }}</div>
                            <v-btn
                              icon
                              x-small
                              @click="increaseAmount(bookableItem)"
                            >
                              <v-icon>mdi-plus</v-icon>
                            </v-btn>
                          </div>
                        </v-col>
                      </v-row>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
              <div
                v-if="selectedBooking.bookableItems?.length === 0"
                class="text-center font-italic"
              >
                Diese Buchung enthält keine Buchungen
              </div>
              <v-autocomplete
                hide-details
                placeholder="Ein weiteres Element Hinzufügen"
                v-model="addBookableValue"
                :items="bookables"
                item-value="id"
                item-text="title"
              >
                <template v-slot:append-outer>
                  <v-btn small color="primary" @click="addBookable">
                    <v-icon left> mdi-plus</v-icon>
                    Hinzufügen
                  </v-btn>
                </template>
              </v-autocomplete>

              <v-row class="mt-5">
                <v-col>
                  <p class="text-uppercase">
                    <strong>Buchungszeitraum</strong>
                  </p>
                </v-col>
                <v-col class="col-auto">
                  <v-btn small outlined @click="removeBookingTimes"
                    >Buchungszeitraum löschen</v-btn
                  >
                </v-col>
              </v-row>
              <v-divider class="mb-5" />
              <v-row no-gutters>
                <v-col class="col-12">
                  <p class="text-uppercase">
                    <strong>Beginn</strong>
                  </p>
                </v-col>
                <v-col class="mr-5">
                  <v-dialog
                    ref="dateFromDialog"
                    v-model="dateFromModal"
                    :return-value.sync="dateFrom"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="dateFrom"
                        label="Datum"
                        prepend-icon="mdi-calendar"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="dateFrom"
                      scrollable
                      locale="de"
                      :first-day-of-week="1"
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="dateFromModal = false"
                      >
                        Abbrechen
                      </v-btn>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.dateFromDialog.save(dateFrom)"
                      >
                        Speichern
                      </v-btn>
                    </v-date-picker>
                  </v-dialog>
                </v-col>
                <v-col>
                  <v-dialog
                    ref="timeFromDialog"
                    v-model="timeFromModal"
                    :return-value.sync="timeFrom"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="timeFrom"
                        label="Uhrzeit"
                        prepend-icon="mdi-clock-time-four-outline"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-time-picker
                      v-if="timeFrom"
                      v-model="timeFrom"
                      full-width
                      format="24hr"
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="timeFromModal = false"
                      >
                        Abbrechen
                      </v-btn>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.timeFromDialog.save(timeFrom)"
                      >
                        Speichern
                      </v-btn>
                    </v-time-picker>
                  </v-dialog>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-col class="col-12">
                  <p class="text-uppercase">
                    <strong>Ende</strong>
                  </p>
                </v-col>
                <v-col class="mr-5">
                  <v-dialog
                    ref="dateToDialog"
                    v-model="dateToModal"
                    :return-value.sync="dateTo"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="dateTo"
                        label="Datum"
                        prepend-icon="mdi-calendar"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="dateTo"
                      scrollable
                      locale="de"
                      :first-day-of-week="1"
                    >
                      <v-spacer></v-spacer>
                      <v-btn text color="primary" @click="dateToModal = false">
                        Abbrechen
                      </v-btn>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.dateToDialog.save(dateTo)"
                      >
                        Speichern
                      </v-btn>
                    </v-date-picker>
                  </v-dialog>
                </v-col>
                <v-col>
                  <v-dialog
                    ref="timeToDialog"
                    v-model="timeToModal"
                    :return-value.sync="timeTo"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="timeTo"
                        label="Uhrzeit"
                        prepend-icon="mdi-clock-time-four-outline"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-time-picker
                      v-if="timeTo"
                      v-model="timeTo"
                      full-width
                      format="24hr"
                    >
                      <v-spacer></v-spacer>
                      <v-btn text color="primary" @click="timeToModal = false">
                        Abbrechen
                      </v-btn>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.timeToDialog.save(timeTo)"
                      >
                        Speichern
                      </v-btn>
                    </v-time-picker>
                  </v-dialog>
                </v-col>
              </v-row>

              <v-row class="mt-5">
                <v-col>
                  <p class="text-uppercase">
                    <strong>Personenbezogene Daten</strong>
                  </p>
                </v-col>
              </v-row>
              <v-divider class="mb-5" />
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Name"
                    required
                    v-model="selectedBooking.name"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Firma"
                    v-model="selectedBooking.company"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    label="E-Mail*"
                    required
                    :rules="validationRules.mail"
                    v-model="selectedBooking.mail"
                  >
                  </v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    label="Telefon"
                    v-model="selectedBooking.phone"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Straße"
                    v-model="selectedBooking.street"
                  >
                  </v-text-field>
                </v-col>
                <v-col class="col-2">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="PLZ"
                    required
                    v-model="selectedBooking.zipCode"
                  >
                  </v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Stadt"
                    required
                    v-model="selectedBooking.location"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row class="mt-5">
                <v-col>
                  <v-textarea
                    background-color="accent"
                    filled
                    hide-details
                    label="Bemerkung"
                    required
                    v-model="selectedBooking.comment"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              class="mb-5"
              color="primary"
              @click="submitChanges"
              :loading="inProgress"
            >
              Speichern
            </v-btn>
            <v-btn class="mb-5 mr-5" outlined @click="closeDialog">
              Abbrechen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
  </v-row>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "BookingEdit",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    booking: {
      type: Object,
      required: true,
    },
    bookables: {
      type: Array,
      required: true,
    },
    workflow: {
      type: Object,
      required: false,
    },
  },
  data() {
    return {
      valid: true,
      inProgress: false,
      test: null,
      addBookableValue: null,

      dateFromModal: false,
      dateToModal: false,

      timeFromModal: false,
      timeToModal: false,

      bookableId_temp: null,

      activePaymentApps: [],

      events: [],
      validationRules: {
        mail: [(v) => /.+@.+\..+/.test(v) || "E-Mail muss gültig sein"],
      },
      paymentMethod: [
        {
          type: "CASH",
          title: "Bar",
        },
        {
          type: "TRANSFER",
          title: "Überweisung",
        },
        {
          type: "CREDIT_CARD",
          title: "Kreditkarte",
        },
        {
          type: "DEBIT_CARD",
          title: "EC-Karte",
        },
        {
          type: "PAYPAL",
          title: "PayPal",
        },
        {
          type: "OTHER",
          title: "Sonstiges",
        },
        {
          type: "GIROPAY",
          title: "Giropay",
        },
        {
          type: "APPLE_PAY",
          title: "Apple Pay",
        },
        {
          type: "GOOGLE_PAY",
          title: "Google Pay",
        },
        {
          type: "UNKNOWN",
          title: "Unbekannt",
        },
        {
          type: "EPS",
          title: "EPS",
        },
        {
          type: "IDEAL",
          title: "iDEAL",
        },
        {
          type: "MAESTRO",
          title: "Maestro",
        },
        {
          type: "PAYDIRECT",
          title: "paydirekt",
        },
        {
          type: "SOFORT",
          title: "SOFORT-Überweisung",
        },
        {
          type: "BLUECODE",
          title: "Bluecode",
        },
      ],
    };
  },
  computed: {
    selectedBookingIsSet() {
      return !_.isNil(this.selectedBooking?._populated);
    },
    openDialog: {
      get() {
        return this.open;
      },
    },
    selectedBooking: {
      get() {
        return this.booking;
      },
    },
    dateFrom: {
      get() {
        if (!this.selectedBooking.timeBegin) {
          return this.formatDate(new Date());
        }
        return this.formatDate(new Date(this.selectedBooking.timeBegin));
      },
      set(val) {
        this.selectedBooking.timeBegin = new Date(
          val + " " + this.timeFrom
        ).getTime();
      },
    },
    dateTo: {
      get() {
        if (!this.selectedBooking.timeEnd) {
          return this.formatDate(new Date());
        }
        return this.formatDate(new Date(this.selectedBooking.timeEnd));
      },
      set(val) {
        this.selectedBooking.timeEnd = new Date(
          val + " " + this.timeTo
        ).getTime();
      },
    },
    timeFrom: {
      get() {
        if (!this.selectedBooking.timeBegin) {
          return this.formatTime(new Date());
        }
        return this.formatTime(new Date(this.selectedBooking.timeBegin));
      },
      set(val) {
        this.selectedBooking.timeBegin = new Date(
          this.dateFrom + " " + val
        ).getTime();
      },
    },
    timeTo: {
      get() {
        if (!this.selectedBooking.timeEnd) {
          return this.formatTime(new Date());
        }
        return this.formatTime(new Date(this.selectedBooking.timeEnd));
      },
      set(val) {
        this.selectedBooking.timeEnd = new Date(
          this.dateTo + " " + val
        ).getTime();
      },
    },
    bookableItems: {
      get() {
        return this.selectedBooking.bookableItems;
      },
      set(val) {
        this.bookableItems = val;
      },
    },
  },
  watch: {
    dateFrom: function () {
      this.getEvents();
    },

    timeFrom: function () {
      this.getEvents();
    },

    dateTo: function () {
      this.getEvents();
    },

    timeTo: function () {
      this.getEvents();
    },
    booking: function () {
      this.fetchActivePaymentApps();
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    remove(item) {
      // remove item from  selectedBooking.bookableIds
      this.selectedBooking.bookableIds =
        this.selectedBooking.bookableIds.filter(
          (bookableId) => bookableId !== item.id
        );
    },
    closeDialog() {
      this.$emit("close");
    },
    async submitChanges() {
      if (!this.selectedBooking._id) {
        if (this.$refs.form.validate() || !this.selectedBooking.mail) {
          this.inProgress = true;
          await ApiBookingService.storeBooking(this.selectedBooking)
            .then(() => {
              this.inProgress = false;
              this.closeDialog();
            })
            .catch(() => {
              this.addToast(
                ToastService.createToast("booking.create.error", "error")
              );
              this.inProgress = false;
            });
        }
      } else {
        this.inProgress = true;
        delete this.selectedBooking._id;
        await ApiBookingService.storeBooking(this.selectedBooking)
          .then()
          .catch(() => {
            this.addToast(
              ToastService.createToast("booking.edit.error", "error")
            );
            this.inProgress = false;
          });
        this.inProgress = false;
        this.closeDialog();
      }
    },
    padTo2Digits(num) {
      return num.toString().padStart(2, "0");
    },
    formatDate(date) {
      if (date !== "Invalid Date") {
        return [
          date.getFullYear(),
          this.padTo2Digits(date.getMonth() + 1),
          this.padTo2Digits(date.getDate()),
        ].join("-");
      } else {
        return null;
      }
    },
    formatTime(date) {
      if (date !== "Invalid Date") {
        return [
          this.padTo2Digits(date.getHours()),
          this.padTo2Digits(date.getMinutes()),
        ].join(":");
      } else {
        return "00:00";
      }
    },
    formatDateTime: function (d) {
      return Date.parse(d);
    },
    getEvents() {
      ApiBookingService.getPublicBookings(this.tenant)
        .then((response) => {
          const bookings = response.data;
          const events = bookings
            .filter((b) => b.bookableId === this.bookableId)
            .map((b) => {
              return {
                name: "Gebucht",
                start: this.formatDateTime(new Date(b.timeBegin)),
                end: this.formatDateTime(new Date(b.timeEnd)),
                color: "grey",
                timed: true,
              };
            });

          if (this.selectedBooking.timeBegin && this.selectedBooking.timeEnd) {
            events.push({
              name: "Ihr Wunschtermin",
              start: this.formatDateTime(
                new Date(this.selectedBooking.timeBegin)
              ),
              end: this.formatDateTime(new Date(this.selectedBooking.timeEnd)),
              color: "red",
              timed: true,
            });
          }

          this.events = events;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    increaseAmount(bookableItem) {
      bookableItem.amount++;
    },
    decreaseAmount(bookableItem) {
      if (bookableItem.amount > 1) {
        bookableItem.amount--;
      } else {
        this.selectedBooking.bookableItems =
          this.selectedBooking.bookableItems.filter(
            (b) => b.bookableId !== bookableItem.bookableId
          );
      }
    },
    addBookable() {
      const existing = this.selectedBooking.bookableItems.find(
        (b) => b.bookableId === this.addBookableValue
      );

      if (existing) {
        existing.amount++;
      } else {
        const bookable = this.bookables.find(
          (b) => b.id === this.addBookableValue
        );

        this.selectedBooking.bookableItems.push({
          bookableId: bookable.id,
          amount: 1,
          _bookableUsed: bookable,
        });
      }

      this.addBookableValue = null;
    },
    removeBookingTimes() {
      this.selectedBooking.timeBegin = null;
      this.selectedBooking.timeEnd = null;
    },
    async fetchActivePaymentApps() {
      try {
        const response = await ApiTenantService.getTenantActivePaymentApps(
          this.booking.tenantId
        );
        this.activePaymentApps = response.data;
      } catch (error) {
        console.log(error);
      }
    },
    isTimeRelated(bookable) {
      switch (bookable.priceCategory) {
      case "per-item":
        return "pro Stück";
      case "per-hour":
        return "pro Stunde";
      case "per-day":
        return "pro Tag";
      default:
        return "pro Stück";
      }
    },
  },
  mounted() {
    if (this.selectedBooking._id) {
      this.getEvents();
    }
  },
};
</script>

<style scoped></style>

<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="900px">
      <v-form ref="form" v-model="valid">
        <v-card class="booking-edit" elevation="0">
          <div class="px-6 py-5 d-flex align-center">
            <v-icon large class="mr-3">
              {{ selectedBooking.id ? "mdi-pencil" : "mdi-plus-circle" }}
            </v-icon>
            <span class="text-h5 font-weight-bold">
              {{
                selectedBooking.id
                  ? "Buchung bearbeiten"
                  : "Neue Buchung anlegen"
              }}
            </span>
          </div>

          <v-divider></v-divider>

          <v-card-text class="px-6 py-6 booking-edit-content">
            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-information-outline</v-icon>
                <span class="text-h6 font-weight-bold">Grundinformationen</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="ID"
                      readonly
                      disabled
                      v-model="selectedBooking.id"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Mandant"
                      v-model="selectedBooking.tenantId"
                      readonly
                      disabled
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-progress-check</v-icon>
                <span class="text-h6 font-weight-bold">Status & Workflow</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row v-if="selectedBooking._populated && workflow.active">
                  <v-col cols="12">
                    <v-select
                      :items="[
                        ...workflow.states,
                        { name: 'Archiv', id: 'archive' },
                      ]"
                      v-model="selectedBooking._populated.workflowStatus"
                      label="Workflow Status"
                      item-text="name"
                      item-value="id"
                      filled
                      dense
                      background-color="accent"
                    >
                      <template #selection="{ item }">
                        <v-chip small text-color="white" color="primary">
                          {{ item.name }}
                        </v-chip>
                      </template>
                    </v-select>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-checkbox
                      label="Ist bezahlt"
                      v-model="selectedBooking.isPayed"
                      color="primary"
                      hide-details
                    ></v-checkbox>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-checkbox
                      label="Ist freigegeben"
                      v-model="selectedBooking.isCommitted"
                      color="primary"
                      hide-details
                    ></v-checkbox>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-checkbox
                      label="Ist storniert"
                      v-model="selectedBooking.isRejected"
                      color="error"
                      hide-details
                    ></v-checkbox>
                  </v-col>
                </v-row>
                <v-row v-if="selectedBooking.isRejected" class="mt-2">
                  <v-col cols="12">
                    <v-textarea
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Ablehnungsgrund"
                      v-model="selectedBooking.rejectionReason"
                      rows="3"
                    ></v-textarea>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-cash-multiple</v-icon>
                <span class="text-h6 font-weight-bold"
                  >Zahlungsinformationen</span
                >
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      :items="activePaymentApps"
                      v-model="selectedBooking.paymentProvider"
                      label="Zahlungsanbieter"
                      item-text="title"
                      item-value="id"
                      filled
                      dense
                      background-color="accent"
                      hide-details
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      :items="paymentMethod"
                      v-model="selectedBooking.paymentMethod"
                      label="Bezahlt mit"
                      item-text="title"
                      item-value="type"
                      filled
                      dense
                      background-color="accent"
                      hide-details
                    ></v-select>
                  </v-col>
                </v-row>

                <v-row v-if="selectedBooking.isPayed" class="mt-4">
                  <v-col cols="12">
                    <div class="info-label mb-3">
                      <v-icon small class="mr-2">mdi-calendar-check</v-icon>
                      Bezahldatum
                    </div>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-menu
                      v-model="paymentDateMenu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      offset-y
                      min-width="auto"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          :value="
                            paymentDate
                              ? new Date(paymentDate).toLocaleDateString(
                                  'de-DE'
                                )
                              : ''
                          "
                          label="Datum"
                          prepend-icon="mdi-calendar"
                          background-color="accent"
                          filled
                          dense
                          readonly
                          clearable
                          @click:clear="paymentDate = null"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="paymentDate"
                        locale="de-DE"
                        :first-day-of-week="1"
                        @input="paymentDateMenu = false"
                      ></v-date-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-menu
                      v-model="paymentTimeMenu"
                      :close-on-content-click="false"
                      :nudge-right="40"
                      transition="scale-transition"
                      offset-y
                      max-width="290px"
                      min-width="290px"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          v-model="paymentTime"
                          label="Uhrzeit"
                          prepend-icon="mdi-clock-outline"
                          background-color="accent"
                          filled
                          dense
                          readonly
                          clearable
                          @click:clear="paymentTime = null"
                          v-bind="attrs"
                          v-on="on"
                          hide-details
                        ></v-text-field>
                      </template>
                      <v-time-picker
                        v-if="paymentTimeMenu"
                        v-model="paymentTime"
                        format="24hr"
                        full-width
                        @click:minute="paymentTimeMenu = false"
                      ></v-time-picker>
                    </v-menu>
                  </v-col>
                </v-row>

                <v-row
                  v-if="selectedBooking.isPayed && (paymentDate || paymentTime)"
                  class="mt-2"
                >
                  <v-col cols="12">
                    <div class="d-flex align-center">
                      <v-chip small color="primary" outlined class="mr-2">
                        <v-icon small left>mdi-calendar-clock</v-icon>
                        {{ formattedPaymentDateTime }}
                      </v-chip>
                      <v-btn
                        x-small
                        text
                        color="primary"
                        @click="setPaymentNow"
                      >
                        <v-icon small left>mdi-clock-fast</v-icon>
                        Jetzt
                      </v-btn>
                      <v-btn
                        x-small
                        text
                        color="error"
                        @click="clearPaymentDateTime"
                      >
                        <v-icon small left>mdi-close</v-icon>
                        Löschen
                      </v-btn>
                    </div>
                  </v-col>
                </v-row>

                <v-row
                  v-if="selectedBooking.isPayed && !paymentDate && !paymentTime"
                  class="mt-2"
                >
                  <v-col cols="12">
                    <v-btn x-small text color="primary" @click="setPaymentNow">
                      <v-icon small left>mdi-clock-fast</v-icon>
                      Aktuelles Datum/Uhrzeit verwenden
                    </v-btn>
                  </v-col>
                </v-row>

                <v-row v-if="selectedBooking.couponCode" class="mt-4">
                  <v-col cols="12" md="6">
                    <div class="info-item">
                      <div class="info-label">
                        <v-icon small class="mr-2">mdi-ticket-percent</v-icon>
                        Genutzter Gutschein
                      </div>
                      <div class="info-value">
                        {{ selectedBooking._couponUsed.id }}
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="info-item">
                      <div class="info-label">
                        <v-icon small class="mr-2">mdi-sale</v-icon>
                        Rabatt
                      </div>
                      <div class="info-value">
                        {{ selectedBooking._couponUsed.discount }}
                        {{
                          selectedBooking._couponUsed.type === "percentage"
                            ? "%"
                            : "€"
                        }}
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title
                class="section-header pa-4 d-flex justify-space-between align-center"
              >
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-package-variant</v-icon>
                  <span class="text-h6 font-weight-bold">Buchungsobjekte</span>
                </div>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-0" v-if="bookableItems.length > 0">
                <v-list dense>
                  <template v-for="(bookableItem, index) in bookableItems">
                    <v-list-item :key="bookableItem.bookableId" class="px-4">
                      <v-list-item-avatar color="primary lighten-4">
                        <v-icon color="primary">mdi-cube-outline</v-icon>
                      </v-list-item-avatar>
                      <v-list-item-content>
                        <v-list-item-title class="font-weight-bold mb-2">
                          {{ bookableItem._bookableUsed?.title }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          <v-row dense class="align-center">
                            <v-col cols="12" sm="5">
                              <v-text-field
                                :value="
                                  getPriceCategory(
                                    bookableItem.bookableId,
                                    'priceEur'
                                  )
                                "
                                @input="
                                  updatePriceCategory(
                                    bookableItem.bookableId,
                                    $event
                                  )
                                "
                                filled
                                dense
                                prefix="€"
                                background-color="accent"
                                hide-details
                                :suffix="
                                  isTimeRelated(
                                    bookableItem._bookableUsed,
                                    getPriceCategory(
                                      bookableItem.bookableId,
                                      'fixedPrice'
                                    )
                                  )
                                "
                                label="Preis (netto)"
                                type="number"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="12" sm="4">
                              <v-checkbox
                                dense
                                :input-value="
                                  getPriceCategory(
                                    bookableItem.bookableId,
                                    'fixedPrice'
                                  )
                                "
                                @change="
                                  updateFixedPrice(
                                    bookableItem.bookableId,
                                    $event
                                  )
                                "
                                label="Pauschalpreis"
                                hide-details
                              ></v-checkbox>
                            </v-col>
                            <v-col cols="12" sm="3">
                              <div class="d-flex align-center justify-end">
                                <v-btn
                                  icon
                                  x-small
                                  @click="decreaseAmount(bookableItem)"
                                >
                                  <v-icon>mdi-minus</v-icon>
                                </v-btn>
                                <div class="px-3 font-weight-bold">
                                  {{ bookableItem.amount }}
                                </div>
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
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                    <v-divider
                      v-if="index < bookableItems.length - 1"
                      :key="`divider-${index}`"
                    />
                  </template>
                </v-list>
              </v-card-text>
              <v-card-text v-else class="pa-4 text-center grey--text">
                <v-icon large color="grey lighten-1" class="mb-2">
                  mdi-package-variant-closed
                </v-icon>
                <div>Keine Buchungsobjekte vorhanden</div>
              </v-card-text>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="12">
                    <v-autocomplete
                      hide-details
                      placeholder="Ein weiteres Buchungobjekt hinzufügen"
                      v-model="addBookableValue"
                      :items="bookables"
                      item-value="id"
                      item-text="title"
                      filled
                      dense
                      background-color="accent"
                    >
                      <template v-slot:append-outer>
                        <v-btn small color="primary" @click="addBookable">
                          <v-icon left small>mdi-plus</v-icon>
                          Hinzufügen
                        </v-btn>
                      </template>
                    </v-autocomplete>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title
                class="section-header pa-4 d-flex justify-space-between align-center"
              >
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-calendar-range</v-icon>
                  <span class="text-h6 font-weight-bold">Buchungszeitraum</span>
                </div>
                <v-btn small outlined @click="removeBookingTimes">
                  <v-icon left small>mdi-delete-outline</v-icon>
                  Löschen
                </v-btn>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12">
                    <div class="info-label mb-2">
                      <v-icon small class="mr-2">mdi-calendar-start</v-icon>
                      Beginn
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          hide-details
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
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          hide-details
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

                <v-row class="mt-4">
                  <v-col cols="12">
                    <div class="info-label mb-2">
                      <v-icon small class="mr-2">mdi-calendar-end</v-icon>
                      Ende
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          hide-details
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
                        <v-btn
                          text
                          color="primary"
                          @click="dateToModal = false"
                        >
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
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          hide-details
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
                        <v-btn
                          text
                          color="primary"
                          @click="timeToModal = false"
                        >
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
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-account-outline</v-icon>
                <span class="text-h6 font-weight-bold"
                  >Kundeninformationen</span
                >
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Name"
                      required
                      v-model="selectedBooking.name"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Firma"
                      v-model="selectedBooking.company"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="E-Mail*"
                      required
                      :rules="validationRules.mail"
                      v-model="selectedBooking.mail"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Telefon"
                      v-model="selectedBooking.phone"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Straße"
                      v-model="selectedBooking.street"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="PLZ"
                      required
                      v-model="selectedBooking.zipCode"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Stadt"
                      required
                      v-model="selectedBooking.location"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
                <span class="text-h6 font-weight-bold">Bemerkungen</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12">
                    <v-textarea
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Bemerkung"
                      v-model="selectedBooking.comment"
                      rows="3"
                    ></v-textarea>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Interne Bemerkung"
                      v-model="selectedBooking.internalComments"
                      rows="3"
                    ></v-textarea>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn color="primary" @click="submitChanges" :loading="inProgress">
              <v-icon left>mdi-content-save</v-icon>
              Speichern
            </v-btn>
            <v-btn outlined @click="closeDialog">
              <v-icon left>mdi-close</v-icon>
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

      paymentDateMenu: false,
      paymentTimeMenu: false,
      paymentDate: null,
      paymentTime: null,

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
    timePaid: {
      get() {
        if (!this.paymentDate) return null;

        const dateTime = new Date(this.paymentDate);
        if (this.paymentTime) {
          const [hours, minutes] = this.paymentTime.split(":");
          dateTime.setHours(parseInt(hours));
          dateTime.setMinutes(parseInt(minutes));
        }

        return dateTime.getTime();
      },
      set(value) {
        if (!value) {
          this.paymentDate = null;
          this.paymentTime = null;
          return;
        }

        const date = new Date(value);
        this.paymentDate = this.formatDate(date);
        this.paymentTime = this.formatTime(date);
      },
    },
    formattedPaymentDateTime() {
      if (!this.paymentDate) return "";

      const date = new Date(this.paymentDate);
      if (this.paymentTime) {
        const [hours, minutes] = this.paymentTime.split(":");
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
      }

      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: this.paymentTime ? "short" : undefined,
      }).format(date);
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
    "booking.tenantId": {
      immediate: true,
      handler() {
        if (this.booking?.tenantId) this.fetchActivePaymentApps();
      },
    },
    booking: function (newBooking) {
      if (newBooking.timePaid) {
        this.timePaid = newBooking.timePaid;
      } else {
        this.paymentDate = null;
        this.paymentTime = null;
      }
    },
    timePaid: function (newValue) {
      this.selectedBooking.timePaid = newValue;
    },
    "selectedBooking.isPayed": function (isPayed) {
      if (!isPayed) {
        //this.clearPaymentDateTime();
      }
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    clearPaymentDateTime() {
      this.paymentDate = null;
      this.paymentTime = null;
    },
    setPaymentNow() {
      const now = new Date();
      this.paymentDate = this.formatDate(now);
      this.paymentTime = this.formatTime(now);
    },
    getPriceCategory(bookableId, field) {
      const bookableItem = this.bookableItems.find(
        (b) => b.bookableId === bookableId
      );
      const { priceCategories, priceType } = bookableItem._bookableUsed;

      if (priceCategories.length === 1) {
        if (field) {
          return priceCategories[0][field];
        }
        return priceCategories[0];
      }

      const bookingDurationInMinutes = this.getBookingDuration();

      let valueToCheck;
      switch (priceType) {
        case "per-hour":
          valueToCheck = bookingDurationInMinutes / 60;
          break;
        case "per-day":
          valueToCheck = bookingDurationInMinutes / 60 / 24;
          break;
        case "per-item":
          valueToCheck = bookableItem.amount;
          break;
        case "per-square-meter":
          valueToCheck = bookableItem.amount;
          break;
        default:
          return null;
      }

      const category =
        priceCategories.find(({ interval }) => {
          const { start, end } = interval;
          return (
            (start === null || start <= valueToCheck) &&
            (end === null || end >= valueToCheck)
          );
        }) || priceCategories[0];

      if (field) {
        return category[field];
      }
      return category;
    },
    getBookingDuration() {
      if (
        !this.selectedBooking ||
        !this.selectedBooking.timeEnd ||
        !this.selectedBooking.timeBegin
      ) {
        return 0;
      }
      return Math.round(
        (this.selectedBooking.timeEnd - this.selectedBooking.timeBegin) / 60000
      );
    },
    updatePriceCategory(bookableId, newPrice) {
      const category = this.getPriceCategory(bookableId);
      category.priceEur = Number(newPrice);
    },
    updateFixedPrice(bookableId, value) {
      const category = this.getPriceCategory(bookableId);
      category.fixedPrice = !!value;
    },
    remove(item) {
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
    isTimeRelated(bookable, isFixedPrice) {
      if (isFixedPrice) {
        return "";
      }

      switch (bookable.priceType) {
        case "per-item":
          return "pro Stück";
        case "per-hour":
          return "pro Stunde";
        case "per-day":
          return "pro Tag";
        case "per-square-meter":
          return "pro m²";
        default:
          return "pro Stück";
      }
    },
  },
  mounted() {
    if (this.selectedBooking._id) {
      this.getEvents();
    }
    if (this.selectedBooking.timePaid) {
      this.timePaid = this.selectedBooking.timePaid;
    }
  },
};
</script>

<style scoped lang="scss">
.booking-edit {
  border-radius: 12px !important;
  overflow: hidden;
}

.booking-edit-content {
  max-height: 70vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.theme--dark .booking-edit-content {
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

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

.info-item {
  margin-bottom: 8px;
}

.info-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.theme--dark .info-label {
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  font-size: 1rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
  padding-left: 28px;
}

.theme--dark .info-value {
  color: rgba(255, 255, 255, 0.87);
}

.v-list-item {
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

.theme--dark .v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

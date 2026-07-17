<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="form" v-model="valid" class="booking-edit-form">
      <div v-if="!isCreateMode" class="d-flex align-center mb-2">
        <div class="text--secondary d-flex align-center flex-wrap">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span
                class="booking-id-copy"
                v-bind="attrs"
                v-on="on"
                @click="copyBookingId"
              >
                ID: {{ selectedBooking.id }}
                <v-icon x-small class="ml-1">mdi-content-copy</v-icon>
              </span>
            </template>
            <span>ID kopieren</span>
          </v-tooltip>
          <span class="mx-1">•</span>
          <span>Mandant: {{ bookingTenantLabel }}</span>
        </div>
      </div>

      <BookingEditStatus
        :booking="selectedBooking"
        :reject-dialog-open="openRejectDialog || openGroupRejectDialog"
        @request-reject="openCancellationDialog"
        @confirm-unreject="unrejectBooking"
      />
      <v-row dense>
        <v-col cols="12" lg="9">
          <BaseSection title="Objekt & Zeitraum" icon="mdi-cube-outline">
            <v-text-field
              v-show="false"
              :value="bookableItems.length"
              :rules="validationRules.minBookings"
            />

            <v-autocomplete
              hide-details
              :placeholder="
                bookableItems.length
                  ? 'Ein weiteres Buchungsobjekt hinzufügen'
                  : 'Buchungsobjekt auswählen'
              "
              v-model="addBookableValue"
              :items="bookables"
              item-value="id"
              item-text="title"
              filled
              dense
              background-color="accent"
            >
              <template v-slot:item="{ item }">
                <v-list-item-avatar>
                  <v-icon :color="getTypeColor(item.type)">
                    {{ getTypeIcon(item.type) }}
                  </v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                  <v-list-item-subtitle class="text--disabled">{{
                    getTypeText(item.type)
                  }}</v-list-item-subtitle>
                </v-list-item-content>
              </template>

              <template v-slot:selection="{ item }">
                <v-icon small left :color="getTypeIcon(item.type)">
                  {{ getTypeIcon(item.type) }}
                </v-icon>
                <span>{{ item.title }}</span>
              </template>

              <template v-slot:append-outer>
                <v-btn small color="primary" @click="addBookable">
                  <v-icon left small>mdi-plus</v-icon>
                  Hinzufügen
                </v-btn>
              </template>
            </v-autocomplete>

            <v-divider v-if="bookableItems.length" class="my-4" />

            <v-list v-if="bookableItems.length" dense class="bookable-list py-0">
                  <template v-for="(bookableItem, index) in bookableItems">
                    <v-list-item :key="bookableItem.bookableId" class="px-0">
                      <v-list-item-content class="py-2">
                        <v-list-item-title class="font-weight-bold">
                          {{ bookableItem._bookableUsed?.title }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="mb-2">
                          <BookableTypeChip
                            :type="bookableItem._bookableUsed?.type"
                          />
                        </v-list-item-subtitle>
                        <v-list-item-subtitle>
                          <template
                            v-if="hasExternalPrices(bookableItem._bookableUsed)"
                          >
                            <v-progress-circular
                              v-if="
                                externalPricesLoading[bookableItem.bookableId]
                              "
                              indeterminate
                              size="20"
                              width="2"
                              color="primary"
                              class="my-2"
                            />



                            <template
                              v-else-if="
                                getExternalPrices(bookableItem.bookableId)
                              "
                            >
                              <div class="d-flex align-center mb-2">
                                <v-icon x-small class="mr-1" color="info">
                                  mdi-information-outline
                                </v-icon>
                                <span
                                  class="caption info--text font-weight-medium"
                                >
                                  Externe Preise
                                </span>
                              </div>

                              <v-row dense>
                                <v-col
                                  v-for="price in getExternalPrices(
                                    bookableItem.bookableId
                                  )"
                                  :key="price.unit"
                                  cols="12"
                                  sm="6"
                                  md="4"
                                >
                                  <v-text-field
                                    :value="price.priceEur"
                                    @input="
                                      updateExternalPrice(
                                        bookableItem.bookableId,
                                        price.unit,
                                        $event
                                      )
                                    "
                                    filled
                                    dense
                                    prefix="€"
                                    :suffix="getUnitLabel(price.unit)"
                                    background-color="accent"
                                    hide-details
                                    type="number"
                                    :label="getUnitLabel(price.unit)"
                                  ></v-text-field>
                                </v-col>
                              </v-row>

                              <div class="d-flex align-center justify-end mt-2">
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
                            </template>

                            <div v-else class="caption grey--text my-2">
                              Keine externen Preise verfügbar
                            </div>
                          </template>

                          <v-row v-else dense class="align-center">
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
                                label="Preis (netto, überschreibbar)"
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
            <div v-else class="caption text--secondary py-2 mt-2">
              Keine Buchungsobjekte – mindestens ein Objekt erforderlich
            </div>

            <v-alert
              v-if="hasAvailabilityWarnings"
              type="warning"
              dense
              text
              class="mt-3 mb-0 caption"
            >
              Mindestens ein Buchungsobjekt ist im gewählten Zeitraum bereits
              belegt. Als Admin können Sie trotzdem fortfahren.
            </v-alert>

            <v-alert
              v-if="hasCheckoutAvailabilityRestrictions"
              type="info"
              dense
              text
              class="mt-3 mb-0 caption"
            >
              {{ checkoutAvailabilityRestrictionHint }}
            </v-alert>

            <div class="d-flex align-center justify-space-between mt-4 mb-1">
              <span class="text-subtitle-2">Buchungszeitraum</span>
              <v-btn x-small text @click="removeBookingTimes">
                <v-icon left small>mdi-delete-outline</v-icon>
                Zeiten löschen
              </v-btn>
            </div>
            <v-row dense>
                  <v-col cols="12" md="3">
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
              <v-col cols="12" md="3">
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

            <v-row dense class="mt-2">
              <v-col cols="12" md="3">
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
              <v-col cols="12" md="3">
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

            <template v-if="showOccupancyCalendar">
              <div class="d-flex align-center justify-space-between mt-4 mb-1">
                <span class="text-subtitle-2">Belegungskalender</span>
                <v-btn
                  x-small
                  text
                  @click="occupancyCalendarVisible = !occupancyCalendarVisible"
                >
                  <v-icon left small>
                    {{
                      occupancyCalendarVisible
                        ? "mdi-chevron-up"
                        : "mdi-chevron-down"
                    }}
                  </v-icon>
                  {{ occupancyCalendarVisible ? "Ausblenden" : "Anzeigen" }}
                </v-btn>
              </div>
              <v-expand-transition>
                <div v-if="occupancyCalendarVisible">
                  <CheckoutCalendar
                    :bookable-id="calendarBookableItem.bookableId"
                    :tenant="selectedBooking.tenantId"
                    :booking-time-begin="selectedBooking.timeBegin"
                    :booking-time-end="selectedBooking.timeEnd"
                    :amount="calendarBookableItem.amount"
                  />
                </div>
              </v-expand-transition>
            </template>
          </BaseSection>

          <BookingCustomFieldsSection
                  v-if="editableCustomFields.length"
                  :fields="editableCustomFields"
                  :values="selectedBooking.customFieldValues || []"
                  @update:values="onCustomFieldUpdate"
                />

          <BaseSection title="Kundendaten" icon="mdi-account-outline">
            <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Name *"
                      required
                      v-model="selectedBooking.name"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Firma"
                      v-model="selectedBooking.company"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      required
                      :rules="validationRules.mail"
                      v-model="selectedBooking.mail"
                    >
                      <template #label>
                        E-Mail <span class="error--text">*</span>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Telefon"
                      v-model="selectedBooking.phone"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Straße, Hausnummer *"
                      v-model="selectedBooking.street"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="PLZ *"
                      required
                      v-model="selectedBooking.zipCode"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="8">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      label="Ort *"
                      required
                      v-model="selectedBooking.location"
                    ></v-text-field>
                  </v-col>
            </v-row>
          </BaseSection>

          <BaseSection title="Admin-Optionen" icon="mdi-cog-outline">
                      <v-row v-if="selectedBooking._populated && workflow.active" dense>
                        <v-col cols="12">
                          <v-select
                            :items="[...workflow.states, { name: 'Archiv', id: 'archive' }]"
                            v-model="selectedBooking._populated.workflowStatus"
                            label="Workflow Status"
                            item-text="name"
                            item-value="id"
                            filled
                            dense
                            background-color="accent"
                          />
                        </v-col>
                      </v-row>

                      <v-switch
                        v-model="userCancellable"
                        label="Benutzer darf selbst stornieren"
                        dense
                        class="mt-2"
                      />

                      <v-divider class="my-4" />

                      <v-row dense>
                        <v-col cols="12" sm="6">
                          <v-select
                            :items="activePaymentApps"
                            v-model="selectedBooking.paymentProvider"
                            item-text="title"
                            item-value="id"
                            filled
                            dense
                            background-color="accent"
                            :rules="paymentProviderRules"
                          >
                            <template #label>
                              Zahlungsanbieter
                              <span v-if="hasPayableItems" class="error--text">*</span>
                            </template>
                          </v-select>
                        </v-col>
                        <v-col cols="12" sm="6">
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
                          />
                        </v-col>
                      </v-row>

                      <v-row dense class="mt-2">
                        <v-col cols="12" sm="6">
                          <v-dialog
                            v-model="paymentDateModal"
                            :disabled="!selectedBooking.isPayed"
                            width="290px"
                          >
                            <template v-slot:activator="{ on, attrs }">
                              <v-text-field
                                :value="paymentDate ? new Date(paymentDate).toLocaleDateString('de-DE') : ''"
                                label="Bezahldatum"
                                prepend-icon="mdi-calendar"
                                background-color="accent"
                                filled
                                dense
                                readonly
                                :disabled="!selectedBooking.isPayed"
                                v-bind="attrs"
                                v-on="on"
                                hide-details
                              />
                            </template>
                            <v-date-picker
                              v-model="paymentDate"
                              locale="de-DE"
                              :first-day-of-week="1"
                              @input="paymentDateModal = false"
                            />
                          </v-dialog>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-dialog
                            v-model="paymentTimeModal"
                            :disabled="!selectedBooking.isPayed"
                            width="290px"
                          >
                            <template v-slot:activator="{ on, attrs }">
                              <v-text-field
                                v-model="paymentTime"
                                label="Bezahluhrzeit"
                                prepend-icon="mdi-clock-outline"
                                background-color="accent"
                                filled
                                dense
                                readonly
                                :disabled="!selectedBooking.isPayed"
                                v-bind="attrs"
                                v-on="on"
                                hide-details
                              />
                            </template>
                            <v-time-picker
                              v-if="paymentTimeModal"
                              v-model="paymentTime"
                              format="24hr"
                              full-width
                              @click:minute="paymentTimeModal = false"
                            />
                          </v-dialog>
                        </v-col>
                      </v-row>

                      <v-row
                        v-if="selectedBooking.isPayed"
                        dense
                        class="mt-1"
                      >
                        <v-col cols="12">
                          <div
                            v-if="paymentDate || paymentTime"
                            class="d-flex align-center flex-wrap"
                          >
                            <v-chip
                              v-if="formattedPaymentDateTime"
                              small
                              color="primary"
                              outlined
                              class="mr-2 mb-1"
                            >
                              <v-icon small left>mdi-calendar-clock</v-icon>
                              {{ formattedPaymentDateTime }}
                            </v-chip>
                            <v-btn
                              x-small
                              text
                              color="primary"
                              class="mb-1"
                              @click="setPaymentNow"
                            >
                              <v-icon small left>mdi-clock-fast</v-icon>
                              Jetzt
                            </v-btn>
                            <v-btn
                              x-small
                              text
                              color="error"
                              class="mb-1"
                              @click="clearPaymentDateTime"
                            >
                              <v-icon small left>mdi-close</v-icon>
                              Löschen
                            </v-btn>
                          </div>
                          <v-btn
                            v-else
                            x-small
                            text
                            color="primary"
                            @click="setPaymentNow"
                          >
                            <v-icon small left>mdi-clock-fast</v-icon>
                            Aktuelles Datum/Uhrzeit verwenden
                          </v-btn>
                        </v-col>
                      </v-row>

                      <v-row dense class="mt-4">
                        <v-col cols="12">
                          <v-textarea
                            v-model="selectedBooking.comment"
                            label="Bemerkung"
                            filled
                            dense
                            background-color="accent"
                            rows="2"
                            hide-details
                          />
                        </v-col>
                        <v-col cols="12">
                          <v-textarea
                            v-model="selectedBooking.internalComments"
                            label="Interne Bemerkung"
                            filled
                            dense
                            background-color="accent"
                            rows="2"
                            hide-details
                          />
                        </v-col>
                        <v-col v-if="groupBooking && Object.keys(groupBooking).length" cols="12">
                          <v-textarea
                            v-model="selectedGroupBooking.internalComments"
                            label="Interne Bemerkung der Serie"
                            filled
                            dense
                            background-color="accent"
                            rows="2"
                            hide-details
                          />
                        </v-col>
            </v-row>
          </BaseSection>
        </v-col>

        <v-col cols="12" lg="3">
          <BookingEditSummary
            :bookable-items="bookableItems"
            :formatted-period="formattedBookingPeriod"
            :custom-fields="editableCustomFields"
            :custom-field-values="selectedBooking.customFieldValues || []"
            :item-validations="itemValidations"
            :total-price-eur="totalPriceEur"
            :is-create-mode="isCreateMode"
            :get-item-price-label="getItemPriceLabel"
          />
        </v-col>
      </v-row>
    </v-form>

    <SaveBar
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      :scroll-root="scrollRoot"
      :in-progress="inProgress"
      :disabled="
        inProgress ||
        !valid ||
        bookableItems.length === 0 ||
        isCreateMode ||
        hasUnsavedChanges
      "
      show-restore
      @submit="submitChanges"
      @cancel="resetChanges"
    />
    <BookingRejectConformationDialog
      :to-reject="selectedBooking"
      :open="openRejectDialog"
      :loading="inProgress"
      @close="openRejectDialog = false"
      @reject-booking="rejectBooking"
    />
    <GroupBookingRejectConformationDialog
      :to-reject="selectedBooking"
      :group-booking-id="groupBooking?.id"
      :open="openGroupRejectDialog"
      :in-progress="inProgress"
      :error="rejectError"
      @close="openGroupRejectDialog = false"
      @reject-single-booking="rejectBooking"
      @reject-group-booking="rejectGroupBooking"
    />
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import SaveBar from "@/components/commons/SaveBar.vue";
import BookingEditStatus from "@/components/Booking/BookingEditStatus.vue";
import BookingCustomFieldsSection from "@/components/Booking/BookingCustomFieldsSection.vue";
import BookingEditSummary from "@/components/Booking/BookingEditSummary.vue";
import CheckoutCalendar from "@/components/Checkout/CheckoutCalendar.vue";
import { getTypeColor, getTypeIcon, getTypeText } from "@/utils/bookables";
import { isTimeDependentBookable } from "@/utils/bookableBookingMode";
import { formatCheckoutValidationError } from "@/utils/checkoutErrors";
import { hasBufferConfig, hasLeadTimeConfig } from "@/utils/bookingLeadTime";
import {
  resolveBookingCheckoutCustomFields,
  setCustomFieldValue,
  validateRequiredCustomFields,
} from "@/utils/bookingCustomFields";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import GroupBookingRejectConformationDialog from "@/components/Booking/GroupBookingRejectConformationDialog.vue";
import _ from "lodash";

export default {
  name: "BookingEdit",
  components: {
    GroupBookingRejectConformationDialog,
    BookingRejectConformationDialog,
    BookableTypeChip,
    BaseSection,
    SaveBar,
    BookingEditStatus,
    BookingCustomFieldsSection,
    BookingEditSummary,
    CheckoutCalendar,
  },
  props: {
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
    groupBooking: {
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

      paymentDateModal: false,
      paymentTimeModal: false,
      paymentDate: null,
      paymentTime: null,

      externalPricesMap: {},
      externalPricesLoading: {},

      bookableId_temp: null,

      activePaymentApps: [],

      scrollRoot: null,
      occupancyCalendarVisible: false,

      validationRules: {
        minBookings: [
          () =>
            this.bookableItems.length > 0 ||
            "Mindestens ein Buchungsobjekt muss hinzugefügt werden",
        ],
        required: [(v) => !!v || "Dieses Feld ist erforderlich"],
        mail: [
          (v) => !!v || "E-Mail ist erforderlich",
          (v) => /.+@.+\..+/.test(v) || "E-Mail muss gültig sein",
        ],
        name: [(v) => !!v || "Name ist erforderlich"],
        zipCode: [(v) => !!v || "PLZ ist erforderlich"],
        location: [(v) => !!v || "Stadt ist erforderlich"],
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

      originalGroupInternalComments: null,

      itemValidations: {},
      validateTimer: null,
      checkoutId: null,

      editableBooking: null,
      originalSnapshot: null,
      openRejectDialog: false,
      openGroupRejectDialog: false,
      rejectError: null,
    };
  },
  computed: {
    ...mapGetters({
      tenants: "tenants/tenants",
      tenantId: "tenants/currentTenantId",
    }),
    isCreateMode() {
      return !this.selectedBooking.id;
    },
    bookingTenantLabel() {
      const tenant = this.tenants.find(
        (t) => t.id === this.selectedBooking.tenantId
      );
      return tenant?.name || this.selectedBooking.tenantId || "—";
    },
    formattedBookingPeriod() {
      if (!this.selectedBooking.timeBegin || !this.selectedBooking.timeEnd) {
        return "—";
      }
      const fmt = (ts) =>
        new Intl.DateTimeFormat("de-DE", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(ts));
      return `${fmt(this.selectedBooking.timeBegin)} – ${fmt(
        this.selectedBooking.timeEnd
      )}`;
    },
    totalPriceEur() {
      return this.bookableItems.reduce(
        (sum, item) => sum + this.calculateItemPrice(item),
        0
      );
    },
    hasAvailabilityWarnings() {
      return Object.values(this.itemValidations).some(
        (v) => v?.status === "warning"
      );
    },
    calendarBookableItem() {
      return this.bookableItems.find((item) => {
        const bookable = item._bookableUsed;
        if (!bookable) return false;
        if (bookable.isTimePeriodRelated || bookable.isBlockPeriodRelated) {
          return false;
        }
        return bookable.isScheduleRelated || bookable.isLongRange;
      });
    },
    showOccupancyCalendar() {
      return !!this.calendarBookableItem;
    },
    hasLeadTimeBookables() {
      return this.bookableItems.some((item) =>
        hasLeadTimeConfig(item._bookableUsed)
      );
    },
    hasBufferBookables() {
      return this.bookableItems.some((item) =>
        hasBufferConfig(item._bookableUsed)
      );
    },
    hasCheckoutAvailabilityRestrictions() {
      return this.hasLeadTimeBookables || this.hasBufferBookables;
    },
    checkoutAvailabilityRestrictionHint() {
      const hasLeadTime = this.hasLeadTimeBookables;
      const hasBuffer = this.hasBufferBookables;
      if (hasLeadTime && hasBuffer) {
        return (
          "Mindestens ein Buchungsobjekt hat Vorlaufzeit und/oder Puffer zwischen Buchungen " +
          "konfiguriert. Bei manuellen Buchungen werden diese Regeln nicht geprüft – " +
          "sie gelten nur im öffentlichen Checkout."
        );
      }
      if (hasBuffer) {
        return (
          "Mindestens ein Buchungsobjekt hat einen Puffer zwischen Buchungen konfiguriert. " +
          "Bei manuellen Buchungen wird diese Regel nicht geprüft – sie gilt nur im " +
          "öffentlichen Checkout."
        );
      }
      return (
        "Mindestens ein Buchungsobjekt hat eine Vorlaufzeit konfiguriert. " +
        "Bei manuellen Buchungen wird diese Regel nicht geprüft – sie gilt nur im " +
        "öffentlichen Checkout."
      );
    },
    hasUnsavedChanges() {
      if (!this.originalSnapshot || !this.editableBooking) return false;
      return this.createSnapshot() !== this.originalSnapshot;
    },
    selectedBookingIsSet() {
      return !_.isNil(this.selectedBooking?._populated);
    },
    selectedBooking: {
      get() {
        return this.editableBooking || this.booking;
      },
    },
    selectedGroupBooking() {
      return this.groupBooking;
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
    groupCommentsChanged() {
      return (
        this.groupBooking &&
        this.selectedGroupBooking.internalComments !==
          this.originalGroupInternalComments
      );
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
    hasPayableItems() {
      return this.bookableItems.some((item) => {
        if (this.hasExternalPrices(item._bookableUsed)) {
          const extPrices = this.getExternalPrices(item.bookableId);
          return extPrices?.some(
            (p) => p.priceEur > 0 && p.unit !== "service-fee"
          );
        }
        const priceEur = this.getPriceCategory(item.bookableId, "priceEur");
        return priceEur && Number(priceEur) > 0;
      });
    },
    paymentProviderRules() {
      if (this.hasPayableItems) {
        return [(v) => !!v || "Zahlungsanbieter ist erforderlich"];
      }
      return [];
    },
    bookableItems: {
      get() {
        return this.selectedBooking?.bookableItems || [];
      },
      set(val) {
        if (this.editableBooking) {
          this.$set(this.editableBooking, "bookableItems", val);
        }
      },
    },
    editableCustomFields() {
      const definitions = this.isCreateMode
        ? resolveBookingCheckoutCustomFields(this.bookableItems)
        : this.selectedBooking.customFieldDefinitions || [];
      const values = this.selectedBooking.customFieldValues || [];

      return definitions.map((definition) => {
        const stored = values.find((v) => v.fieldId === definition.id);
        return {
          ...definition,
          currentValue: stored != null ? stored.value : null,
          required:
            definition.usageOptions?.context === "checkout" &&
            definition.usageOptions?.requiredInCheckout,
        };
      });
    },
    userCancellable: {
      get() {
        return (
          this.selectedBooking?.cancellationPolicy?.userCancellable !== false
        );
      },
      set(val) {
        if (!this.selectedBooking.cancellationPolicy) {
          this.$set(this.selectedBooking, "cancellationPolicy", {
            userCancellable: val,
          });
        } else {
          this.$set(
            this.selectedBooking.cancellationPolicy,
            "userCancellable",
            val
          );
        }
      },
    },
  },
  watch: {
    timeTo: function () {
      this.scheduleItemValidation();
    },
    bookableItems: {
      deep: true,
      handler() {
        this.syncCustomFieldDefinitions();
        this.scheduleItemValidation();
      },
    },
    "selectedBooking.timeBegin": function () {
      this.scheduleItemValidation();
    },
    "selectedBooking.timeEnd": function () {
      this.scheduleItemValidation();
    },
    "booking.tenantId": {
      immediate: true,
      handler() {
        if (this.booking?.tenantId) this.fetchActivePaymentApps();
      },
    },
    booking: {
      immediate: true,
      handler(newBooking) {
        if (!newBooking) return;

        this.editableBooking = _.cloneDeep(newBooking);

        if (newBooking.timePaid) {
          this.timePaid = newBooking.timePaid;
        } else {
          this.paymentDate = null;
          this.paymentTime = null;
        }
        if (this.groupBooking) {
          this.originalGroupInternalComments =
            this.groupBooking.internalComments ?? null;
        }

        this.$nextTick(() => this.updateSnapshot());
      },
    },
    timePaid: function (newValue) {
      this.selectedBooking.timePaid = newValue;
    },
    "selectedBooking.isPayed": function (isPayed) {
      if (!isPayed) {
        this.paymentDateModal = false;
        this.paymentTimeModal = false;
      }
    },
    activePaymentApps: {
      immediate: true,
      handler(apps) {
        if (
          apps.length === 1 &&
          !this.selectedBooking.id &&
          !this.selectedBooking.paymentProvider
        ) {
          this.selectedBooking.paymentProvider = apps[0].id;
        }
      },
    },
    "selectedBooking.id": {
      handler(id) {
        if (
          id &&
          this.activePaymentApps.length === 1 &&
          !this.selectedBooking.paymentProvider
        ) {
          this.selectedBooking.paymentProvider = this.activePaymentApps[0].id;
        }
      },
    },
  },
  methods: {
    getTypeIcon,
    getTypeText,
    getTypeColor,
    ...mapActions({
      addToast: "toasts/add",
    }),
    async copyBookingId() {
      if (!this.selectedBooking.id) return;
      try {
        await navigator.clipboard.writeText(this.selectedBooking.id);
        this.addToast(
          ToastService.createToast("booking.copyId.success", "success")
        );
      } catch (error) {
        console.error("Failed to copy booking id:", error);
        this.addToast(
          ToastService.createToast(
            "booking.copyId.errors.something-wrong",
            "error"
          )
        );
      }
    },
    customFieldIcon(inputType) {
      const icons = {
        string: "mdi-form-textbox",
        text: "mdi-form-textarea",
        numeric: "mdi-numeric",
        boolean: "mdi-toggle-switch-outline",
        select: "mdi-form-dropdown",
      };
      return icons[inputType] || "mdi-form-textbox";
    },
    updateCustomFieldValue(fieldId, newValue) {
      const values = setCustomFieldValue(
        this.selectedBooking.customFieldValues || [],
        fieldId,
        newValue
      );
      this.$set(this.selectedBooking, "customFieldValues", values);
    },
    onCustomFieldUpdate({ fieldId, value }) {
      this.updateCustomFieldValue(fieldId, value);
    },
    syncCustomFieldDefinitions() {
      if (!this.isCreateMode) return;
      const definitions = resolveBookingCheckoutCustomFields(this.bookableItems);
      this.$set(this.selectedBooking, "customFieldDefinitions", definitions);
    },
    scheduleItemValidation() {
      if (this.validateTimer) clearTimeout(this.validateTimer);
      this.validateTimer = setTimeout(() => {
        this.validateAllBookableItems();
      }, 500);
    },
    async validateAllBookableItems() {
      for (const item of this.bookableItems) {
        await this.validateBookableItem(item);
      }
    },
    async validateBookableItem(bookableItem) {
      const bookableId = bookableItem.bookableId;
      const bookable = bookableItem._bookableUsed;

      if (
        isTimeDependentBookable(bookable) &&
        (!this.selectedBooking.timeBegin || !this.selectedBooking.timeEnd)
      ) {
        this.$set(this.itemValidations, bookableId, {
          status: "idle",
          message: "Zeitraum fehlt",
        });
        return;
      }

      this.$set(this.itemValidations, bookableId, {
        status: "loading",
        message: "Prüfe Verfügbarkeit…",
      });

      const payload = {
        bookableId: bookableItem.bookableId,
        amount: bookableItem.amount,
        bookable: bookableItem._bookableUsed,
      };

      try {
        const response = await ApiCheckoutService.validateCheckoutItem(
          this.selectedBooking.tenantId,
          payload,
          this.selectedBooking.timeBegin,
          this.selectedBooking.timeEnd,
          null,
          false,
          this.checkoutId
        );

        if (response.data?.checkoutId) {
          this.checkoutId = response.data.checkoutId;
        }

        this.$set(this.itemValidations, bookableId, {
          status: "ok",
          message: "Kein Konflikt erkannt",
          regularPriceEur: response.data?.regularPriceEur,
        });
      } catch (err) {
        if (err.response?.data?.checkoutId) {
          this.checkoutId = err.response.data.checkoutId;
        }

        const message = formatCheckoutValidationError(err.response?.data);
        this.$set(this.itemValidations, bookableId, {
          status: "warning",
          message: message || "Mögliche Doppelbuchung",
        });
      }
    },
    calculateItemPrice(item) {
      if (this.hasExternalPrices(item._bookableUsed)) {
        const price = this.getRelevantExternalPrice(item.bookableId);
        return (Number(price?.priceEur) || 0) * item.amount;
      }

      const category = this.getPriceCategory(item.bookableId);
      if (!category) return 0;

      const base = Number(category.priceEur) || 0;
      if (category.fixedPrice) return base;

      const duration = this.getBookingDuration();
      const bookable = item._bookableUsed;
      const amount = item.amount || 1;

      switch (bookable?.priceType) {
        case "per-hour":
          return base * (duration / 60) * amount;
        case "per-day":
          return base * (duration / 60 / 24) * amount;
        case "per-square-meter":
        case "per-item":
        default:
          return base * amount;
      }
    },
    getItemPriceLabel(item) {
      const price = this.calculateItemPrice(item);
      return `${price.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`;
    },
    clearCustomFieldValue(fieldId) {
      const values = (this.selectedBooking.customFieldValues || []).filter(
        (v) => v.fieldId !== fieldId
      );
      this.$set(this.selectedBooking, "customFieldValues", values);
    },
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
    cancel() {
      this.$emit("cancel");
    },
    createSnapshot() {
      const booking = _.cloneDeep(this.editableBooking);
      delete booking._id;
      return JSON.stringify({
        booking,
        timePaid: this.timePaid,
        groupInternalComments: this.groupBooking?.internalComments ?? null,
        externalPrices: this.externalPricesMap,
      });
    },
    updateSnapshot() {
      if (!this.editableBooking) return;
      this.originalSnapshot = this.createSnapshot();
    },
    resetChanges() {
      if (!this.originalSnapshot) {
        this.cancel();
        return;
      }

      const snap = JSON.parse(this.originalSnapshot);
      this.editableBooking = _.cloneDeep(snap.booking);
      this.timePaid = snap.timePaid;
      if (this.groupBooking) {
        this.$set(
          this.groupBooking,
          "internalComments",
          snap.groupInternalComments
        );
      }
      this.externalPricesMap = _.cloneDeep(snap.externalPrices || {});
    },
    openCancellationDialog() {
      this.rejectError = null;
      if (this.groupBooking?.id) {
        this.openGroupRejectDialog = true;
      } else {
        this.openRejectDialog = true;
      }
    },
    async rejectBooking(
      id,
      reason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      this.inProgress = true;
      try {
        await ApiBookingService.rejectBooking(
          id,
          this.tenantId,
          reason,
          skipCancellation,
          bankDetails,
          refundPercentage
        );
        await this.addToast(
          ToastService.createToast("booking.reject.success", "success")
        );
        this.openRejectDialog = false;
        this.openGroupRejectDialog = false;
        this.finishSave();
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.reject.error", "error")
        );
      } finally {
        this.inProgress = false;
      }
    },
    async rejectGroupBooking(
      id,
      reason,
      skipCancellation,
      bankDetails,
      refundPercentage
    ) {
      this.inProgress = true;
      this.rejectError = null;
      try {
        const response = await ApiGroupBookingService.rejectGroupBooking(
          this.tenantId,
          this.groupBooking.id,
          reason,
          skipCancellation,
          bankDetails,
          refundPercentage
        );
        if (!response.success) {
          this.rejectError = this.$t("group-booking.reject.error.message");
          return;
        }
        await this.addToast(
          ToastService.createToast("group-booking.reject.success", "success")
        );
        this.openGroupRejectDialog = false;
        this.finishSave();
      } catch (error) {
        this.rejectError = this.$t("group-booking.reject.error.message");
      } finally {
        this.inProgress = false;
      }
    },
    async unrejectBooking() {
      if (!this.selectedBooking?.id) return;

      this.inProgress = true;
      try {
        const response = await ApiBookingService.getBooking(
          this.selectedBooking.id,
          this.tenantId,
          true
        );
        const payload = {
          ...response.data,
          isRejected: false,
          rejectionReason: "",
        };
        delete payload._id;
        delete payload._populated;
        await ApiBookingService.storeBooking(payload);
        await this.addToast(
          ToastService.createToast("booking.unreject.success", "success")
        );
        this.finishSave();
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.unreject.error", "error")
        );
      } finally {
        this.inProgress = false;
      }
    },
    finishSave() {
      this.$emit("saved");
    },
    async submitChanges() {
      const missingFields = validateRequiredCustomFields(
        this.editableCustomFields,
        this.selectedBooking.customFieldValues || []
      );
      if (missingFields.length) {
        await this.addToast(
          ToastService.createToast("booking.validation.required", "error")
        );
        return;
      }

      if (
        this.selectedBooking.isRejected &&
        !this.selectedBooking.rejectionReason?.trim()
      ) {
        await this.addToast(
          ToastService.createToast("booking.validation.required", "error")
        );
        return;
      }

      if (!this.selectedBooking.id) {
        this.inProgress = true;
        if (!this.$refs.form.validate()) {
          await this.addToast(
            ToastService.createToast("booking.validation.required", "error")
          );
          if (this.bookableItems.length === 0) {
            await this.addToast(
              ToastService.createToast(
                "booking.validation.bookableItems.min_items",
                "error"
              )
            );
          }
          this.inProgress = false;
          return;
        }

        await ApiBookingService.storeBooking(this.selectedBooking)
          .then(async () => {
            await this.saveGroupBookingIfNeeded();
            this.inProgress = false;
            this.finishSave();
          })
          .catch((err) => {
            const data = err.response?.data;
            if (data?.error === "ValidationError" && data.details?.length) {
              data.details.forEach((detail) => {
                this.addToast(
                  ToastService.createBookingValidationToast(detail)
                );
              });
            } else {
              this.addToast(
                ToastService.createToast("booking.create.error", "error")
              );
            }
            this.inProgress = false;
          });
      } else {
        this.inProgress = true;
        delete this.selectedBooking._id;
        await ApiBookingService.storeBooking(this.selectedBooking)
          .then(async () => {
            await this.saveGroupBookingIfNeeded();
            this.inProgress = false;
            this.finishSave();
          })
          .catch((err) => {
            const data = err.response?.data;
            console.log("ERRE", err);
            if (data?.error === "ValidationError" && data.details?.length) {
              data.details.forEach((detail) => {
                this.addToast(
                  ToastService.createBookingValidationToast(detail)
                );
              });
            } else {
              this.addToast(
                ToastService.createToast("booking.edit.error", "error")
              );
            }
            this.inProgress = false;
          });
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
    async saveGroupBookingIfNeeded() {
      if (this.groupCommentsChanged) {
        await ApiGroupBookingService.updateGroupBooking(
          this.groupBooking.tenantId,
          this.groupBooking.id,
          {
            internalComments: this.selectedGroupBooking.internalComments,
          }
        );
      }
    },
    increaseAmount(bookableItem) {
      bookableItem.amount++;
      this.scheduleItemValidation();
    },
    decreaseAmount(bookableItem) {
      if (bookableItem.amount > 1) {
        bookableItem.amount--;
        this.scheduleItemValidation();
      } else {
        this.selectedBooking.bookableItems =
          this.selectedBooking.bookableItems.filter(
            (b) => b.bookableId !== bookableItem.bookableId
          );
        this.$delete(this.itemValidations, bookableItem.bookableId);
        this.syncCustomFieldDefinitions();
      }
    },
    async addBookable() {
      if (!this.addBookableValue) return;

      const existing = this.selectedBooking.bookableItems.find(
        (b) => b.bookableId === this.addBookableValue
      );

      if (existing) {
        existing.amount++;
      } else {
        let bookable = this.bookables.find(
          (b) => b.id === this.addBookableValue
        );

        if (!bookable?.customFields?.length) {
          try {
            const response = await ApiBookablesService.getBookable(
              this.addBookableValue,
              this.selectedBooking.tenantId,
              true
            );
            bookable = response.data;
          } catch (error) {
            console.error(error);
          }
        }

        if (!bookable) return;

        this.selectedBooking.bookableItems.push({
          bookableId: bookable.id,
          amount: 1,
          _bookableUsed: bookable,
        });

        if (this.hasExternalPrices(bookable)) {
          await this.fetchExternalPricesForItem(bookable.id);
        }
      }

      this.syncCustomFieldDefinitions();
      this.addBookableValue = null;
      this.scheduleItemValidation();
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
    hasExternalPrices(bookable) {
      return (
        bookable?.externalProviders &&
        bookable.externalProviders?.some(
          (p) => p.active && p.handles.includes("pricing")
        )
      );
    },

    getExternalPrices(bookableId) {
      return this.externalPricesMap[bookableId] || null;
    },

    async fetchExternalPricesForItem(bookableId) {

      console.log(
        `Fetching external prices for bookableId ${bookableId}...`,
        this.externalPricesMap[bookableId],
        this.externalPricesLoading[bookableId]
      );

      if (
        this.externalPricesMap[bookableId] ||
        this.externalPricesLoading[bookableId]
      ) {
        return;
      }

      this.$set(this.externalPricesLoading, bookableId, true);
      try {
        const response = await ApiBookablesService.getBookablePrices(
          bookableId,
          this.selectedBooking.tenantId
        );
        this.$set(this.externalPricesMap, bookableId, response.data);
      } catch (error) {
        console.error(
          `Failed to fetch external prices for ${bookableId}:`,
          error
        );
        this.$set(this.externalPricesMap, bookableId, []);
      } finally {
        this.$set(this.externalPricesLoading, bookableId, false);
      }
    },
    async loadAllExternalPrices() {
      const promises = this.bookableItems
        .filter((item) => this.hasExternalPrices(item._bookableUsed))
        .map((item) => this.fetchExternalPricesForItem(item.bookableId));
      await Promise.all(promises);
    },

    getUnitLabel(unit) {
      const labels = {
        hour: "pro Stunde",
        day: "pro Tag",
        week: "pro Woche",
        month: "pro Monat",
        year: "pro Jahr",
        "service-fee": "Servicegebühr",
      };
      return labels[unit] || unit;
    },

    getRelevantExternalPrice(bookableId) {
      const prices = this.externalPricesMap[bookableId];
      if (!prices || prices.length === 0) return null;

      const durationMinutes = this.getBookingDuration();
      const durationHours = durationMinutes / 60;
      const durationDays = durationHours / 24;

      // Beste Einheit basierend auf Buchungsdauer auswählen
      if (durationDays >= 365) {
        return prices.find((p) => p.unit === "year");
      } else if (durationDays >= 28) {
        return prices.find((p) => p.unit === "month");
      } else if (durationDays >= 7) {
        return prices.find((p) => p.unit === "week");
      } else if (durationDays >= 1) {
        return prices.find((p) => p.unit === "day");
      }
      return prices.find((p) => p.unit === "hour") || prices[0];
    },

    updateExternalPrice(bookableId, unit, newPrice) {
      const prices = this.externalPricesMap[bookableId];
      if (!prices) return;
      const price = prices.find((p) => p.unit === unit);
      if (price) {
        price.priceEur = Number(newPrice);
      }
    },
  },
  async mounted() {
    this.scrollRoot = this.$el.closest(".admin-page__body--scroll");
    if (this.groupBooking) {
      this.originalGroupInternalComments =
        this.groupBooking.internalComments ?? null;
    }
    await this.loadAllExternalPrices();
    this.scheduleItemValidation();
    this.updateSnapshot();
  },
  beforeDestroy() {
    if (this.validateTimer) {
      clearTimeout(this.validateTimer);
    }
  },
};
</script>

<style scoped lang="scss">
.page-content {
  padding-bottom: calc(56px + 12px + 12px + 16px);
}

.bookable-list {
  background: transparent;
}

.bookable-list >>> .v-list-item {
  min-height: auto;
}

.bookable-list >>> .v-list-item__title {
  font-size: 0.9375rem;
  font-weight: 500;
}

.booking-id-copy {
  cursor: pointer;
  user-select: none;
}

.booking-id-copy:hover {
  color: var(--v-primary-base);
}
</style>

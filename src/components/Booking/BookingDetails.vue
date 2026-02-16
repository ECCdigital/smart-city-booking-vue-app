<template>
  <div>
    <v-card class="booking-details" elevation="0">
      <div class="px-6 py-5 d-flex align-center">
        <v-icon large class="mr-3">mdi-file-document-outline</v-icon>
        <span class="text-h5 font-weight-bold">Buchungsdetails</span>
      </div>

      <v-divider></v-divider>

      <v-card-text class="px-6 py-6 booking-details-content">
        <v-alert
          v-if="groupBooking && groupBooking.id"
          type="info"
          dense
          outlined
          border="left"
          class="mx-6 my-4"
        >
          Diese Buchung ist Teil der Gruppenbuchung
          <strong>#{{ groupBooking.id }}</strong
          >. Änderungen an dieser Buchung können Auswirkungen auf die gesamte
          Gruppenbuchung haben.
        </v-alert>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-information-outline</v-icon>
            <span class="text-h6 font-weight-bold">Buchungsinformationen</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-pound</v-icon>
                    Buchungsnummer
                  </div>
                  <div class="info-value">{{ booking.id }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-calendar-clock</v-icon>
                    Buchungsdatum
                  </div>
                  <div class="info-value">
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(booking.timeCreated))
                    }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-calendar-range</v-icon>
                    Buchungszeitraum
                  </div>
                  <div class="info-value">
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(booking.timeBegin))
                    }}
                    -
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(booking.timeEnd))
                    }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-shield-check-outline</v-icon>
                    Freigabestatus
                  </div>
                  <div class="info-value">
                    <v-chip
                      small
                      :color="getApprovalStatusColor()"
                      text-color="white"
                    >
                      <v-icon left x-small>
                        {{ getApprovalStatusIcon() }}
                      </v-icon>
                      {{ getApprovalStatusText() }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-cash-multiple</v-icon>
            <span class="text-h6 font-weight-bold">Zahlungsinformationen</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-currency-eur</v-icon>
                    Gesamtpreis
                  </div>
                  <div class="info-value price-highlight">
                    {{
                      Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(booking.priceEur)
                    }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-credit-card-outline</v-icon>
                    Bezahlt mit
                  </div>
                  <div class="info-value">
                    <v-chip
                      :color="getPaymentMethodColor(booking.paymentMethod)"
                      text-color="white"
                      small
                    >
                      <v-icon left small>
                        {{ getPaymentMethodIcon(booking.paymentMethod) }}
                      </v-icon>
                      {{ translatePayMethod(booking.paymentMethod) }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-check-circle-outline</v-icon>
                    Status der Zahlung
                  </div>
                  <div class="info-value">
                    <v-chip
                      small
                      :color="booking.isPayed ? 'success' : 'warning'"
                      text-color="white"
                    >
                      <v-icon left x-small>
                        {{
                          booking.isPayed ? "mdi-check" : "mdi-clock-outline"
                        }}
                      </v-icon>
                      {{ booking.isPayed ? "Bezahlt" : "Ausstehend" }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
              <v-col
                cols="12"
                md="6"
                v-if="booking.priceEur && booking.priceEur > 0"
              >
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-bank-transfer</v-icon>
                    Zahlungsanbieter
                  </div>
                  <div class="info-value">
                    <v-chip
                      :color="getPaymentProviderColor(booking.paymentProvider)"
                      text-color="white"
                      small
                    >
                      <v-icon left small>
                        {{ getPaymentProviderIcon(booking.paymentProvider) }}
                      </v-icon>
                      {{ translatePaymentProvider(booking.paymentProvider) }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
              <v-col
                cols="12"
                v-if="
                  !booking.isPayed &&
                  booking.isCommitted &&
                  booking.paymentProvider &&
                  booking.paymentProvider !== 'invoice'
                "
              >
                <v-alert type="info" dense outlined border="left" class="mb-0">
                  <div class="d-flex align-center mb-2">
                    <v-icon class="mr-2">mdi-credit-card-clock-outline</v-icon>
                    <span class="font-weight-medium">
                      Die Zahlung steht noch aus. Zahlungslink bereitstellen:
                    </span>
                  </div>

                  <div v-if="!groupBooking" class="d-flex gap-2 flex-wrap mt-3">
                    <v-btn small outlined @click="copyPaymentLink(false)">
                      <v-icon left small>
                        {{
                          paymentLinkCopied ? "mdi-check" : "mdi-content-copy"
                        }}
                      </v-icon>
                      {{ paymentLinkCopied ? "Kopiert!" : "Link kopieren" }}
                    </v-btn>
                    <v-btn
                      small
                      color="primary"
                      @click="openPaymentLink(false)"
                    >
                      <v-icon left small>mdi-open-in-new</v-icon>
                      Link öffnen
                    </v-btn>
                  </div>

                  <div v-else class="mt-3">
                    <div class="mb-2 text-caption">
                      <v-icon x-small class="mr-1">mdi-information</v-icon>
                      Diese Buchung gehört zur Gruppenbuchung #{{
                        groupBooking.id
                      }}
                    </div>

                    <div class="d-flex gap-2 flex-wrap">
                      <v-btn small outlined @click="copyPaymentLink(false)">
                        <v-icon left small>
                          {{
                            singlePaymentLinkCopied
                              ? "mdi-check"
                              : "mdi-content-copy"
                          }}
                        </v-icon>
                        {{
                          singlePaymentLinkCopied
                            ? "Kopiert!"
                            : "Nur diese Buchung"
                        }}
                      </v-btn>

                      <v-btn
                        small
                        color="primary"
                        @click="copyPaymentLink(true)"
                      >
                        <v-icon left small>
                          {{
                            groupPaymentLinkCopied
                              ? "mdi-check"
                              : "mdi-content-copy"
                          }}
                        </v-icon>
                        {{
                          groupPaymentLinkCopied ? "Kopiert!" : "Gesamte Gruppe"
                        }}
                      </v-btn>

                      <v-menu offset-y>
                        <template v-slot:activator="{ on, attrs }">
                          <v-btn small color="primary" v-bind="attrs" v-on="on">
                            <v-icon left small>mdi-open-in-new</v-icon>
                            Link öffnen
                            <v-icon right small>mdi-chevron-down</v-icon>
                          </v-btn>
                        </template>
                        <v-list dense>
                          <v-list-item @click="openPaymentLink(false)">
                            <v-list-item-icon>
                              <v-icon small>mdi-file-document-outline</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                              <v-list-item-title
                                >Nur diese Buchung</v-list-item-title
                              >
                            </v-list-item-content>
                          </v-list-item>
                          <v-list-item @click="openPaymentLink(true)">
                            <v-list-item-icon>
                              <v-icon small
                                >mdi-file-document-multiple-outline</v-icon
                              >
                            </v-list-item-icon>
                            <v-list-item-content>
                              <v-list-item-title>
                                Gesamte Gruppe ({{
                                  groupBooking.bookingIds?.length || 0
                                }}
                                Buchungen)
                              </v-list-item-title>
                            </v-list-item-content>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </div>
                </v-alert>
              </v-col>
              <v-col
                cols="12"
                md="6"
                v-if="booking.isPayed && booking.timePaid"
              >
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-calendar-check</v-icon>
                    Bezahldatum
                  </div>
                  <div class="info-value">
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(booking.timePaid))
                    }}
                  </div>
                </div>
              </v-col>
            </v-row>
            <v-row v-if="booking.isRejected && booking.rejectionReason">
              <v-col cols="12">
                <v-alert type="error" dense outlined border="left" class="mb-0">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-alert-circle</v-icon>
                    <div>
                      <div class="font-weight-bold">Ablehnungsgrund</div>
                      <div>{{ booking.rejectionReason }}</div>
                    </div>
                  </div>
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-package-variant</v-icon>
            <span class="text-h6 font-weight-bold">Buchungsobjekte</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0 mb-1">
            <v-list dense>
              <template v-for="(item, name, index) in booking.bookableItems">
                <v-list-item :key="name" class="px-4">
                  <v-list-item-avatar color="primary lighten-4">
                    <v-icon color="primary">mdi-cube-outline</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      {{ item._bookableUsed?.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <BookableTypeChip :type="item._bookableUsed?.type" />
                    </v-list-item-subtitle>
                    <v-list-item-subtitle>
                      <span class="mr-4">
                        <v-icon x-small>mdi-counter</v-icon>
                        Anzahl: {{ item?.amount }}
                      </span>
                      <span>
                        <v-icon x-small>mdi-currency-eur</v-icon>
                        Einzelpreis:
                        {{
                          Intl.NumberFormat("de-DE", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.userGrossPriceEur)
                        }}
                      </span>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
                <v-divider
                  v-if="index < Object.keys(booking.bookableItems).length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-account-outline</v-icon>
            <span class="text-h6 font-weight-bold">Kundeninformationen</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-account</v-icon>
                    Name
                  </div>
                  <div class="info-value">{{ booking.name || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-office-building</v-icon>
                    Firma
                  </div>
                  <div class="info-value">{{ booking.company || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-email-outline</v-icon>
                    E-Mail
                  </div>
                  <div class="info-value">{{ booking.mail || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-phone-outline</v-icon>
                    Telefon
                  </div>
                  <div class="info-value">{{ booking.phone || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-map-marker-outline</v-icon>
                    Straße
                  </div>
                  <div class="info-value">{{ booking.street || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-mailbox-outline</v-icon>
                    Postleitzahl
                  </div>
                  <div class="info-value">{{ booking.zipCode || "-" }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-city</v-icon>
                    Stadt
                  </div>
                  <div class="info-value">{{ booking.location || "-" }}</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          v-if="invoices?.length > 0"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-invoice-outline</v-icon>
            <span class="text-h6 font-weight-bold">Rechnungen</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <v-list dense>
              <template v-for="(item, index) in invoices">
                <v-list-item :key="index" class="px-4">
                  <v-list-item-avatar color="success lighten-4">
                    <v-icon color="success">mdi-file-pdf-box</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      {{ item.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.timeCreated">
                      <v-icon x-small>mdi-calendar</v-icon>
                      Ausstellungsdatum:
                      {{
                        Intl.DateTimeFormat("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.timeCreated))
                      }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn icon @click="downloadInvoice(item.name)">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-divider
                  v-if="index < invoices.length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-file-document</v-icon>
              <span class="text-h6 font-weight-bold">Buchungsbelege</span>
            </div>
            <v-btn small @click="createReceipt(booking.id)">
              <v-icon left small>mdi-plus</v-icon>
              Beleg erstellen
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4" v-if="errors.receipt">
            <v-alert type="error" dense outlined border="left">
              {{ errors.receipt }}
            </v-alert>
          </v-card-text>
          <v-card-text class="pa-0" v-if="receipts.length > 0">
            <v-list dense>
              <template v-for="(item, index) in receipts">
                <v-list-item :key="item.title" class="px-4">
                  <v-list-item-avatar color="success lighten-4">
                    <v-icon color="success">mdi-file-pdf-box</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      {{ item.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.timeCreated">
                      <v-icon x-small>mdi-calendar</v-icon>
                      Ausstellungsdatum:
                      {{
                        Intl.DateTimeFormat("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.timeCreated))
                      }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn icon @click="downloadReceipt(item.title)">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-divider
                  v-if="index < receipts.length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
          <v-card-text v-else class="pa-4 text-center grey--text">
            <v-icon large color="grey lighten-1" class="mb-2">
              mdi-file-document-outline
            </v-icon>
            <div>Keine Buchungsbelege vorhanden</div>
          </v-card-text>
        </v-card>

        <v-card
          class="mb-6 section-card"
          elevation="2"
          outlined
          v-if="booking.comment || booking.internalComments"
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-comment-text-outline</v-icon>
            <span class="text-h6 font-weight-bold">Bemerkungen</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <div v-if="booking.comment" class="mb-4">
              <div class="info-label mb-2">
                <v-icon small class="mr-2">mdi-comment-outline</v-icon>
                Bemerkung
              </div>
              <div class="comment-box">
                {{ booking.comment }}
              </div>
            </div>
            <div v-if="booking.internalComments">
              <div class="info-label mb-2">
                <v-icon small class="mr-2">mdi-comment-alert-outline</v-icon>
                Interne Bemerkung
              </div>
              <div class="comment-box internal">
                {{ booking.internalComments }}
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 section-card" elevation="2" outlined>
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-paperclip</v-icon>
            <span class="text-h6 font-weight-bold">Anhänge</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" v-if="attachments?.length > 0">
            <v-list dense>
              <template v-for="(item, index) in attachments">
                <v-list-item :key="index" class="px-4">
                  <v-list-item-avatar color="info lighten-4">
                    <v-icon color="info">mdi-file-document</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      {{ item.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip
                        x-small
                        :color="item.accepted ? 'success' : 'grey'"
                        text-color="white"
                        class="mr-2"
                      >
                        <v-icon left x-small>
                          {{
                            item.accepted
                              ? "mdi-checkbox-marked"
                              : "mdi-checkbox-blank-outline"
                          }}
                        </v-icon>
                        {{
                          item.accepted
                            ? "Gelesen und akzeptiert"
                            : "Nicht akzeptiert"
                        }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn
                      icon
                      @click="
                        downloadAttachment({ url: item.url, label: item.title })
                      "
                    >
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-divider
                  v-if="index < attachments.length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
          <v-card-text v-else class="pa-4 text-center grey--text">
            <v-icon large color="grey lighten-1" class="mb-2">
              mdi-paperclip
            </v-icon>
            <div>Keine Anhänge vorhanden</div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn outlined @click="closeDialog">
          <v-icon left>mdi-close</v-icon>
          Schließen
        </v-btn>
      </v-card-actions>
      <ProcessingIndicator ref="processingIndicator" />
      <GroupBookingCreateReceipt
        :open="openCreateAggregatedReceipt"
        :booking-id="booking.id"
        :error="errors.receipt"
        @close="closeAggregatedReceipt"
        @create-single-booking-receipt="createSingleReceipt(booking.id)"
        @create-group-booking-receipt="createGroupReceipt(booking.id)"
      />
    </v-card>
  </div>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";
import GroupBookingCreateReceipt from "@/components/Booking/GroupBookingCreateReceipt.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import {
  getBookingErrorMessage,
  getGroupBookingErrorMessage,
} from "@/utils/errorMessages";
import ProcessingIndicator from "@/components/ProcessingIndicator.vue";
import ProcessingService from "@/services/ProcessingService";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";

export default {
  name: "BookingDetails",
  components: {
    BookableTypeChip,
    ProcessingIndicator,
    GroupBookingCreateReceipt,
  },
  props: {
    booking: {
      type: Object,
      required: true,
    },
    groupBooking: {
      type: Object,
      default: null,
    },
  },
  events: "update",
  data() {
    return {
      openCreateAggregatedReceipt: false,
      errors: {
        receipt: null,
      },
      paymentLinkCopied: false,
      singlePaymentLinkCopied: false,
      groupPaymentLinkCopied: false,
      paymentLinkCopiedTimeout: null,
      singlePaymentLinkCopiedTimeout: null,
      groupPaymentLinkCopiedTimeout: null,
    };
  },
  computed: {
    receipts() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) => attachment.type === "receipt"
      );
    },
    invoices() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) => attachment.type === "invoice"
      );
    },
    attachments() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) =>
          attachment.type !== "receipt" && attachment.type !== "invoice"
      );
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    translatePaymentProvider(provider) {
      switch (provider) {
        case "giroCockpit":
          return "GiroCockpit (Online bezahlen)";
        case "pmPayment":
          return "pmPayment (Online bezahlen)";
        case "invoice":
          return "Rechnung";
        case "manual":
          return "Manuelle Zahlung";
        default:
          return "Unbekannt";
      }
    },
    translatePayMethod(paymentMethod) {
      switch (paymentMethod) {
        case "CASH":
          return "Bar";
        case "TRANSFER":
          return "Überweisung";
        case "CREDIT_CARD":
          return "Kreditkarte";
        case "DEBIT_CARD":
          return "EC-Karte";
        case "PAYPAL":
          return "PayPal";
        case "OTHER":
          return "Sonstiges";
        case "GIROPAY":
          return "Giropay";
        case "APPLE_PAY":
          return "Apple Pay";
        case "GOOGLE_PAY":
          return "Google Pay";
        case "EPS":
          return "EPS";
        case "IDEAL":
          return "iDEAL";
        case "MAESTRO":
          return "Maestro";
        case "PAYDIRECT":
          return "paydirekt";
        case "SOFORT":
          return "SOFORT-Überweisung";
        case "BLUECODE":
          return "Bluecode";
        default:
          return "Unbekannt";
      }
    },
    getApprovalStatusText() {
      if (this.booking.isRejected && !this.booking.isCommitted) {
        return "Abgelehnt";
      }
      if (this.booking.isRejected && this.booking.isCommitted) {
        return "Storniert";
      }
      if (this.booking.isCommitted) {
        return "Freigegeben";
      }
      return "Ausstehend";
    },
    getApprovalStatusColor() {
      if (this.booking.isRejected) {
        return "error";
      }
      if (this.booking.isCommitted) {
        return "success";
      }
      return "warning";
    },
    getApprovalStatusIcon() {
      if (this.booking.isRejected) {
        return "mdi-close-circle";
      }
      if (this.booking.isCommitted) {
        return "mdi-check-circle";
      }
      return "mdi-clock-outline";
    },
    createReceipt(bookingId) {
      if (this.groupBooking) {
        this.openCreateAggregatedReceipt = true;
      } else {
        this.createSingleReceipt(bookingId);
      }
    },
    async createSingleReceipt(bookingId) {
      const operationId = ProcessingService.showOverlay("Erstelle Beleg...");
      try {
        const response = await ApiBookingService.generateReceipt(bookingId);
        if (!response.success) {
          this.handleBookingError("receipt", response.errors);
        } else {
          this.$emit("update", bookingId);
          await this.addToast(
            ToastService.createToast("receipt.create.success", "success")
          );
          this.errors.receipt = null;
          this.openCreateAggregatedReceipt = false;
        }
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    handleBookingError(action, errors) {
      const code = errors[0]?.code;
      this.addToast(
        ToastService.createToast(`booking.${action}.error`, "error")
      );
      this.errors[action] = getBookingErrorMessage(code);
    },
    handleGroupBookingError(action, errors) {
      const code = errors[0]?.code;
      this.addToast(
        ToastService.createToast(`group-booking.${action}.error`, "error")
      );
      this.errors[action] = getGroupBookingErrorMessage(code);
    },
    async createGroupReceipt(bookingId) {
      const operationId = ProcessingService.showOverlay(
        "Erstelle Gruppenbeleg..."
      );
      try {
        this.openCreateAggregatedReceipt = false;
        const response = await ApiGroupBookingService.generateGroupReceipt(
          undefined,
          this.groupBooking.id
        );
        if (!response.success) {
          this.handleGroupBookingError("receipt", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("receipt.create.success", "success")
          );
          this.errors.receipt = null;
          this.$emit("update", bookingId);
        }
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    downloadReceipt(name) {
      const operationId = ProcessingService.showSnackbar(
        "Stelle Zahlungsbeleg bereit..."
      );
      ApiBookingService.getReceipt(this.booking.id, name).then((response) => {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", name);
        document.body.appendChild(link);
        link.click();
        ProcessingService.hide(operationId);
      });
    },
    downloadInvoice(name) {
      const operationId = ProcessingService.showSnackbar(
        "Stelle Rechnung bereit..."
      );
      ApiBookingService.getInvoice(this.booking.id, name).then((response) => {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", name);
        document.body.appendChild(link);
        link.click();
        ProcessingService.hide(operationId);
      });
    },
    downloadAttachment({ url, label }) {
      const operationId = ProcessingService.showSnackbar(
        "Stelle Anhang bereit..."
      );
      try {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.download = label;
        link.click();
      } catch (error) {
        this.addToast(
          ToastService.createToast("attachment.download.error", "error")
        );
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    closeDialog() {
      this.errors.receipt = null;
      this.$emit("close");
    },
    closeAggregatedReceipt() {
      this.errors.receipt = null;
      this.openCreateAggregatedReceipt = false;
    },
    // Payment Provider
    getPaymentProviderColor(provider) {
      const colors = {
        giroCockpit: "blue darken-2",
        pmPayment: "purple darken-1",
        invoice: "orange darken-1",
        manual: "grey darken-1",
      };
      return colors[provider] || "grey";
    },

    getPaymentProviderIcon(provider) {
      const icons = {
        giroCockpit: "mdi-bank",
        pmPayment: "mdi-credit-card-multiple",
        invoice: "mdi-file-document",
        manual: "mdi-hand-coin",
      };
      return icons[provider] || "mdi-help-circle";
    },
    getPaymentMethodColor(method) {
      const colors = {
        CASH: "green darken-1",
        TRANSFER: "blue darken-1",
        CREDIT_CARD: "deep-purple darken-1",
        DEBIT_CARD: "indigo darken-1",
        PAYPAL: "blue darken-3",
        GIROPAY: "red darken-1",
        APPLE_PAY: "grey darken-4",
        GOOGLE_PAY: "blue darken-2",
        EPS: "pink darken-1",
        IDEAL: "pink darken-2",
        MAESTRO: "blue darken-4",
        PAYDIRECT: "orange darken-2",
        SOFORT: "pink darken-3",
        BLUECODE: "light-blue darken-1",
        OTHER: "grey darken-2",
      };
      return colors[method] || "grey";
    },

    getPaymentMethodIcon(method) {
      const icons = {
        CASH: "mdi-cash",
        TRANSFER: "mdi-bank-transfer",
        CREDIT_CARD: "mdi-credit-card",
        DEBIT_CARD: "mdi-card",
        PAYPAL: "mdi-paypal",
        GIROPAY: "mdi-bank",
        APPLE_PAY: "mdi-apple",
        GOOGLE_PAY: "mdi-google",
        EPS: "mdi-credit-card-fast",
        IDEAL: "mdi-credit-card-check",
        MAESTRO: "mdi-credit-card-wireless",
        PAYDIRECT: "mdi-contactless-payment",
        SOFORT: "mdi-flash",
        BLUECODE: "mdi-qrcode",
        OTHER: "mdi-dots-horizontal",
      };
      return icons[method] || "mdi-help-circle";
    },
    getPaymentLink(isGroupBooking = false) {
      const baseUrl = `${window.location.origin}${process.env.BASE_URL}payment/redirection`;
      const sanitizedBaseUrl = baseUrl.replace(/\/+$/, "");

      let ids;
      let aggregated;

      if (isGroupBooking && this.groupBooking?.bookingIds) {
        ids = this.groupBooking.bookingIds.join(",");
        aggregated = true;
      } else {
        ids = this.booking.id;
        aggregated = false;
      }

      return `${sanitizedBaseUrl}?ids=${ids}&tenant=${this.booking.tenantId}&aggregated=${aggregated}`;
    },
    async copyPaymentLink(isGroupBooking = false) {
      const link = this.getPaymentLink(isGroupBooking);
      await navigator.clipboard.writeText(link);

      if (this.groupBooking) {
        if (isGroupBooking) {
          this.groupPaymentLinkCopied = true;
          if (this.groupPaymentLinkCopiedTimeout) {
            clearTimeout(this.groupPaymentLinkCopiedTimeout);
          }
          this.groupPaymentLinkCopiedTimeout = setTimeout(() => {
            this.groupPaymentLinkCopied = false;
          }, 2000);
        } else {
          this.singlePaymentLinkCopied = true;
          if (this.singlePaymentLinkCopiedTimeout) {
            clearTimeout(this.singlePaymentLinkCopiedTimeout);
          }
          this.singlePaymentLinkCopiedTimeout = setTimeout(() => {
            this.singlePaymentLinkCopied = false;
          }, 2000);
        }
      } else {
        this.paymentLinkCopied = true;
        if (this.paymentLinkCopiedTimeout) {
          clearTimeout(this.paymentLinkCopiedTimeout);
        }
        this.paymentLinkCopiedTimeout = setTimeout(() => {
          this.paymentLinkCopied = false;
        }, 2000);
      }
    },

    openPaymentLink(isGroupBooking = false) {
      const link = this.getPaymentLink(isGroupBooking);
      window.open(link, "_blank", "noopener,noreferrer");
    },
  },
  mounted() {
    ProcessingService.setComponent(this.$refs.processingIndicator);
  },
  beforeDestroy() {
    if (this.paymentLinkCopiedTimeout) {
      clearTimeout(this.paymentLinkCopiedTimeout);
    }
    if (this.singlePaymentLinkCopiedTimeout) {
      clearTimeout(this.singlePaymentLinkCopiedTimeout);
    }
    if (this.groupPaymentLinkCopiedTimeout) {
      clearTimeout(this.groupPaymentLinkCopiedTimeout);
    }
  },
};
</script>

<style scoped lang="scss">
.booking-details {
  border-radius: 12px !important;
  overflow: hidden;
}

.booking-details-content {
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

.theme--dark .booking-details-content {
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

.price-highlight {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--v-primary-base);
}

.comment-box {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-left: 3px solid var(--v-primary-base);
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-box.internal {
  background: rgba(255, 152, 0, 0.08);
  border-left-color: var(--v-warning-base);
}

.theme--dark .comment-box {
  background: rgba(255, 255, 255, 0.05);
}

.theme--dark .comment-box.internal {
  background: rgba(255, 152, 0, 0.12);
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
.gap-2 {
  gap: 8px;
}

.info-value {
  font-size: 1rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
  padding-left: 28px;

  .v-chip {
    font-weight: 500;
    letter-spacing: 0.02em;
  }
}
</style>

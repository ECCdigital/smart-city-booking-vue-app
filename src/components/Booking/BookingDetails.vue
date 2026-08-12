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
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-information-outline</v-icon>
              <span class="text-h6 font-weight-bold"
                >Buchungsinformationen</span
              >
            </div>
            <v-tooltip
              v-if="hasEventId || (booking.timeBegin && booking.timeEnd)"
              bottom
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  small
                  fab
                  elevation="0"
                  color="primary"
                  v-bind="attrs"
                  v-on="on"
                  @click="onDownloadIcal(booking.id)"
                >
                  <v-icon>mdi-calendar-export</v-icon>
                </v-btn>
              </template>
              Termin für die Buchung herunterladen
            </v-tooltip>
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
                  <div
                    v-if="booking.timeBegin && booking.timeEnd"
                    class="info-value"
                  >
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
                  <div v-else class="info-value">-</div>
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
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-book-cancel-outline</v-icon>
                    Stornierungsrichtlinie
                  </div>
                  <div class="info-value">
                    <v-chip
                      small
                      :color="userCancellable ? 'success' : 'grey'"
                      text-color="white"
                    >
                      <v-icon left x-small>
                        {{ userCancellable ? "mdi-check" : "mdi-cancel" }}
                      </v-icon>
                      {{
                        userCancellable
                          ? "Selbststornierung erlaubt"
                          : "Nur durch Administratoren"
                      }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          v-if="confirmedIfbsLockers.length > 0"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-lock-outline</v-icon>
            <span class="text-h6 font-weight-bold">Schließfach-Steuerung</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-1">
            <v-list dense>
              <template v-for="(locker, index) in confirmedIfbsLockers">
                <v-list-item :key="locker.processId" class="px-4 py-2">
                  <v-list-item-avatar color="indigo lighten-4">
                    <v-icon color="indigo">mdi-locker</v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">
                      Fahrradbox #{{ locker.ifbsMetadata?.nummer || locker.id }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <span class="mr-3">
                        <v-icon x-small>mdi-identifier</v-icon>
                        Box-ID: {{ locker.ifbsMetadata?.boxId }}
                      </span>
                      <span class="mr-3">
                        <v-icon x-small>mdi-tag-outline</v-icon>
                        Vorgang: {{ locker.processId }}
                      </span>
                    </v-list-item-subtitle>
                    <v-list-item-subtitle class="mt-1">
                      <v-chip
                        v-if="getLockerDisplayStatus(locker.processId)"
                        x-small
                        :color="getLockerDisplayStatus(locker.processId).color"
                        text-color="white"
                      >
                        <v-progress-circular
                          v-if="
                            getLockerDisplayStatus(locker.processId).loading
                          "
                          indeterminate
                          size="10"
                          width="1"
                          color="white"
                          class="mr-1"
                        />
                        <v-icon v-else left x-small>
                          {{ getLockerDisplayStatus(locker.processId).icon }}
                        </v-icon>
                        {{ getLockerDisplayStatus(locker.processId).text }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action
                    class="flex-row align-center"
                    style="gap: 8px"
                  >
                    <v-btn
                      small
                      outlined
                      color="info"
                      :loading="lockerLoading[locker.processId + '_status']"
                      :disabled="!lockerOpenIds[locker.processId]"
                      @click="fetchLockerStatus(locker)"
                    >
                      <v-icon left small>mdi-refresh</v-icon>
                      Status prüfen
                    </v-btn>
                    <v-btn
                      small
                      color="success"
                      :loading="lockerLoading[locker.processId + '_open']"
                      :disabled="lockerLoading[locker.processId + '_waitOpen']"
                      @click="openLocker(locker)"
                    >
                      <v-icon left small>mdi-lock-open-variant</v-icon>
                      Öffnen
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>

                <v-expand-transition :key="'alert-' + locker.processId">
                  <div v-if="lockerErrors[locker.processId]" class="px-4 pb-2">
                    <v-alert
                      type="error"
                      dense
                      outlined
                      border="left"
                      class="mb-0 mt-1"
                      dismissible
                      @input="$set(lockerErrors, locker.processId, null)"
                    >
                      {{ lockerErrors[locker.processId] }}
                    </v-alert>
                  </div>
                </v-expand-transition>

                <v-divider
                  v-if="index < confirmedIfbsLockers.length - 1"
                  :key="`locker-divider-${index}`"
                />
              </template>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card
          v-if="bookingAccessPoints.length > 0"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title
            class="section-header pa-4 d-flex justify-space-between align-center"
          >
            <div>
              <v-icon class="mr-2">mdi-door-open</v-icon>
              <span class="text-h6 font-weight-bold">{{
                $t("accessPoint.booking.title")
              }}</span>
            </div>
            <v-btn
              small
              text
              color="primary"
              :loading="accessPointsLoading"
              :disabled="!canControlAccessPoints"
              @click="fetchBookingAccessPoints"
            >
              <v-icon left small>mdi-refresh</v-icon>
              {{ $t("accessPoint.booking.reload") }}
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-alert
              type="info"
              text
              dense
              border="left"
              class="mb-4 access-point-pin-hint"
            >
              {{ $t("accessPoint.booking.pinInfo") }}
            </v-alert>

            <div class="access-point-grid">
              <div
                v-for="accessPoint in bookingAccessPoints"
                :key="getAccessPointKey(accessPoint)"
                class="access-point-tile"
                :class="`access-point-tile--${accessPointTone(accessPoint)}`"
              >
                <div class="access-point-tile__body">
                  <div
                    class="access-point-tile__icon"
                    :class="`access-point-tile__icon--${accessPointTone(
                      accessPoint
                    )}`"
                  >
                    <v-icon>mdi-door</v-icon>
                  </div>

                  <div class="access-point-tile__info">
                    <div class="access-point-tile__title-row">
                      <span class="access-point-tile__title">
                        {{ accessPoint.label || accessPoint.externalId }}
                      </span>
                      <v-chip
                        v-if="getAccessPointDisplayStatus(accessPoint)"
                        small
                        label
                        :color="getAccessPointDisplayStatus(accessPoint).color"
                        text-color="white"
                        class="access-point-tile__status"
                      >
                        <v-progress-circular
                          v-if="
                            getAccessPointDisplayStatus(accessPoint).loading
                          "
                          indeterminate
                          size="12"
                          width="2"
                          color="white"
                          class="mr-1"
                        />
                        <v-icon v-else left x-small>
                          {{ getAccessPointDisplayStatus(accessPoint).icon }}
                        </v-icon>
                        {{ getAccessPointDisplayStatus(accessPoint).text }}
                      </v-chip>
                    </div>

                    <div class="access-point-tile__meta">
                      <span class="meta-pill">
                        <v-icon x-small>mdi-identifier</v-icon>
                        {{ accessPoint.externalId || accessPoint.id }}
                      </span>
                      <span class="meta-pill">
                        <v-icon x-small>mdi-cloud-outline</v-icon>
                        {{ accessPoint.provider || "nuki" }}
                      </span>
                      <span
                        v-if="accessPoint.isProvisioned"
                        class="meta-pill meta-pill--ok"
                      >
                        <v-icon x-small>mdi-check-decagram-outline</v-icon>
                        {{ $t("accessPoint.booking.provisioned") }}
                      </span>
                    </div>

                    <div
                      v-if="accessPoint.provisionedAt"
                      class="access-point-tile__subtle"
                    >
                      {{ $t("accessPoint.booking.provisionedAt") }}
                      {{ formatDateTime(accessPoint.provisionedAt) }}
                    </div>

                    <div
                      v-if="accessWindowHint(accessPoint)"
                      class="access-point-tile__window"
                    >
                      <v-icon
                        x-small
                        :color="
                          isWithinAccessWindow(accessPoint)
                            ? 'success'
                            : 'warning'
                        "
                        class="mr-1"
                      >
                        {{
                          isWithinAccessWindow(accessPoint)
                            ? "mdi-clock-check-outline"
                            : "mdi-clock-alert-outline"
                        }}
                      </v-icon>
                      <span>{{ accessWindowHint(accessPoint) }}</span>
                    </div>
                  </div>
                </div>

                <v-expand-transition>
                  <div
                    v-if="accessPointErrors[getAccessPointKey(accessPoint)]"
                    class="access-point-tile__error"
                  >
                    <v-alert
                      type="error"
                      dense
                      text
                      border="left"
                      class="mb-0"
                      dismissible
                      @input="
                        $set(
                          accessPointErrors,
                          getAccessPointKey(accessPoint),
                          null
                        )
                      "
                    >
                      {{ accessPointErrors[getAccessPointKey(accessPoint)] }}
                    </v-alert>
                  </div>
                </v-expand-transition>

                <div class="access-point-tile__actions">
                  <v-btn
                    small
                    text
                    color="info"
                    :loading="
                      accessPointLoading[
                        getAccessPointKey(accessPoint) + '_status'
                      ]
                    "
                    :disabled="!canControlAccessPoints"
                    @click="fetchAccessPointStatus(accessPoint)"
                  >
                    <v-icon left small>mdi-refresh</v-icon>
                    {{ $t("accessPoint.booking.checkStatus") }}
                  </v-btn>

                  <v-spacer />

                  <div class="access-point-tile__action-group">
                    <v-btn
                      v-if="canRemoteClose(accessPoint)"
                      small
                      outlined
                      color="warning"
                      :loading="
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_close'
                        ]
                      "
                      :disabled="
                        !canControlAccessPoints ||
                        !isWithinAccessWindow(accessPoint) ||
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_waitClose'
                        ]
                      "
                      @click="closeAccessPoint(accessPoint)"
                    >
                      <v-icon left small>mdi-lock</v-icon>
                      {{ $t("accessPoint.booking.close") }}
                    </v-btn>
                    <v-btn
                      v-if="canUnlatchAccessPoint(accessPoint)"
                      small
                      outlined
                      color="primary"
                      :loading="
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_unlatch'
                        ]
                      "
                      :disabled="
                        !canControlAccessPoints ||
                        !isWithinAccessWindow(accessPoint) ||
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_waitOpen'
                        ] ||
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_waitClose'
                        ]
                      "
                      @click="unlatchAccessPoint(accessPoint)"
                    >
                      <v-icon left small>mdi-door-open</v-icon>
                      {{ $t("accessPoint.booking.unlatch") }}
                    </v-btn>
                    <v-btn
                      v-if="canRemoteOpen(accessPoint)"
                      small
                      depressed
                      color="success"
                      :loading="
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_open'
                        ]
                      "
                      :disabled="
                        !canControlAccessPoints ||
                        !isWithinAccessWindow(accessPoint) ||
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_waitOpen'
                        ] ||
                        accessPointLoading[
                          getAccessPointKey(accessPoint) + '_waitClose'
                        ]
                      "
                      @click="openAccessPoint(accessPoint)"
                    >
                      <v-icon left small>mdi-lock-open-variant</v-icon>
                      {{ $t("accessPoint.booking.open") }}
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
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
              <v-col cols="12" v-if="booking.paymentProvider === 'invoice'">
                <v-alert
                  :type="invoices.length === 0 ? 'warning' : 'info'"
                  dense
                  outlined
                  border="left"
                  class="mb-0"
                >
                  <div class="d-flex align-center mb-2">
                    <v-icon class="mr-2">
                      {{
                        invoices.length === 0
                          ? "mdi-alert-outline"
                          : "mdi-file-document-check-outline"
                      }}
                    </v-icon>
                    <span class="font-weight-medium">
                      {{
                        invoices.length === 0
                          ? "Für diese Buchung wurde noch keine Rechnung erstellt."
                          : "Rechnung erneut erstellen und versenden."
                      }}
                    </span>
                  </div>
                  <div class="d-flex gap-2 flex-wrap mt-3">
                    <v-btn
                      small
                      color="primary"
                      :loading="invoiceLoading"
                      @click="generateAndSendInvoice"
                    >
                      <v-icon left small>mdi-email-fast-outline</v-icon>
                      {{
                        invoices.length === 0
                          ? "Rechnung erstellen & versenden"
                          : "Rechnung erneut versenden"
                      }}
                    </v-btn>
                    <v-btn
                      small
                      outlined
                      :loading="invoiceGenerateLoading"
                      @click="generateInvoiceOnly"
                    >
                      <v-icon left small>mdi-file-plus-outline</v-icon>
                      {{
                        invoices.length === 0
                          ? "Nur erstellen (ohne Versand)"
                          : "Nur neu erstellen"
                      }}
                    </v-btn>
                  </div>
                  <div v-if="errors.invoice" class="mt-2">
                    <v-alert type="error" dense outlined class="mb-0">
                      {{ errors.invoice }}
                    </v-alert>
                  </div>
                </v-alert>
              </v-col>
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
                  <div class="info-value">
                    {{ booking.name || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-office-building</v-icon>
                    Firma
                  </div>
                  <div class="info-value">
                    {{ booking.company || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-email-outline</v-icon>
                    E-Mail
                  </div>
                  <div class="info-value">
                    {{ booking.mail || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-phone-outline</v-icon>
                    Telefon
                  </div>
                  <div class="info-value">
                    {{ booking.phone || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-map-marker-outline</v-icon>
                    Straße
                  </div>
                  <div class="info-value">
                    {{ booking.street || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-mailbox-outline</v-icon>
                    Postleitzahl
                  </div>
                  <div class="info-value">
                    {{ booking.zipCode || "-" }}
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="info-item">
                  <div class="info-label">
                    <v-icon small class="mr-2">mdi-city</v-icon>
                    Stadt
                  </div>
                  <div class="info-value">
                    {{ booking.location || "-" }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          v-if="cancellationReceipts?.length > 0"
          class="mb-6 section-card"
          elevation="2"
          outlined
        >
          <v-card-title class="section-header pa-4">
            <v-icon class="mr-2">mdi-book-cancel-outline</v-icon>
            <span class="text-h6 font-weight-bold">Stornobelege</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <v-list dense>
              <template v-for="(item, index) in cancellationReceipts">
                <v-list-item :key="index" class="px-4">
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
                    <v-btn
                      icon
                      @click="downloadCancellationReceipt(item.title)"
                    >
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-divider
                  v-if="index < cancellationReceipts.length - 1"
                  :key="`divider-${index}`"
                />
              </template>
            </v-list>
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
              <v-icon class="mr-2">mdi-file-document-outline</v-icon>
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
          v-if="
            booking.comment ||
            booking.internalComments ||
            groupBooking?.internalComments
          "
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
            <div v-if="groupBooking?.internalComments">
              <div class="info-label mb-2">
                <v-icon small class="mr-2">mdi-comment-alert-outline</v-icon>
                Interne Bemerkung der Serie
              </div>
              <div class="comment-box internal">
                {{ groupBooking.internalComments }}
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
                        downloadAttachment({
                          url: item.url,
                          label: item.title,
                        })
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
import ApiAccessService from "@/services/api/ApiAccessService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";
import GroupBookingCreateReceipt from "@/components/Booking/GroupBookingCreateReceipt.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import {
  getBookingErrorMessage,
  getGroupBookingErrorMessage,
} from "@/utils/errorMessages";
import { getIfbsErrorMessage } from "@/utils/ifbsErrors";
import ProcessingIndicator from "@/components/ProcessingIndicator.vue";
import ProcessingService from "@/services/ProcessingService";
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { formatBlockingReasonMessage } from "@/utilities/access-blocking-reasons";

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
      default: () => {},
    },
  },
  events: "update",
  data() {
    return {
      openCreateAggregatedReceipt: false,
      errors: {
        receipt: null,
        invoice: null,
      },
      invoiceLoading: false,
      invoiceGenerateLoading: false,
      paymentLinkCopied: false,
      singlePaymentLinkCopied: false,
      groupPaymentLinkCopied: false,
      paymentLinkCopiedTimeout: null,
      singlePaymentLinkCopiedTimeout: null,
      groupPaymentLinkCopiedTimeout: null,
      lockerStatuses: {},
      lockerLoading: {},
      lockerOpenIds: {},
      lockerErrors: {},
      bookingAccessPoints: [],
      accessPointsLoading: false,
      accessPointStatuses: {},
      accessPointLoading: {},
      accessPointOpenIds: {},
      accessPointErrors: {},
      now: Date.now(),
      accessWindowTimer: null,
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
    cancellationReceipts() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) => attachment.type === "cancellation"
      );
    },
    attachments() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) =>
          attachment.type !== "receipt" &&
          attachment.type !== "invoice" &&
          attachment.type !== "cancellation"
      );
    },
    confirmedIfbsLockers() {
      if (!this.booking.lockerInfo || !Array.isArray(this.booking.lockerInfo)) {
        return [];
      }
      return this.booking.lockerInfo.filter(
        (locker) => locker.lockerSystem === "ifbs" && locker.isConfirmed
      );
    },
    hasEventId() {
      return Object.values(this.booking.bookableItems || {}).some(
        (item) => item._bookableUsed?.eventId
      );
    },
    userCancellable() {
      return this.booking?.cancellationPolicy?.userCancellable !== false;
    },
    canControlAccessPoints() {
      return BookingPermissionService.allowUpdate(this.booking);
    },
  },
  watch: {
    "booking.id": {
      immediate: true,
      handler() {
        this.fetchBookingAccessPoints();
      },
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),

    async generateAndSendInvoice() {
      this.invoiceLoading = true;
      this.errors.invoice = null;
      const operationId = ProcessingService.showOverlay(
        "Erstelle und versende Rechnung..."
      );
      try {
        const response = await ApiBookingService.generateInvoice(
          this.booking.id,
          true
        );
        if (!response.success) {
          this.handleBookingError("invoice", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("invoice.create.success", "success")
          );
          this.errors.invoice = null;
          this.$emit("update", this.booking.id);
        }
      } catch (error) {
        this.errors.invoice =
          "Fehler beim Erstellen und Versenden der Rechnung.";
        this.addToast(
          ToastService.createToast("invoice.create.error", "error")
        );
      } finally {
        ProcessingService.hide(operationId);
        this.invoiceLoading = false;
      }
    },

    async generateInvoiceOnly() {
      this.invoiceGenerateLoading = true;
      this.errors.invoice = null;
      const operationId = ProcessingService.showOverlay("Erstelle Rechnung...");
      try {
        const response = await ApiBookingService.generateInvoice(
          this.booking.id,
          false
        );
        if (!response.success) {
          this.handleBookingError("invoice", response.errors);
        } else {
          await this.addToast(
            ToastService.createToast("invoice.create.success", "success")
          );
          this.errors.invoice = null;
          this.$emit("update", this.booking.id);
        }
      } catch (error) {
        this.errors.invoice = "Fehler beim Erstellen der Rechnung.";
        this.addToast(
          ToastService.createToast("invoice.create.error", "error")
        );
      } finally {
        ProcessingService.hide(operationId);
        this.invoiceGenerateLoading = false;
      }
    },

    getIfbsErrorMessage(errorCode) {
      return getIfbsErrorMessage(errorCode);
    },
    getLockerDisplayStatus(processId) {
      const isWaiting = this.lockerLoading[processId + "_waitOpen"];
      const status = this.lockerStatuses[processId];

      if (isWaiting) {
        return {
          color: "orange",
          icon: null,
          text: "Warte auf Bestätigung…",
          loading: true,
        };
      }

      if (!status) return null;

      if (status.confirmed) {
        return {
          color: "success",
          icon: "mdi-lock-open-variant",
          text: status.confirmedAt
            ? `Geöffnet (${new Date(status.confirmedAt).toLocaleTimeString(
                "de-DE",
                { hour: "2-digit", minute: "2-digit", second: "2-digit" }
              )})`
            : "Geöffnet",
          loading: false,
        };
      }

      if (status.errorCode) {
        return {
          color: "error",
          icon: "mdi-alert-circle",
          text: `Fehler ${status.errorCode}`,
          loading: false,
        };
      }

      return {
        color: "orange darken-1",
        icon: "mdi-timer-sand",
        text: "Noch nicht bestätigt",
        loading: false,
      };
    },
    getAccessPointKey(accessPoint) {
      return accessPoint.id || accessPoint.externalId;
    },
    isRemoteCapable(accessPoint) {
      const mode = accessPoint?.mode || "both";
      return mode === "remote" || mode === "both";
    },
    canRemoteOpen(accessPoint) {
      return this.isRemoteCapable(accessPoint);
    },
    canRemoteClose(accessPoint) {
      // Salto KS verriegelt selbst und unterstützt kein remote "close".
      return (
        this.isRemoteCapable(accessPoint) &&
        accessPoint?.provider !== "salto-ks"
      );
    },
    canUnlatchAccessPoint(accessPoint) {
      // Entriegeln (Latch) ist Nuki-spezifisch und nur remote-fähig.
      return (
        (accessPoint?.type || "door") === "door" &&
        this.isRemoteCapable(accessPoint) &&
        accessPoint?.provider !== "salto-ks"
      );
    },
    accessPointTone(accessPoint) {
      const status = this.getAccessPointDisplayStatus(accessPoint);
      const color = (status && status.color) || "grey";
      if (color.startsWith("success")) return "success";
      if (color.startsWith("error")) return "error";
      if (color.startsWith("warning") || color.startsWith("orange")) {
        return "warning";
      }
      if (color.startsWith("info")) return "info";
      return "grey";
    },
    resolveAccessError(error, accessPoint, fallbackKey, options = {}) {
      const { treat403AsWindow = true } = options;
      if (error?.response?.status === 403 && treat403AsWindow) {
        return this.$t("accessPoint.booking.window.outside", {
          hint: this.accessWindowHint(accessPoint),
        });
      }
      return this.$t(fallbackKey);
    },
    formatOpenBlockingReasons(blockingReasons) {
      return formatBlockingReasonMessage(blockingReasons, (key) => this.$t(key));
    },
    getAccessBuffer(accessPoint) {
      const buffer = accessPoint?.accessBuffer || {};
      const toMinutes = (value) => {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : 0;
      };
      return {
        before: toMinutes(buffer.beforeMs),
        after: toMinutes(buffer.afterMs),
      };
    },
    getAccessWindow(accessPoint) {
      const { timeBegin, timeEnd } = this.booking || {};
      if (!timeBegin || !timeEnd) return null;
      const buffer = this.getAccessBuffer(accessPoint);
      return {
        start: timeBegin - buffer.before * 60000,
        end: timeEnd + buffer.after * 60000,
      };
    },
    isWithinAccessWindow(accessPoint) {
      const window = this.getAccessWindow(accessPoint);
      if (!window) return true;
      return (
        accessPoint.accessFrom <= this.now && accessPoint.accessTo >= this.now
      );
    },
    accessWindowHint(accessPoint) {
      const window = this.getAccessWindow(accessPoint);
      if (!window) return "";
      if (this.now < accessPoint.accessFrom) {
        return this.$t("accessPoint.booking.window.before", {
          time: this.formatDateTime(accessPoint.accessFrom),
        });
      }
      if (this.now > accessPoint.accessTo) {
        return this.$t("accessPoint.booking.window.after", {
          time: this.formatDateTime(accessPoint.accessTo),
        });
      }
      return this.$t("accessPoint.booking.window.until", {
        time: this.formatDateTime(accessPoint.accessTo),
      });
    },
    formatDateTime(value) {
      if (!value) return "";
      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    },
    getAccessPointDisplayStatus(accessPoint) {
      const accessPointId = this.getAccessPointKey(accessPoint);
      const isWaitingOpen =
        this.accessPointLoading[accessPointId + "_waitOpen"];
      const isWaitingClose =
        this.accessPointLoading[accessPointId + "_waitClose"];
      const status = this.accessPointStatuses[accessPointId];

      if (isWaitingOpen || isWaitingClose) {
        return {
          color: "orange",
          icon: null,
          text: isWaitingClose
            ? this.$t("accessPoint.booking.status.waitingClose")
            : this.$t("accessPoint.booking.status.waitingOpen"),
          loading: true,
        };
      }

      if (status?.confirmed) {
        const time = status.confirmedAt
          ? new Date(status.confirmedAt).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : null;
        return {
          color: "success",
          icon: "mdi-lock-open-variant",
          text: time
            ? this.$t("accessPoint.booking.status.openedAt", { time })
            : this.$t("accessPoint.booking.status.opened"),
          loading: false,
        };
      }

      if (status?.errorCode || status?.error) {
        return {
          color: "error",
          icon: "mdi-alert-circle",
          text: status.errorCode
            ? this.$t("accessPoint.booking.status.errorCode", {
                code: status.errorCode,
              })
            : this.$t("accessPoint.booking.status.error"),
          loading: false,
        };
      }

      if (
        typeof status?.open === "boolean" ||
        typeof status?.locked === "boolean"
      ) {
        if (status.open) {
          return {
            color: "success",
            icon: "mdi-door-open",
            text: this.$t("accessPoint.booking.status.opened"),
            loading: false,
          };
        }
        if (status.locked) {
          return {
            color: "info",
            icon: "mdi-lock",
            text: this.$t("accessPoint.booking.status.locked"),
            loading: false,
          };
        }
        return {
          color: "warning",
          icon: "mdi-lock-open-variant-outline",
          text: this.$t("accessPoint.booking.status.unlocked"),
          loading: false,
        };
      }

      if (status?.state || status?.status || status?.lockState) {
        return {
          color: "info",
          icon: "mdi-information-outline",
          text: status.state || status.status || status.lockState,
          loading: false,
        };
      }

      if (accessPoint.lastEvent) {
        return {
          color: "info",
          icon: "mdi-history",
          text: this.$t("accessPoint.booking.status.lastEvent"),
          loading: false,
        };
      }

      if (accessPoint.isProvisioned) {
        return {
          color: "success",
          icon: "mdi-check-decagram-outline",
          text: this.$t("accessPoint.booking.status.provisioned"),
          loading: false,
        };
      }

      return {
        color: "grey",
        icon: "mdi-timer-sand",
        text: this.$t("accessPoint.booking.status.notProvisioned"),
        loading: false,
      };
    },
    getAccessResponseData(response) {
      const responseData = response.data || {};
      return responseData.data || responseData.status || responseData;
    },
    isAccessPointOpen(status) {
      if (!status) return false;
      if (status.confirmed) return true;
      return status.open === true;
    },
    isAccessPointClosed(status) {
      if (!status) return false;
      if (
        typeof status.locked === "boolean" ||
        typeof status.open === "boolean"
      ) {
        return status.locked === true && status.open !== true;
      }
      return false;
    },
    async queryAccessPointStatus(accessPoint, openProcessId) {
      const accessPointId = this.getAccessPointKey(accessPoint);
      const response = openProcessId
        ? await ApiAccessService.getOpenStatus(
            this.booking.id,
            accessPointId,
            this.booking.tenantId,
            openProcessId
          )
        : await ApiAccessService.getStatus(
            this.booking.id,
            accessPointId,
            this.booking.tenantId
          );
      const status = this.getAccessResponseData(response);
      this.$set(this.accessPointStatuses, accessPointId, status);
      return status;
    },
    async fetchBookingAccessPoints() {
      if (!this.booking?.id) return;

      this.accessPointsLoading = true;
      try {
        const response = await ApiAccessService.getAccessPoints(
          this.booking.id,
          this.booking.tenantId
        );
        const responseData = response.data || {};
        this.bookingAccessPoints = Array.isArray(responseData)
          ? responseData
          : responseData.data || [];
      } catch (error) {
        this.bookingAccessPoints = [];
      } finally {
        this.accessPointsLoading = false;
      }
    },
    async openAccessPoint(accessPoint) {
      if (!this.canControlAccessPoints) return;
      const accessPointId = this.getAccessPointKey(accessPoint);
      this.$set(this.accessPointLoading, accessPointId + "_open", true);
      this.$set(this.accessPointErrors, accessPointId, null);
      this.$set(this.accessPointStatuses, accessPointId, null);

      try {
        const response = await ApiAccessService.open(
          this.booking.id,
          accessPointId,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.accessPointErrors,
            accessPointId,
            this.formatOpenBlockingReasons(
              responseData.data?.blockingReasons
            )
          );
          return;
        }

        const openProcessId =
          responseData.data?.openProcessId || responseData.openProcessId;
        if (openProcessId) {
          this.$set(this.accessPointOpenIds, accessPointId, openProcessId);
        }

        await this.waitForAccessPointStatusChange(accessPoint, "open");
      } catch (error) {
        this.$set(
          this.accessPointErrors,
          accessPointId,
          this.resolveAccessError(
            error,
            accessPoint,
            "accessPoint.open.sendError.message",
            { treat403AsWindow: false }
          )
        );
      } finally {
        this.$set(this.accessPointLoading, accessPointId + "_open", false);
      }
    },
    async unlatchAccessPoint(accessPoint) {
      if (!this.canControlAccessPoints) return;
      const accessPointId = this.getAccessPointKey(accessPoint);
      this.$set(this.accessPointLoading, accessPointId + "_unlatch", true);
      this.$set(this.accessPointErrors, accessPointId, null);
      this.$set(this.accessPointStatuses, accessPointId, null);

      try {
        const response = await ApiAccessService.unlatch(
          this.booking.id,
          accessPointId,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.accessPointErrors,
            accessPointId,
            responseData.errors?.[0]?.message ||
              this.$t("accessPoint.unlatch.error.message")
          );
          return;
        }

        await this.waitForAccessPointStatusChange(accessPoint, "unlatch");
      } catch (error) {
        this.$set(
          this.accessPointErrors,
          accessPointId,
          this.resolveAccessError(
            error,
            accessPoint,
            "accessPoint.unlatch.sendError.message"
          )
        );
      } finally {
        this.$set(this.accessPointLoading, accessPointId + "_unlatch", false);
      }
    },
    async closeAccessPoint(accessPoint) {
      if (!this.canControlAccessPoints) return;
      const accessPointId = this.getAccessPointKey(accessPoint);
      this.$set(this.accessPointLoading, accessPointId + "_close", true);
      this.$set(this.accessPointErrors, accessPointId, null);
      this.$set(this.accessPointStatuses, accessPointId, null);

      try {
        const response = await ApiAccessService.close(
          this.booking.id,
          accessPointId,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.accessPointErrors,
            accessPointId,
            responseData.errors?.[0]?.message ||
              this.$t("accessPoint.close.error.message")
          );
          return;
        }

        await this.waitForAccessPointStatusChange(accessPoint, "close");
      } catch (error) {
        this.$set(
          this.accessPointErrors,
          accessPointId,
          this.resolveAccessError(
            error,
            accessPoint,
            "accessPoint.close.sendError.message"
          )
        );
      } finally {
        this.$set(this.accessPointLoading, accessPointId + "_close", false);
      }
    },
    async waitForAccessPointStatusChange(accessPoint, action) {
      const accessPointId = this.getAccessPointKey(accessPoint);
      const isOpenAction = action === "open" || action === "unlatch";
      const loadingKey = isOpenAction ? "_waitOpen" : "_waitClose";
      const isDone = (status) =>
        isOpenAction
          ? this.isAccessPointOpen(status)
          : this.isAccessPointClosed(status);
      const successKey = `accessPoint.${action}.success`;
      const errorKey = `accessPoint.${action}.error.message`;
      const timeoutKey = `accessPoint.${action}.timeout.message`;

      this.$set(this.accessPointLoading, accessPointId + loadingKey, true);

      try {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          const status = await this.queryAccessPointStatus(accessPoint);

          if (isDone(status)) {
            await this.addToast(
              ToastService.createToast(successKey, "success")
            );
            return;
          }

          if (status?.errorCode || status?.error) {
            this.$set(
              this.accessPointErrors,
              accessPointId,
              status.errorCode
                ? this.$t("accessPoint.status.doorError.message", {
                    code: status.errorCode,
                  })
                : this.$t(errorKey)
            );
            return;
          }
        }

        this.$set(this.accessPointErrors, accessPointId, this.$t(timeoutKey));
      } catch (error) {
        this.$set(
          this.accessPointErrors,
          accessPointId,
          this.$t("accessPoint.status.waitTimeout.message")
        );
      } finally {
        this.$set(this.accessPointLoading, accessPointId + loadingKey, false);
      }
    },
    async fetchAccessPointStatus(accessPoint) {
      if (!this.canControlAccessPoints) return;
      const accessPointId = this.getAccessPointKey(accessPoint);
      this.$set(this.accessPointLoading, accessPointId + "_status", true);
      this.$set(this.accessPointErrors, accessPointId, null);

      try {
        await this.queryAccessPointStatus(accessPoint);
      } catch (error) {
        this.$set(
          this.accessPointErrors,
          accessPointId,
          this.resolveAccessError(
            error,
            accessPoint,
            "accessPoint.status.error.message"
          )
        );
      } finally {
        this.$set(this.accessPointLoading, accessPointId + "_status", false);
      }
    },
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
        const blob = response.data;
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
        const blob = new Blob([response.data], {
          type: "application/pdf",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", name);
        document.body.appendChild(link);
        link.click();
        ProcessingService.hide(operationId);
      });
    },
    downloadCancellationReceipt(name) {
      const operationId = ProcessingService.showSnackbar(
        "Stelle Stornobeleg bereit..."
      );
      ApiBookingService.getCancellationReceipt(this.booking.id, name).then(
        (response) => {
          const blob = new Blob([response.data], {
            type: "application/pdf",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", name);
          document.body.appendChild(link);
          link.click();
          ProcessingService.hide(operationId);
        }
      );
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
    onDownloadIcal(bookingId) {
      this.$emit("download-ical", bookingId);
    },
    closeDialog() {
      this.errors.receipt = null;
      this.errors.invoice = null;
      this.$emit("close");
    },
    closeAggregatedReceipt() {
      this.errors.receipt = null;
      this.openCreateAggregatedReceipt = false;
    },
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

    async openLocker(locker) {
      const pid = locker.processId;
      this.$set(this.lockerLoading, pid + "_open", true);
      this.$set(this.lockerErrors, pid, null);
      this.$set(this.lockerStatuses, pid, null);

      try {
        const response = await ApiAccessService.open(
          this.booking.id,
          locker.processId
        );

        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.lockerErrors,
            pid,
            this.formatOpenBlockingReasons(
              responseData.data?.blockingReasons
            )
          );
          this.$set(this.lockerLoading, pid + "_open", false);
          return;
        } else if (responseData.success === true) {
          const openProcessId = responseData.data?.openProcessId;
          if (openProcessId) {
            this.$set(this.lockerOpenIds, pid, openProcessId);
          }

          this.$set(this.lockerLoading, pid + "_open", false);
          await this.waitForLockerConfirmation(locker);
        }
      } catch (error) {
        this.$set(
          this.lockerErrors,
          pid,
          "Fehler beim Senden des Öffnen-Befehls. Bitte erneut versuchen."
        );
        this.$set(this.lockerLoading, pid + "_open", false);
      }
    },

    async waitForLockerConfirmation(locker) {
      const pid = locker.processId;
      const openProcessId = this.lockerOpenIds[pid];

      if (!openProcessId) {
        this.$set(
          this.lockerErrors,
          pid,
          "Keine OpenBox-ID vorhanden. Öffnen-Befehl konnte nicht verifiziert werden."
        );
        return;
      }

      this.$set(this.lockerLoading, pid + "_waitOpen", true);

      try {
        const response = await ApiAccessService.getOpenStatus(
          this.booking.id,
          pid,
          this.booking.tenantId,
          openProcessId
        );

        const responseData = response.data || {};

        console.log("Locker-Status-Antwort:", responseData);

        if (responseData.success === false) {
          this.$set(
            this.lockerErrors,
            pid,
            responseData.errors?.[0]?.message ||
              "Fehler beim Abrufen des Box-Status."
          );
          return;
        } else {
          const status = responseData.data;

          this.$set(this.lockerStatuses, pid, status);
          if (status.confirmed) {
            await this.addToast(
              ToastService.createToast("locker.open.success", "success")
            );
          } else if (status.errorCode) {
            this.$set(
              this.lockerErrors,
              pid,
              `Schließfach-Fehler ${status.errorCode}: ${getIfbsErrorMessage(
                status.errorCode
              )}`
            );
          } else {
            this.$set(
              this.lockerErrors,
              pid,
              "Die Box hat den Öffnen-Befehl noch nicht bestätigt. Bitte Status erneut prüfen."
            );
          }
        }
      } catch (error) {
        this.$set(
          this.lockerErrors,
          pid,
          "Zeitüberschreitung beim Warten auf Bestätigung. Bitte Status manuell prüfen."
        );
      } finally {
        this.$set(this.lockerLoading, pid + "_waitOpen", false);
      }
    },

    async fetchLockerStatus(locker) {
      const pid = locker.processId;
      const openProcessId = this.lockerOpenIds[pid];

      if (!openProcessId) {
        return;
      }

      this.$set(this.lockerLoading, pid + "_status", true);
      this.$set(this.lockerErrors, pid, null);

      try {
        const response = await ApiAccessService.getOpenStatus(
          this.booking.id,
          pid,
          this.booking.tenantId,
          openProcessId
        );

        const status = response.data?.status || response.data;
        this.$set(this.lockerStatuses, pid, status);

        if (status?.confirmed) {
          await this.addToast(
            ToastService.createToast("locker.open.success", "success")
          );
        } else if (status?.errorCode) {
          this.$set(
            this.lockerErrors,
            pid,
            `Schließfach-Fehler ${status.errorCode}: ${getIfbsErrorMessage(
              status.errorCode
            )}`
          );
        }
      } catch (error) {
        this.$set(this.lockerErrors, pid, "Fehler beim Abfragen des Status.");
      } finally {
        this.$set(this.lockerLoading, pid + "_status", false);
      }
    },
  },
  mounted() {
    ProcessingService.setComponent(this.$refs.processingIndicator);
    this.accessWindowTimer = setInterval(() => {
      this.now = Date.now();
    }, 30000);
  },
  beforeDestroy() {
    if (this.accessWindowTimer) {
      clearInterval(this.accessWindowTimer);
    }
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

  .v-chip {
    font-weight: 500;
    letter-spacing: 0.02em;
  }
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

/* ---- Access point tiles ---- */
.access-point-pin-hint {
  border-radius: 4px;
}

.access-point-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.access-point-tile {
  position: relative;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 4px solid var(--ap-accent, rgba(0, 0, 0, 0.12));
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.015);
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.access-point-tile--success {
  --ap-accent: var(--v-success-base, #4caf50);
}
.access-point-tile--warning {
  --ap-accent: var(--v-warning-base, #fb8c00);
}
.access-point-tile--error {
  --ap-accent: var(--v-error-base, #ff5252);
}
.access-point-tile--info {
  --ap-accent: var(--v-info-base, #2196f3);
}
.access-point-tile--grey {
  --ap-accent: rgba(0, 0, 0, 0.18);
}

.theme--dark .access-point-tile {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.access-point-tile__body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.access-point-tile__icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
}

.access-point-tile__icon .v-icon {
  color: inherit;
}

.access-point-tile__icon--success {
  background: rgba(76, 175, 80, 0.14);
  color: var(--v-success-base, #4caf50);
}
.access-point-tile__icon--warning {
  background: rgba(251, 140, 0, 0.16);
  color: var(--v-warning-base, #fb8c00);
}
.access-point-tile__icon--error {
  background: rgba(255, 82, 82, 0.16);
  color: var(--v-error-base, #ff5252);
}
.access-point-tile__icon--info {
  background: rgba(33, 150, 243, 0.16);
  color: var(--v-info-base, #2196f3);
}

.access-point-tile__info {
  flex: 1 1 auto;
  min-width: 0;
}

.access-point-tile__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.access-point-tile__title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
  word-break: break-word;
}

.theme--dark .access-point-tile__title {
  color: rgba(255, 255, 255, 0.92);
}

.access-point-tile__status {
  flex: 0 0 auto;
  font-weight: 600;
}

.access-point-tile__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.62);
  background: rgba(0, 0, 0, 0.06);
}

.meta-pill .v-icon {
  color: inherit;
}

.meta-pill--ok {
  color: var(--v-success-base, #43a047);
  background: rgba(76, 175, 80, 0.12);
}

.theme--dark .meta-pill {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}

.access-point-tile__subtle {
  margin-top: 6px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

.theme--dark .access-point-tile__subtle {
  color: rgba(255, 255, 255, 0.55);
}

.access-point-tile__window {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

.theme--dark .access-point-tile__window {
  color: rgba(255, 255, 255, 0.65);
}

.access-point-tile__error {
  margin-top: 12px;
}

.access-point-tile__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.theme--dark .access-point-tile__actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.access-point-tile__action-group {
  display: flex;
  flex-wrap: wrap;
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

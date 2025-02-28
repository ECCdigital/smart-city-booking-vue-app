<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";

export default {
  name: "BookingDetails",
  props: {
    booking: {
      type: Object,
      required: true,
    },
  },
  events: "update",
  data() {
    return {
      creatingReceipt: false,
    };
  },
  computed: {
    receipts() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) => attachment.type === "receipt"
      );
    },
    attachments() {
      if (!this.booking.attachments) return [];
      return this.booking.attachments?.filter(
        (attachment) => attachment.type !== "receipt"
      );
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
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
    createReceipt(bookingId) {
      this.creatingReceipt = true;
      ApiBookingService.generateReceipt(bookingId)
        .then((response) => {
          if (response.status === 200) {
            this.$emit("update", bookingId);
            this.addToast(
              ToastService.createToast("receipt.create.success", "success")
            );
          }
        })
        .catch(() => {
          this.addToast(
            ToastService.createToast("receipt.create.error", "error")
          );
        })
        .finally(() => {
          this.creatingReceipt = false;
        });
    },
    downloadReceipt(name) {
      ApiBookingService.getReceipt(this.booking.id, name).then((response) => {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", name);
        document.body.appendChild(link);
        link.click();
      });
    },
    downloadAttachment({ url, label }) {
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
      }
    },
    closeDialog() {
      this.$emit("close");
    },
  },
};
</script>

<template>
  <v-card>
    <v-card-title class="mx-3 mb-3">
      <span class="text-h5">Buchungsdetails</span>
    </v-card-title>

    <v-card-text class="mx-3">
      <span class="text-h6">Buchungsinformationen</span>
      <v-divider />
      <v-row no-gutters>
        <v-col cols="12" md="6">
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Buchungsnummer
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.id }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Buchungsdatum
              </v-list-item-title>
              <v-list-item-subtitle>{{
                Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(booking.timeCreated))
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h"> Gesamtpreis </v-list-item-title>
              <v-list-item-subtitle>{{
                Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(booking.priceEur)
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Bezahlt mit
              </v-list-item-title>
              <v-list-item-subtitle>{{
                translatePayMethod(booking.paymentMethod)
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Status der Zahlung
              </v-list-item-title>
              <v-list-item-subtitle>{{
                booking.isPayed ? "bezahlt" : "ausstehend"
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Freigabestatus
              </v-list-item-title>
              <v-list-item-subtitle
                :class="{ 'error--text': booking.isRejected }"
                >{{
                  booking.isRejected
                    ? "storniert"
                    : booking.isCommitted == true
                    ? "freigegeben"
                    : "ausstehend"
                }}</v-list-item-subtitle
              >
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Buchungszeitraum
              </v-list-item-title>
              <v-list-item-subtitle
                >{{
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
                }}</v-list-item-subtitle
              >
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <div class="mt-6">
        <span class="text-h6">Buchungsobjekte</span>
      </div>
      <v-divider />
      <v-row no-gutters>
        <v-col>
          <v-list dense>
            <template v-for="(item, name, index) in booking.bookableItems">
              <v-list-item two-line :key="name">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item._bookableUsed?.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle
                    >Anzahl: {{ item?.amount }}</v-list-item-subtitle
                  >
                  <v-list-item-subtitle
                    >Einzelpreis: {{ item.userGrossPriceEur }} € </v-list-item-subtitle
                  >

                </v-list-item-content>
              </v-list-item>
              <v-divider v-if="index < receipts.length - 1" :key="index" />
            </template>
          </v-list>
        </v-col>
      </v-row>
      <div class="mt-6">
        <span class="text-h6">Kunde</span>
      </div>
      <v-divider />
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Name </v-list-item-title>
              <v-list-item-subtitle>{{ booking.name }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Firma </v-list-item-title>
              <v-list-item-subtitle>{{ booking.company }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> E-Mail </v-list-item-title>
              <v-list-item-subtitle>{{ booking.mail }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Telefon </v-list-item-title>
              <v-list-item-subtitle>{{ booking.phone }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Straße </v-list-item-title>
              <v-list-item-subtitle>{{ booking.street }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Postleitzahl </v-list-item-title>
              <v-list-item-subtitle>{{ booking.zipCode }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title> Stadt </v-list-item-title>
              <v-list-item-subtitle>{{
                booking.location
              }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <div class="d-flex flex-row justify-space-between mt-6">
        <span class="text-h6">Buchungsbelege</span>
        <v-btn
          :loading="creatingReceipt"
          small
          outlined
          @click="createReceipt(booking.id)"
        >
          <v-icon>mdi-plus</v-icon>Buchungsbeleg erstellen
        </v-btn>
      </div>
      <v-divider />
      <v-row no-gutters>
        <v-col>
          <v-list dense v-if="receipts.length > 0">
            <template v-for="(item, title, index) in receipts">
              <v-list-item two-line :key="title">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="item.timeCreated"
                    >Austellungsdatum:
                    {{
                      Intl.DateTimeFormat("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(item.timeCreated))
                    }}</v-list-item-subtitle
                  >
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon @click="downloadReceipt(item.title)">
                    <v-icon color="primary">mdi-file-download</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
              <v-divider v-if="index < receipts.length - 1" :key="index" />
            </template>
          </v-list>
          <span v-else>Keine Buchungsbelege vorhanden</span>
        </v-col>
      </v-row>
      <div class="mt-6">
        <span class="text-h6">Bemerkung</span>
      </div>
      <v-divider />
      <v-row>
        <v-col>
          <p>{{ booking.comment }}</p>
        </v-col>
      </v-row>
      <div class="mt-6">
        <span class="text-h6">Anhänge</span>
      </div>
      <v-divider />
      <v-row no-gutters>
        <v-col>
          <v-list dense v-if="attachments?.length > 0">
            <template v-for="(item, index) in attachments">
              <v-list-item two-line :key="index">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Gelesen und akzeptiert:
                    <v-icon v-if="item.accepted" color="success">
                      mdi-checkbox-marked-outline
                    </v-icon>
                    <v-icon v-else color="error">
                      mdi-checkbox-blank-outline
                    </v-icon>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn
                    icon
                    @click="
                      downloadAttachment({ url: item.url, label: item.title })
                    "
                  >
                    <v-icon color="primary">mdi-file-download</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
              <v-divider
                v-if="index < attachments.length - 1"
                :key="`divider-${index}`"
              />
            </template>
          </v-list>
          <span v-else>Keine Anhänge vorhanden</span>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn class="mb-5 mr-5" outlined @click="closeDialog"> Schließen </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped></style>

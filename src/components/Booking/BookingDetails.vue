<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ToastService from "@/services/ToastService";
import {mapActions} from "vuex";
import ApiFileService from "@/services/api/ApiFileService";

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
      if (this.booking.attachments === undefined) return [];
      return this.booking.attachments.filter((attachment) => attachment.type === "receipt");
    },
    attachments() {
      if (this.booking.attachments === undefined) return [];
      return this.booking.attachments.filter((attachment) => attachment.type !== "receipt");
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    translatePayMethod(value) {
      switch (value) {
      case "1":
        return "Giropay";
      case "17":
        return "Giropay";
      case "18":
        return "Giropay";
      case "2":
        return "eps";
      case "12":
        return "iDEAL";
      case "11":
        return "Kreditkarte";
      case "6":
        return "Lastschrift";
      case "7":
        return "Lastschrift";
      case "26":
        return "Bluecode";
      case "33":
        return "Maestro";
      case "14":
        return "PayPal";
      case "23":
        return "paydirekt";
      case "27":
        return "Sofortüberweisung";
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
            this.addToast(ToastService.createToast("receipt.create.success", "success"));
          }
        })
        .catch(() => {
          this.addToast(ToastService.createToast("receipt.create.error", "error"));
        }).finally(() => {
        this.creatingReceipt = false;
      });
    },
    downloadReceipt(name) {
      ApiBookingService.getReceipt(this.booking.id, name)
        .then((response) => {
          const blob = new Blob([response.data], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", name);
          document.body.appendChild(link);
          link.click();
        });
    },
    downloadAttachment(name) {
      ApiFileService.getFile(this.booking.tenant, name)
        .then((response) => {
          const blob = new Blob([response.data], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", name);
          document.body.appendChild(link);
          link.click();
        });
    },
    closeDialog() {
      this.$emit("close");
    },
  },
}
</script>

<template>
  <v-card>
    <v-card-title class="mx-3 mb-3">
      <span  class="text-h5">Buchungsdetails</span>
    </v-card-title >

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
              <v-list-item-subtitle>{{ Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(booking.timeCreated)) }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Preis
              </v-list-item-title>
              <v-list-item-subtitle>{{ Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(booking.priceEur) }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Zahlungsart
              </v-list-item-title>
              <v-list-item-subtitle>{{ translatePayMethod(booking.payMethod) }}</v-list-item-subtitle>
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
              <v-list-item-subtitle>{{ booking.isPayed ? "bezahlt" : "ausstehend" }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title class="text-h">
                Freigabestatus
              </v-list-item-title>
              <v-list-item-subtitle>{{  booking.isCommitted == true ? "freigegeben" : "ausstehend" }}</v-list-item-subtitle>
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
              <v-list-item-subtitle>{{Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(booking.timeBegin)) }} - {{ Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(booking.timeEnd)) }}</v-list-item-subtitle>
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
          <v-list dense >
            <template v-for="(item, name, index) in booking.bookableItems">
              <v-list-item two-line :key="name">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item._bookableUsed?.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle>Anzahl: {{  item?.amount }}</v-list-item-subtitle>

                </v-list-item-content>
              </v-list-item>
              <v-divider v-if="index < receipts.length - 1" :key="index"/>
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
              <v-list-item-title>
                Name
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.name}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                Firma
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.company }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                E-Mail
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.mail }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                Telefon
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.phone }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                Straße
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.street }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                Postleitzahl
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.zipCode }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-col>
        <v-col>
          <v-list-item two-line>
            <v-list-item-content>
              <v-list-item-title>
                Stadt
              </v-list-item-title>
              <v-list-item-subtitle>{{ booking.location }}</v-list-item-subtitle>
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
          <v-list dense v-if="receipts.length > 0" >
            <template v-for="(item, name, index) in receipts">
              <v-list-item two-line :key="name">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="item.timeCreated">Austellungsdatum: {{ Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.timeCreated)) }}</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon @click="downloadReceipt(item.name)">
                    <v-icon color="primary">mdi-file-download</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
              <v-divider v-if="index < receipts.length - 1" :key="index"/>
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
                    {{ item.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Gelesen und akzeptiert:
                    <v-icon v-if="item.content.required && item.content.accepted" color="success">
                      mdi-checkbox-marked-outline
                    </v-icon>
                    <v-icon v-else color="error">
                      mdi-checkbox-blank-outline
                    </v-icon>
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon @click="downloadAttachment(item.filePath)">
                    <v-icon color="primary">mdi-file-download</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
              <v-divider v-if="index < attachments.length - 1" :key="`divider-${index}`" />
            </template>
          </v-list>
          <span v-else>Keine Anhänge vorhanden</span>
        </v-col>

      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn class="mb-5 mr-5" outlined @click="closeDialog">
        Schließen
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>

</style>

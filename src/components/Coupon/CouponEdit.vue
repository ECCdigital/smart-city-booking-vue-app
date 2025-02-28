<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-card v-if="coupon">
        <v-card-title class="mx-3">
          <span v-if="coupon.id" class="text-h5">Gutschein bearbeiten</span>
          <span v-else class="text-h5">Neuen Gutschein erstellen</span>
        </v-card-title>
        <v-divider class="mx-9 mb-5" />
        <v-card-text>
          <v-container>
            <v-form ref="form" v-model="valid">
              <v-row>
                <v-col class="col-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Gutscheinnummer"
                    v-model="selectedCoupon.id"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="col-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Bezeichnung"
                    v-model="selectedCoupon.description"
                  ></v-text-field>
                </v-col>
                <v-col class="col-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    type="number"
                    label="maximale Anzahl"
                    v-model="selectedCoupon.maxAmount"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="col-6">
                  <v-select
                    background-color="accent"
                    filled
                    label="Typ"
                    :items="couponTypes"
                    v-model="selectedCoupon.type"
                    hide-details
                  >
                  </v-select>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Wert"
                    :rules="[rules.required]"
                    v-model="selectedCoupon.discount"
                    :append-icon="
                      selectedCoupon.type === 'percentage' ? '%' : '€'
                    "
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row no-gutters class="mt-4">
                <v-col class="col-12">
                  <p class="text-uppercase">
                    <strong>Gültig ab</strong>
                  </p>
                </v-col>
                <v-col class="mr-5">
                  <v-dialog
                    ref="validFromDialog"
                    v-model="validFromModal"
                    :return-value.sync="validDateFrom"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="validDateFrom"
                        label="Gültig ab"
                        prepend-icon="mdi-calendar"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker v-model="validDateFrom" scrollable>
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validFromDialog.save([])"
                        >Löschen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="validFromModal = false"
                        >Abbrechen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validFromDialog.save(validDateFrom)"
                        >Speichern</v-btn
                      >
                    </v-date-picker>
                  </v-dialog>
                </v-col>
                <v-col>
                  <v-dialog
                    ref="validTimeFromDialog"
                    v-model="validTimeFromModal"
                    :return-value.sync="validTimeFrom"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="validTimeFrom"
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
                      v-model="validTimeFrom"
                      full-width
                      format="24hr"
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validTimeFromDialog.save([])"
                        >Löschen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="validTimeFromModal = false"
                        >Abbrechen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validTimeFromDialog.save(validTimeFrom)"
                        >Speichern</v-btn
                      >
                    </v-time-picker>
                  </v-dialog>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-col class="col-12">
                  <p class="text-uppercase">
                    <strong>Gültig bis</strong>
                  </p>
                </v-col>
                <v-col class="mr-5">
                  <v-dialog
                    ref="validToDialog"
                    v-model="validToModal"
                    :return-value.sync="validDateTo"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="validDateTo"
                        label="Datum"
                        prepend-icon="mdi-calendar"
                        background-color="accent"
                        filled
                        readonly
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker v-model="validDateTo" scrollable>
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validToDialog.save([])"
                        >Löschen</v-btn
                      >
                      <v-btn text color="primary" @click="validToModal = false"
                        >Abbrechen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validToDialog.save(validDateTo)"
                        >Speichern</v-btn
                      >
                    </v-date-picker>
                  </v-dialog>
                </v-col>
                <v-col>
                  <v-dialog
                    ref="validTimeToDialog"
                    v-model="validTimeToModal"
                    :return-value.sync="validTimeTo"
                    persistent
                    width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="validTimeTo"
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
                      v-model="validTimeTo"
                      full-width
                      format="24hr"
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validTimeToDialog.save([])"
                        >Löschen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="validTimeToModal = false"
                        >Abbrechen</v-btn
                      >
                      <v-btn
                        text
                        color="primary"
                        @click="$refs.validTimeToDialog.save(validTimeTo)"
                        >Speichern</v-btn
                      >
                    </v-time-picker>
                  </v-dialog>
                </v-col>
              </v-row>
            </v-form>
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
    </v-dialog>
  </v-row>
</template>

<script>
import ApiCouponService from "@/services/api/ApiCouponService";
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";

export default {
  name: "CouponEdit",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    coupon: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      validFromModal: false,
      validTimeToModal: false,
      validTimeFromModal: false,
      validToModal: false,
      inProgress: false,
      validDateFrom: null,
      validDateTo: null,
      validTimeFrom: null,
      validTimeTo: null,
      valid: true,
      rules: {
        required: (value) => !!value || "Pflichtfeld",
      },
      couponTypes: [
        { text: "Prozent", value: "percentage" },
        { text: "Betrag", value: "fixed" },
      ],
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    openDialog: {
      get() {
        return this.open;
      },
    },
    selectedCoupon: {
      get() {
        return this.coupon;
      },
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    closeDialog() {
      this.$emit("close");
    },
    async submitChanges() {
      if (this.$refs.form.validate()) {
        this.inProgress = true;

        if (this.validDateFrom) {
          this.selectedCoupon.validFrom = this.transformDateTime(
            this.validDateFrom,
            this.validTimeFrom
          );
        } else {
          this.selectedCoupon.validFrom = null;
        }

        if (this.validDateTo) {
          this.selectedCoupon.validTo = this.transformDateTime(
            this.validDateTo,
            this.validTimeTo
          );
        } else {
          this.selectedCoupon.validTo = null;
        }

        this.selectedCoupon.tenantId = this.tenantId;

        await ApiCouponService.submitCoupon(undefined, this.selectedCoupon)
          .then((response) => {
            this.inProgress = false;
            this.$emit("close");
          })
          .catch((error) => {
            this.addToast(
              ToastService.createToast("coupon.create.error", "error")
            );
            this.inProgress = false;
          });
      }
    },
    padTo2Digits(num) {
      return num.toString().padStart(2, "0");
    },
    formatDate(date) {
      if (date !== "Invalid Date" && date) {
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
      if (date !== "Invalid Date" && date) {
        return [
          this.padTo2Digits(date.getHours()),
          this.padTo2Digits(date.getMinutes()),
        ].join(":");
      } else {
        return null;
      }
    },
    transformDateTime(date, time) {
      if (!date) {
        return null;
      }

      // the time zone should germany

      const timestamp = new Date(date).getTime();
      const dateObj = new Date(timestamp);

      if (time) {
        const [hours, minutes] = time.split(":");
        dateObj.setHours(hours, minutes, 0, 0);
      } else {
        dateObj.setHours(0, 0, 0, 0);
      }

      return dateObj.getTime();
    },
  },
  watch: {
    coupon: {
      handler() {
        if (this.coupon.validFrom) {
          this.validDateFrom = this.formatDate(new Date(this.coupon.validFrom));
          this.validTimeFrom = this.formatTime(new Date(this.coupon.validFrom));
        } else {
          this.validDateFrom = null;
          this.validTimeFrom = null;
        }
        if (this.coupon.validTo) {
          this.validDateTo = this.formatDate(new Date(this.coupon.validTo));
          this.validTimeTo = this.formatTime(new Date(this.coupon.validTo));
        } else {
          this.validDateTo = null;
          this.validTimeTo = null;
        }
      },
      deep: true,
    },
  },
};
</script>

<style scoped></style>

<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-form ref="form" v-model="valid">
        <v-card class="coupon-edit" elevation="0">
          <div class="px-6 py-5 d-flex align-center">
            <v-icon large class="mr-3">
              {{ coupon.id ? "mdi-pencil" : "mdi-plus-circle" }}
            </v-icon>
            <span class="text-h5 font-weight-bold">
              {{
                coupon.id ? "Gutschein bearbeiten" : "Neuen Gutschein erstellen"
              }}
            </span>
          </div>

          <v-divider></v-divider>

          <v-card-text class="px-6 py-6 coupon-edit-content">
            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-ticket-outline</v-icon>
                <span class="text-h6 font-weight-bold">Grundinformationen</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Gutscheinnummer"
                      v-model="selectedCoupon.id"
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Bezeichnung"
                      v-model="selectedCoupon.description"
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      type="number"
                      label="Maximale Anzahl"
                      v-model="selectedCoupon.maxAmount"
                      hide-details
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-sale</v-icon>
                <span class="text-h6 font-weight-bold"
                >Rabatt-Einstellungen</span
                >
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      background-color="accent"
                      filled
                      dense
                      label="Typ"
                      :items="couponTypes"
                      v-model="selectedCoupon.type"
                      hide-details
                    >
                      <template #selection="{ item }">
                        <v-chip small text-color="white" color="primary">
                          {{ item.text }}
                        </v-chip>
                      </template>
                    </v-select>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Wert"
                      :rules="[rules.required]"
                      v-model="selectedCoupon.discount"
                      :suffix="
                        selectedCoupon.type === 'percentage' ? '%' : '€'
                      "
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 section-card" elevation="2" outlined>
              <v-card-title class="section-header pa-4">
                <v-icon class="mr-2">mdi-calendar-range</v-icon>
                <span class="text-h6 font-weight-bold"
                >Gültigkeitszeitraum</span
                >
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12">
                    <div class="info-label mb-2">
                      <v-icon small class="mr-2">mdi-calendar-start</v-icon>
                      Gültig ab
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          label="Datum"
                          prepend-icon="mdi-calendar"
                          background-color="accent"
                          filled
                          dense
                          readonly
                          clearable
                          @click:clear="validDateFrom = null"
                          hide-details
                          v-bind="attrs"
                          v-on="on"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="validDateFrom"
                        scrollable
                        locale="de"
                        :first-day-of-week="1"
                      >
                        <v-spacer></v-spacer>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validFromDialog.save([])"
                        >
                          Löschen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="validFromModal = false"
                        >
                          Abbrechen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validFromDialog.save(validDateFrom)"
                        >
                          Speichern
                        </v-btn>
                      </v-date-picker>
                    </v-dialog>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          clearable
                          @click:clear="validTimeFrom = null"
                          hide-details
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
                        >
                          Löschen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="validTimeFromModal = false"
                        >
                          Abbrechen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validTimeFromDialog.save(validTimeFrom)"
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
                      Gültig bis
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          clearable
                          @click:clear="validDateTo = null"
                          hide-details
                          v-bind="attrs"
                          v-on="on"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="validDateTo"
                        scrollable
                        locale="de"
                        :first-day-of-week="1"
                      >
                        <v-spacer></v-spacer>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validToDialog.save([])"
                        >
                          Löschen
                        </v-btn>
                        <v-btn text color="primary" @click="validToModal = false">
                          Abbrechen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validToDialog.save(validDateTo)"
                        >
                          Speichern
                        </v-btn>
                      </v-date-picker>
                    </v-dialog>
                  </v-col>
                  <v-col cols="12" md="6">
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
                          dense
                          readonly
                          clearable
                          @click:clear="validTimeTo = null"
                          hide-details
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
                        >
                          Löschen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="validTimeToModal = false"
                        >
                          Abbrechen
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.validTimeToDialog.save(validTimeTo)"
                        >
                          Speichern
                        </v-btn>
                      </v-time-picker>
                    </v-dialog>
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

<style scoped lang="scss">
.coupon-edit {
  border-radius: 12px !important;
  overflow: hidden;
}

.coupon-edit-content {
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

  }
}

.theme--dark .coupon-edit-content {
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);

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

.info-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}

.theme--dark .info-label {
  color: rgba(255, 255, 255, 0.7);
}
</style>

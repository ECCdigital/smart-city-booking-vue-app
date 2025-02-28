<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-text-field
          v-model="search"
          label="Gutschein suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>
        <v-data-table
          :headers="headers"
          :items="api.coupons"
          :search="search"
          :footer-props="{
            'items-per-page-all-text': 'Alle',
            'items-per-page-text': 'Gutscheine pro Seite',
          }"
          class="accent elevation-1"
          fixed-header
          :loading="loading"
          loading-text="Daten werden geladen..."
        >
          <template v-slot:item.type="{ item }">
            {{ transformType(item.type) }}
          </template>
          <template v-slot:item.discount="{ item }">
            {{ transformDiscount(item.discount, item.type) }}
          </template>
          <template v-slot:item.maxAmount="{ item }">
            {{ transformAmount(item) }}
          </template>
          <template v-slot:item.validFrom="{ item }">
            {{ transformDate(item.validFrom) }}
          </template>
          <template v-slot:item.validTo="{ item }">
            {{ transformDate(item.validTo) }}
          </template>
          <template v-slot:item.expired="{ item }">
            <v-chip v-if="transformExpired(item.validTo, item.validFrom)">
              inaktiv
            </v-chip>
            <v-chip v-else color="secondary" text-color="black"> aktiv </v-chip>
            <v-chip
              v-if="!hasAmount(item.maxAmount, item.usedAmount)"
              color="red"
              class="ml-1"
            >
              Keine Gutscheine mehr verfügbar
            </v-chip>
          </template>
          <template v-slot:item.controls="{ item }">
            <span v-if="item.id !== 'super-admin'">
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn icon v-bind="attrs" v-on="on" small>
                    <v-icon>mdi-dots-horizontal</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    link
                    @click="onOpenEditCoupons(item.id)"
                    :disabled="!CouponPermissionService.allowUpdate(item)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-pencil</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Gutschein bearbeiten</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    link
                    @click="onOpenDeleteDialog(item.id)"
                    :disabled="!CouponPermissionService.allowDelete(item)"
                  >
                    <v-list-item-icon>
                      <v-icon>mdi-delete</v-icon>
                    </v-list-item-icon>
                    <v-list-item-title>Gutschein löschen</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </span>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
    <v-btn
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      class="v-btn"
      @click="onOpenCreateCoupon"
      :disabled="!CouponPermissionService.allowCreate()"
    >
      <v-icon>mdi-plus</v-icon> Gutschein erstellen
    </v-btn>
    <CouponEdit
      :coupon="selectedCoupon"
      :open="openEditDialog"
      @close="closeEditDialog"
    ></CouponEdit>
    <CouponDeleteConformationDialog
      :to-delete="selectedCoupon"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    ></CouponDeleteConformationDialog>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import CouponEdit from "../components/Coupon/CouponEdit.vue";
import { mapActions, mapGetters } from "vuex";
import ApiCouponService from "@/services/api/ApiCouponService";
import CouponDeleteConformationDialog from "@/components/Coupon/CouponDeleteConformationDialog.vue";
import CouponPermissionService from "@/services/permissions/CouponPermissionService";

export default {
  name: "Coupons",
  components: {
    CouponDeleteConformationDialog,
    CouponEdit,
    AdminLayout,
  },
  data() {
    return {
      search: "",
      openEditDialog: false,
      api: {
        coupons: [],
      },
      headers: [
        {
          text: "Gutschein-Nummer",
          value: "id",
        },
        {
          text: "Beschreibung",
          value: "description",
        },
        {
          text: "Rabatt",
          value: "discount",
        },
        {
          text: "Anzahl",
          value: "maxAmount",
        },
        {
          text: "Gültig ab",
          value: "validFrom",
        },
        {
          text: "Gültig bis",
          value: "validTo",
        },
        {
          text: "Status",
          value: "expired",
        },
        { text: "", value: "controls", sortable: false },
      ],
      selectedCoupon: {},
      openDeleteDialog: false,
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    CouponPermissionService() {
      return CouponPermissionService;
    },
  },
  watch: {
    tenantId() {
      this.fetchCoupons();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    onOpenDeleteDialog(id) {
      this.selectedCoupon = Object.assign(
        {},
        this.api.coupons.find((coupon) => coupon.id === id)
      );
      this.openDeleteDialog = true;
    },
    onCloseDeleteDialog() {
      this.openDeleteDialog = false;
      this.fetchCoupons();
    },
    fetchCoupons() {
      this.startLoading("fetch-coupons");

      ApiCouponService.getCoupons(undefined)
        .then((response) => {
          this.api.coupons = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-coupons");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onOpenCreateCoupon() {
      this.selectedCoupon = { type: "fixed" };
      this.openEditDialog = true;
    },
    onOpenEditCoupons(id) {
      this.selectedCoupon = Object.assign(
        {},
        this.api.coupons.find((coupon) => coupon.id === id)
      );
      this.openEditDialog = true;
    },
    closeEditDialog() {
      this.openEditDialog = false;
      this.fetchCoupons();
    },
    transformDiscount(discount, type) {
      if (type === "percentage") {
        return `${discount}%`;
      }
      return `${discount}€`;
    },
    transformType(type) {
      if (type === "percentage") {
        return "Prozent";
      }
      return "Betrag";
    },
    transformExpired(expirationDate, startDate) {
      const today = new Date();
      const expiration = new Date(expirationDate);
      const start = new Date(startDate);
      if (expirationDate && today > expiration) {
        return true;
      }
      return today < start;
    },
    transformAmount(coupon) {
      if (coupon.maxAmount === undefined || coupon.maxAmount === null) {
        return `${coupon.usedAmount}`;
      }
      return `${coupon.usedAmount}/${coupon.maxAmount}`;
    },
    hasAmount(maxAmount, usedAmount) {
      if (maxAmount === undefined || maxAmount === null) {
        return true;
      }
      return maxAmount > usedAmount;
    },
    transformDate(date) {
      if (!date) {
        return null;
      }
      const dateObj = new Date(date);
      return (
        dateObj.toLocaleDateString("de-DE") +
        " " +
        dateObj.toLocaleTimeString("de-DE")
      );
    },
  },
  created() {
    this.fetchCoupons();
  },
};
</script>

<style scoped></style>

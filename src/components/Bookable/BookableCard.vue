<template>
  <v-card
    :class="[
      'bookable-card',
      'fill-height',
      'd-flex',
      'flex-column',
      { 'bookable-card--unavailable': !item.isBookable || !item.isPublic },
    ]"
    @click="navigateToEdit"
    hover
  >
    <div class="bookable-card-header position-relative">
      <div class="menu-container">
        <v-menu offset-y>
          <template v-slot:activator="{ on: menu, attrs }">
            <v-tooltip bottom>
              <template v-slot:activator="{ on: tooltip }">
                <v-btn
                  icon
                  class="menu-button"
                  v-bind="attrs"
                  v-on="{ ...tooltip, ...menu }"
                  @click.stop
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <span>Schnellaktionen</span>
            </v-tooltip>
          </template>
          <v-list dense>
            <v-list-item link @click.stop="copyBookableId">
              <v-list-item-icon>
                <v-icon>mdi-identifier</v-icon>
              </v-list-item-icon>
              <v-list-item-title>ID kopieren</v-list-item-title>
            </v-list-item>
            <v-list-item
              link
              @click.stop="emitDuplicateAction"
              :disabled="duplicateDisabled"
            >
              <v-list-item-icon>
                <v-icon>mdi-content-copy</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Duplizieren</v-list-item-title>
            </v-list-item>
            <v-list-item link @click.stop="gotoCheckout">
              <v-list-item-icon>
                <v-icon>mdi-cart</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Zur Buchung</v-list-item-title>
            </v-list-item>
            <v-divider
              v-if="BookablePermissionService.allowDelete(item)"
            ></v-divider>
            <v-list-item
              link
              class="red--text"
              @click.stop="emitDeleteAction"
              :disabled="!BookablePermissionService.allowUpdate(item)"
              v-if="BookablePermissionService.allowDelete(item)"
            >
              <v-list-item-icon>
                <v-icon color="red">mdi-delete</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Löschen</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <MediaReferenceImage
        v-if="coverImage"
        :reference="coverImage"
        size="sm"
        lazy-size="thumb"
        aspect-ratio="16/9"
        class="bookable-image"
        :height="200"
      >
        <div
          v-if="!item.isBookable || !item.isPublic"
          class="status-badges pa-3"
        >
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip
                v-if="!item.isPublic"
                small
                color="warning"
                class="mr-2 elevation-2"
                v-on="on"
              >
                <v-icon small left>mdi-eye-off</v-icon>
                Nicht gelistet
              </v-chip>
            </template>
            <span>Nicht öffentlich sichtbar</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip
                v-if="!item.isBookable"
                small
                color="error"
                class="elevation-2"
                v-on="on"
              >
                <v-icon small left>mdi-cancel</v-icon>
                Nicht buchbar
              </v-chip>
            </template>
            <span>Nicht buchbar</span>
          </v-tooltip>
        </div>
      </MediaReferenceImage>

      <div v-else class="placeholder-container">
        <PlaceholderPattern variant="poly" :theme="isDark ? 'dark' : 'light'" />

        <div
          v-if="!item.isBookable || !item.isPublic"
          class="status-badges pa-3"
        >
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip
                v-if="!item.isPublic"
                small
                color="warning"
                class="mr-2 elevation-2"
                v-on="on"
              >
                <v-icon small left>mdi-eye-off</v-icon>
                Nicht gelistet
              </v-chip>
            </template>
            <span>Nicht öffentlich sichtbar</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-chip
                v-if="!item.isBookable"
                small
                color="error"
                class="elevation-2"
                v-on="on"
              >
                <v-icon small left>mdi-cancel</v-icon>
                Nicht buchbar
              </v-chip>
            </template>
            <span>Nicht buchbar</span>
          </v-tooltip>
        </div>
      </div>
    </div>

    <div class="bookable-card-title pa-4 text-center">
      <h3
        class="font-weight-bold mb-1 title-dynamic"
        :class="titleSizeClass"
        :title="item.title"
      >
        {{ item.title }}
      </h3>
      <p
        v-if="item.type === 'ticket'"
        class="text-caption grey--text mb-0 event-name-clamp"
        :title="item._populated?.event?.information?.name"
      >
        <v-icon x-small class="mr-1">mdi-calendar-star</v-icon>
        {{ item._populated?.event?.information?.name || "Unbekannt" }}
      </p>
    </div>

    <v-divider></v-divider>

    <v-card-text class="flex-grow-1 pa-4">
      <div v-if="item.description" class="mb-3 text-body-2">
        <p
          class="grey--text text--darken-2 mb-0"
          v-html="shortenText(item.description)"
        ></p>
      </div>

      <!-- IFBS External Prices -->
      <div v-if="isIfbsActive" class="mb-3">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2">
            mdi-lock-outline
          </v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            IFBS Preise
          </span>
          <v-chip x-small class="ml-2" color="primary" outlined label>
            extern
          </v-chip>
        </div>

        <div v-if="isLoadingIfbsPrices" class="ml-7">
          <v-progress-linear indeterminate color="primary" class="my-2" />
        </div>

        <div v-else-if="ifbsPrices" class="ml-7">
          <div
            v-for="row in ifbsCardPriceRows"
            :key="row.key"
            class="d-flex align-center justify-space-between text-body-2 mb-1"
          >
            <div class="d-flex align-center">
              <v-icon x-small color="primary" class="mr-2">
                {{ row.icon }}
              </v-icon>
              <span class="grey--text text--darken-1">{{ row.label }}</span>
            </div>
            <span class="font-weight-bold primary--text">
              {{ row.value }}
            </span>
          </div>

          <v-divider class="my-2" />

          <div class="d-flex align-center justify-space-between text-body-2">
            <div class="d-flex align-center">
              <v-icon x-small color="primary" class="mr-2">
                mdi-cash-plus
              </v-icon>
              <span class="grey--text text--darken-1">Servicegebühr</span>
            </div>
            <span class="font-weight-bold primary--text">
              {{ formatCurrency(ifbsPrices["Preis_Servicegebühr"]) }}
            </span>
          </div>

          <div
            v-if="
              ifbsPrices['minimum_usage_time_mins'] &&
              ifbsPrices['minimum_usage_time_mins'] !== '0'
            "
            class="d-flex align-center justify-space-between text-body-2 mt-1"
          >
            <div class="d-flex align-center">
              <v-icon x-small color="primary" class="mr-2">
                mdi-timer-outline
              </v-icon>
              <span class="grey--text text--darken-1">Mindestdauer</span>
            </div>
            <span class="font-weight-bold primary--text">
              {{ formatDuration(ifbsPrices["minimum_usage_time_mins"]) }}
            </span>
          </div>
        </div>

        <div v-else class="ml-7 text-caption grey--text">
          Preise nicht verfügbar
        </div>
      </div>

      <!-- Normal Prices -->
      <div v-else-if="hasPriceCategories" class="mb-3">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2"> mdi-cash </v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            Preise
          </span>
        </div>
        <div
          v-for="(priceCategory, index) in item.priceCategories"
          :key="index"
          class="ml-7 mb-1"
        >
          <div class="d-flex align-center justify-space-between text-body-2">
            <div class="d-flex align-center">
              <span class="font-weight-bold primary--text mr-2">
                {{ priceCategory.priceEur | currency("EUR", "de-DE") }}
              </span>
              <v-chip
                v-if="priceCategory.fixedPrice"
                x-small
                color="secondary"
                text-color="black"
              >
                Pauschal
              </v-chip>
            </div>
            <span
              v-if="priceCategory.interval.end || priceCategory.interval.start"
              class="grey--text text--darken-1"
            >
              {{
                getPrice(
                  priceCategory.interval.start,
                  priceCategory.interval.end,
                  item.priceType
                )
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Free -->
      <div v-else class="d-flex align-center mb-3 text-body-2">
        <v-icon small color="success" class="mr-2">mdi-cash-check</v-icon>
        <span class="success--text font-weight-bold">Kostenfrei</span>
      </div>

      <div v-if="item.flags && item.flags.length > 0">
        <div class="ml-3">
          <div
            v-for="(flag, index) in item.flags.slice(0, 3)"
            :key="index"
            class="d-flex align-center mb-1 text-body-2"
          >
            <v-icon x-small color="success" class="mr-2">mdi-check</v-icon>
            <span class="grey--text text--darken-2">{{ flag }}</span>
          </div>
          <span
            v-if="item.flags.length > 3"
            class="text-caption grey--text ml-5"
          >
            +{{ item.flags.length - 3 }} weitere
          </span>
        </div>
      </div>
    </v-card-text>

    <v-dialog
      v-model="showDeleteDialog"
      persistent
      max-width="500px"
      @click:outside.stop
    >
      <v-card color="accent">
        <v-card-title>
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          <span class="text-h5">Buchungsobjekt löschen</span>
        </v-card-title>
        <v-card-text>
          <span class="text-h6">
            Sind Sie sicher, dass Sie das Buchungsobjekt
            <strong>{{ item.title }}</strong> löschen wollen?
          </span>
          <p class="text-body-2 grey--text text--darken-1 mt-3 mb-0">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn outlined @click.stop="showDeleteDialog = false">
            Abbrechen
          </v-btn>
          <v-btn color="error" @click.stop="confirmDelete"> Löschen </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiLockerService from "@/services/api/ApiLockerService";
import ToastService from "@/services/ToastService";
import PlaceholderPattern from "@/components/commons/PlaceholderPattern.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";

export default {
  components: { MediaReferenceImage, PlaceholderPattern },
  props: {
    editRoute: String,
    fromRoute: String,
    item: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      defaultImage: require("@/assets/bookable-default.jpg"),
      isDuplicateAllowed: true,
      isLoadingIfbsPrices: false,
      ifbsPrices: null,
      showDeleteDialog: false,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      instance: "instance/instance",
    }),
    isDark() {
      return this.$vuetify?.theme?.dark || false;
    },
    /**
     * The cover image: the first entry of the image list, determined by
     * position (§4.8). A bookable the media import has not touched yet falls
     * back to its legacy `imgUrl`.
     */
    coverImage() {
      return this.item.images?.[0] || this.item.imgUrl || null;
    },
    duplicateDisabled() {
      return (
        !this.BookablePermissionService.allowCreate() ||
        !this.isDuplicateAllowed
      );
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
    isIfbsActive() {
      const providers = this.item?.externalProviders;
      const provider = providers?.find(
        (p) => p.active && p.provider === "ifbs"
      );
      if (provider) {
        return (
          provider.handles.includes("pricing") && provider.config?.locationId
        );
      }
      return false;
    },
    ifbsProvider() {
      if (!this.isIfbsActive) return null;
      return this.item.externalProviders.find((p) => p.provider === "ifbs");
    },
    ifbsCardPriceRows() {
      if (!this.ifbsPrices) return [];
      return [
        {
          key: "1h",
          label: "pro Stunde",
          value: this.formatCurrency(this.ifbsPrices["Preis_1h"]),
          icon: "mdi-clock-outline",
        },
        {
          key: "1d",
          label: "pro Tag",
          value: this.formatCurrency(this.ifbsPrices["Preis_1d"]),
          icon: "mdi-calendar-today",
        },
        {
          key: "1w",
          label: "pro Woche",
          value: this.formatCurrency(this.ifbsPrices["Preis_1w"]),
          icon: "mdi-calendar-week",
        },
        {
          key: "1m",
          label: "pro Monat",
          value: this.formatCurrency(this.ifbsPrices["Preis_1m"]),
          icon: "mdi-calendar-month",
        },
        {
          key: "1y",
          label: "pro Jahr",
          value: this.formatCurrency(this.ifbsPrices["Preis_1y"]),
          icon: "mdi-calendar-star",
        },
      ];
    },
    hasPriceCategories() {
      return (
        this.item.priceCategories &&
        this.item.priceCategories.some((pC) => pC.priceEur > 0)
      );
    },
    titleSizeClass() {
      const len = this.item.title?.length || 0;
      if (len <= 25) return "text-h6";
      if (len <= 50) return "text-subtitle-1";
      return "text-body-2";
    },
  },
  watch: {
    isIfbsActive: {
      immediate: true,
      handler(active) {
        if (active) {
          this.fetchIfbsPrices();
        } else {
          this.ifbsPrices = null;
        }
      },
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    navigateToEdit() {
      if (
        this.editRoute &&
        this.BookablePermissionService.allowUpdate(this.item)
      ) {
        this.$router.push({
          name: this.editRoute,
          query: { id: this.item.id, fromRoute: this.fromRoute },
        });
      }
    },
    getPrice(start, end, priceType) {
      const suffix = this.intervalSuffix(priceType);
      let interval = "";
      if (!start) {
        interval = `bis ${end}`;
      }
      if (!end) {
        interval = `ab ${start}`;
      }
      if (start && end) {
        interval = `${start} - ${end}`;
      }
      return `${interval} ${suffix}`;
    },
    intervalSuffix(type) {
      if (type === "per-hour") return "Std.";
      if (type === "per-day") return "Tage";
      if (type === "per-square-meter") return "m²";
      return "Stück";
    },
    formatCurrency(value) {
      return parseFloat(value || 0).toFixed(2) + " €";
    },
    formatDuration(minutes) {
      const mins = parseInt(minutes, 10);
      if (!mins || mins === 0) return "Keine";

      const weeks = Math.floor(mins / 10080);
      const days = Math.floor((mins % 10080) / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      const remainingMins = mins % 60;

      const parts = [];
      if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`);
      if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
      if (hours > 0)
        parts.push(`${hours} ${hours === 1 ? "Stunde" : "Stunden"}`);
      if (remainingMins > 0) parts.push(`${remainingMins} Min.`);

      return parts.join(", ");
    },
    async fetchIfbsPrices() {
      const provider = this.ifbsProvider;
      if (!provider?.config?.locationId || !this.item?.tenantId) return;

      try {
        this.isLoadingIfbsPrices = true;
        const response = await ApiLockerService.getPrice(
          this.item.tenantId,
          "ifbs",
          provider.config.locationId
        );
        this.ifbsPrices = response.data;
      } catch (err) {
        console.error("Error fetching IFBS prices:", err);
        this.ifbsPrices = null;
      } finally {
        this.isLoadingIfbsPrices = false;
      }
    },
    emitDeleteAction() {
      this.showDeleteDialog = true;
    },
    confirmDelete() {
      this.showDeleteDialog = false;
      this.$emit("delete");
    },
    emitDuplicateAction() {
      this.$emit("duplicate");
    },
    gotoCheckout() {
      const checkoutConfig = this.instance?.checkout || {};

      if (checkoutConfig.useLegacyCheckout) {
        const routeData = this.$router.resolve({
          name: "checkout",
          query: { id: this.item.id, tenant: this.tenantId, amount: 1 },
        });
        window.open(routeData.href, "_blank");
        return;
      }

      if (checkoutConfig.checkoutUrl) {
        const baseUrl = checkoutConfig.checkoutUrl.replace(/\/+$/, "");
        const url = `${baseUrl}/checkout/${this.item.id}/?tenantId=${this.tenantId}`;
        window.open(url, "_blank");
      }
    },
    async copyBookableId() {
      try {
        await navigator.clipboard.writeText(this.item.id);
        this.addToast(
          ToastService.createToast("bookable.copyId.success", "success")
        );
      } catch (error) {
        console.error("Failed to copy bookable id:", error);
        this.addToast(
          ToastService.createToast(
            "bookable.copyId.errors.something-wrong",
            "error"
          )
        );
      }
    },
    shortenText(text) {
      return text.substring(0, 120) + (text.length > 120 ? " ..." : "");
    },
    async setAllowDuplicate() {
      const bookableCountCheck =
        await ApiBookablesService.publicBookableCountCheck();
      this.isDuplicateAllowed = bookableCountCheck || !this.item.isPublic;
    },
  },
  mounted() {
    this.setAllowDuplicate();
  },
};
</script>

<style scoped lang="scss">
.placeholder-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.bookable-card {
  max-width: 400px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  cursor: pointer;
  position: relative;
  border-radius: 12px !important;
  overflow: hidden;
}

.bookable-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.bookable-card--unavailable {
  opacity: 0.85;
}

.bookable-card-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.bookable-card-title {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .bookable-card-header,
.theme--dark .bookable-card-title {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.bookable-image {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  transition: transform 0.3s ease;
}

.bookable-card:hover .bookable-image {
  transform: scale(1.02);
}

.status-badges {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.4) 0%,
    transparent 100%
  );
}

.position-relative {
  position: relative;
}

.flex-grow-1 {
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.theme--dark .flex-grow-1 {
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

.menu-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.menu-button {
  background-color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 1) !important;
  }

  .v-icon {
    color: rgba(0, 0, 0, 0.75);
  }
}

.theme--dark .menu-button {
  background-color: rgba(40, 40, 40, 0.85) !important;

  &:hover {
    background-color: rgba(60, 60, 60, 1) !important;
  }

  .v-icon {
    color: rgba(255, 255, 255, 0.9);
  }
}

.title-dynamic {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  transition: font-size 0.2s ease;
  width: 100%;
}

.event-name-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  word-break: break-all;
}
</style>

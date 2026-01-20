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
    outlined
  >
    <div class="bookable-card-header position-relative">
      <div class="menu-container">
        <v-menu offset-y>
          <template v-slot:activator="{ on: menu, attrs }">
            <v-tooltip bottom>
              <template v-slot:activator="{ on: tooltip }">
                <v-btn
                  icon
                  v-bind="attrs"
                  v-on="{ ...tooltip, ...menu }"
                  @click.stop
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <span>Aktionen</span>
            </v-tooltip>
          </template>
          <v-list dense>
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

      <v-img
        v-if="item.imgUrl"
        :lazy-src="item.imgUrl"
        aspect-ratio="16/9"
        :src="item.imgUrl"
        class="bookable-image"
        height="200"
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
      </v-img>

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
      <h3 class="text-h6 font-weight-bold mb-1">
        {{ item.title }}
      </h3>
      <p v-if="item.type === 'ticket'" class="text-caption grey--text mb-0">
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

      <div class="mb-3" v-if="hasPriceCategories">
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
      <div v-else class="d-flex align-center mb-3 text-body-2">
        <v-icon small color="success" class="mr-2">mdi-cash-check</v-icon>
        <span class="success--text font-weight-bold">Kostenfrei</span>
      </div>

      <div v-if="item.flags && item.flags.length > 0">
        <div class="d-flex align-center mb-2">
          <v-icon small color="grey darken-1" class="mr-2"> mdi-star </v-icon>
          <span class="text-body-2 font-weight-bold grey--text text--darken-2">
            Ausstattung
          </span>
        </div>
        <div class="ml-7">
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
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import PlaceholderPattern from "@/components/commons/PlaceholderPattern.vue";

export default {
  components: { PlaceholderPattern },
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
    };
  },
  methods: {
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
      if (type === "per-hour") {
        return "Std.";
      } else if (type === "per-day") {
        return "Tage";
      } else if (type === "per-square-meter") return "m²";
      else {
        return "Stück";
      }
    },

    emitDeleteAction() {
      this.$emit("delete");
    },
    emitDuplicateAction() {
      this.$emit("duplicate");
    },
    gotoCheckout() {
      const routeData = this.$router.resolve({
        name: "checkout",
        query: { id: this.item.id, tenant: this.tenantId, amount: 1 },
      });
      window.open(routeData.href, "_blank");
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
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    isDark() {
      return this.$vuetify?.theme?.dark || false;
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
    hasPriceCategories() {
      return (
        this.item.priceCategories &&
        this.item.priceCategories.some((pC) => pC.priceEur > 0)
      );
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

.v-card {
  transition: all 0.3s ease;
}

.bookable-card:hover .bookable-image {
  transform: scale(1.02);
}

.bookable-image {
  transition: transform 0.3s ease;
}

.position-relative {
  position: relative;
}

.bookable-card {
  max-width: 400px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  cursor: pointer;
  position: relative;
  border-radius: 12px !important;
  overflow: hidden;
}

.flex-grow-1 {
  max-height: 300px; // Passe dies nach Bedarf an
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
</style>

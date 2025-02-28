<template>
  <v-card class="mx-auto accent flex d-flex flex-column" height="100%">
    <div>
      <v-img
        :lazy-src="item.imgUrl"
        aspect-ratio="16/9"
        :src="item.imgUrl ? item.imgUrl : defaultImage"
        class="rounded-img"
      >
        <v-overlay
          :absolute="true"
          :value="!item.isBookable || !item.isPublic"
          class="align-start justify-start"
        >
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-icon class="ml-2" v-on="on" v-if="!item.isPublic" size="75"
                >mdi-eye-off-outline</v-icon
              >
            </template>
            <span
              >Das Buchungsobjekt ist für die Öffentlichkeit nicht
              sichtbar</span
            >
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-icon class="ml-2" v-on="on" v-if="!item.isBookable" size="75"
                >mdi-cancel</v-icon
              >
            </template>
            <span>Das Buchungsobjekt ist nicht buchbar</span>
          </v-tooltip>
        </v-overlay>
      </v-img>
    </div>
    <v-card-title>{{ item.title }}</v-card-title>
    <v-card-subtitle class="pb-4">
      <v-row no-gutters v-if="item.type === 'ticket'">
        <v-col class="col-4 font-weight-bold">
          <small>Veranstaltung:</small>
        </v-col>
        <v-col>
          {{ item._populated?.event?.information?.name || "Unbekannt" }}
        </v-col>
      </v-row>

      <p
        class="mt-2 mb-0"
        v-if="item.description"
        v-html="shortenText(item.description)"
      ></p>
    </v-card-subtitle>

    <v-card-text
      class="font-weight-bold title pb-0"
      color="grey darken-1"
      v-if="item.priceEur && item.priceEur > 0"
    >
      {{ item.priceEur | currency("EUR", "de-DE") }}
    </v-card-text>
    <v-card-text
      class="font-weight-bold title pb-0"
      color="grey darken-1"
      v-else
    >
      Kostenfrei
    </v-card-text>

    <v-card-text color="grey darken-1" v-if="item.flags">
      <ul class="unstyled-list">
        <li v-for="flag in item.flags" :key="flag" class="d-flex">
          <v-icon class="pe-2" size="23">mdi-check</v-icon>
          <div class="subtitle-1">{{ flag }}</div>
        </li>
      </ul>
    </v-card-text>

    <v-card-actions class="py-4 mt-auto" v-if="editRoute">
      <v-spacer></v-spacer>
      <v-btn
        class="secondary"
        color="black"
        rounded
        text
        :to="{ name: editRoute, query: { id: item.id, fromRoute: fromRoute } }"
        :disabled="!BookablePermissionService.allowUpdate(item)"
      >
        Bearbeiten
      </v-btn>
      <v-menu offset-y>
        <template v-slot:activator="{ on: menu, attrs }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn icon v-bind="attrs" v-on="{ ...tooltip, ...menu }">
                <v-icon size="25">mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <span>Einstellungen</span>
          </v-tooltip>
        </template>
        <v-list dense>
          <v-list-item
            link
            @click="emitDuplicateAction"
            :disabled="duplicateDisabled"
          >
            <v-list-item-icon>
              <v-icon>mdi-content-copy</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Duplizieren</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="gotoCheckout">
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
            @click="emitDeleteAction"
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
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import ApiBookablesService from "@/services/api/ApiBookablesService";

export default {
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
      return text.substring(0, 140) + (text.length > 140 ? " ..." : "");
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
    duplicateDisabled() {
      return (
        !this.BookablePermissionService.allowCreate() ||
        !this.isDuplicateAllowed
      );
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
  },
  mounted() {
    this.setAllowDuplicate();
  },
};
</script>

<style scoped lang="scss">
.unstyled-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rounded-img {
  border-top-left-radius: 25px !important;
  border-top-right-radius: 25px !important;
  height: 200px;
  max-height: 200px;
}
</style>

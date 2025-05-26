<template>
  <nav id="navbar">
    <v-app-bar
      flat
      app
      clipped-left
      :color="isProduction !== 'true' ? 'green' : ''"
    >
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <img
        alt="Smart City Booking"
        src="/app-logo.png"
        style="max-height: 50px; width: auto; max-width: 250px"
      />
      <v-spacer></v-spacer>
      <span v-if="isProduction !== 'true'" class="font-weight-bold"
        >DIES IST EIN TESTSYSTEM</span
      >
      <v-spacer></v-spacer>
      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn icon v-on="on" class="mr-1" @click="darkMode">
            <v-icon>
              {{
                $vuetify.theme.dark
                  ? "mdi-white-balance-sunny"
                  : "mdi-moon-waxing-crescent"
              }}
            </v-icon>
          </v-btn>
        </template>
        <span>Theme wechseln</span>
      </v-tooltip>
      <v-menu offset-y>
        <template v-slot:activator="{ on: menu, attrs }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn icon v-bind="attrs" v-on="{ ...tooltip, ...menu }">
                <v-icon size="25">mdi-account-circle</v-icon>
              </v-btn>
            </template>
            <span>Profil Einstellungen</span>
          </v-tooltip>
        </template>
        <v-list dense>
          <v-list-item inactive>
            <v-list-item-title>{{
              user.firstName ? user.firstName : "User Name"
            }}</v-list-item-title>
          </v-list-item>
          <v-list-item-group color="primary">
            <v-list-item
              v-for="(item, i) in profileItems"
              :key="i"
              :to="{ name: item.link }"
            >
              <v-list-item-icon>
                <v-icon>{{ item.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="logout">
              <v-list-item-icon>
                <v-icon> mdi-logout </v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Abmelden</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      app
      :clipped="$vuetify.breakpoint.mdAndUp"
      id="nav"
    >
      <div class="v-navigation-drawer__content">
        <v-list dense nav class="py-0" rounded>
          <v-select
            rounded
            dense
            filled
            prepend-inner-icon="mdi-home-account"
            background-color="accent"
            v-model="currentTenant"
            :items="tenants"
            item-text="name"
            item-value="id"
            hide-details
            class="my-2 text-truncate"
          >
            <template v-slot:prepend-item>
              <v-list-item class="my-2"> Mandant auswählen: </v-list-item>
              <v-divider></v-divider>
            </template>
          </v-select>

          <v-divider></v-divider>
          <div v-for="parentItem in navItems" :key="parentItem.header">
            <v-subheader
              v-if="parentItem.header"
              class="pl-3 py-4 subtitle-1 text--black"
              >{{ parentItem.header }}
            </v-subheader>
            <v-list-item
              v-for="item in parentItem.pages"
              :key="item.title"
              link
              class="my-2"
              :to="{ name: item.link }"
              exact
              active-class="active-item secondary"
            >
              <v-list-item-icon>
                <v-icon>{{ item.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <template v-if="false">
                  @TODO: Add to instead of href with rout name instead of path
                </template>
                <v-list-item-title
                  :href="item.link"
                  target="_blank"
                  class="font-weight-medium subtitle-2"
                  >{{ item.title }}</v-list-item-title
                >
              </v-list-item-content>
            </v-list-item>
            <v-divider class="mt-2 mb-2"></v-divider>
          </div>
        </v-list>
      </div>
    </v-navigation-drawer>
  </nav>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  data: () => ({
    drawer: false,
    isProduction: process.env.VUE_APP_IS_PRODUCTION,
    profileItems: [
      {
        title: "Einstellungen",
        link: "settings",
        icon: "mdi-cog-outline",
      },
    ],
    items: [
      {
        header: null,
        pages: [
          {
            title: "Mandanten",
            link: "dashboard",
            icon: "mdi-view-dashboard",
            showAlways: true,
          },
        ],
      },
      {
        header: "Buchungsplattform",
        pages: [
          {
            title: "Buchungen",
            link: "bookings",
            icon: "mdi-book-outline",
            interfaceName: "bookings",
            context: "tenant",
          },
          {
            title: "Gutscheine",
            link: "coupons",
            icon: "mdi-ticket-percent-outline",
            interfaceName: "coupons",
            context: "tenant",
          },
          {
            title: "Veranstaltungsorte",
            link: "event-locations",
            icon: "mdi-map-marker-outline",
            interfaceName: "locations",
            context: "tenant",
          },
          {
            title: "Räume",
            link: "rooms",
            icon: "mdi-door",
            interfaceName: "rooms",
            context: "tenant",
          },
          {
            title: "Ressourcen",
            link: "resources",
            icon: "mdi-hammer-wrench",
            interfaceName: "resources",
            context: "tenant",
          },
          {
            title: "Tickets",
            link: "tickets",
            icon: "mdi-ticket",
            interfaceName: "tickets",
            context: "tenant",
          },
          {
            title: "Veranstaltungen",
            link: "events",
            icon: "mdi-calendar",
            interfaceName: "events",
            context: "tenant",
          },
        ],
      },
      {
        header: "Mandant",
        pages: [
          {
            title: "Mandant verwalten",
            link: "tenant",
            icon: "mdi-domain",
            interfaceName: "tenants",
            context: "tenant",
          },
          {
            title: "Mandant Benutzer",
            link: "user",
            icon: "mdi-account-group-outline",
            interfaceName: "users",
            context: "tenant",
          },
          {
            title: "Mandant Rollen",
            link: "roles",
            icon: "mdi-account-key-outline",
            interfaceName: "roles",
            context: "tenant",
          },
        ],
      },
      {
        header: "System",
        pages: [
          {
            title: "Instanz verwalten",
            link: "instances",
            icon: "mdi-home-edit-outline",
            interfaceName: "instance",
          },
          {
            title: "Mandanten",
            link: "instance-tenants",
            icon: "mdi-domain",
            interfaceName: "instance",
          },
          {
            title: "Benutzer",
            link: "instance-users",
            icon: "mdi-account-group-outline",
            interfaceName: "instance",
          },
        ],
      },
      {
        header: null,
        pages: [
          {
            title: "Einstellungen",
            link: "settings",
            icon: "mdi-cog-outline",
            interfaceName: "settings",
            showAlways: true,
          },
        ],
      },
    ],
    //currentTenant: "",
    tenants: [],
  }),
  components: {},
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      deleteUser: "user/delete",
      selectTenant: "tenants/select",
    }),
    resetStores() {
      this.$store.dispatch("reset");
    },
    logout() {
      ApiAuthService.logout()
        .then(() => {
          this.addToast(ToastService.createToast("logout.success", "success"));
          this.resetStores();
          window.location.href = "/";
        })
        .finally(() => {
          this.deleteUser();
        });
    },
    darkMode() {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
    },
    fetchTenants() {
      ApiTenantService.getTenants(true).then((response) => {
        this.tenants = response.data;
        if(!this.currentTenant && this.tenants.length === 1) {
          this.currentTenant = this.tenants[0].id;
        }
      });
    },
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
      isAuthorized: "user/isAuthorized",
      getCurrentTenant: "tenants/currentTenantId",
    }),
    currentTenant: {
      get: function () {
        return this.getCurrentTenant;
      },
      set: function (newValue) {
        this.selectTenant(newValue);
      },
    },
    navItems() {
      // reduce items to only those that are allowed for the current user
      return this.items
        .map((item) => {
          return {
            ...item,
            pages: item.pages.filter((page) => {
              if (page.showAlways) {
                return true;
              }
              return (
                this.isAuthorized(page.interfaceName) &&
                (page.context !== "tenant" || this.getCurrentTenant)
              );
            }),
          };
        })
        .filter((item) => {
          return item.pages.length > 0;
        });
    },
  },
  async mounted() {
    this.drawer = !this.$vuetify.breakpoint.mdAndDown;
    this.fetchTenants();
  },
};
</script>
<style>
.active-item {
  color: black !important;
}
</style>

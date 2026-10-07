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
        :src="appLogo"
        class="navbar-logo"
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
      <NotificationDisplay class="mr-2" />
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
            :items="tenantItems"
            item-text="name"
            item-value="id"
            hide-details
            class="my-2 text-truncate"
          >
            <template v-slot:prepend-item>
              <v-list-item class="my-2"> Mandant auswählen: </v-list-item>
              <v-divider></v-divider>
            </template>
            <template v-slot:item="{ item }">
              <v-list-item-content>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action v-if="item.disabled">
                <SupervisionLevelChip :level="item.supervisionLevel" x-small />
              </v-list-item-action>
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
              <v-list-item-action v-if="badges[item.badge]" class="my-0">
                <v-chip
                  x-small
                  label
                  color="warning"
                  :data-test="`nav-badge-${item.link}`"
                  >{{ badges[item.badge] }}</v-chip
                >
              </v-list-item-action>
            </v-list-item>
            <v-divider class="mt-2 mb-2"></v-divider>
          </div>
        </v-list>
      </div>
      <template v-slot:append>
        <div class="pa-3 text-center text--secondary caption">
          Version {{ appVersion }}
        </div>
      </template>
    </v-navigation-drawer>
  </nav>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiClientService from "@/services/api/ApiClientService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";
import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";
import NotificationDisplay from "@/components/NotificationDisplay";
import SupervisionLevelChip from "@/components/Supervision/SupervisionLevelChip.vue";
import keycloakService from "@/services/KeycloakService";
import { isBffAuthMode } from "@/services/auth/authMode";
import { directRedirects } from "@/services/auth/directRedirects";
import { version as appVersion } from "../../package.json";

export default {
  data: () => ({
    drawer: false,
    isProduction: process.env.VUE_APP_IS_PRODUCTION,
    appVersion,
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
            icon: "mdi-domain-switch",
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
            title: "Rabatte",
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
            title: "Geräte & Weiteres",
            link: "resources",
            icon: "mdi-package-variant",
            interfaceName: "resources",
            context: "tenant",
          },
          {
            title: "Tickets",
            link: "tickets",
            icon: "mdi-ticket-confirmation-outline",
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
          {
            title: "Mediathek",
            link: "media",
            icon: "mdi-image-multiple-outline",
            interfaceName: "media",
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
            title: "Mitglieder",
            link: "user",
            icon: "mdi-account-multiple-outline",
            interfaceName: "users",
            context: "tenant",
          },
          {
            title: "Rollen",
            link: "roles",
            icon: "mdi-shield-account-outline",
            interfaceName: "roles",
            context: "tenant",
          },
          {
            title: "Zutritt & Schließsysteme",
            link: "access-points",
            icon: "mdi-door-closed-lock",
            interfaceName: "tenants",
            context: "tenant",
          },
        ],
      },
      {
        header: "System",
        pages: [
          {
            title: "Dashboard",
            link: "dataDashboard",
            icon: "mdi-view-dashboard",
            interfaceName: "instance",
          },
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
            title: "Prüfliste",
            link: "instance-review-queue",
            icon: "mdi-clipboard-list-outline",
            interfaceName: "instance",
            badge: "waiting",
          },
          {
            title: "Benutzer",
            link: "instance-users",
            icon: "mdi-account-group-outline",
            interfaceName: "instance",
          },
          {
            title: "Automatisierungsregeln",
            link: "rules",
            icon: "mdi-cog-sync-outline",
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
    // The counters beside an entry, by the entry's `badge`; 0 shows none.
    badges: { waiting: 0 },
  }),
  components: {
    NotificationDisplay,
    SupervisionLevelChip,
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
      deleteUser: "user/delete",
      selectTenant: "tenants/select",
    }),
    resetStores() {
      this.$store.dispatch("reset");
    },
    async logout() {
      const authType =
        ApiClientService.getAuthType() || localStorage.getItem("authType");

      // Direct + keycloak-js: IdP logout redirect. BFF: cookie logout via ApiAuthService.
      if (authType === "keycloak" && !isBffAuthMode()) {
        this.resetStores();
        await this.deleteUser();

        await keycloakService.logout(
          directRedirects(window.location.origin).logout
        );
      } else {
        ApiAuthService.logout()
          .then((result) => {
            this.addToast(
              ToastService.createToast("logout.success", "success")
            );
            this.resetStores();

            if (result?.idpLogoutUrl) {
              window.location.href = result.idpLogoutUrl;
              return;
            }

            const base = process.env.BASE_URL?.trim()
              ? process.env.BASE_URL.replace(/\/$/, "")
              : "";
            window.location.href = `${base}/login`;
          })
          .finally(() => {
            this.deleteUser();
          });
      }
    },
    darkMode() {
      this.$store.dispatch("theme/toggleDarkMode").then((isDarkMode) => {
        this.$vuetify.theme.dark = isDarkMode;
      });
    },
    fetchTenants() {
      ApiTenantService.getTenants(true).then((response) => {
        this.tenants = response.data;
        if (
          !this.currentTenant &&
          this.tenants.length === 1 &&
          !this.declinedMembership(this.tenants[0].id)
        ) {
          this.currentTenant = this.tenants[0].id;
        }
      });
    },
    /**
     * What waits for the instance owner's decision - the offers and the
     * tenants, the two registers of the Prüfliste: the entry's badge is the
     * sum of their counters, each read as a page of one. A register that
     * cannot be read adds nothing.
     *
     * The permissions are read off the store, as `isAuthorized` does. A
     * permission service would import the user module before the store, and
     * the user module imports the store: loaded that way from the drawer,
     * the store is built without its user module.
     */
    async fetchWaitingCount() {
      const permissions = this.$store.state.user.data?.permissions;
      if (permissions?.instanceOwner !== true) return;
      const firstOfOne = { page: 1, pageSize: 1 };
      const answers = await Promise.allSettled([
        ApiReviewQueueService.getReviewQueue(firstOfOne),
        ApiTenantApprovalQueueService.getTenantApprovalQueue(firstOfOne),
      ]);
      this.badges.waiting = answers.reduce((sum, answer) => {
        if (answer.status === "rejected") {
          console.error(answer.reason);
          return sum;
        }
        return sum + (answer.value?.total || 0);
      }, 0);
    },
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
      isAuthorized: "user/isAuthorized",
      getCurrentTenant: "tenants/currentTenantId",
      declinedMembership: "user/declinedMembership",
    }),
    // A declined tenant stays in the list, greyed out and not selectable
    // (glossary „abgewiesen“); the instance owner keeps every tenant.
    tenantItems() {
      return this.tenants.map((tenant) => {
        const membership = this.declinedMembership(tenant.id);
        return membership
          ? {
              ...tenant,
              disabled: true,
              supervisionLevel: membership.supervisionLevel,
            }
          : tenant;
      });
    },
    currentTenant: {
      get: function () {
        return this.getCurrentTenant;
      },
      set: function (newValue) {
        this.selectTenant(newValue);
      },
    },
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
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
    this.fetchWaitingCount();
  },
};
</script>
<style>
.active-item {
  color: black !important;
}

/* Light Mode Scrollbar */
#nav ::-webkit-scrollbar {
  width: 8px;
}

#nav ::-webkit-scrollbar-track {
  background: #f1f1f1;
}

#nav ::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

#nav ::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Dark Mode Scrollbar */
.theme--dark #nav ::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.theme--dark #nav ::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.theme--dark #nav ::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* Firefox Support */
#nav {
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}

.theme--dark #nav {
  scrollbar-color: #555 #1e1e1e;
}
</style>

<style scoped>
.navbar-logo {
  padding: var(--scb-logo-plate-padding);
  border-radius: var(--scb-radius-control);
  background: var(--scb-logo-plate);
}
</style>

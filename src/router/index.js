import Vue from "vue";
import VueRouter from "vue-router";
import Home from "@/views/Home.vue";
import Events from "@/views/Bookables/Events/Events.vue";
import EventCreate from "@/views/Bookables/Events/EventCreate.vue";
import EventCreateInformation from "@/views/Bookables/Events/Form/Information.vue";
import EventCreateEventLocation from "@/views/Bookables/Events/Form/EventLocation.vue";
import EventCreateEventOrganizer from "@/views/Bookables/Events/Form/EventOrganizer.vue";
import EventCreateAttendees from "@/views/Bookables/Events/Form/Attendees.vue";
import EventCreateAgenda from "@/views/Bookables/Events/Form/Agenda.vue";
import EventCreateAttachments from "@/views/Bookables/Events/Form/Attachments.vue";
import EventCreateImages from "@/views/Bookables/Events/Form/Images.vue";
import SimpleEventCreator from "@/views/Bookables/Events/SimpleEventCreator.vue";
import Rooms from "@/views/Bookables/Rooms/Rooms.vue";
import Resources from "@/views/Bookables/Resources/Resources.vue";
import Locations from "@/views/Bookables/Locations/Locations";
import Tenants from "@/views/Management/Tenants";
import Users from "@/views/Management/TenantUsers.vue";
import Roles from "@/views/Management/Roles";
import store from "@/store/index";
import ToastService from "@/services/ToastService";
import Tickets from "@/views/Bookables/Tickets/Tickets";
import Bookings from "@/views/Bookings.vue";
import Settings from "@/views/Settings";
import EditBookable from "@/views/Bookables/EditBookable";
import ApiAuthService from "@/services/api/ApiAuthService";
import Coupons from "@/views/Coupons.vue";
import Instances from "@/views/Management/Instances.vue";
import InstanceUsers from "@/views/Management/InstanceUsers.vue";
import InstanceTenants from "@/views/Management/InstanceTenants.vue";

Vue.use(VueRouter);

function lazyLoad(view) {
  return () => import(`@/views/${view}.vue`);
}

const routes = [
  {
    path: "/",
    name: "home",
    redirect: "/login",
  },
  {
    path: "/admin/",
    name: "admin",
    redirect: "/admin/dashboard",
  },
  {
    path: "/admin/dashboard",
    name: "dashboard",
    component: Home,
    meta: {
      title: "Ihre Mandanten",
      requiresAuth: true,
      interfaceName: "dashboard",
      public: true,
    },
  },
  {
    path: "/admin/instanz",
    name: "instances",
    component: Instances,
    meta: {
      title: "Instanz verwalten",
      requiresAuth: true,
      interfaceName: "instance",
    },
  },
  {
    path: "/admin/instanz/mandanten",
    name: "instance-tenants",
    component: InstanceTenants,
    meta: {
      title: "Mandanten",
      requiresAuth: true,
      interfaceName: "instance",
    },
  },
  {
    path: "/admin/instanz/benutzer",
    name: "instance-users",
    component: InstanceUsers,
    meta: {
      title: "Benutzer",
      requiresAuth: true,
      interfaceName: "instance",
    },
  },
  {
    path: "/admin/mandanten",
    name: "tenant",
    component: Tenants,
    meta: {
      title: "Mandanten",
      requiresAuth: true,
      interfaceName: "tenants",
    },
  },
  {
    path: "/admin/benutzer",
    name: "user",
    component: Users,
    meta: {
      title: "Benutzer",
      requiresAuth: true,
      interfaceName: "users",
    },
  },
  {
    path: "/admin/rollen",
    name: "roles",
    component: Roles,
    meta: {
      title: "Rollen",
      requiresAuth: true,
      interfaceName: "roles",
    },
  },
  {
    path: "/admin/gutscheine",
    name: "coupons",
    component: Coupons,
    meta: {
      title: "Gutscheine",
      requiresAuth: true,
      interfaceName: "coupons",
    },
  },
  {
    path: "/admin/buchungen",
    name: "bookings",
    component: Bookings,
    meta: {
      title: "Buchungen",
      requiresAuth: true,
      interfaceName: "bookings",
    },
  },
  {
    path: "/admin/veranstaltungsorte",
    name: "event-locations",
    component: Locations,
    meta: {
      title: "Veranstaltungsorte",
      requiresAuth: true,
      interfaceName: "locations",
    },
  },
  {
    path: "/admin/veranstaltungsorte/edit",
    name: "location-edit",
    component: EditBookable,
    meta: {
      type: "event-location",
      title: "Raum bearbeiten",
      requiresAuth: true,
      interfaceName: "locations",
    },
  },
  {
    path: "/admin/veranstaltungsorte/create",
    name: "location-create",
    component: EditBookable,
    meta: {
      type: "event-location",
      title: "Raum anlegen",
      requiresAuth: true,
      interfaceName: "locations",
    },
  },
  {
    path: "/admin/raeume",
    name: "rooms",
    component: Rooms,
    meta: {
      title: "Räume",
      requiresAuth: true,
      interfaceName: "rooms",
    },
  },
  {
    path: "/admin/raeume/edit",
    name: "room-edit",
    component: EditBookable,
    meta: {
      type: "room",
      title: "Raum Bearbeiten",
      requiresAuth: true,
      interfaceName: "rooms",
    },
  },
  {
    path: "/admin/raeume/create",
    name: "room-create",
    component: EditBookable,
    meta: {
      type: "room",
      title: "Raum anlegen",
      requiresAuth: true,
      interfaceName: "rooms",
    },
  },
  {
    path: "/admin/ressourcen",
    name: "resources",
    component: Resources,
    meta: {
      type: "resource",
      title: "Ressourcen",
      requiresAuth: true,
      interfaceName: "resources",
    },
  },
  {
    path: "/admin/resources/edit",
    name: "resource-edit",
    component: EditBookable,
    meta: {
      type: "resource",
      title: "Raum bearbeiten",
      requiresAuth: true,
      interfaceName: "resources",
    },
  },
  {
    path: "/admin/resources/create",
    name: "resource-create",
    component: EditBookable,
    meta: {
      type: "resource",
      title: "Raum anlegen",
      requiresAuth: true,
      interfaceName: "resources",
    },
  },
  {
    path: "/admin/tickets",
    name: "tickets",
    component: Tickets,
    meta: {
      title: "Tickets",
      requiresAuth: true,
      interfaceName: "tickets",
    },
  },
  {
    path: "/admin/tickets/edit",
    name: "ticket-edit",
    component: EditBookable,
    meta: {
      type: "ticket",
      title: "Ticket bearbeiten",
      requiresAuth: true,
      interfaceName: "tickets",
    },
  },
  {
    path: "/admin/tickets/create",
    name: "ticket-create",
    component: EditBookable,
    meta: {
      type: "ticket",
      title: "Ticket anlegen",
      requiresAuth: true,
      interfaceName: "tickets",
    },
  },
  {
    path: "/admin/veranstaltungen",
    name: "events",
    component: Events,
    meta: {
      title: "Veranstaltungen",
      requiresAuth: true,
      interfaceName: "events",
    },
  },
  {
    path: "/admin/veranstaltungen/edit",
    name: "event-edit",
    component: EventCreate,
    meta: {
      title: "Veranstaltung bearbeiten",
      requiresAuth: true,
      interfaceName: "events",
    },
  },
  {
    path: "/admin/veranstaltungen/create",
    name: "event-create",
    component: EventCreate,
    meta: {
      title: "Veranstaltung erstellen",
      requiresAuth: true,
      interfaceName: "events",
    },
    children: [
      {
        path: "simple-event",
        name: "simple-event-creator",
        component: SimpleEventCreator,
        meta: {
          title: "Veranstaltung erstellen",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "information",
        name: "event-create-information",
        component: EventCreateInformation,
        meta: {
          title: "Information",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "veranstaltungsort",
        name: "event-create-event-location",
        component: EventCreateEventLocation,
        meta: {
          title: "Veranstaltungsort",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "veranstalter",
        name: "event-create-organizer",
        component: EventCreateEventOrganizer,
        meta: {
          title: "Veranstalter",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "teilnehmer",
        name: "event-create-attendees",
        component: EventCreateAttendees,
        meta: {
          title: "Teilnehmer",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "agenda",
        name: "event-create-agenda",
        component: EventCreateAgenda,
        meta: {
          title: "Agenda",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "anhaenge",
        name: "event-create-attachments",
        component: EventCreateAttachments,
        meta: {
          title: "Anhänge",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
      {
        path: "bilder",
        name: "event-create-images",
        component: EventCreateImages,
        meta: {
          title: "Bildergalerie",
          requiresAuth: true,
          interfaceName: "events",
        },
      },
    ],
  },
  {
    path: "/admin/einstellungen",
    name: "settings",
    component: Settings,
    meta: {
      title: "Einstellungen",
      requiresAuth: true,
      interfaceName: "settings",
      public: true,
    },
  },
  {
    path: "/login",
    name: "login",
    component: lazyLoad("Auth/Login"),
    meta: {
      title: "Login",
      requiresAuth: false,
    },
  },
  {
    path: "/login/sso",
    name: "sso",
    component: lazyLoad("Auth/SsoLogin"),
    props: true,
    meta: {
      title: "SSO",
      requiresAuth: false,
    },
  },
  {
    path: "/registrieren",
    name: "register",
    component: lazyLoad("Auth/Register"),
    meta: {
      title: "Registrieren",
      requiresAuth: false,
    },
  },
  {
    path: "/checkout",
    name: "checkout",
    component: lazyLoad("BundleCheckout/CheckoutMain"),
    meta: {
      title: "Checkout",
      requiresAuth: false,
    },
  },
  {
    path: "/checkout/status",
    name: "checkout-status",
    component: lazyLoad("MultiCheckout/CheckoutStatus"),
    meta: {
      title: "Checkout Status",
      requiresAuth: false,
    },
  },
  {
    path: "/willkommen",
    name: "welcome",
    component: lazyLoad("Auth/Welcome"),
    meta: {
      title: "Willkommen",
      requiresAuth: false,
    },
    props: true,
  },
  {
    path: "/email/verify",
    name: "email-verify",
    component: lazyLoad("Auth/EmailVerify"),
    meta: {
      title: "E-Mail bestätigen",
      requiresAuth: false,
    },
  },
  {
    path: "/password/reset",
    name: "password-reset",
    component: lazyLoad("Auth/PasswordReset"),
    meta: {
      title: "Passwort zurücksetzen",
      requiresAuth: false,
    },
  },
  {
    path: "/password/confirmed",
    name: "password-confirmed",
    component: lazyLoad("Auth/PasswordConfirmed"),
    meta: {
      title: "Passwort zurückgesetzt",
      requiresAuth: false,
    },
  },
  {
    path: "/payment/redirection",
    name: "payment-redirection",
    component: lazyLoad("MultiCheckout/PaymentRedirection"),
    meta: {
      title: "Zahlung wird bearbeitet",
      requiresAuth: false,
    },
  },
  {
    path: "/booking/status/:tenantId",
    name: "booking-status",
    component: lazyLoad("BookingStatus"),
    meta: {
      title: "Buchungsstatus",
      requiresAuth: false,
    },
    props: true,
  },
  {
    path: "/booking/request-reject/:tenantId",
    name: "booking-request-reject",
    component: lazyLoad("RequestRejectBooking"),
    meta: {
      title: "Buchung stornieren",
      requiresAuth: false,
    },
    props: true,
  },
  {
    path: "/booking/verify-reject/:tenantId",
    name: "booking-request-reject",
    component: lazyLoad("VerifyRejectBooking"),
    meta: {
      title: "Stornierung bestätigen",
      requiresAuth: false,
    },
    props: true,
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

function isLoggedIn() {
  return store.getters["user/isLoggedIn"];
}

function isAuthorized(ifce) {
  return store.getters["user/isAuthorized"](ifce);
}

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const hasSession = await ApiAuthService.me()
      .then((response) => {
        store.dispatch("user/update", response.data);
        return true;
      })
      .catch(() => {
        return false;
      });

    if (!hasSession) {
      next({ name: "home" });
      await store.dispatch(
        "toasts/add",
        ToastService.createToast("session.expired", "error")
      );
      return;
    }
  }

  if (!!isAuthorized(to.meta.interfaceName) && !!to.meta.isPublic) {
    next({ name: "home" });
  } else {
    next();
  }

  if (to.meta.requiresAuth && !isLoggedIn()) {
    next({ name: "login", query: { redirectUrl: to.name } });
    await store.dispatch(
      "toasts/add",
      ToastService.createToast("errors.unauthenticated", "error")
    );
  } else {
    next();
  }
});
router.afterEach((to) => {
  Vue.nextTick(() => {
    document.title =
      process.env.VUE_APP_NAME + ": " + to.meta.title ||
      process.env.VUE_APP_NAME;
  });
});

export default router;

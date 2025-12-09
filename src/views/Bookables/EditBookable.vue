<template>
  <v-container v-if="!isLoading" style="max-width: 1800px">
    <div class="d-flex">
      <v-btn icon class="ms-n14 me-5 accent" @click="goBack">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <h2 class="mb-4">
        Buchungsobjekt {{ this.mode === "create" ? "erstellen" : "bearbeiten" }}
      </h2>
    </div>

    <div class="d-flex align-center mb-2">
      <div>
        <div class="text--secondary">
          ID: {{ bookable?.id }} • {{ bookable?.title || "Unbenannt" }}
        </div>
      </div>
      <v-spacer />
      <v-chip
        v-if="hasUnsavedChanges"
        color="warning"
        text-color="black"
        small
        class="mr-2"
        label
      >
        Ungespeicherte Änderungen
      </v-chip>
    </div>

    <v-row>
      <v-col class="col-12 col-md-3">
        <v-tabs
          v-model="activeTab"
          color="primary"
          show-arrows
          :vertical="$vuetify.breakpoint.mdAndUp"
        >
          <v-tab
            v-for="t in tabs"
            :key="t.key"
            class="d-flex justify-start"
            style="text-transform: none"
          >
            <v-icon left small>{{ t.icon }}</v-icon>
            {{ t.label }}
          </v-tab>
        </v-tabs>

        <BookableVisibility
          :allow-public="allowPublic"
          :bookable="bookable"
          @update:bookable="onUpdateBookable"
        />
      </v-col>

      <v-col class="col-12 col-md-9">
        <keep-alive>
          <component
            :is="currentComponent"
            :tenant-id="tenantId"
            :bookable="bookable"
            :events="events"
            :available-holidays="availableHolidays"
            :available-users="availableUsers"
            :available-roles="availableRoles"
            @update:bookable="onUpdateBookable"
            ref="activeChild"
          />
        </keep-alive>
      </v-col>
    </v-row>

    <SaveBar
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      @submit="createOrUpdate"
      @cancel="goBack"
      show-cancel
      :disabled="isLoading || !validRoot || hasUnsavedChanges"
      :in-progress="isLoading"
    />
  </v-container>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { mapActions, mapGetters } from "vuex";
import _ from "lodash";
import ApiEventService from "@/services/api/ApiEventService";
import ApiUsersService from "@/services/api/ApiUsersService";
import BookableTimeDependantAttributes from "@/components/Bookable/BookableTimeDependantAttributes";
import SortableList from "@/components/SortableList";
import Tiptap from "@/components/Tiptap";
import ApiRolesService from "@/services/api/ApiRolesService";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import BookableLockingAttributes from "@/components/Bookable/BookableLockingAttributes";
import BookableCheckoutBookables from "@/components/Bookable/BookableCheckoutBookables.vue";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import BookableGeneralAttributes from "@/components/Bookable/BookableGeneralAttributes.vue";
import BookablePricesAttributes from "@/components/Bookable/BookablePricesAttributes.vue";
import BookablePermissionsAttributes from "@/components/Bookable/BookablePermissionsAttributes.vue";
import BookableSeriesAttributes from "@/components/Bookable/BookableSeriesAttributes.vue";
import BookableRelationsAttributes from "@/components/Bookable/BookableRelationsAttributes.vue";
import BookableAttachmentsAttributes from "@/components/Bookable/BookableAttachmentsAttributes.vue";
import BookableAdditionalAttributes from "@/components/Bookable/BookableAdditionalAttributes.vue";
import SaveBar from "@/components/commons/SaveBar.vue";
import BookableVisibility from "@/components/Bookable/BookableVisibility.vue";

export default {
  name: "EditBookable",
  components: {
    BookableVisibility,
    SaveBar,
    BookableCheckoutBookables,
    ChooseFile,
    SortableList,
    BookableTimeDependantAttributes,
    Tiptap,
    BookableLockingAttributes,
    BookableGeneralAttributes,
    BookablePricesAttributes,
    BookablePermissionsAttributes,
    BookableSeriesAttributes,
    BookableRelationsAttributes,
    BookableAttachmentsAttributes,
    BookableAdditionalAttributes,
  },

  data() {
    return {
      bookable: {},
      validRoot: true,
      originalSnapshot: null,
      events: [],
      tabs: [
        {
          key: "general",
          label: "Allgemein",
          icon: "mdi-information-outline",
          comp: BookableGeneralAttributes,
        },
        {
          key: "availability",
          label: "Verfügbarkeit",
          icon: "mdi-calendar-clock",
          comp: BookableTimeDependantAttributes,
        },
        {
          key: "prices",
          label: "Preise",
          icon: "mdi-currency-eur",
          comp: BookablePricesAttributes,
        },
        {
          key: "locking",
          label: "Schließsysteme",
          icon: "mdi-lock-open-outline",
          comp: BookableLockingAttributes,
        },
        {
          key: "permissions",
          label: "Berechtigungen",
          icon: "mdi-lock",
          comp: BookablePermissionsAttributes,
        },
        {
          key: "series",
          label: "Serienbuchungen",
          icon: "mdi-repeat",
          comp: BookableSeriesAttributes,
        },
        {
          key: "relations",
          label: "Abhängige Objekte",
          icon: "mdi-link-variant",
          comp: BookableRelationsAttributes,
        },
        {
          key: "attachments",
          label: "Anhänge",
          icon: "mdi-paperclip",
          comp: BookableAttachmentsAttributes,
        },
        {
          key: "additional",
          label: "Zusätzliches",
          icon: "mdi-dots-horizontal",
          comp: BookableAdditionalAttributes,
        },
      ],
      activeTab: 0,
      allowPublic: true,
      bookables: [],
      availableUsers: [],
      availableRoles: [],
      availableHolidays: [],
      selectedState: null,
      states: [
        { text: "Bundesweit", value: null },
        { text: "Brandenburg", value: "BB" },
        { text: "Berlin", value: "BE" },
        { text: "Baden-Württemberg", value: "BW" },
        { text: "Bayern", value: "BY" },
        { text: "Hansestadt Bremen", value: "HB" },
        { text: "Hessen", value: "HE" },
        { text: "Hansestadt Hamburg", value: "HH" },
        { text: "Mecklenburg Vorpommern", value: "MV" },
        { text: "Niedersachsen", value: "NI" },
        { text: "Nordrhein-Westfalen", value: "NW" },
        { text: "Rheinland-Pfalz", value: "RP" },
        { text: "Schleswig-Holstein", value: "SH" },
        { text: "Saarland", value: "SL" },
        { text: "Sachsen", value: "SN" },
        { text: "Sachsen-Anhalt", value: "ST" },
        { text: "Thüringen", value: "TH" },
      ],
    };
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    onUpdateBookable(next) {
      this.bookable = { ...this.bookable, ...next };
    },
    createOrUpdate() {
      this.startLoading("crud-bookable");
      ApiBookablesService.createOrUpdateBookable(this.bookable)
        .then(() => {
          this.originalSnapshot = JSON.stringify(this.bookable);
        })
        .finally(() => {
          this.stopLoading("crud-bookable");
        });
    },
    fetchBookable(bookableId) {
      this.startLoading("fetch-bookable");
      ApiBookablesService.getBookable(bookableId)
        .then((response) => {
          this.bookable = response.data;

          this.$nextTick(() => {
            this.originalSnapshot = JSON.stringify(this.bookable);
          });
        })
        .finally(() => {
          this.stopLoading("fetch-bookable");
        });
    },

    async fetchEvents() {
      await ApiEventService.getEvents().then((result) => {
        this.events = result?.data;
      });
    },

    async fetchBookables() {
      await ApiBookablesService.getBookables().then((result) => {
        this.bookables = result?.data;
      });
    },

    async fetchUsers() {
      await ApiUsersService.getUserIds().then((result) => {
        this.availableUsers = result?.data;
      });
    },

    async fetchRoles() {
      await ApiRolesService.getTenantRoles(true).then((result) => {
        this.availableRoles = result?.data;
      });
    },

    initialize() {
      const bookableId = this.$route.query.id;
      if (!_.isNil(bookableId)) {
        this.fetchBookable(bookableId);
        this.fetchBookables();
      } else {
        this.fetchBookables();
      }
      this.fetchEvents();
      this.fetchUsers();
      this.fetchRoles();
    },

    goBack() {
      if (_.isNil(this.$route.query.fromRoute)) {
        this.$router.push({ name: "dashboard" });
      } else {
        this.$router.push({ name: this.$route.query.fromRoute });
      }
    },

    async allowSetPublic() {
      const bookableCountCheck =
        await ApiBookablesService.publicBookableCountCheck();
      this.allowPublic = bookableCountCheck || this.isPublic;
    },
    async fetchHolidays() {
      const response = await ApiHolidaysService.getHolidays(
        "DE",
        this.selectedState
      );
      this.availableHolidays = response.data
        .map((holiday) =>
          holiday.type === "public"
            ? {
                name: holiday.name,
                countryCode: "DE",
                stateCode: this.selectedState,
              }
            : null
        )
        .filter(Boolean);
    },
  },
  computed: {
    ...mapGetters({
      isLoading: "loading/isLoading",
      currentTenantId: "tenants/currentTenantId",
    }),
    hasUnsavedChanges() {
      return this.originalSnapshot !== JSON.stringify(this.bookable);
    },
    currentComponent() {
      return this.tabs[this.activeTab]?.comp || null;
    },
    tenantId: {
      get() {
        if (this.mode === "create") {
          return this.currentTenantId;
        } else {
          return this.$store.state.bookables.form.tenantId;
        }
      },
      set(value) {
        this.updateValue({ field: "tenantId", value: value });
      },
    },
    mode: function () {
      return this.bookable?.id ? "edit" : "create";
    },
  },

  mounted() {
    this.initialize();
    this.allowSetPublic();
    this.setUseGraduatedPrices();
    this.fetchHolidays();
  },
};
</script>

<style scoped>
.add-time-period[disabled] {
  opacity: 0.6;
}
.panel {
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.2);
}
.panel-header {
  padding: 13px 13px 13px 13px;
}
</style>

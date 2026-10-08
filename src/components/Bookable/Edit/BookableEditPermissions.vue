<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { tenantUserOptions } from "@/utils/tenantUsers";
import UserRoleSelector from "@/components/commons/UserRoleSelector.vue";
import BookingDiscountEditor from "@/components/Bookable/Edit/BookingDiscountEditor.vue";
import { mapGetters } from "vuex";
import bookableEditing from "@/mixins/bookableEditing";

/**
 * What is left of the Berechtigungen tab once Serienbuchung and Stornierung
 * became areas of their own: Anmeldepflicht, Individuelle Berechtigungen and
 * Preisrabatte, until „Wer darf buchen?“ takes their place. Drawn in the tab
 * without a frame (`BOOKABLE_EDIT_TABS`); its cards are its own.
 */
export default {
  name: "BookableEditPermissions",
  components: { BookingDiscountEditor, UserRoleSelector, BaseSection },
  mixins: [bookableEditing],
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      availableUsers: [],
      availableRoles: [],
    };
  },
  computed: {
    ...mapGetters({
      currentTenantId: "tenants/currentTenantId",
    }),
    tenantId() {
      return this.model.tenantId || this.currentTenantId;
    },
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    availableUserIds() {
      return this.availableUsers.map((user) => user.userId);
    },
  },
  watch: {
    tenantId() {
      this.fetchUsers();
    },
  },
  methods: {
    setDiscounts(kind, items) {
      this.$emit("update:bookable", {
        bookingDiscounts: { ...this.model.bookingDiscounts, [kind]: items },
      });
    },
    removePermittedUser(item) {
      this.model.permittedUsers.splice(
        this.model.permittedUsers.indexOf(item),
        1
      );
    },
    removePermittedRole(item) {
      this.model.permittedRoles.splice(
        this.model.permittedRoles.indexOf(item),
        1
      );
    },
    async fetchRoles() {
      await ApiRolesService.getTenantRoles(true).then((result) => {
        this.availableRoles = result?.data;
      });
    },
    async fetchUsers() {
      if (!this.tenantId) {
        this.availableUsers = [];
        return;
      }

      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);

        this.availableUsers = tenantUserOptions(response).map((user) => ({
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.label,
          hasName: !!user.name,
        }));
      } catch (error) {
        console.error("Error fetching tenant users:", error);
        this.availableUsers = [];
      }
    },
  },
  mounted() {
    this.fetchRoles();
    this.fetchUsers();
  },
};
</script>

<template>
  <div>
    <v-card
      id="be-section-permissions-login"
      class="mb-6 section-card"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-login-variant</v-icon>
        <span class="text-h6 font-weight-bold">Anmeldepflicht</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-switch
          dense
          label="Login erforderlich zum Buchen"
          hide-details
          v-model="model.requiresLogin"
        ></v-switch>
        <p class="mb-0 mt-3 text-caption" style="max-width: 700px">
          Wenn aktiviert, müssen Benutzer angemeldet sein, um dieses
          Buchungsobjekt buchen zu können.
        </p>
      </v-card-text>
    </v-card>

    <v-card
      id="be-section-permissions-access"
      class="mb-6 section-card"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-account-lock-outline</v-icon>
        <span class="text-h6 font-weight-bold"
          >Individuelle Berechtigungen</span
        >
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <UserRoleSelector
          :users="model.permittedUsers"
          :roles="model.permittedRoles"
          :available-users="availableUserIds"
          :available-roles-prop="availableRoles"
          :fetch-roles-on-mount="false"
          @update:users="model.permittedUsers = $event"
          @update:roles="model.permittedRoles = $event"
          users-label="Verfügbar für Benutzer"
          roles-label="Verfügbar für Rollen"
          users-hint="Berechtigen Sie <strong>bestimmte Benutzer</strong>, dieses Objekt zu sehen."
          roles-hint="Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses Objekt zu sehen."
        />
      </v-card-text>
    </v-card>

    <div
      v-if="expertOptionShown('bookingDiscounts')"
      id="be-section-permissions-discounts"
    >
      <BaseSection title="Preisrabatte" icon="mdi-ticket-percent-outline" />

      <p class="mb-4 text-caption" style="max-width: 700px">
        Legen Sie einen prozentualen Preisnachlass (0–100&nbsp;%) pro Benutzer
        oder Rolle fest. 100&nbsp;% entspricht einer kostenfreien Buchung.
      </p>

      <BookingDiscountEditor
        v-if="model.bookingDiscounts"
        :items="model.bookingDiscounts.users"
        @update:items="setDiscounts('users', $event)"
        type="user"
        :available-users="availableUsers"
        label="Rabatt für Benutzer"
        hint="Gewähren Sie <strong>bestimmten Benutzern</strong> einen Preisnachlass auf dieses Buchungsobjekt."
      />

      <BookingDiscountEditor
        v-if="model.bookingDiscounts"
        :items="model.bookingDiscounts.roles"
        @update:items="setDiscounts('roles', $event)"
        type="role"
        :available-roles="availableRoles"
        label="Rabatt für Rollen"
        hint="Gewähren Sie <strong>allen Benutzern einer Rolle</strong> einen Preisnachlass auf dieses Buchungsobjekt."
      />
    </div>
  </div>
</template>

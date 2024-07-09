<template>
  <div class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-15">
      <v-card-text class="px-0">
        <v-img src="@/assets/app-logo.png" max-width="200" class="mx-auto mt-4" />
        <h2 class="mt-8 mb-2">Anmeldung</h2>
        <v-row
          v-if="step !== 'tenant'"
          no-gutters
          justify="center"
          class="mx-12"
        >
        </v-row>
        <v-stepper v-model="step" elevation="0" class="mx-auto" alt-labels>
          <v-stepper-items>
            <v-stepper-content step="tenant">
              <SelectTenant
                v-model="tenant"
                :tenants="tenants"
                @next="nextStep"
              />
            </v-stepper-content>
            <v-stepper-content step="login">
              <LoginCard
                :tenant="tenant"
                :sso-active="ssoActive"
                @next="toStep"
                @toStep="toStep"
              />
            </v-stepper-content>
          </v-stepper-items>
        </v-stepper>
        <ContactInformation class="px-10" />
      </v-card-text>
    </v-card>
    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <router-link to="/datenschutz">Datenschutz</router-link>
        |
        <router-link to="/nutzungsbedingungen">Nutzungsbedingungen</router-link>
      </v-card-text>
    </v-card>
  </div>
</template>
<script>
import LoginCard from "@/components/Auth/LoginCard.vue";
import SelectTenant from "@/components/Auth/SelectTenant.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ContactInformation from "@/components/ContactInformation.vue";
import sso from "@/views/Auth/Sso.vue";

export default {
  computed: {
    sso() {
      return sso;
    },
  },
  components: {
    ContactInformation,
    LoginCard,
    SelectTenant,
  },
  data() {
    return {
      step: "tenant",
      tenants: [],
      tenant: null,
      possibleSteps: ["tenant", "login"],
      ssoActive: false,
    };
  },

  mounted() {
    this.fetchTenants();
    this.getStepFromUrl();
  },

  watch: {
    tenant: {
      handler: async function (tenant) {
        if (!tenant) {
          return;
        }
        const response = await ApiTenantService.tenantSsoConfig(tenant?.id);
        this.ssoActive = !!response.active;
      },
      immediate: true,
    },
  },

  methods: {
    getStepFromUrl() {
      const step = this.$route.query.step;
      if (this.possibleSteps.includes(step)) {
        this.step = step;
        this.$router.replace({ query: {} });
      }
    },

    fetchTenants() {
      ApiTenantService.getTenants(true).then((response) => {
        this.tenants = response.data;
      });
    },
    nextStep() {
      this.step = this.possibleSteps[this.possibleSteps.indexOf(this.step) + 1];
    },
    toStep(step) {
      this.step = step;
    },
    prevStep() {
      this.step = this.possibleSteps[this.possibleSteps.indexOf(this.step) - 1];
    },
    changeTenant() {
      this.step = "tenant";
    },
  },
};
</script>

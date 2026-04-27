<template>
  <v-container class="text-center">
    <v-card outlined max-width="500" class="mx-auto mt-sm-10">
      <v-card-text>
        <v-img :src="appLogo" max-width="200" class="mx-auto mt-4" />

        <template v-if="cardMethod">
          <h2 class="mt-8 mb-2">{{ cardMethod.label }}</h2>
          <p v-if="cardMethod.description" class="subtitle-2 mb-6">
            {{ cardMethod.description }}
          </p>
        </template>

        <template v-else-if="!loading">
          <v-alert type="error" text dense class="mt-8">
            Anmeldemethode nicht gefunden oder deaktiviert.
          </v-alert>
        </template>
      </v-card-text>

      <CardLoginCard
        v-if="cardMethod"
        :card-method="cardMethod"
        @success="onSuccess"
      />

      <v-card-text v-if="loading" class="text-center py-10">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>

      <v-card-text class="text-center">
        <ContactInformation class="px-6" />
      </v-card-text>
    </v-card>

    <v-card elevation="0" max-width="500" class="mx-auto mt-2">
      <v-card-text class="text-right pa-0">
        <router-link to="/datenschutz">Datenschutz</router-link>
        |
        <router-link to="/nutzungsbedingungen">
          Nutzungsbedingungen
        </router-link>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ContactInformation from "@/components/ContactInformation.vue";
import CardLoginCard from "@/components/Auth/CardLoginCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  name: "CardLogin",
  components: { ContactInformation, CardLoginCard },

  props: {
    appId: { type: String, required: true },
  },

  data() {
    return {
      cardMethod: null,
      loading: true,
    };
  },

  computed: {
    ...mapGetters({
      nextUrl: "authStore/nextUrl",
    }),
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
    },
  },

  methods: {
    ...mapActions({
      updateNextUrl: "authStore/setNextUrl",
    }),

    async fetchCardMethod() {
      this.loading = true;
      try {
        const methods = await ApiAuthService.getCardAuthMethods();
        this.cardMethod = methods.find((m) => m.id === this.appId) || null;
      } catch {
        this.cardMethod = null;
      } finally {
        this.loading = false;
      }
    },

    onSuccess() {
      if (this.nextUrl) {
        this.$router.push(this.nextUrl);
        this.updateNextUrl(null);
      } else {
        this.$router.push({ name: "dashboard" });
      }
    },
  },

  async mounted() {
    await this.fetchCardMethod();
  },
};
</script>

<template>
  <AuthPage
    :title="cardMethod ? cardMethod.label : 'Mit Karte anmelden'"
    icon="mdi-card-account-details-outline"
  >
    <div v-if="loading" class="scb-form text-center">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <CardLoginCard
      v-else-if="cardMethod"
      :card-method="cardMethod"
      @success="onSuccess"
    />

    <div v-else class="scb-form">
      <v-alert type="error" text dense class="mb-0">
        Anmeldemethode nicht gefunden oder deaktiviert.
      </v-alert>
      <p class="scb-form__switch mt-4 mb-0">
        <router-link :to="{ name: 'login' }" class="scb-form__link">
          Zurück zur Anmeldung
        </router-link>
      </p>
    </div>
  </AuthPage>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import AuthPage from "@/components/Auth/AuthPage.vue";
import CardLoginCard from "@/components/Auth/CardLoginCard.vue";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  name: "CardLogin",
  components: { AuthPage, CardLoginCard },

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

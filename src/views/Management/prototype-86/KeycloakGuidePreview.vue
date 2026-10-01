<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86): the tab "Authentifizierung" with a
       stub instance, to look at the variants without a backend. The real
       place is /instance?tab=sso&variant=A|B|C. Never in production. -->
  <v-container style="max-width: 1100px" class="py-8">
    <div class="text-caption mb-4" style="color: #ff00aa">
      Vorschau ohne Backend, Stub-Instanz. Echter Ort: Instanz verwalten →
      Single Sign-On.
    </div>
    <v-row>
      <v-col cols="12" md="auto">
        <v-tabs v-model="tab" vertical color="primary">
          <v-tab class="justify-start" style="text-transform: none">
            <v-icon left small>mdi-shield-lock</v-icon>Single Sign-On
          </v-tab>
          <v-tab class="justify-start" style="text-transform: none">
            <v-icon left small>mdi-card-account-details</v-icon>Karten
          </v-tab>
        </v-tabs>
      </v-col>
      <v-col cols="12" md="9">
        <InstanceEditAuth
          v-if="tab === 0"
          :instance="instance"
          :has-unsaved-changes="false"
          @update:instance="instance = { ...instance, ...$event }"
        />
        <InstanceEditCardsPrototype
          v-else
          :instance="instance"
          @update:instance="instance = { ...instance, ...$event }"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import InstanceEditAuth from "@/components/Instance/Edit/InstanceEditAuth.vue";
import InstanceEditCardsPrototype from "@/components/Instance/Edit/prototype-86/InstanceEditCardsPrototype.vue";

export default {
  name: "KeycloakGuidePreview",
  components: { InstanceEditAuth, InstanceEditCardsPrototype },
  data() {
    return {
      tab: 0,
      instance: {
        name: "Beispielstadt",
        applications: [
          {
            id: "keycloak",
            type: "auth",
            active: true,
            serverUrl: "https://sso.beispielstadt.de",
            realm: "biletado",
            publicClient: "biletado-web",
            privateClient: "biletado-api",
            privateClientSecret: "s3cr3t",
            roleMapping: {
              active: true,
              roles: [
                { tenantId: null, keycloakRole: "biletado-admin", tenantRoleId: null },
              ],
            },
          },
        ],
      },
    };
  },
};
</script>

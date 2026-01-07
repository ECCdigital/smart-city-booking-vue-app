<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card class="">
      <v-card-title class="py-4 px-6">
        <span class="text-h5">
          <v-icon left>mdi-account-plus</v-icon> Neue Benutzer hinzufügen</span
        >
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pt-6 pb-2 px-8">
        <v-tabs v-model="model" fixed-tabs>
          <v-tab
            ><v-icon class="mr-2">mdi-email</v-icon> Per E-Mail einladen</v-tab
          >
          <v-tab><v-icon class="mr-2">mdi-link</v-icon> Einladungslink </v-tab>
        </v-tabs>

        <v-tabs-items v-model="model">
          <v-tab-item class="mt-4 mx-2">
            <div class="text-body-1">
              Lade Benutzer zu diesem Mandanten ein.
            </div>
            <div class="text-caption">
              Trage die E-Mail-Adressen der Personen ein, die du einladen
              möchtest. Du kannst mehrere E-Mail-Adressen durch Leerzeichen,
              Kommas oder Semikolons trennen.
            </div>
            <div class="mt-2">
              <v-row no-gutters>
                <v-col
                  class="col-12 col-md-9 d-flex align-center justify-center"
                >
                  <v-text-field
                    dense
                    label="E-Mail-Adressen"
                    outlined
                    hide-details
                    v-model="emailInput"
                    @keyup.enter="parseEmails"
                  ></v-text-field>
                </v-col>
                <v-col class="d-flex align-center justify-center">
                  <v-btn
                    :disabled="!emailInput"
                    @click="parseEmails"
                    color="primary"
                    >übernehmen</v-btn
                  >
                </v-col>
              </v-row>
            </div>
            <div v-if="parsedEmails.length > 0" class="text-subtitle-2 mt-2">
              Einladung senden an
            </div>
            <div v-if="parsedEmails.length > 0">
              <v-list>
                <v-list-item
                  v-for="(email, index) in parsedEmails"
                  :key="index"
                >
                  <v-list-item-content>
                    <v-list-item-title>
                      <div
                        class="d-flex"
                        :class="email.exists ? 'text--disabled' : ''"
                      >
                        {{ email.email }}
                      </div>
                      <div v-if="email.exists" class="text-caption">
                        <span class="text--disabled"
                          >Benutzer existiert bereits</span
                        >
                      </div>
                    </v-list-item-title>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn icon @click="removeEmail(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
              </v-list>

              <v-divider class="my-4"></v-divider>

              <div>
                <div class="text-subtitle-2 mb-2">
                  Verifikationsprozess (optional)
                </div>
                <v-alert
                  type="info"
                  dense
                  elevation="2"
                  border="left"
                  colored-border
                >
                  Du kannst optional einen Verifikationsprozess auswählen, die
                  eingeladene Benutzer bestehen müssen, bevor sie aktiv im
                  Mandanten arbeiten können. Erst dann werden die zugehörigen
                  Rollen automatisch zugewiesen. Wenn kein Verifikationsprozess
                  definiert ist, werden Benutzer direkt nach Annahme der
                  Einladung hinzugefügt und erhalten sofort die ausgewählten
                  Rollen.
                </v-alert>
                <v-select
                  v-model="selectedChallenge"
                  :items="challenges"
                  item-text="label"
                  item-value="id"
                  label="Verifikationsprozess auswählen"
                  outlined
                  dense
                  clearable
                  :hint="'Optional – Rollen können auch direkt ohne Verifikationsprozess vergeben werden'"
                  persistent-hint
                >
                  <template v-slot:item="{ item, attrs, on }">
                    <v-list-item v-bind="attrs" v-on="on">
                      <v-list-item-content>
                        <v-list-item-title class="d-flex align-center">
                          <v-icon
                            left
                            small
                            :color="
                              item.key === 'manualApproval' ? 'blue' : 'green'
                            "
                          >
                            {{
                              item.key === "manualApproval"
                                ? "mdi-account-check-outline"
                                : "mdi-shield-check"
                            }}
                          </v-icon>
                          {{ item.label }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          Rollen:
                          {{ getRoleNames(item.rolesToAssign).join(", ") }}
                        </v-list-item-subtitle>
                      </v-list-item-content>
                    </v-list-item>
                  </template>
                </v-select>

                <div v-if="selectedChallenge" class="mt-2">
                  <span class="text-caption">
                    Diese Rollen werden durch den ausgewählten
                    Verifikationsprozess automatisch vergeben:
                  </span>
                  <v-chip
                    v-for="r in challengeRoles"
                    :key="r.id"
                    small
                    color="blue lighten-5"
                    class="ma-1"
                  >
                    <v-icon left x-small>mdi-shield-account</v-icon>
                    {{ r.name }}
                  </v-chip>
                </div>
              </div>

              <v-divider class="my-4"></v-divider>
              <div>
                <div class="text-subtitle-2 mb-2">
                  Zusätzliche Rollen vergeben (optional)
                </div>
                <v-select
                  v-model="selectedRoles"
                  :items="availableRoles"
                  item-text="name"
                  item-value="id"
                  label="Rollen auswählen"
                  multiple
                  chips
                  small-chips
                  outlined
                  dense
                  hint="Optional – Wählen Sie zusätzliche Rollen, die Benutzer erhalten sollen. Wenn keinen Verifikationsprozess ausgewählt ist, erhalten Benutzer diese Rollen direkt nach Annahme der Einladung."
                  persistent-hint
                ></v-select>
              </div>
            </div>

            <div class="d-flex align-end justify-end mt-4">
              <v-btn class="mr-4" outlined @click="closeDialog">
                Abbrechen
              </v-btn>
              <v-btn
                class=""
                color="primary"
                @click="inviteUsers"
                :disabled="validEmailCount === 0"
              >
                <v-icon left>mdi-send</v-icon>
                {{ validEmailCount }} Benutzer einladen
              </v-btn>
            </div>
          </v-tab-item>
          <v-tab-item class="mx-2">
            <div class="d-flex align-center justify-space-between mt-4">
              <div>
                <div class="text-body-1">
                  Verwalte die Einladungslinks für diesen Mandanten.
                </div>
                <div class="text-caption">
                  Erstelle Einladungslinks und teile sie, damit Benutzer dem
                  Mandanten beitreten können.
                </div>
              </div>

              <v-btn
                v-if="!createLinkMode"
                color="primary"
                @click="createLinkMode = true"
              >
                <v-icon left>mdi-link-plus</v-icon>
                Neuen Einladungslink erstellen
              </v-btn>
            </div>

            <v-divider class="my-4" />

            <div v-if="!createLinkMode">
              <span>
                <v-icon left>mdi-link-variant</v-icon>
                Bestehende Einladungslinks
              </span>
              <div
                v-if="invitationLinks.length === 0"
                class="text-center pa-4 grey--text"
              >
                <v-icon color="grey">mdi-link-off</v-icon>
                Keine Einladungslinks vorhanden
              </div>
              <v-list v-else dense>
                <v-list-item
                  v-for="(link, index) in invitationLinks"
                  :key="index"
                  :class="{
                    'text--disabled': expired(link) || maxUseReached(link),
                  }"
                >
                  <v-list-item-content>
                    <v-list-item-title class="d-flex align-center">
                      <span class="text-truncate">{{
                        combineTokenUrl(link.token)
                      }}</span>
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip
                        x-small
                        :color="expired(link) ? 'error' : 'success'"
                        class="mr-1"
                        v-if="link.expiresAt"
                      >
                        <v-icon x-small left>mdi-clock-outline</v-icon>
                        Läuft ab: {{ formatDate(link.expiresAt) }}
                      </v-chip>
                      <v-chip
                        x-small
                        :color="maxUseReached(link) ? 'error' : 'success'"
                        class="mr-1"
                      >
                        <v-icon x-small left>mdi-account-multiple</v-icon>
                        Nutzungen: {{ link.usedCount }} /
                        {{ link.maxUses ? link.maxUses : "∞" }}
                      </v-chip>
                      <v-chip
                        x-small
                        class="mr-1"
                        v-for="role in getLinkRoles(link)"
                        :key="role.id"
                        color="blue lighten-4"
                      >
                        <v-icon x-small left>mdi-shield-account</v-icon>
                        {{ role.name }}
                      </v-chip>
                      <v-chip
                        x-small
                        class="mr-1"
                        v-for="challenge in challenges.filter((c) =>
                          link.challenges.some(
                            (linkChallenge) => linkChallenge.id === c.id
                          )
                        )"
                        :key="challenge.id"
                        color="green lighten-4"
                      >
                        <v-icon x-small left>mdi-shield-check</v-icon>
                        {{ challenge.label }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <div>
                      <v-btn
                        icon
                        small
                        :disabled="expired(link) || maxUseReached(link)"
                        @click="copyInvitationLink(combineTokenUrl(link.token))"
                      >
                        <v-icon small>mdi-content-copy</v-icon>
                      </v-btn>

                      <v-btn icon small @click="onDeleteLink(link.token)">
                        <v-icon small>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </v-list-item-action>
                </v-list-item>
              </v-list>
              <div class="d-flex align-end justify-end mt-4">
                <v-btn class="mt-4" outlined @click="closeDialog">
                  Abbrechen
                </v-btn>
              </div>
            </div>

            <div v-else>
              <span class="d-flex align-center">
                <v-icon left>mdi-link-plus</v-icon> Neuen Einladungslink
                erstellen
              </span>

              <v-form ref="newLinkForm">
                <v-row class="mt-2">
                  <v-col cols="12" md="6">
                    <v-menu
                      v-model="expiryDateMenu"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      offset-y
                      min-width="290px"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                          v-model="newLink.expiresAt"
                          label="Ablaufdatum (optional)"
                          prepend-icon="mdi-calendar"
                          readonly
                          dense
                          v-bind="attrs"
                          v-on="on"
                          clearable
                          @click:clear="newLink.expiresAt = null"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="newLink.expiresAt"
                        @input="expiryDateMenu = false"
                        :min="tomorrow"
                      ></v-date-picker>
                    </v-menu>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="newLink.maxUses"
                      label="Maximale Nutzungen (optional)"
                      type="number"
                      min="1"
                      dense
                      prepend-icon="mdi-account-multiple"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col class="col-12">
                    <div>
                      <div class="text-subtitle-2 mb-2">
                        Verifikationsprozess (optional)
                      </div>
                      <v-alert
                        type="info"
                        dense
                        elevation="2"
                        border="left"
                        colored-border
                      >
                        Du kannst optional einen Verifikationsprozess auswählen,
                        die eingeladene Benutzer bestehen müssen, bevor sie
                        aktiv im Mandanten arbeiten können. Erst dann werden die
                        zugehörigen Rollen automatisch zugewiesen. Wenn kein
                        Verifikationsprozess definiert ist, werden Benutzer
                        direkt nach Annahme der Einladung hinzugefügt und
                        erhalten sofort die ausgewählten Rollen.
                      </v-alert>
                      <v-select
                        v-model="linkSelectedChallenge"
                        :items="challenges"
                        item-text="label"
                        item-value="id"
                        label="Verifikationsprozess auswählen"
                        outlined
                        dense
                        clearable
                        :hint="'Optional – Rollen können auch direkt ohne Verifikationsprozess vergeben werden'"
                        persistent-hint
                      >
                        <template v-slot:item="{ item, attrs, on }">
                          <v-list-item v-bind="attrs" v-on="on">
                            <v-list-item-content>
                              <v-list-item-title class="d-flex align-center">
                                <v-icon
                                  left
                                  small
                                  :color="
                                    item.key === 'manualApproval'
                                      ? 'blue'
                                      : 'green'
                                  "
                                >
                                  {{
                                    item.key === "manualApproval"
                                      ? "mdi-account-check-outline"
                                      : "mdi-shield-check"
                                  }}
                                </v-icon>
                                {{ item.label }}
                              </v-list-item-title>
                              <v-list-item-subtitle>
                                Rollen:
                                {{
                                  getRoleNames(item.rolesToAssign).join(", ")
                                }}
                              </v-list-item-subtitle>
                            </v-list-item-content>
                          </v-list-item>
                        </template>
                      </v-select>

                      <div v-if="linkSelectedChallenge" class="mt-2">
                        <span class="text-caption">
                          Diese Rollen werden durch den ausgewählten
                          Verifikationsprozess automatisch vergeben:
                        </span>
                        <v-chip
                          v-for="r in linkChallengeRoles"
                          :key="r.id"
                          small
                          color="blue lighten-5"
                          class="ma-1"
                        >
                          <v-icon left x-small>mdi-shield-account</v-icon>
                          {{ r.name }}
                        </v-chip>
                      </div>
                    </div>

                    <v-divider class="my-4"></v-divider>
                    <div>
                      <div class="text-subtitle-2 mb-2">
                        Zusätzliche Rollen vergeben (optional)
                      </div>
                      <v-select
                        v-model="linkSelectedRoles"
                        :items="linkAvailableRoles"
                        item-text="name"
                        item-value="id"
                        label="Rollen auswählen"
                        multiple
                        chips
                        small-chips
                        outlined
                        dense
                        hint="Optional – Wählen Sie zusätzliche Rollen, die Benutzer erhalten sollen. Wenn keinen Verifikationsprozess ausgewählt ist, erhalten Benutzer diese Rollen direkt nach Annahme der Einladung."
                        persistent-hint
                      ></v-select>
                    </div>
                  </v-col>
                </v-row>

                <div class="d-flex justify-end mt-4">
                  <v-btn class="mr-2" outlined @click="cancelCreateLink">
                    Abbrechen
                  </v-btn>
                  <v-btn
                    color="primary"
                    @click="createInvitationLink"
                    :loading="creatingLink"
                  >
                    <v-icon left>mdi-link-plus</v-icon>
                    Link erstellen
                  </v-btn>
                </div>
              </v-form>
            </div>
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>
    </v-card>
    <v-dialog v-model="openDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5"> Einladungslink löschen </v-card-title>
        <v-card-text>
          <div class="text-body-1">
            Möchten Sie diese Einladungslink wirklich löschen? Gelöschte Links
            können nicht wiederhergestellt werden.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn outlined @click="openDeleteDialog = false">Abbrechen</v-btn>
          <v-btn
            color="red"
            @click="
              $emit('deleteLink', linkToDelete);
              openDeleteDialog = false;
            "
          >
            Link löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
export default {
  name: "TenantInviteUserDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    roles: {
      type: Array,
      default: () => [],
    },
    members: {
      type: Array,
      default: () => [],
    },
    challenges: {
      type: Array,
      default: () => [],
    },
    invitationLinks: {
      type: Array,
      default: () => [],
    },
    tenantId: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      model: null,
      emailInput: "",
      parsedEmails: [],
      selectedRoles: [],
      selectedChallenge: null,
      linkSelectedRoles: [],
      linkSelectedChallenge: null,
      createLinkMode: false,
      expiryDateMenu: false,
      creatingLink: false,
      newLink: {
        expiresAt: null,
        maxUses: null,
        roles: [],
        challenges: [],
      },
      openDeleteDialog: false,
      linkToDelete: null,
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    validEmailCount() {
      return this.parsedEmails.filter((e) => !e.exists).length;
    },
    tomorrow() {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().substr(0, 10);
    },
    challengeRoles() {
      if (!this.selectedChallenge) return [];
      const challenge = this.challenges.find(
        (c) => c.id === this.selectedChallenge
      );
      return challenge
        ? this.roles.filter((r) => challenge.rolesToAssign?.includes(r.id))
        : [];
    },
    availableRoles() {
      const challengeRoleIds = this.challengeRoles.map((r) => r.id);
      return this.roles.filter((role) => !challengeRoleIds.includes(role.id));
    },
    linkChallengeRoles() {
      if (!this.linkSelectedChallenge) return [];
      const challenge = this.challenges.find(
        (c) => c.id === this.linkSelectedChallenge
      );
      return challenge
        ? this.roles.filter((r) => challenge.rolesToAssign?.includes(r.id))
        : [];
    },
    linkAvailableRoles() {
      const challengeRoleIds = this.linkChallengeRoles.map((r) => r.id);
      return this.roles.filter((role) => !challengeRoleIds.includes(role.id));
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    getLinkRoles(link) {
      const roles = link.roles || [];
      const challengeRoles = this.challenges
        .filter((c) => link.challenges.some((lc) => lc === c.id))
        ?.flatMap((c) => c.rolesToAssign || []);
      const allRoles = [...new Set([...roles, ...challengeRoles])];
      return this.roles.filter((role) => allRoles.includes(role.id));
    },

    formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },

    combineTokenUrl(token) {
      if (!this.tenantId) return "";
      const originUrl = window.location.origin.replace(/\/+$/, "");
      const basePath = (process.env.BASE_URL || "/").replace(/^\/+|\/+$/g, "");
      const safeBasePath = basePath ? `${basePath}/` : "";
      console.log('Origin URL:', originUrl);
      console.log('Base Path:', basePath);

      const url = new URL(`${originUrl}/${safeBasePath}auth/invitation/${this.tenantId}`);
      url.searchParams.set("token", token);
      console.log(' URL:', url);
      console.log('Generated Invitation URL:', url.toString());
      return url.toString();
    },

    async copyInvitationLink(link) {
      try {
        await navigator.clipboard.writeText(link);
        this.$emit("toast", {
          type: "success",
          message: "Link wurde in die Zwischenablage kopiert",
        });
      } catch (error) {
        this.$emit("toast", {
          type: "error",
          message: "Link konnte nicht kopiert werden",
        });
      }
    },
    async createInvitationLink() {
      this.creatingLink = true;
      try {
        const payload = {
          roles: this.linkSelectedRoles,
          expiresAt: this.newLink.expiresAt,
          maxUses: this.newLink.maxUses,
          challenges: this.linkSelectedChallenge
            ? [this.linkSelectedChallenge]
            : [],
        };

        this.$emit("createLink", payload);

        this.resetCreateLinkForm();
        this.createLinkMode = false;
      } catch (error) {
        this.$emit("toast", {
          type: "error",
          message: "Fehler beim Vorbereiten des Einladungslinks",
        });
      } finally {
        this.creatingLink = false;
      }
    },
    parseEmails() {
      if (!this.emailInput) {
        this.parsedEmails = [];
        return;
      }

      const emailStrings = this.emailInput
        .split(/[\s,;]+/)
        .filter((email) => email.trim() !== "");

      const existingEmails = this.parsedEmails.map((item) => item.email);

      emailStrings.forEach((email) => {
        if (/.+@.+\..+/.test(email) && !existingEmails?.includes(email)) {
          this.parsedEmails.push({
            email: email,
            roles: [],
            exists: this.members.some(
              (member) => member.userId?.toLowerCase() === email.toLowerCase()
            ),
          });
        }
      });
    },
    maxUseReached(link) {
      return link.maxUses && link.usedCount >= link.maxUses;
    },
    expired(link) {
      return link.expiresAt && new Date(link.expiresAt) < new Date();
    },

    removeEmail(index) {
      this.parsedEmails.splice(index, 1);
    },
    cancelCreateLink() {
      this.resetCreateLinkForm();
      this.createLinkMode = false;
    },
    resetCreateLinkForm() {
      this.newLink = {
        expiresAt: null,
        maxUses: null,
        roles: [],
        challenges: [],
      };
      this.linkSelectedChallenge = null;
      this.linkSelectedRoles = [];
    },
    inviteUsers() {
      if (this.validEmailCount === 0) return;
      this.parsedEmails = this.parsedEmails.map((e) => {
        if (!e.exists) {
          return {
            ...e,
            roles: this.selectedRoles,
            challenges: [this.selectedChallenge],
          };
        }
        return e;
      });
      this.$emit("invite", this.parsedEmails);
      this.emailInput = "";
      this.parsedEmails = [];
      this.selectedRoles = [];
      this.selectedChallenge = null;
      this.closeDialog();
    },
    onDeleteLink(linkToken) {
      this.linkToDelete = linkToken;
      this.openDeleteDialog = true;
    },
    getRoleNames(roleIds) {
      return roleIds?.map((id) => this.getRoleById(id)?.name || id);
    },

    getRoleById(roleId) {
      return this.roles.find((role) => role.id === roleId);
    },
  },
};
</script>

<style scoped></style>

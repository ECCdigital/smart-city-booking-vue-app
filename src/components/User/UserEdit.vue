<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-card>
        <v-card-title class="mx-3">
          <span class="text-h5">Benutzer bearbeiten</span>
        </v-card-title>
        <v-divider class="mx-9 mb-5" />
        <v-card-text>
          <v-container>
            <v-row>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="ID"
                  readonly
                  disabled
                  v-model="selectedUser.id"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Vorname"
                  required
                  v-model="selectedUser.firstName"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Nachname"
                  required
                  v-model="selectedUser.lastName"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Firma"
                  required
                  v-model="selectedUser.company"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Telefon"
                  required
                  v-model="selectedUser.phone"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Adresse"
                  required
                  v-model="selectedUser.address"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Postleitzahl"
                  required
                  v-model="selectedUser.zipCode"
                ></v-text-field>
              </v-col>
              <v-col>
                <v-text-field
                  background-color="accent"
                  filled
                  hide-details
                  label="Stadt"
                  required
                  v-model="selectedUser.city"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-checkbox
                  label="Verifiziert"
                  v-model="selectedUser.isVerified"
                  color="primary"
                ></v-checkbox>
              </v-col>
              <v-col>
                <v-checkbox
                  label="Suspendiert"
                  v-model="selectedUser.isSuspended"
                  color="primary"
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            class="mb-5"
            color="primary"
            @click="submitChanges"
            :loading="inProgress"
          >
            Speichern
          </v-btn>
          <v-btn class="mb-5 mr-5" outlined @click="closeDialog">
            Abbrechen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import ApiUsersService from "@/services/api/ApiUsersService";
import { mapActions } from "vuex";

export default {
  name: "UserEdit",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      api: {
        roles: [],
      },
      inProgress: false,
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    selectedUser: {
      get() {
        return this.user;
      },
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    closeDialog() {
      this.$emit("close");
    },
    async submitChanges() {
      try {
        this.inProgress = true;
        await ApiUsersService.submitUser(this.selectedUser);
        this.closeDialog();
      } catch (error) {
        console.error(error);
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>

<style scoped></style>

<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="900px" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-avatar
            :color="getAvatarColor()"
            size="48"
            class="white--text font-weight-bold mr-4"
          >
            {{ getUserInitials() }}
          </v-avatar>
          <div class="flex-grow-1">
            <div class="text-h5 font-weight-medium">
              {{ getUserName() }}
              <v-icon
                v-if="selectedUser.isVerified"
                color="success"
                small
                class="ml-2"
              >
                mdi-check-decagram
              </v-icon>
            </div>
            <div class="text-caption grey--text">
              ID: {{ selectedUser.id }}
              <span v-if="selectedUser.created" class="mx-2">•</span>
              <span v-if="selectedUser.created">
                Registriert: {{ formatDateShort(selectedUser.created) }}
              </span>
            </div>
          </div>
          <v-chip
            v-if="selectedUser.isVerified"
            color="green"
            text-color="white"
            class="mr-2"
          >
            <v-icon left small>mdi-check-circle</v-icon>
            Verifiziert
          </v-chip>
          <v-chip
            v-if="selectedUser.isSuspended"
            color="red"
            text-color="white"
            class="mr-2"
          >
            <v-icon left small>mdi-cancel</v-icon>
            Suspendiert
          </v-chip>
          <v-btn icon @click="closeDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-tabs v-model="activeTab" grow>
          <v-tab>
            <v-icon left>mdi-account</v-icon>
            Benutzerdaten
          </v-tab>
          <v-tab>
            <v-icon left>mdi-map-marker</v-icon>
            Adresse
          </v-tab>
          <v-tab>
            <v-icon left>mdi-domain</v-icon>
            Mandanten
          </v-tab>
          <v-tab>
            <v-icon left>mdi-cog</v-icon>
            Einstellungen
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text class="pa-6" style="max-height: 500px; overflow-y: auto">
          <v-tabs-items v-model="activeTab">
            <v-tab-item>
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon color="primary" class="mr-2">
                    mdi-account-details
                  </v-icon>
                  <span class="text-h6 font-weight-medium">
                    Persönliche Daten
                  </span>
                </div>
                <p class="text-body-2 grey--text mb-0">
                  Grundlegende Informationen über den Benutzer
                </p>
              </div>

              <v-card outlined class="mb-4">
                <v-card-text class="pa-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-identifier</v-icon>
                        Benutzer-ID
                      </div>
                      <v-text-field
                        v-model="selectedUser.id"
                        background-color="grey lighten-4"
                        filled
                        dense
                        readonly
                        disabled
                        hide-details
                      />
                    </v-col>
                    <v-col v-if="selectedUser.created" cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-calendar-clock</v-icon>
                        Registriert am
                      </div>
                      <v-text-field
                        :value="formatDate(selectedUser.created)"
                        background-color="grey lighten-4"
                        filled
                        dense
                        readonly
                        disabled
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <v-card outlined>
                <v-card-text class="pa-4">
                  <v-row>
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-account</v-icon>
                        Vorname
                      </div>
                      <v-text-field
                        v-model="selectedUser.firstName"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Vorname eingeben"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-account</v-icon>
                        Nachname
                      </div>
                      <v-text-field
                        v-model="selectedUser.lastName"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Nachname eingeben"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-3">
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-domain</v-icon>
                        Firma
                      </div>
                      <v-text-field
                        v-model="selectedUser.company"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Firma eingeben"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-phone</v-icon>
                        Telefon
                      </div>
                      <v-text-field
                        v-model="selectedUser.phone"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Telefonnummer eingeben"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <v-tab-item>
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon color="primary" class="mr-2">mdi-home-city</v-icon>
                  <span class="text-h6 font-weight-medium">Adressdaten</span>
                </div>
                <p class="text-body-2 grey--text mb-0">
                  Adressinformationen des Benutzers
                </p>
              </div>

              <v-card outlined>
                <v-card-text class="pa-4">
                  <v-row>
                    <v-col cols="12">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-map-marker</v-icon>
                        Straße und Hausnummer
                      </div>
                      <v-text-field
                        v-model="selectedUser.address"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Adresse eingeben"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-3">
                    <v-col cols="12" sm="4">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-mailbox</v-icon>
                        Postleitzahl
                      </div>
                      <v-text-field
                        v-model="selectedUser.zipCode"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="PLZ"
                      />
                    </v-col>
                    <v-col cols="12" sm="8">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-city</v-icon>
                        Stadt
                      </div>
                      <v-text-field
                        v-model="selectedUser.city"
                        background-color="accent"
                        filled
                        dense
                        hide-details
                        placeholder="Stadt eingeben"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <v-tab-item>
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon color="primary" class="mr-2">mdi-domain</v-icon>
                  <span class="text-h6 font-weight-medium">
                    Mandanten-Zugehörigkeit
                  </span>
                </div>
                <p class="text-body-2 grey--text mb-0">
                  Verwaltung der Mandanten-Mitgliedschaften und zugewiesenen
                  Rollen
                </p>
              </div>

              <v-alert
                v-if="!memberships || memberships.length === 0"
                type="info"
                outlined
                dense
                class="mb-4"
              >
                <div class="d-flex align-center">
                  <span
                    >Dieser Benutzer ist noch keinem Mandanten zugeordnet</span
                  >
                </div>
              </v-alert>

              <v-card
                v-for="(membership, index) in memberships"
                :key="index"
                outlined
                class="mb-4"
              >
                <v-card-title class="d-flex align-center py-3 px-4">
                  <v-avatar
                    :color="membership.owner ? 'amber' : 'blue-grey'"
                    size="36"
                    class="mr-3"
                  >
                    <v-icon :color="membership.owner ? 'black' : 'white'" small>
                      {{ membership.owner ? "mdi-crown" : "mdi-domain" }}
                    </v-icon>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-medium">
                      {{ getTenantNameById(membership.tenantId) }}
                    </div>
                    <div class="text-caption grey--text">
                      ID: {{ membership.tenantId }}
                    </div>
                  </div>
                  <v-chip
                    v-if="membership.owner"
                    color="amber"
                    text-color="black"
                    small
                    class="mr-2"
                  >
                    <v-icon left x-small>mdi-crown</v-icon>
                    Eigentümer
                  </v-chip>
                  <v-chip
                    :color="getStatusColor(membership.status)"
                    text-color="white"
                    small
                  >
                    <v-icon left x-small>
                      {{ getStatusIcon(membership.status) }}
                    </v-icon>
                    {{ getStatusText(membership.status) }}
                  </v-chip>
                </v-card-title>

                <v-divider />

                <v-card-text class="pa-4">
                  <v-row class="mb-3">
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-source-branch</v-icon>
                        Quelle
                      </div>
                      <v-chip small outlined>
                        <v-icon left x-small>
                          {{
                            membership.source === "manual"
                              ? "mdi-account-plus"
                              : "mdi-email"
                          }}
                        </v-icon>
                        {{
                          membership.source === "manual"
                            ? "Manuell hinzugefügt"
                            : "Einladung"
                        }}
                      </v-chip>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <div class="text-subtitle-2 mb-2 grey--text">
                        <v-icon small class="mr-1">mdi-shield-account</v-icon>
                        Rollen in diesem Mandanten
                      </div>
                      <div
                        v-if="membership.roles && membership.roles.length > 0"
                      >
                        <v-chip
                          v-for="(roleId, idx) in membership.roles"
                          :key="idx"
                          small
                          class="mr-1 mb-1"
                          color="primary"
                          outlined
                        >
                          <v-icon left x-small>mdi-shield-check</v-icon>
                          {{ getRoleNameById(roleId) }}
                        </v-chip>
                      </div>
                      <v-chip v-else small outlined color="grey">
                        <v-icon left x-small>mdi-minus-circle</v-icon>
                        Keine Rollen zugewiesen
                      </v-chip>
                    </v-col>
                  </v-row>

                  <!-- Tenant Details -->
                  <v-expansion-panels flat>
                    <v-expansion-panel>
                      <v-expansion-panel-header class="px-0">
                        <div class="d-flex align-center">
                          <v-icon small class="mr-2"
                            >mdi-information-outline</v-icon
                          >
                          <span class="text-body-2"
                            >Mandanten-Details anzeigen</span
                          >
                        </div>
                      </v-expansion-panel-header>
                      <v-expansion-panel-content class="px-0">
                        <v-simple-table dense>
                          <template v-slot:default>
                            <tbody>
                              <tr
                                v-if="
                                  getTenantById(membership.tenantId)
                                    ?.contactName
                                "
                              >
                                <td class="grey--text">
                                  <v-icon x-small class="mr-1"
                                    >mdi-account</v-icon
                                  >
                                  Kontaktperson
                                </td>
                                <td>
                                  {{
                                    getTenantById(membership.tenantId)
                                      .contactName
                                  }}
                                </td>
                              </tr>
                              <tr
                                v-if="
                                  getTenantById(membership.tenantId)?.location
                                "
                              >
                                <td class="grey--text">
                                  <v-icon x-small class="mr-1"
                                    >mdi-map-marker</v-icon
                                  >
                                  Standort
                                </td>
                                <td>
                                  {{
                                    getTenantById(membership.tenantId).location
                                  }}
                                </td>
                              </tr>
                              <tr
                                v-if="getTenantById(membership.tenantId)?.mail"
                              >
                                <td class="grey--text">
                                  <v-icon x-small class="mr-1"
                                    >mdi-email</v-icon
                                  >
                                  E-Mail
                                </td>
                                <td>
                                  {{ getTenantById(membership.tenantId).mail }}
                                </td>
                              </tr>
                              <tr
                                v-if="getTenantById(membership.tenantId)?.phone"
                              >
                                <td class="grey--text">
                                  <v-icon x-small class="mr-1"
                                    >mdi-phone</v-icon
                                  >
                                  Telefon
                                </td>
                                <td>
                                  {{ getTenantById(membership.tenantId).phone }}
                                </td>
                              </tr>
                              <tr
                                v-if="
                                  getTenantById(membership.tenantId)?.website
                                "
                              >
                                <td class="grey--text">
                                  <v-icon x-small class="mr-1">mdi-web</v-icon>
                                  Website
                                </td>
                                <td>
                                  <a
                                    :href="
                                      'https://' +
                                      getTenantById(membership.tenantId).website
                                    "
                                    target="_blank"
                                  >
                                    {{
                                      getTenantById(membership.tenantId).website
                                    }}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </template>
                        </v-simple-table>
                      </v-expansion-panel-content>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <!-- Role Permissions (wenn Rollen vorhanden) -->
                  <div
                    v-if="membership.roles && membership.roles.length > 0"
                    class="mt-4"
                  >
                    <v-divider class="mb-3" />
                    <div class="text-subtitle-2 mb-3 grey--text">
                      <v-icon small class="mr-1">mdi-key</v-icon>
                      Berechtigungen durch zugewiesene Rollen
                    </div>

                    <v-expansion-panels flat accordion>
                      <v-expansion-panel
                        v-for="(roleId, idx) in membership.roles"
                        :key="idx"
                      >
                        <v-expansion-panel-header class="px-0">
                          <div class="d-flex align-center">
                            <v-icon small class="mr-2" color="primary">
                              mdi-shield-check
                            </v-icon>
                            <span class="text-body-2 font-weight-medium">
                              {{ getRoleNameById(roleId) }}
                            </span>
                          </div>
                        </v-expansion-panel-header>
                        <v-expansion-panel-content class="px-0">
                          <div class="permissions-container">
                            <!-- Admin Interfaces -->
                            <div
                              v-if="getRoleAdminInterfaces(roleId).length > 0"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="purple" class="mr-2">
                                  mdi-view-dashboard
                                </v-icon>
                                <span class="font-weight-medium">
                                  Zugriff auf Admin-Bereiche
                                </span>
                              </div>
                              <v-row dense>
                                <v-col
                                  v-for="(iface, i) in getRoleAdminInterfaces(
                                    roleId
                                  )"
                                  :key="i"
                                  cols="12"
                                  sm="6"
                                  md="4"
                                >
                                  <v-chip
                                    small
                                    color="purple lighten-5"
                                    class="ma-1"
                                  >
                                    <v-icon left x-small color="purple">
                                      {{ getAdminInterfaceIcon(iface) }}
                                    </v-icon>
                                    <span class="purple--text text--darken-2">
                                      {{ translateAdminInterface(iface) }}
                                    </span>
                                  </v-chip>
                                </v-col>
                              </v-row>
                            </div>

                            <!-- Benutzer-Verwaltung -->
                            <div
                              v-if="hasAnyPermission(roleId, 'manageUsers')"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="blue" class="mr-2">
                                  mdi-account-multiple
                                </v-icon>
                                <span class="font-weight-medium">
                                  Benutzer-Verwaltung
                                </span>
                              </div>
                              <v-simple-table dense class="permission-table">
                                <template v-slot:default>
                                  <tbody>
                                    <tr
                                      v-for="(value, perm) in getRoleById(
                                        roleId
                                      )?.manageUsers"
                                      :key="perm"
                                    >
                                      <td class="py-2" style="width: 50%">
                                        <v-icon
                                          x-small
                                          :color="value ? 'success' : 'grey'"
                                          class="mr-2"
                                        >
                                          {{
                                            value ? "mdi-check" : "mdi-close"
                                          }}
                                        </v-icon>
                                        {{ translatePermission(perm) }}
                                      </td>
                                      <td class="text-right">
                                        <v-chip
                                          x-small
                                          :color="
                                            value ? 'success' : 'grey lighten-2'
                                          "
                                          :text-color="value ? 'white' : 'grey'"
                                        >
                                          {{
                                            value ? "Erlaubt" : "Nicht erlaubt"
                                          }}
                                        </v-chip>
                                      </td>
                                    </tr>
                                  </tbody>
                                </template>
                              </v-simple-table>
                            </div>

                            <!-- Buchbare Objekte -->
                            <div
                              v-if="hasAnyPermission(roleId, 'manageBookables')"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="orange" class="mr-2">
                                  mdi-calendar-multiple
                                </v-icon>
                                <span class="font-weight-medium">
                                  Buchbare Objekte
                                </span>
                              </div>
                              <v-simple-table dense class="permission-table">
                                <template v-slot:default>
                                  <tbody>
                                    <tr
                                      v-for="(value, perm) in getRoleById(
                                        roleId
                                      )?.manageBookables"
                                      :key="perm"
                                    >
                                      <td class="py-2" style="width: 50%">
                                        <v-icon
                                          x-small
                                          :color="value ? 'success' : 'grey'"
                                          class="mr-2"
                                        >
                                          {{
                                            value ? "mdi-check" : "mdi-close"
                                          }}
                                        </v-icon>
                                        {{ translatePermission(perm) }}
                                      </td>
                                      <td class="text-right">
                                        <v-chip
                                          x-small
                                          :color="
                                            value ? 'success' : 'grey lighten-2'
                                          "
                                          :text-color="value ? 'white' : 'grey'"
                                        >
                                          {{
                                            value ? "Erlaubt" : "Nicht erlaubt"
                                          }}
                                        </v-chip>
                                      </td>
                                    </tr>
                                  </tbody>
                                </template>
                              </v-simple-table>
                            </div>

                            <!-- Buchungen -->
                            <div
                              v-if="hasAnyPermission(roleId, 'manageBookings')"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="green" class="mr-2">
                                  mdi-calendar-check
                                </v-icon>
                                <span class="font-weight-medium"
                                  >Buchungen</span
                                >
                              </div>
                              <v-simple-table dense class="permission-table">
                                <template v-slot:default>
                                  <tbody>
                                    <tr
                                      v-for="(value, perm) in getRoleById(
                                        roleId
                                      )?.manageBookings"
                                      :key="perm"
                                    >
                                      <td class="py-2" style="width: 50%">
                                        <v-icon
                                          x-small
                                          :color="value ? 'success' : 'grey'"
                                          class="mr-2"
                                        >
                                          {{
                                            value ? "mdi-check" : "mdi-close"
                                          }}
                                        </v-icon>
                                        {{ translatePermission(perm) }}
                                      </td>
                                      <td class="text-right">
                                        <v-chip
                                          x-small
                                          :color="
                                            value ? 'success' : 'grey lighten-2'
                                          "
                                          :text-color="value ? 'white' : 'grey'"
                                        >
                                          {{
                                            value ? "Erlaubt" : "Nicht erlaubt"
                                          }}
                                        </v-chip>
                                      </td>
                                    </tr>
                                  </tbody>
                                </template>
                              </v-simple-table>
                            </div>

                            <!-- Rabatte -->
                            <div
                              v-if="hasAnyPermission(roleId, 'manageCoupons')"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="red" class="mr-2">
                                  mdi-ticket-percent
                                </v-icon>
                                <span class="font-weight-medium"
                                  >Rabatte</span
                                >
                              </div>
                              <v-simple-table dense class="permission-table">
                                <template v-slot:default>
                                  <tbody>
                                    <tr
                                      v-for="(value, perm) in getRoleById(
                                        roleId
                                      )?.manageCoupons"
                                      :key="perm"
                                    >
                                      <td class="py-2" style="width: 50%">
                                        <v-icon
                                          x-small
                                          :color="value ? 'success' : 'grey'"
                                          class="mr-2"
                                        >
                                          {{
                                            value ? "mdi-check" : "mdi-close"
                                          }}
                                        </v-icon>
                                        {{ translatePermission(perm) }}
                                      </td>
                                      <td class="text-right">
                                        <v-chip
                                          x-small
                                          :color="
                                            value ? 'success' : 'grey lighten-2'
                                          "
                                          :text-color="value ? 'white' : 'grey'"
                                        >
                                          {{
                                            value ? "Erlaubt" : "Nicht erlaubt"
                                          }}
                                        </v-chip>
                                      </td>
                                    </tr>
                                  </tbody>
                                </template>
                              </v-simple-table>
                            </div>

                            <!-- Rollen -->
                            <div
                              v-if="hasAnyPermission(roleId, 'manageRoles')"
                              class="mb-4"
                            >
                              <div class="permission-category-title mb-2">
                                <v-icon small color="indigo" class="mr-2">
                                  mdi-shield-account
                                </v-icon>
                                <span class="font-weight-medium">Rollen</span>
                              </div>
                              <v-simple-table dense class="permission-table">
                                <template v-slot:default>
                                  <tbody>
                                    <tr
                                      v-for="(value, perm) in getRoleById(
                                        roleId
                                      )?.manageRoles"
                                      :key="perm"
                                    >
                                      <td class="py-2" style="width: 50%">
                                        <v-icon
                                          x-small
                                          :color="value ? 'success' : 'grey'"
                                          class="mr-2"
                                        >
                                          {{
                                            value ? "mdi-check" : "mdi-close"
                                          }}
                                        </v-icon>
                                        {{ translatePermission(perm) }}
                                      </td>
                                      <td class="text-right">
                                        <v-chip
                                          x-small
                                          :color="
                                            value ? 'success' : 'grey lighten-2'
                                          "
                                          :text-color="value ? 'white' : 'grey'"
                                        >
                                          {{
                                            value ? "Erlaubt" : "Nicht erlaubt"
                                          }}
                                        </v-chip>
                                      </td>
                                    </tr>
                                  </tbody>
                                </template>
                              </v-simple-table>
                            </div>

                            <!-- Sonder-Berechtigungen -->
                            <div
                              v-if="getRoleById(roleId)?.freeBookings"
                              class="mb-2"
                            >
                              <v-alert
                                color="success"
                                outlined
                                dense
                                class="ma-0"
                              >
                                <div class="d-flex align-center">
                                  <v-icon small class="mr-2"
                                    >mdi-cash-remove</v-icon
                                  >
                                  <span class="font-weight-medium">
                                    Kostenlose Buchungen erlaubt
                                  </span>
                                </div>
                              </v-alert>
                            </div>
                          </div>
                        </v-expansion-panel-content>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </div>
                </v-card-text>
              </v-card>
            </v-tab-item>

            <!-- Settings Tab -->
            <v-tab-item>
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon color="primary" class="mr-2">
                    mdi-shield-account
                  </v-icon>
                  <span class="text-h6 font-weight-medium">
                    Account-Einstellungen
                  </span>
                </div>
                <p class="text-body-2 grey--text mb-0">
                  Verwalten Sie den Status und die Berechtigungen des Benutzers
                </p>
              </div>

              <!-- Verification Section -->
              <v-card outlined class="mb-4">
                <v-card-text class="pa-5">
                  <div class="d-flex flex-column flex-sm-row align-center">
                    <div class="flex-grow-1 mb-3 mb-sm-0">
                      <div class="text-body-1 font-weight-medium mb-1">
                        <v-icon
                          :color="selectedUser.isVerified ? 'success' : 'grey'"
                          class="mr-1"
                        >
                          {{
                            selectedUser.isVerified
                              ? "mdi-check-decagram"
                              : "mdi-alert-circle-outline"
                          }}
                        </v-icon>
                        E-Mail-Verifizierung
                      </div>
                      <div class="text-body-2 grey--text">
                        {{
                          selectedUser.isVerified
                            ? "Der Benutzer ist verifiziert"
                            : "Der Benutzer ist noch nicht verifiziert"
                        }}
                      </div>
                    </div>
                    <v-checkbox
                      v-model="selectedUser.isVerified"
                      label="Verifiziert"
                      color="success"
                      hide-details
                      class="mt-0 pt-0"
                    />
                  </div>
                </v-card-text>
              </v-card>

              <!-- Suspension Section -->
              <v-card outlined class="suspension-card">
                <v-card-text class="pa-5">
                  <div class="d-flex flex-column flex-sm-row align-center">
                    <div class="flex-grow-1 mb-3 mb-sm-0">
                      <div class="text-body-1 font-weight-medium mb-1">
                        <v-icon
                          :color="selectedUser.isSuspended ? 'error' : 'grey'"
                          class="mr-1"
                        >
                          {{
                            selectedUser.isSuspended
                              ? "mdi-cancel"
                              : "mdi-check-circle-outline"
                          }}
                        </v-icon>
                        Account-Sperrung
                      </div>
                      <div class="text-body-2 grey--text">
                        {{
                          selectedUser.isSuspended
                            ? "Der Account ist derzeit gesperrt"
                            : "Der Account ist aktiv"
                        }}
                      </div>
                    </div>
                    <v-checkbox
                      v-model="selectedUser.isSuspended"
                      label="Suspendiert"
                      color="error"
                      hide-details
                      class="mt-0 pt-0"
                    />
                  </div>
                </v-card-text>
              </v-card>

            </v-tab-item>
          </v-tabs-items>
        </v-card-text>

        <v-divider />

        <!-- Actions -->
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="closeDialog" :disabled="inProgress">
            <v-icon left small>mdi-close</v-icon>
            Abbrechen
          </v-btn>
          <v-btn
            color="primary"
            @click="submitChanges"
            :loading="inProgress"
            :disabled="!isFormValid()"
          >
            <v-icon left small>mdi-content-save</v-icon>
            Speichern
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
    memberships: {
      type: Array,
      required: false,
      default: () => [],
    },
    tenants: {
      type: Array,
      required: false,
      default: () => [],
    },
    roles: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      activeTab: 0,
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
    getUserInitials() {
      if (this.selectedUser.firstName && this.selectedUser.lastName) {
        return (
          this.selectedUser.firstName.charAt(0).toUpperCase() +
          this.selectedUser.lastName.charAt(0).toUpperCase()
        );
      }
      return this.selectedUser.id?.toString().substring(0, 2) || "??";
    },
    getUserName() {
      if (this.selectedUser.firstName || this.selectedUser.lastName) {
        return `${this.selectedUser.firstName || ""} ${
          this.selectedUser.lastName || ""
        }`.trim();
      }
      return "Benutzer bearbeiten";
    },
    getAvatarColor() {
      if (this.selectedUser.isSuspended) return "red";
      if (this.selectedUser.isVerified) return "green";
      return "blue-grey";
    },
    getFullAddress() {
      const parts = [
        this.selectedUser.address,
        this.selectedUser.zipCode,
        this.selectedUser.city,
      ].filter(Boolean);
      return parts.join(", ");
    },
    isFormValid() {
      return (
        this.selectedUser.firstName?.trim() &&
        this.selectedUser.lastName?.trim()
      );
    },
    formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatDateShort(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
    getAccountAge() {
      if (!this.selectedUser.created) return "";

      const now = new Date();
      const created = new Date(this.selectedUser.created);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) return "Heute registriert";
      if (diffDays === 1) return "Vor 1 Tag registriert";
      if (diffDays < 7) return `Vor ${diffDays} Tagen registriert`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `Vor ${weeks} Woche${weeks > 1 ? "n" : ""} registriert`;
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `Vor ${months} Monat${months > 1 ? "en" : ""} registriert`;
      }

      const years = Math.floor(diffDays / 365);
      return `Vor ${years} Jahr${years > 1 ? "en" : ""} registriert`;
    },
    isNewUser() {
      if (!this.selectedUser.created) return false;

      const now = new Date();
      const created = new Date(this.selectedUser.created);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 7; // Als "neu" markieren, wenn weniger als 7 Tage alt
    },
    closeDialog() {
      this.activeTab = 0;
      this.$emit("close");
    },
    async submitChanges() {
      if (!this.isFormValid()) {
        return;
      }

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

    getTenantNameById(tenantId) {
      const tenant = this.tenants.find((t) => t.id === tenantId);
      return tenant?.name || "Unbekannter Mandant";
    },

    getTenantById(tenantId) {
      return this.tenants.find((t) => t.id === tenantId);
    },

    getRoleNameById(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      return role?.name || roleId.substring(0, 8) + "...";
    },

    getRolePermissions(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      if (!role) return {};

      const permissions = [];

      // Admin Interfaces
      if (role.adminInterfaces && role.adminInterfaces.length > 0) {
        role.adminInterfaces.forEach((iface) => {
          permissions.push(`Admin: ${iface}`);
        });
      }

      // Andere Permissions
      const permissionGroups = [
        "manageUsers",
        "manageBookables",
        "manageBookings",
        "manageCoupons",
        "manageRoles",
      ];

      permissionGroups.forEach((group) => {
        if (role[group]) {
          Object.keys(role[group]).forEach((key) => {
            if (role[group][key] === true) {
              permissions.push(`${this.formatPermissionGroup(group)}: ${key}`);
            }
          });
        }
      });

      if (role.freeBookings) {
        permissions.push("Kostenlose Buchungen");
      }

      return permissions;
    },

    formatPermissionGroup(group) {
      const map = {
        manageUsers: "Benutzer",
        manageBookables: "Buchbare Objekte",
        manageBookings: "Buchungen",
        manageCoupons: "Rabatte",
        manageRoles: "Rollen",
      };
      return map[group] || group;
    },

    formatPermissionName(permission) {
      if (!permission) return "";
      console.log("Formatting permission:", permission);
      return permission.replace(/([A-Z])/g, " $1").trim();
    },

    getStatusColor(status) {
      const colors = {
        active: "success",
        pending: "warning",
        suspended: "error",
        invited: "info",
      };
      return colors[status] || "grey";
    },

    getStatusIcon(status) {
      const icons = {
        active: "mdi-check-circle",
        pending: "mdi-clock-outline",
        suspended: "mdi-cancel",
        invited: "mdi-email-outline",
      };
      return icons[status] || "mdi-help-circle";
    },

    getStatusText(status) {
      const texts = {
        active: "Aktiv",
        pending: "Ausstehend",
        suspended: "Suspendiert",
        invited: "Eingeladen",
      };
      return texts[status] || status;
    },
    getRoleById(roleId) {
      return this.roles.find((r) => r.id === roleId);
    },

    getRoleAdminInterfaces(roleId) {
      const role = this.getRoleById(roleId);
      return role?.adminInterfaces || [];
    },
    translateAdminInterface(iface) {
      const translations = {
        roles: "Rollen",
        users: "Mitglieder",
        bookings: "Buchungen",
        coupons: "Rabatte",
        locations: "Veranstaltungsorte",
        rooms: "Räume",
        resources: "Geräte & Weiteres",
        tickets: "Tickets",
        events: "Veranstaltungen",
        dashboard: "Dashboard",
        settings: "Einstellungen",
        reports: "Berichte",
        analytics: "Analysen",
      };
      return translations[iface] || iface;
    },
    getAdminInterfaceIcon(iface) {
      const icons = {
        roles: "mdi-shield-account",
        users: "mdi-account-multiple",
        bookings: "mdi-book",
        coupons: "mdi-ticket-percent",
        locations: "mdi-map-marker",
        rooms: "mdi-door",
        resources: "mdi-package-variant",
        tickets: "mdi-ticket-confirmation",
        events: "mdi-calendar",
      };
      return icons[iface] || "mdi-view-grid";
    },

    translatePermission(perm) {
      const translations = {
        create: "Erstellen",
        readAny: "Alle lesen",
        readOwn: "Eigene lesen",
        updateAny: "Alle bearbeiten",
        updateOwn: "Eigene bearbeiten",
        deleteAny: "Alle löschen",
        deleteOwn: "Eigene löschen",
      };
      return translations[perm] || perm;
    },

    hasAnyPermission(roleId, group) {
      const role = this.getRoleById(roleId);
      if (!role || !role[group]) return false;
      return Object.values(role[group]).some((value) => value === true);
    },
  },
};
</script>

<style scoped>
.suspension-card {
  border-color: #ef5350 !important;
  background: linear-gradient(
    to right,
    rgba(244, 67, 54, 0.02),
    rgba(244, 67, 54, 0.05)
  );
}

/* Fade Transition */
.v-fade-transition-enter-active,
.v-fade-transition-leave-active {
  transition: opacity 0.3s ease;
}

.v-fade-transition-enter,
.v-fade-transition-leave-to {
  opacity: 0;
}
</style>

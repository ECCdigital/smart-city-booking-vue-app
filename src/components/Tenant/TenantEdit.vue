<template>
  <v-container>
    <v-form ref="form" v-model="valid">
      <h3>Allgemeine Informationen</h3>
      <v-progress-linear
        :active="isLoading"
        indeterminate
        color="primary"
      ></v-progress-linear>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="ID"
            readonly
            disabled
            v-model="tenant.id"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Name"
            :rules="validationRules.required"
            v-model="tenant.name"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Kontakt Person"
            :rules="validationRules.required"
            v-model="tenant.contactName"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Adresse"
            :rules="validationRules.required"
            v-model="tenant.location"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="E-Mail Adresse"
            :rules="validationRules.mail"
            type="mail"
            v-model="tenant.mail"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Telefonummer"
            :rules="validationRules.required"
            v-model="tenant.phone"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Website"
            :rules="validationRules.required"
            type="text"
            v-model="tenant.website"
          ></v-text-field>
        </v-col>
      </v-row>
      <h3 class="mt-10">Web-Schnittstelle</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Link zur Detailseite (Buchungsobjekt)"
            placeholder="https://..."
            :rules="validationRules.weblink"
            v-model="tenant.bookableDetailLink"
            suffix="?bkid=[ID]"
          >
          </v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Link zur Detailseite (Event)"
            placeholder="https://..."
            :rules="validationRules.weblink"
            v-model="tenant.eventDetailLink"
            suffix="?bkid=[ID]"
          >
          </v-text-field>
        </v-col>
      </v-row>
      <h3 class="mt-10">E-Mail-Konfiguration</h3>
      <v-divider class="mb-5"></v-divider>
      <v-switch
        v-model="tenant.useInstanceMail"
        color="primary"
        label="Instanz E-Mail-Konfiguration verwenden"
        class="mt-2"
      ></v-switch>
      <MailKonfiguration
        :mail-config="tenantMailConfig"
        :show-validation="!tenant.useInstanceMail"
        @update="updateMailConfig"
      />

      <h3 class="mt-10">Zahlungsbeleg</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-card
            v-if="!!tenant.receiptTemplate"
            color="success lighten-5"
            class="rounded"
          >
            <v-card-text
              class="success--text text--darken-1 d-flex justify-space-between align-center"
            >
              <div>
                <v-icon left> mdi-check </v-icon>
                Es ist eine Zahlungsbeleg-Vorlage hinterlegt.
              </div>

              <v-btn small outlined @click="showEditTemplateDialog = true"
                >bearbeiten</v-btn
              >
            </v-card-text>
          </v-card>
          <v-card v-else color="error lighten-5" class="rounded">
            <v-card-text
              class="error--text text--darken-1 d-flex justify-space-between align-center"
            >
              <div>
                <v-icon left> mdi-close </v-icon>
                Es ist keine Zahlungsbelegvorlage hinterlegt.
              </div>

              <v-btn small outlined @click="showEditTemplateDialog = true"
                >bearbeiten</v-btn
              >
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Belegnummer Präfix"
            v-model="tenant.receiptNumberPrefix"
          ></v-text-field>
        </v-col>
      </v-row>
      <h3 class="mt-10">Zahlungsmethoden</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-text-field
            background-color="accent"
            filled
            label="Ergänzung zum Verwendungszweck"
            prefix="[Buchungsnummer] - "
            :rules="validationRules.paymentPurposeSuffix"
            v-model="tenant.paymentPurposeSuffix"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-expansion-panels flat multiple v-if="apps.giroCockpit">
            <v-expansion-panel>
              <v-expansion-panel-header
                color="accent"
                expand-icon="mdi-menu-down"
                class="panel-header"
              >
                <template v-slot:default="{ open }">
                  <v-row no-gutters align="center">
                    <v-col cols="4">
                      <span class="text-subtitle-1"> S-Public Services </span>
                    </v-col>
                    <v-col class="col-2">
                      <v-fade-transition leave-absolute>
                        <div v-if="!open">
                          <v-icon
                            v-if="apps.giroCockpit?.active"
                            color="success"
                            >mdi-check</v-icon
                          >
                          <span v-if="apps.giroCockpit?.active" class="ml-2"
                            >Aktiv</span
                          >

                          <v-icon
                            v-if="apps.giroCockpit?.active === false"
                            color="error"
                            >mdi-close</v-icon
                          >
                          <span
                            v-if="apps.giroCockpit?.active === false"
                            class="ml-2"
                            >Inaktiv</span
                          >
                        </div>
                      </v-fade-transition>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-row>
                  <v-col class="col-12">
                    <v-switch
                      v-model="apps.giroCockpit.active"
                      color="primary"
                      hide-details
                      label="S-Public Services als Zahlungsanbieter aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Kundennummer"
                      hide-details
                      v-model="apps.giroCockpit.paymentMerchantId"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Projektnummer"
                      v-model="apps.giroCockpit.paymentProjectId"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Schlüssel"
                      v-model="apps.giroCockpit.paymentSecret"
                      :append-icon="
                        showPaymentSecret ? 'mdi-eye' : 'mdi-eye-off'
                      "
                      @click:append="showPaymentSecret = !showPaymentSecret"
                      :type="showPaymentSecret ? 'text' : 'password'"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      prefix="[Buchungsnummer] - "
                      :rules="validationRules.paymentPurposeSuffix"
                      v-model="apps.giroCockpit.paymentPurposeSuffix"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
          <v-expansion-panels flat multiple class="mt-8" v-if="apps.pmPayment">
            <v-expansion-panel>
              <v-expansion-panel-header
                color="accent"
                expand-icon="mdi-menu-down"
                class="panel-header"
              >
                <template v-slot:default="{ open }">
                  <v-row no-gutters align="center">
                    <v-col cols="4">
                      <span class="text-subtitle-1"> pmPayment </span>
                    </v-col>
                    <v-col class="col-auto">
                      <v-fade-transition leave-absolute>
                        <div class="flex d-inline" v-if="!open">
                          <v-icon v-if="apps.pmPayment?.active" color="success"
                            >mdi-check</v-icon
                          >
                          <span v-if="apps.pmPayment?.active" class="ml-2"
                            >Aktiv</span
                          >

                          <v-icon
                            v-if="apps.pmPayment?.active === false"
                            color="error"
                            >mdi-close</v-icon
                          >
                          <span
                            v-if="apps.pmPayment?.active === false"
                            class="ml-2"
                            >Inaktiv</span
                          >

                          <v-icon
                            v-if="
                              apps.pmPayment.paymentMode === 'test' &&
                              apps.pmPayment?.active
                            "
                            color="info"
                            class="ml-4"
                            >mdi-information-outline</v-icon
                          >
                          <span
                            v-if="
                              apps.pmPayment.paymentMode === 'test' &&
                              apps.pmPayment?.active
                            "
                            class="ml-2"
                            >Testmodus ist aktiv</span
                          >
                        </div>
                      </v-fade-transition>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-row>
                  <v-col class="col-auto">
                    <v-switch
                      v-model="apps.pmPayment.active"
                      color="primary"
                      hide-details
                      label="pmPayment als Zahlungsanbieter aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                  <v-col>
                    <v-switch
                      v-model="apps.pmPayment.paymentMode"
                      color="primary"
                      hide-details
                      true-value="test"
                      false-value="prod"
                      label="Testmodus"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Amtlicher Gemeindeschlüssel"
                      hide-details
                      v-model="apps.pmPayment.paymentMerchantId"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Verfahren"
                      v-model="apps.pmPayment.paymentProjectId"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Salt Passwort"
                      v-model="apps.pmPayment.paymentSecret"
                      :append-icon="
                        showPmPaymentSecret ? 'mdi-eye' : 'mdi-eye-off'
                      "
                      @click:append="showPmPaymentSecret = !showPmPaymentSecret"
                      :type="showPmPaymentSecret ? 'text' : 'password'"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      prefix="[Buchungsnummer] - "
                      :rules="validationRules.paymentPurposeSuffix"
                      v-model="apps.pmPayment.paymentPurposeSuffix"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
          <v-expansion-panels flat multiple class="mt-8" v-if="apps.invoice">
            <v-expansion-panel>
              <v-expansion-panel-header
                color="accent"
                expand-icon="mdi-menu-down"
                class="panel-header"
              >
                <template v-slot:default="{ open }">
                  <v-row no-gutters align="center">
                    <v-col cols="4">
                      <span class="text-subtitle-1"> Rechnung </span>
                    </v-col>
                    <v-col class="col-2">
                      <v-fade-transition leave-absolute>
                        <div v-if="!open">
                          <v-icon v-if="apps.invoice?.active" color="success"
                            >mdi-check</v-icon
                          >
                          <span v-if="apps.invoice?.active" class="ml-2"
                            >Aktiv</span
                          >

                          <v-icon
                            v-if="apps.invoice?.active === false"
                            color="error"
                            >mdi-close</v-icon
                          >
                          <span
                            v-if="apps.invoice?.active === false"
                            class="ml-2"
                            >Inaktiv</span
                          >
                        </div>
                      </v-fade-transition>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-row>
                  <v-col class="col-12">
                    <v-switch
                      v-model="apps.invoice.active"
                      color="primary"
                      hide-details
                      label="Rechnung als Zahlungsmittel aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-card
                      v-if="!!tenant.invoiceTemplate"
                      color="success lighten-5"
                      class="rounded"
                    >
                      <v-card-text
                        class="success--text text--darken-1 d-flex justify-space-between align-center"
                      >
                        <div>
                          <v-icon left> mdi-check </v-icon>
                          Es ist eine Rechnungs-Vorlage hinterlegt.
                        </div>

                        <v-btn
                          small
                          outlined
                          @click="showEditInvoiceTemplateDialog = true"
                          >bearbeiten</v-btn
                        >
                      </v-card-text>
                    </v-card>
                    <v-card v-else color="error lighten-5" class="rounded">
                      <v-card-text
                        class="error--text text--darken-1 d-flex justify-space-between align-center"
                      >
                        <div>
                          <v-icon left> mdi-close </v-icon>
                          Es ist keine Rechnungs-Vorlage hinterlegt.
                        </div>

                        <v-btn
                          small
                          outlined
                          @click="showEditInvoiceTemplateDialog = true"
                          >bearbeiten</v-btn
                        >
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Bank"
                      v-model="apps.invoice.bank"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="IBAN"
                      v-model="apps.invoice.iban"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="BIC"
                      v-model="apps.invoice.bic"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Kontoinhaber"
                      v-model="apps.invoice.accountHolder"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col class="col-12 col-md-6">
                    <v-text-field
                      background-color="accent"
                      filled
                      label="Zahlungsziel in Tagen"
                      type="number"
                      v-model="apps.invoice.daysUntilPaymentDue"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
      <h3 class="mt-10">Schließsysteme</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-expansion-panels flat multiple v-if="apps.pareva">
            <v-expansion-panel>
              <v-expansion-panel-header
                color="accent"
                expand-icon="mdi-menu-down"
                class="penal-header"
              >
                <template v-slot:default="{ open }">
                  <v-row no-gutters align="center">
                    <v-col cols="4">
                      <span class="text-subtitle-1"> Pareva </span>
                    </v-col>
                    <v-col class="col-2">
                      <v-fade-transition leave-absolute>
                        <div v-if="!open">
                          <v-icon v-if="apps.pareva?.active" color="success"
                            >mdi-check</v-icon
                          >
                          <span v-if="apps.pareva?.active" class="ml-2"
                            >Aktiv</span
                          >

                          <v-icon
                            v-if="apps.pareva?.active === false"
                            color="error"
                            >mdi-close</v-icon
                          >
                          <span
                            v-if="apps.pareva?.active === false"
                            class="ml-2"
                            >Inaktiv</span
                          >
                        </div>
                      </v-fade-transition>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-row>
                  <v-col class="col-12">
                    <v-switch
                      v-model="apps.pareva.active"
                      color="primary"
                      hide-details
                      label="Parava aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Server-URL"
                      v-model="apps.pareva.serverUrl"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Locker-ID"
                      v-model="apps.pareva.lockerId"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Benutzername"
                      v-model="apps.pareva.user"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-text-field
                      background-color="accent"
                      filled
                      dense
                      label="Passwort"
                      v-model="apps.pareva.password"
                      :append-icon="
                        showParevaPassword ? 'mdi-eye' : 'mdi-eye-off'
                      "
                      @click:append="showParevaPassword = !showParevaPassword"
                      :type="showParevaPassword ? 'text' : 'password'"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>

      <h3 class="mt-10">Buchungskonfiguration</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col class="col-12 col-md-6">
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Vorausbuchungen möglich bis"
            type="number"
            suffix="Monate"
            v-model="tenant.maxBookingAdvanceInMonths"
          >
          </v-text-field>
        </v-col>
      </v-row>
      <v-switch
        v-model="tenant.enablePublicStatusView"
        color="primary"
        hint="Sofern aktiviert, kann der Status einer Buchung öffentlich abgefragt werden."
        persistent-hint
        label="Öffentlicher Buchungsstatus"
        class="mt-2"
      >
      </v-switch>
      <h3 class="mb-5 mt-5">Events</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col>
          <v-card flat height="120">
            <v-snackbar :timeout="-1" :value="true" absolute color="info" text>
              <v-icon color="info" left> mdi-information-outline </v-icon>
              <span>
                Mit dieser Option können Sie das Erstellen einer Veranstaltung
                standardmäßig auf den einfachen Modus umstellen. Dieser Modus
                ist für die meisten Anwendungsfälle ausreichend. Das Erstellen
                einer detaillierte Veranstaltung lässt sich weiterhin über den
                "Veranstaltung Erstellen" Knopf auswählen.
              </span>
            </v-snackbar>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col class="col-12 col-md-6">
          <v-switch
            v-model="eventCreationMode"
            color="primary"
            hide-details
            label="Einfacher Event-Modus"
            class="mt-2"
          >
          </v-switch>
        </v-col>
      </v-row>
      <h3 class="mb-5 mt-5">Workflow</h3>
      <v-divider class="mb-5"></v-divider>
      <v-row>
        <v-col class="col-12 col-md-6">
          <v-expansion-panels flat multiple>
            <v-expansion-panel>
              <v-expansion-panel-header
                color="accent"
                expand-icon="mdi-menu-down"
                class="penal-header"
              >
                <template v-slot:default="{ open }">
                  <v-row no-gutters align="center">
                    <v-col cols="4">
                      <span class="text-subtitle-1"> Workflow </span>
                    </v-col>
                    <v-col class="col-2">
                      <v-fade-transition leave-absolute>
                        <div v-if="!open">
                          <v-icon v-if="workflow.active" color="success"
                            >mdi-check</v-icon
                          >
                          <span v-if="workflow.active" class="ml-2">Aktiv</span>

                          <v-icon v-if="workflow.active === false" color="error"
                            >mdi-close</v-icon
                          >
                          <span v-if="workflow.active === false" class="ml-2"
                            >Inaktiv</span
                          >
                        </div>
                      </v-fade-transition>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-header>
              <v-expansion-panel-content class="mt-3">
                <v-row>
                  <v-col class="col-12">
                    <v-switch
                      v-model="workflow.active"
                      color="primary"
                      hide-details
                      label="Workflow aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <v-row v-if="workflow.states" no-gutters class="mt-4">
                  <v-col cols="2">
                    <span class="text-caption"> Status für neue Buchungen</span>
                  </v-col>
                </v-row>

                <div v-for="(status, idx) in workflow.states" :key="status.id">
                  <v-row>
                    <v-col cols="2">
                      <v-checkbox
                        v-model="workflow.defaultState"
                        :value="workflow.states[idx].id"
                        color="primary"
                        :label="idx === 0 ? '' : ''"
                        class="mt-2"
                      ></v-checkbox>
                    </v-col>
                    <v-col class="col-2 d-flex align-center justify-center">
                      <v-btn
                        v-if="idx !== 0"
                        color="primary"
                        @click="moveUp(idx)"
                        class="mt-2"
                        icon
                      >
                        <v-icon>mdi-arrow-up</v-icon>
                      </v-btn>
                      <v-btn
                        v-if="idx !== workflow.states.length - 1"
                        color="primary"
                        @click="moveDown(idx)"
                        class="mt-2"
                        icon
                      >
                        <v-icon>mdi-arrow-down</v-icon>
                      </v-btn>
                    </v-col>
                    <v-col class="d-flex align-center">
                      <span>
                        <strong> {{ workflow.states[idx].name }}</strong>
                      </span>
                    </v-col>
                    <v-col class="col-auto d-flex align-center justify-center">
                      <v-btn @click="editStatus(idx)" icon depressed>
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn
                        color="error"
                        @click="removeStatus(idx)"
                        icon
                        depressed
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                  <v-divider class="my-2" />
                </div>
                <div class="d-flex justify-center">
                  <v-btn @click="addStatus" class="mt-4" outlined>
                    Workflow-Status hinzufügen
                  </v-btn>
                </div>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-form>

    <div class="flex mt-12">
      <v-spacer />
      <v-btn
        class="mb-5"
        color="primary"
        @click="submitChanges"
        :loading="inProgress"
      >
        Speichern
      </v-btn>
    </div>
    <ReceiptTemplateDialog
      :open="showEditTemplateDialog"
      :receipt-template="tenant.receiptTemplate"
      @close="showEditTemplateDialog = false"
      @submit="onSubmitReceiptTemplate"
    />
    <InvoiceTemplateDialog
      :open="showEditInvoiceTemplateDialog"
      :invoice-template="tenant.invoiceTemplate"
      @close="showEditInvoiceTemplateDialog = false"
      @submit="onSubmitInvoiceTemplate"
    />
    <TenantEditWorkflowStatusDialog
      :open="showEditStatusDialog"
      :states="selectedSatus"
      @close="showEditStatusDialog = false"
      @save="updateStatus"
    />
  </v-container>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import { mapActions, mapGetters } from "vuex";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import { v4 as uuidv4 } from "uuid";
import ReceiptTemplateDialog from "@/components/Tenant/ReceiptTemplateDialog.vue";
import InvoiceTemplateDialog from "@/components/Tenant/InvoiceTemplateDialog.vue";
import TenantEditWorkflowStatusDialog from "@/components/Tenant/TenantEditWorkflowStatusDialog.vue";

export default {
  name: "TenantEdit",
  components: {
    TenantEditWorkflowStatusDialog,
    MailKonfiguration,
    InvoiceTemplateDialog,
    ReceiptTemplateDialog,
  },
  data() {
    return {
      isLoading: false,
      showEditTemplateDialog: false,
      showEditInvoiceTemplateDialog: false,
      showNoreplyPassword: false,
      showPaymentSecret: false,
      showParevaPassword: false,
      showPmPaymentSecret: false,
      showClientSecret: false,
      showRefreshToken: false,
      showEditStatusDialog: false,
      selectedSatus: {},
      valid: false,
      originTenantId: null,
      inProgress: false,
      validationRules: {
        required: [(v) => !!v || "Pflichtfeld"],
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
        paymentPurposeSuffix: [
          (v) => !v || v.length <= 12 || "Maximal 12 Zeichen erlaubt.",
        ],
        weblink: [
          (v) =>
            !v ||
            /https?\:\/\/([a-z\.A-Z\-]+)\/.*/g.test(v) ||
            "Ungültige URL.",
        ],
      },
      defaultApps: {
        giroCockpit: {
          type: "payment",
          id: "giroCockpit",
          title: "S-Public Services",
          paymentMerchantId: "",
          paymentProjectId: "",
          paymentSecret: "",
          paymentPurposeSuffix: "",
          active: false,
        },
        pmPayment: {
          type: "payment",
          id: "pmPayment",
          title: "pmPayment",
          paymentMerchantId: "",
          paymentProjectId: "",
          paymentSecret: "",
          paymentMode: "",
          active: false,
        },
        invoice: {
          type: "payment",
          id: "invoice",
          title: "Rechnung",
          bank: "",
          iban: "",
          bic: "",
          accountHolder: "",
          daysUntilPaymentDue: null,
          active: false,
        },
        pareva: {
          type: "locker",
          id: "pareva",
          title: "Pareva",
          serverUrl: "",
          lockerId: "",
          user: "",
          password: "",
          active: false,
        },
      },
      apps: {},
      workflow: {
        active: false,
        defaultState: "",
        states: [],
      },
      tenant: {},
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    tenantMailConfig: {
      get() {
        return {
          genericMailTemplate: this.tenant.genericMailTemplate,
          noreplyMail: this.tenant.noreplyMail,
          noreplyDisplayName: this.tenant.noreplyDisplayName,
          noreplyHost: this.tenant.noreplyHost,
          noreplyPort: this.tenant.noreplyPort,
          noreplyUser: this.tenant.noreplyUser,
          noreplyPassword: this.tenant.noreplyPassword,
          noreplyUseGraphApi: this.tenant.noreplyUseGraphApi,
          noreplyStarttls: this.tenant.noreplyStarttls,
          noreplyGraphTenantId: this.tenant.noreplyGraphTenantId,
          noreplyGraphClientId: this.tenant.noreplyGraphClientId,
          noreplyGraphClientSecret: this.tenant.noreplyGraphClientSecret,
        };
      },
    },
    eventCreationMode: {
      get() {
        const mode = this.tenant.defaultEventCreationMode;
        return mode === "simple";
      },
      set(value) {
        this.$set(
          this.tenant,
          "defaultEventCreationMode",
          value ? "simple" : "detailed"
        );
      },
    },
  },
  watch: {
    async tenantId(val) {
      if (val) {
        this.tenant = {};
        await this.fetchTenant();
      }
    },
    async tenant(val) {
      if (val) {
        this.initializeApps();
        this.originTenantId = val.id;
        await this.fetchWorkflow();
      }
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async fetchTenant() {
      try {
        this.isLoading = true;
        const response = await ApiTenantService.getTenant(this.tenantId);
        this.tenant = response.data;
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    updateMailConfig(newConfig) {
      this.tenant.noreplyDisplayName = newConfig.noreplyDisplayName;
      this.tenant.noreplyMail = newConfig.noreplyMail;
      this.tenant.noreplyDisplayName = newConfig.noreplyDisplayName;
      this.tenant.noreplyHost = newConfig.noreplyHost;
      this.tenant.noreplyPort = newConfig.noreplyPort;
      this.tenant.noreplyUser = newConfig.noreplyUser;
      this.tenant.noreplyPassword = newConfig.noreplyPassword;
      this.tenant.noreplyUseGraphApi = newConfig.noreplyUseGraphApi;
      this.tenant.noreplyStarttls = newConfig.noreplyStarttls;
      this.tenant.noreplyGraphTenantId = newConfig.noreplyGraphTenantId;
      this.tenant.noreplyGraphClientId = newConfig.noreplyGraphClientId;
      this.tenant.noreplyGraphClientSecret = newConfig.noreplyGraphClientSecret;
      this.tenant.genericMailTemplate = newConfig.genericMailTemplate;
    },
    async submitChanges() {
      if (this.$refs.form.validate()) {
        this.replaceApps();
        this.inProgress = true;

        try {
          await ApiTenantService.submitTenant(this.tenant);
          if (this.workflow.id) {
            this.workflow = await ApiWorkflowService.updateWorkflow(
              this.workflow,
              this.tenant.id
            );
          } else {
            this.workflow = await ApiWorkflowService.createWorkflow(
              this.workflow,
              this.tenant.id
            );
          }
          this.inProgress = false;
          await this.addToast({
            message: "Änderungen wurden erfolgreich gespeichert.",
            type: "success",
          });
        } catch (e) {
          await this.addToast({
            message: "Fehler beim Speichern der Änderungen.",
            type: "error",
          });
          this.inProgress = false;
        }
      } else {
        //reset validation after 4 seconds
        setTimeout(() => {
          this.$refs.form.resetValidation();
        }, 4000);
      }
    },
    initializeApps() {
      const existing = this.tenant.applications || [];

      Object.keys(this.defaultApps).forEach((appId) => {
        const found = existing.find((a) => a.id === appId);
        if (found) {
          this.$set(this.apps, appId, { ...found });
        } else {
          this.$set(this.apps, appId, { ...this.defaultApps[appId] });
        }
      });
    },

    replaceApps() {
      this.tenant.applications = Object.values(this.apps).map((app) => {
        return { ...app };
      });
    },

    async fetchWorkflow() {
      const data = await ApiWorkflowService.getWorkflow(this.tenant.id);
      if (data.id) {
        this.workflow = data;
      } else {
        this.workflow = {
          active: false,
          states: [],
          archive: [],
          description: "",
          name: "",
          defaultState: "",
          tenantId: this.tenant.id,
        };
      }
    },

    addStatus() {
      const id = uuidv4();
      this.workflow.states.push({
        id: id,
        name: "",
        tasks: [],
        actions: [],
      });
      this.selectedSatus = this.workflow.states.find((s) => s.id === id);
      this.showEditStatusDialog = true;
    },
    editStatus(idx) {
      this.showEditStatusDialog = true;
      this.selectedSatus = this.workflow.states[idx];
    },
    removeStatus(idx) {
      this.workflow.states.splice(idx, 1);
    },
    updateStatus(status) {
      const idx = this.workflow.states.findIndex((s) => s.id === status.id);
      this.workflow.states.splice(idx, 1, status);
      this.showEditStatusDialog = false;
    },
    moveUp(idx) {
      this.workflow.states.splice(
        idx - 1,
        0,
        this.workflow.states.splice(idx, 1)[0]
      );
    },
    moveDown(idx) {
      this.workflow.states.splice(
        idx + 1,
        0,
        this.workflow.states.splice(idx, 1)[0]
      );
    },
    onSubmitReceiptTemplate(template) {
      this.tenant.receiptTemplate = template;
      this.showEditTemplateDialog = false;
    },
    onSubmitInvoiceTemplate(template) {
      this.tenant.invoiceTemplate = template;
      this.showEditInvoiceTemplateDialog = false;
    },
  },
  async mounted() {
    await this.fetchTenant();
    this.initializeApps();
    await this.fetchWorkflow();
  },
};
</script>

<style scoped></style>

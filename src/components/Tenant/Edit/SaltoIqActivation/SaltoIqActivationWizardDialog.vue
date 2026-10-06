<script>
// The guided first-activation ceremony of a Salto KS IQ (backend spec
// docs/specs/salto-ks-remote-open.md §3): acknowledge the app ban, secure the
// first secret and trigger the PIN mail, capture the mailed PIN once, done.
// The parent owns the API calls and passes them in as async function props
// that resolve on success and reject with a translated message.
import { iqDisplayName } from "./iqActivationState";

export default {
  name: "SaltoIqActivationWizardDialog",
  props: {
    // The IQ being activated; null closes the dialog.
    iq: { type: Object, default: null },
    // async () => void - start the activation (secret + PIN mail)
    onStart: { type: Function, required: true },
    // async (pin) => void - complete the activation with the mailed PIN
    onComplete: { type: Function, required: true },
  },
  data() {
    return {
      step: 1,
      appBanAck: false,
      pin: "",
      error: null,
      working: false,
    };
  },
  computed: {
    iqName() {
      return this.iq ? iqDisplayName(this.iq) : "";
    },
  },
  watch: {
    iq(iq, previous) {
      if (iq && iq.id !== previous?.id) {
        this.reset(iq);
      }
    },
  },
  methods: {
    reset(iq) {
      this.appBanAck = false;
      this.pin = "";
      this.error = null;
      this.working = false;
      // A wizard lost after the start step resumes at the PIN capture - the
      // secret is already persisted and only the mailed PIN is missing.
      this.step = iq.state === "pending_pin" ? 3 : 1;
    },
    close() {
      this.$emit("close");
    },
    async doStart() {
      this.error = null;
      this.step = 2;
      try {
        await this.onStart();
        this.step = 3;
      } catch (error) {
        this.error = error.message;
        this.step = 1;
      }
    },
    async resendMail() {
      this.error = null;
      this.working = true;
      try {
        await this.onStart();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.working = false;
      }
    },
    async doComplete() {
      this.error = null;
      this.working = true;
      try {
        await this.onComplete(this.pin);
        this.step = 4;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.working = false;
      }
    },
  },
};
</script>

<template>
  <v-dialog :value="!!iq" max-width="640" persistent @input="close">
    <v-card v-if="iq">
      <v-card-title class="headline">
        {{ $t("accessPoint.tenant.salto.iq.wizard.title") }} {{ iqName }}
        <v-spacer />
        <v-btn icon @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" text dense class="mb-3">
          {{ error }}
        </v-alert>

        <v-stepper v-model="step" vertical flat class="elevation-0">
          <v-stepper-step :complete="step > 1" step="1">
            {{ $t("accessPoint.tenant.salto.iq.wizard.stepPrepare") }}
          </v-stepper-step>
          <v-stepper-content step="1">
            <p class="text-body-2">
              {{ $t("accessPoint.tenant.salto.iq.wizard.prepareText") }}
            </p>
            <v-alert type="warning" text dense icon="mdi-cellphone-off">
              {{ $t("accessPoint.tenant.salto.iq.appBan") }}
            </v-alert>
            <v-checkbox
              v-model="appBanAck"
              dense
              :label="$t('accessPoint.tenant.salto.iq.wizard.appBanAck')"
            />
            <v-btn color="primary" :disabled="!appBanAck" @click="doStart">
              {{ $t("accessPoint.tenant.salto.iq.wizard.next") }}
            </v-btn>
          </v-stepper-content>

          <v-stepper-step :complete="step > 2" step="2">
            {{ $t("accessPoint.tenant.salto.iq.wizard.stepStart") }}
          </v-stepper-step>
          <v-stepper-content step="2">
            <div class="d-flex align-center py-4">
              <v-progress-circular
                indeterminate
                size="22"
                width="2"
                color="primary"
                class="mr-3"
              />
              <span class="text-body-2">
                {{ $t("accessPoint.tenant.salto.iq.wizard.startProgress") }}
              </span>
            </div>
          </v-stepper-content>

          <v-stepper-step :complete="step > 3" step="3">
            {{ $t("accessPoint.tenant.salto.iq.wizard.stepPin") }}
          </v-stepper-step>
          <v-stepper-content step="3">
            <p class="text-body-2">
              {{ $t("accessPoint.tenant.salto.iq.wizard.pinText") }}
            </p>
            <v-text-field
              v-model="pin"
              :label="$t('accessPoint.tenant.salto.iq.pinLabel')"
              :placeholder="$t('accessPoint.tenant.salto.iq.pinPlaceholder')"
              maxlength="4"
              filled
              dense
              background-color="accent"
              style="max-width: 200px"
            />
            <v-btn
              color="primary"
              :loading="working"
              :disabled="pin.length !== 4"
              @click="doComplete"
            >
              {{ $t("accessPoint.tenant.salto.iq.wizard.completeActivation") }}
            </v-btn>
            <v-btn
              text
              small
              class="ml-2"
              :loading="working"
              @click="resendMail"
            >
              {{ $t("accessPoint.tenant.salto.iq.actions.resendMail") }}
            </v-btn>
            <div class="text-caption grey--text mt-2">
              {{ $t("accessPoint.tenant.salto.iq.wizard.resendHint") }}
            </div>
          </v-stepper-content>

          <v-stepper-step :complete="step === 4" step="4">
            {{ $t("accessPoint.tenant.salto.iq.wizard.stepDone") }}
          </v-stepper-step>
          <v-stepper-content step="4">
            <v-alert type="success" text dense class="mb-3">
              <strong>{{ iqName }}</strong>
              {{ $t("accessPoint.tenant.salto.iq.wizard.doneText") }}
            </v-alert>
            <v-btn color="primary" @click="close">
              {{ $t("accessPoint.tenant.salto.iq.wizard.close") }}
            </v-btn>
          </v-stepper-content>
        </v-stepper>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

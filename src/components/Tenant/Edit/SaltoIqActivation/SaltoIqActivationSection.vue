<script>
// IQ activation checklist for Salto KS remote-open: the IQs sorted by
// required action, inline PIN capture for pending activations, and the
// guided modal wizard for first activations. Completed IQs collapse to a
// single line. The page loads the IQs and hands them in with `reload`, which
// reads them anew; this component makes all wizard API calls and reloads
// after each step (ECCdigital/tickets#1107).
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import SaltoIqActivationWizardDialog from "./SaltoIqActivationWizardDialog.vue";
import {
  stateMeta,
  actionOrder,
  iqDisplayName,
  formatTimestamp,
} from "./iqActivationState";

export default {
  name: "SaltoIqActivationSection",
  components: { SaltoIqActivationWizardDialog },
  props: {
    tenantId: { type: String, required: true },
    // The IQs of the site as the backend lists them.
    iqs: { type: Array, required: true },
    // async () => void - reads the IQs anew after a step
    reload: { type: Function, required: true },
  },
  data() {
    return {
      busyIds: [],
      inlineErrors: {},
      pins: {},
      wizardIqId: null,
      discardIqId: null,
    };
  },
  computed: {
    sorted() {
      return [...this.iqs].sort((a, b) => actionOrder(a) - actionOrder(b));
    },
    wizardIq() {
      return this.iqs.find((iq) => iq.id === this.wizardIqId) || null;
    },
    discardIq() {
      return this.iqs.find((iq) => iq.id === this.discardIqId) || null;
    },
    // Discarding a pending activation only drops the stored secret; on any
    // state beyond that the system user stays activated at Salto, so a fresh
    // wizard run at that IQ only works with a new system user.
    discardWarningKey() {
      return this.discardIq && this.discardIq.state === "pending_pin"
        ? "accessPoint.tenant.salto.iq.discardConfirm.pendingText"
        : "accessPoint.tenant.salto.iq.discardConfirm.activatedWarning";
    },
  },
  methods: {
    stateMeta,
    iqDisplayName,
    formatTimestamp,
    busy(iq) {
      return this.busyIds.includes(iq.id);
    },
    pinFor(iq) {
      return this.pins[iq.id] || "";
    },
    setPin(iq, value) {
      this.$set(this.pins, iq.id, value);
    },
    errorMessage(error) {
      const data = error.response?.data;
      const code = typeof data === "object" ? data?.code : null;
      if (code) {
        const key = `accessPoint.tenant.salto.iq.errors.${code}`;
        if (this.$te(key)) return this.$t(key);
      }
      return getApiErrorMessage(
        error,
        (typeof data === "string" && data.trim()) ||
          error.message ||
          this.$t("accessPoint.tenant.salto.iq.errors.generic")
      );
    },
    // Runs one wizard step for an IQ, refreshes the list afterwards and
    // rethrows with a translated message for the caller to display.
    async run(iq, request) {
      this.busyIds.push(iq.id);
      this.$set(this.inlineErrors, iq.id, null);
      try {
        await request();
      } catch (error) {
        throw new Error(this.errorMessage(error));
      } finally {
        this.busyIds = this.busyIds.filter((id) => id !== iq.id);
      }
      await this.reload();
    },
    // The wizard dialog awaits these directly; the inline handlers below
    // wrap them and land the error on the IQ's row instead.
    runStart(iq) {
      return this.run(iq, () =>
        ApiAccessAppsService.startSaltoIqActivation(this.tenantId, iq.id)
      );
    },
    runComplete(iq, pin) {
      return this.run(iq, () =>
        ApiAccessAppsService.completeSaltoIqActivation(
          this.tenantId,
          iq.id,
          pin
        )
      );
    },
    async start(iq) {
      try {
        await this.runStart(iq);
      } catch (error) {
        this.$set(this.inlineErrors, iq.id, error.message);
      }
    },
    async complete(iq, pin) {
      try {
        await this.runComplete(iq, pin);
        this.$set(this.pins, iq.id, "");
      } catch (error) {
        this.$set(this.inlineErrors, iq.id, error.message);
      }
    },
    async confirmDiscard() {
      const iq = this.discardIq;
      this.discardIqId = null;
      if (!iq) return;
      try {
        await this.run(iq, () =>
          ApiAccessAppsService.discardSaltoIqActivation(this.tenantId, iq.id)
        );
      } catch (error) {
        this.$set(this.inlineErrors, iq.id, error.message);
      }
    },
    wizardStart() {
      return this.runStart(this.wizardIq);
    },
    wizardComplete(pin) {
      return this.runComplete(this.wizardIq, pin);
    },
  },
};
</script>

<template>
  <div>
    <v-alert v-if="!iqs.length" type="info" text dense class="mb-0">
      {{ $t("accessPoint.tenant.salto.iq.noIqs") }}
    </v-alert>

    <template v-else>
      <v-alert type="warning" text dense class="mb-4" icon="mdi-cellphone-off">
        {{ $t("accessPoint.tenant.salto.iq.appBan") }}
      </v-alert>

      <!-- Task list, sorted by required action -->
      <div v-for="iq in sorted" :key="iq.id" class="mb-2">
        <!-- Rendered outside the row so a failed discard on a collapsed
               (activated) row is visible too -->
        <v-alert
          v-if="inlineErrors[iq.id]"
          type="error"
          text
          dense
          class="mb-1"
        >
          {{ inlineErrors[iq.id] }}
        </v-alert>

        <!-- Completed IQs collapse to a single line -->
        <div
          v-if="stateMeta(iq).done"
          class="done-row d-flex align-center px-3 py-2"
        >
          <v-icon small color="success" class="mr-2">
            {{ stateMeta(iq).icon }}
          </v-icon>
          <span class="text-body-2 mr-2">{{ iqDisplayName(iq) }}</span>
          <span class="text-caption grey--text">
            <template v-if="stateMeta(iq).key === 'no_otp'">
              {{ $t("accessPoint.tenant.salto.iq.state.no_otp.doneNote") }}
            </template>
            <template v-else>
              {{ $t("accessPoint.tenant.salto.iq.state.activated.doneNote") }}
              {{ formatTimestamp(iq.activatedAt) }}
            </template>
          </span>
          <v-spacer />
          <v-btn
            v-if="stateMeta(iq).key === 'activated'"
            icon
            x-small
            :loading="busy(iq)"
            :title="$t('accessPoint.tenant.salto.iq.actions.discardTooltip')"
            @click="discardIqId = iq.id"
          >
            <v-icon x-small>mdi-link-off</v-icon>
          </v-btn>
        </div>

        <!-- Open tasks: everything directly on the surface -->
        <v-card v-else outlined class="task-card">
          <v-card-text>
            <div class="d-flex align-center mb-1">
              <v-avatar size="28" :color="stateMeta(iq).color" class="mr-3">
                <v-icon small dark>{{ stateMeta(iq).icon }}</v-icon>
              </v-avatar>
              <div>
                <span class="font-weight-medium">{{ iqDisplayName(iq) }}</span>
                <span class="text-caption grey--text ml-2">
                  {{
                    iq.online
                      ? $t("accessPoint.tenant.salto.iq.online")
                      : $t("accessPoint.tenant.salto.iq.offline")
                  }}
                </span>
              </div>
              <v-spacer />
              <v-chip x-small text-color="white" :color="stateMeta(iq).color">
                {{
                  $t(
                    `accessPoint.tenant.salto.iq.state.${
                      stateMeta(iq).key
                    }.label`
                  )
                }}
              </v-chip>
            </div>

            <div v-if="iq.lastError" class="text-caption grey--text mb-2">
              {{ $t("accessPoint.tenant.salto.iq.lastErrorLabel") }}
              <code>{{ iq.lastError }}</code>
            </div>

            <!-- Next step, per state -->
            <template v-if="stateMeta(iq).key === 'not_activated'">
              <div class="text-body-2 mb-2">
                <strong>
                  {{ $t("accessPoint.tenant.salto.iq.nextStepLabel") }}
                </strong>
                {{
                  $t("accessPoint.tenant.salto.iq.state.not_activated.nextStep")
                }}
              </div>
              <v-btn color="primary" small @click="wizardIqId = iq.id">
                <v-icon left small>mdi-play</v-icon>
                {{ $t("accessPoint.tenant.salto.iq.actions.start") }}
              </v-btn>
            </template>

            <template v-else-if="stateMeta(iq).key === 'pending_pin'">
              <div class="text-body-2 mb-2">
                <strong>
                  {{ $t("accessPoint.tenant.salto.iq.nextStepLabel") }}
                </strong>
                {{
                  $t("accessPoint.tenant.salto.iq.state.pending_pin.nextStep")
                }}
              </div>
              <div class="d-flex align-center flex-wrap">
                <v-otp-input
                  v-if="$vuetify.breakpoint.smAndUp"
                  length="4"
                  style="max-width: 220px"
                  :value="pinFor(iq)"
                  @input="setPin(iq, $event)"
                />
                <v-text-field
                  v-else
                  style="max-width: 140px"
                  :value="pinFor(iq)"
                  :label="$t('accessPoint.tenant.salto.iq.pinLabel')"
                  maxlength="4"
                  dense
                  filled
                  hide-details
                  @input="setPin(iq, $event)"
                />
                <v-btn
                  color="primary"
                  small
                  class="ml-3"
                  :loading="busy(iq)"
                  :disabled="pinFor(iq).length !== 4"
                  @click="complete(iq, pinFor(iq))"
                >
                  {{ $t("accessPoint.tenant.salto.iq.actions.complete") }}
                </v-btn>
                <v-btn text small :loading="busy(iq)" @click="start(iq)">
                  {{ $t("accessPoint.tenant.salto.iq.actions.resendMail") }}
                </v-btn>
                <v-btn
                  text
                  small
                  color="error"
                  :loading="busy(iq)"
                  @click="discardIqId = iq.id"
                >
                  {{ $t("accessPoint.tenant.salto.iq.actions.discard") }}
                </v-btn>
              </div>
            </template>

            <template v-else>
              <div class="text-body-2 mb-2">
                {{
                  $t(
                    `accessPoint.tenant.salto.iq.state.${
                      stateMeta(iq).key
                    }.nextStep`
                  )
                }}
              </div>
              <v-btn
                color="error"
                outlined
                small
                :loading="busy(iq)"
                @click="discardIqId = iq.id"
              >
                {{
                  $t("accessPoint.tenant.salto.iq.actions.discardAndRestart")
                }}
              </v-btn>
            </template>
          </v-card-text>
        </v-card>
      </div>
    </template>

    <!-- First-activation modal wizard -->
    <SaltoIqActivationWizardDialog
      :iq="wizardIq"
      :on-start="wizardStart"
      :on-complete="wizardComplete"
      @close="wizardIqId = null"
    />

    <!-- Discard confirmation -->
    <v-dialog
      :value="!!discardIq"
      max-width="480"
      persistent
      scrollable
      @input="discardIqId = null"
    >
      <v-card v-if="discardIq">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left color="error">mdi-alert</v-icon>
          <span class="text-h5">
            {{ $t("accessPoint.tenant.salto.iq.discardConfirm.title") }}
          </span>
          <v-spacer />
          <v-btn icon @click="discardIqId = null"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          {{ $t(discardWarningKey) }}
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="discardIqId = null">
            {{ $t("accessPoint.tenant.salto.iq.discardConfirm.cancel") }}
          </v-btn>
          <v-btn color="error" @click="confirmDiscard">
            <v-icon left small>mdi-delete</v-icon>
            {{ $t("accessPoint.tenant.salto.iq.discardConfirm.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.done-row {
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 4px;
  background: rgba(76, 175, 80, 0.05);
}
.task-card {
  border-left: 3px solid var(--v-primary-base);
}
</style>

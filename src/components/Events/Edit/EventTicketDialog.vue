<script>
import { mapGetters } from "vuex";
import AppDialog from "@/components/commons/AppDialog.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { normalizeBookable } from "@/utils/normalizeBookable";
import {
  applyTicketForm,
  defaultTicketTitle,
  hasTieredPrice,
  newTicket,
  parsePrice,
  ticketFormOf,
} from "@/utils/eventTickets";

/**
 * A ticket of the event in short (`eventTickets`): its name, how many there
 * are and the price per ticket. Without `ticketId` it creates one, named
 * after the event; with it, it edits that ticket and leaves everything else
 * of it as it is. „Detail-Modus öffnen“ leads to the ticket's editing page.
 * Emits `saved` and `close`.
 */
export default {
  name: "EventTicketDialog",
  components: { AppDialog },
  props: {
    open: { type: Boolean, required: true },
    ticketId: { type: String, default: null },
    eventId: { type: String, required: true },
    eventName: { type: String, default: "" },
    // The event's Teilnahmeplätze: the most tickets of one kind.
    maxAttendees: { type: Number, default: null },
  },
  data() {
    return {
      form: { title: "", amount: null, price: "" },
      ticket: null,
      template: null,
      loading: false,
      saving: false,
      failed: false,
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    isNew() {
      return !this.ticketId;
    },
    tiered() {
      return !!this.ticket && hasTieredPrice(this.ticket);
    },
    rules() {
      const max = this.maxAttendees;
      return {
        title: [(v) => !!(v || "").trim() || this.$t("validation.required")],
        amount: [
          (v) =>
            Number(v) >= 1 || this.$t("event.edit.tickets.dialog.amountMin"),
          (v) =>
            !max ||
            Number(v) <= max ||
            this.$t("event.edit.tickets.dialog.amountMax", { max }),
        ],
        price: [
          (v) =>
            parsePrice(v) !== null ||
            this.$t("event.edit.tickets.dialog.priceInvalid"),
        ],
      };
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (open) this.load();
      },
    },
  },
  methods: {
    async load() {
      this.failed = false;
      this.$refs.form?.resetValidation();
      this.loading = true;
      try {
        if (this.isNew) {
          this.ticket = null;
          this.template = (
            await ApiBookablesService.getBookableTemplate(this.tenantId)
          ).data;
          this.form = {
            title: defaultTicketTitle(this.eventName),
            amount: this.maxAttendees || null,
            price: "0,00",
          };
        } else {
          this.ticket = normalizeBookable(
            (await ApiBookablesService.getBookable(this.ticketId)).data
          );
          this.form = ticketFormOf(this.ticket);
        }
      } catch (error) {
        this.failed = true;
      } finally {
        this.loading = false;
      }
    },
    async save() {
      if (!this.$refs.form.validate()) return;
      this.saving = true;
      this.failed = false;
      try {
        const bookable = this.isNew
          ? newTicket(this.template || {}, this.eventId, this.form)
          : applyTicketForm(this.ticket, this.form);
        await ApiBookablesService.createOrUpdateBookable(bookable);
        this.$emit("saved");
        this.$emit("close");
      } catch (error) {
        this.failed = true;
      } finally {
        this.saving = false;
      }
    },
    openDetail() {
      this.$router.push({ name: "ticket-edit", query: { id: this.ticketId } });
    },
  },
};
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      isNew
        ? $t('event.edit.tickets.dialog.titleNew')
        : $t('event.edit.tickets.dialog.titleEdit')
    "
    :subtitle="eventName"
    icon="mdi-ticket-outline"
    :busy="saving"
    data-test="event-ticket-dialog"
    @close="$emit('close')"
  >
    <p class="text-body-2 text--secondary">
      {{ $t("event.edit.tickets.dialog.intro") }}
    </p>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-form v-else ref="form" @submit.prevent="save">
      <v-text-field
        v-model="form.title"
        :label="$t('event.edit.tickets.dialog.name') + ' *'"
        :rules="rules.title"
        outlined
        dense
        autofocus
        data-test="ticket-title"
      />
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.amount"
            :label="$t('event.edit.tickets.dialog.amount') + ' *'"
            :hint="
              maxAttendees
                ? $t('event.edit.tickets.dialog.amountHint', {
                    max: maxAttendees,
                  })
                : ''
            "
            :rules="rules.amount"
            type="number"
            min="1"
            :max="maxAttendees || undefined"
            persistent-hint
            outlined
            dense
            data-test="ticket-amount"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.price"
            :label="$t('event.edit.tickets.dialog.price')"
            :hint="
              tiered
                ? $t('event.edit.tickets.dialog.priceTiered')
                : $t('event.edit.tickets.dialog.priceHint')
            "
            :rules="tiered ? [] : rules.price"
            :disabled="tiered"
            suffix="€"
            inputmode="decimal"
            persistent-hint
            outlined
            dense
            data-test="ticket-price"
          />
        </v-col>
      </v-row>
    </v-form>
    <v-alert
      v-if="failed"
      type="error"
      text
      dense
      class="mt-4 mb-0"
      data-test="ticket-failed"
    >
      {{ $t("event.edit.tickets.dialog.failed") }}
    </v-alert>

    <template #actions-start>
      <v-btn
        v-if="!isNew"
        text
        color="primary"
        :disabled="saving"
        data-test="ticket-detail"
        @click="openDetail"
      >
        <v-icon small left>mdi-open-in-new</v-icon>
        {{ $t("event.edit.tickets.dialog.detail") }}
      </v-btn>
    </template>
    <template #actions>
      <v-btn text :disabled="saving" @click="$emit('close')">
        {{ $t("actions.cancel") }}
      </v-btn>
      <v-btn
        color="primary"
        depressed
        :loading="saving"
        :disabled="loading"
        data-test="ticket-save"
        @click="save"
      >
        {{ $t("actions.save") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import eventEditing from "@/mixins/eventEditing";
import { REGISTRATION, eventImagesOf } from "@/utils/eventEditing";
import { EVENT_FORMATS } from "@/utils/eventParticipationLink";

const FORMAT_KEYS = Object.freeze({
  [EVENT_FORMATS.PRESENCE]: "presence",
  [EVENT_FORMATS.HYBRID]: "hybrid",
  [EVENT_FORMATS.ONLINE]: "online",
});

/**
 * The overview beside the event editing page, as the bookable editor's
 * „Übersicht“: per tab what is entered, and what is missing although
 * required. Every heading and row leads to its tab and field (`go`).
 */
export default {
  name: "EventEditOverview",
  mixins: [eventEditing],
  props: {
    // The issues of the event (`eventIssues`), shown here at all times.
    issues: { type: Array, default: () => [] },
    tabs: { type: Array, required: true },
  },
  computed: {
    blocks() {
      const f = this.form;
      const info = f.information;
      const t = (key, params) => this.$t(`event.edit.${key}`, params);
      const portal = this.registrationMode === REGISTRATION.PORTAL;
      const date = (d, time) =>
        d
          ? `${new Date(`${d}T00:00:00`).toLocaleDateString("de-DE", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}${time ? `, ${time}` : ""}`
          : "";
      const rows = {
        general: [
          ["basics.name", info.name, "name"],
          ["basics.images", eventImagesOf(f).length || ""],
          ["features.label", (info.flags || []).join(", ")],
        ],
        date: [
          ["date.startDate", date(info.startDate, info.startTime), "start"],
          ["date.endDate", date(info.endDate, info.endTime), "end"],
        ],
        place: [
          [
            "place.format",
            t(`place.formats.${FORMAT_KEYS[f.format] || "presence"}`),
          ],
          ...(f.format !== EVENT_FORMATS.ONLINE
            ? [["place.name", f.eventLocation.name, "placeName"]]
            : []),
          ...(f.format !== EVENT_FORMATS.PRESENCE
            ? [["place.url", f.eventLocation.url, "url"]]
            : []),
        ],
        people: [
          ["organizer.name", f.eventOrganizer.name, "organizer"],
          ["contact.email", f.eventLocation.emailAddress, "emailAddress"],
        ],
        participation: [
          [
            "participation.question",
            t(`participation.${this.registrationMode}.label`),
          ],
          ...(portal
            ? [["participation.max", f.attendees.maxAttendees, "maxAttendees"]]
            : []),
          ...(this.registrationMode === REGISTRATION.EXTERNAL
            ? [
                [
                  "participation.externalUrl",
                  f.externalBookingUrl,
                  "externalBookingUrl",
                ],
              ]
            : []),
        ],
        program: [
          [
            null,
            (f.schedules || []).length
              ? t("overview.programCount", { count: f.schedules.length })
              : t("overview.programNone"),
          ],
        ],
        media: [
          [
            null,
            (f.attachments || []).length
              ? t("overview.attachments", { count: f.attachments.length })
              : "",
          ],
        ],
        tickets: [[null, portal ? "" : t("overview.noTicketNeeded")]],
      };
      return this.tabs
        .filter((tab) => rows[tab.key])
        .map((tab) => ({
          ...tab,
          rows: rows[tab.key]
            .filter((row) => !(tab.key === "tickets" && !row[1]))
            .map(([label, value, field]) => ({
              label: label ? t(label) : "",
              value: value === null || value === undefined ? "" : String(value),
              field,
              missing: field
                ? this.issues.some((issue) => issue.field === field)
                : false,
            })),
        }))
        .filter((block) => block.rows.length);
    },
  },
};
</script>

<template>
  <aside
    class="event-overview"
    :aria-label="$t('event.edit.overview.title')"
    data-test="event-overview"
  >
    <v-card outlined class="section-card">
      <v-card-title class="section-header">
        <v-icon>mdi-clipboard-text-outline</v-icon>
        <span>{{ $t("event.edit.overview.title") }}</span>
      </v-card-title>
      <v-divider />
      <div class="event-overview__body">
        <section
          v-for="block in blocks"
          :key="block.key"
          class="event-overview__block"
        >
          <button
            type="button"
            class="event-overview__title"
            @click="$emit('go', { tab: block.key })"
          >
            <v-icon small>{{ block.icon }}</v-icon>
            {{ $t(block.labelKey) }}
          </button>
          <button
            v-for="(row, index) in block.rows"
            :key="index"
            type="button"
            class="event-overview__row"
            :data-test="row.field ? `overview-${row.field}` : null"
            @click="$emit('go', { tab: block.key, field: row.field })"
          >
            <span v-if="row.label" class="event-overview__label">
              {{ row.label }}
            </span>
            <span
              class="event-overview__value"
              :class="{ 'event-overview__value--empty': !row.value }"
            >
              {{ row.value || $t("event.edit.overview.empty") }}
            </span>
            <span v-if="row.missing" class="event-overview__issue">
              <v-icon x-small color="error">mdi-alert-circle-outline</v-icon>
              {{ $t("event.edit.overview.missing") }}
            </span>
          </button>
        </section>
      </div>
    </v-card>
  </aside>
</template>

<style scoped>
.event-overview__body {
  padding: var(--scb-space-2);
}

.event-overview__block + .event-overview__block {
  margin-top: var(--scb-space-1);
  padding-top: var(--scb-space-1);
  border-top: 1px solid var(--scb-rule);
}

.event-overview__title,
.event-overview__row {
  display: flex;
  width: 100%;
  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  border-radius: var(--scb-radius-control);
  cursor: pointer;
  transition: background-color var(--scb-motion-fast);
}

.event-overview__title:hover,
.event-overview__row:hover {
  background-color: var(--scb-hover-tint);
}

.event-overview__title:focus-visible,
.event-overview__row:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--v-primary-base);
}

.event-overview__title {
  align-items: center;
  gap: var(--scb-space-1);
  padding: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
}

.event-overview__title .v-icon {
  color: inherit;
}

.event-overview__row {
  flex-wrap: wrap;
  align-items: baseline;
  padding: 2px var(--scb-space-1) 2px var(--scb-space-6);
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-base);
}

.event-overview__label {
  flex: 0 0 42%;
  padding-right: var(--scb-space-2);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.event-overview__value {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: var(--scb-font-weight-medium);
  overflow-wrap: anywhere;
}

.event-overview__value--empty {
  font-weight: normal;
  color: var(--scb-text-caption);
}

.event-overview__issue {
  flex: 1 1 100%;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}
</style>

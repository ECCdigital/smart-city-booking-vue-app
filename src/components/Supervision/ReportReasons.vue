<template>
  <div class="report-reasons" data-test="report-reasons">
    <div
      v-for="(entry, index) in reasons"
      :key="index"
      class="report-reasons__entry"
    >
      <div class="report-reasons__meta">
        {{
          index === 0
            ? $t("supervision.reports.reported", {
                tenant: report.tenantName,
                by: entry.reportedBy,
                date: dateTime(entry.reportedAt),
              })
            : $t("supervision.reports.added", {
                by: entry.reportedBy,
                date: dateTime(entry.reportedAt),
              })
        }}
        <span v-if="entry.bookingId">
          ·
          {{ $t("supervision.reports.booking", { id: entry.bookingId }) }}
        </span>
      </div>
      <div class="report-reasons__text">{{ entry.reason }}</div>
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";
import { reportReasons } from "@/utils/reports";

/**
 * One report of a tenant (glossary „Meldung“, ECCdigital/tickets#630) with
 * all its reasons: who reported it when, then who added to it, each with
 * the booking it came from. Shared by the open reports of the review queue
 * and the reports a suspension links.
 */
export default {
  name: "ReportReasons",
  props: {
    /** A report as `GET /api/instances/reports` answers it. */
    report: {
      type: Object,
      required: true,
    },
  },
  computed: {
    reasons() {
      return reportReasons(this.report);
    },
  },
  methods: {
    dateTime: (value) => FormatService.dateTime(value),
  },
};
</script>

<style scoped>
/* The report of one tenant: its reasons under a hairline at the left. */
.report-reasons {
  padding-left: var(--scb-space-3);
  border-left: 2px solid var(--scb-rule);
}

.report-reasons__entry + .report-reasons__entry {
  margin-top: var(--scb-space-1);
}

.report-reasons__meta {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.report-reasons__text {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  white-space: pre-line;
}
</style>

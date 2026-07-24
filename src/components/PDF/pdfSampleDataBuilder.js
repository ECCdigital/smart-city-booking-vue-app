import { SAMPLE_DATA } from "@/components/Mail/templateVariables.js";
import {
  resolveBookingTableMeta,
  buildCompactMetaHtml,
} from "@/components/PDF/pdfBookingTableMeta.js";
import {
  PDF_BOOKING_LAYOUTS,
  DEFAULT_PDF_BOOKING_LAYOUT,
} from "@/components/PDF/pdfBookingLayoutConstants.js";

function resolveLayout(layout) {
  return PDF_BOOKING_LAYOUTS.includes(layout)
    ? layout
    : DEFAULT_PDF_BOOKING_LAYOUT;
}

function renderPartial(Handlebars, data) {
  return Handlebars.compile("{{> pdfBookingItemsTable }}")(data);
}

function buildSummaryItems(items = []) {
  return items.map((item) => ({
    label: item.title,
    amount: item.amount,
  }));
}

function enrichBooking(booking, items, { includePayment = false } = {}) {
  return {
    ...booking,
    hasPayment: includePayment,
    summaryItems: booking.summaryItems || buildSummaryItems(items),
  };
}

function enrichBookings(bookings = []) {
  return bookings.map((row) => ({
    ...row,
    summaryItems:
      row.summaryItems || buildSummaryItems(row.items || []),
  }));
}

/**
 * Builds preview sample data for the PDF template editor, rendering
 * bookingEntries / mainContent with the same partials as the backend.
 */
export function buildPdfPreviewSampleData(
  templateType,
  layout,
  Handlebars,
  pdfBookingTableMeta = null,
) {
  const base = SAMPLE_DATA[templateType];
  if (!base || !Handlebars) {
    return base || {};
  }

  const resolvedLayout = resolveLayout(layout);
  const includePayment = templateType === "receipt";
  const booking = enrichBooking(base.booking, base.items, {
    includePayment,
  });
  const bookings = enrichBookings(base.bookings);
  const tableMeta = resolveBookingTableMeta(
    pdfBookingTableMeta ? { pdfBookingTableMeta } : null,
  );

  const tablePayload = {
    layout: resolvedLayout,
    items: base.items,
    coupon: base.coupon,
    totals: base.totals,
    booking,
    tableMeta,
    compactMetaHtml: buildCompactMetaHtml(booking, tableMeta),
  };

  const result = {
    ...base,
    booking,
    bookings,
  };

  if (templateType === "receipt") {
    result.bookingEntries = renderPartial(Handlebars, {
      ...tablePayload,
      tableClass: "booking-detail",
    });
  } else {
    result.mainContent = renderPartial(Handlebars, {
      ...tablePayload,
      tableClass: "booked-items",
      booking: enrichBooking(base.booking, base.items, {
        includePayment: false,
      }),
    });
  }

  return result;
}

export { DEFAULT_PDF_BOOKING_LAYOUT } from "@/components/PDF/pdfBookingLayoutConstants.js";

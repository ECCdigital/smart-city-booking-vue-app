export function groupUsesInvoicePayment(bookings = []) {
  const validBookings = bookings.filter(Boolean);
  return (
    validBookings.length > 0 &&
    validBookings.every((b) => b.paymentProvider === "invoice")
  );
}

/**
 * The members' attachments of one `type`, each counted once across the
 * series (an aggregated document hangs on every member), newest first.
 * `keyOf` names the attachment: invoices by file name, cancellation
 * receipts by title - an untitled one by itself, so that two of them
 * are not read as one.
 */
function collectGroupAttachments(bookings, type, keyOf) {
  const seen = new Set();
  const attachments = [];

  for (const booking of bookings) {
    if (!booking) continue;

    for (const attachment of booking.attachments || []) {
      if (attachment.type !== type) continue;

      const key = keyOf(attachment);
      if (seen.has(key)) continue;

      seen.add(key);
      attachments.push({
        ...attachment,
        bookingId: booking.id,
      });
    }
  }

  return attachments.sort(
    (a, b) => new Date(b.timeCreated || 0) - new Date(a.timeCreated || 0)
  );
}

export function collectGroupInvoices(bookings = []) {
  return collectGroupAttachments(
    bookings,
    "invoice",
    (attachment) =>
      attachment.name || `${attachment.invoiceId}-${attachment.revision ?? 0}`
  );
}

export function collectGroupCancellationReceipts(bookings = []) {
  return collectGroupAttachments(
    bookings,
    "cancellation",
    (attachment) => attachment.title ?? attachment
  );
}

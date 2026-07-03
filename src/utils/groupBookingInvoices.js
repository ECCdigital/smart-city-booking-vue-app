export function groupUsesInvoicePayment(bookings = []) {
  return bookings.length > 0 && bookings.every((b) => b.paymentProvider === "invoice");
}

export function collectGroupInvoices(bookings = []) {
  const seen = new Set();
  const invoices = [];

  for (const booking of bookings) {
    for (const attachment of booking.attachments || []) {
      if (attachment.type !== "invoice") continue;

      const key =
        attachment.name ||
        `${attachment.invoiceId}-${attachment.revision ?? 0}`;
      if (seen.has(key)) continue;

      seen.add(key);
      invoices.push({
        ...attachment,
        bookingId: booking.id,
      });
    }
  }

  return invoices.sort(
    (a, b) => new Date(b.timeCreated || 0) - new Date(a.timeCreated || 0)
  );
}

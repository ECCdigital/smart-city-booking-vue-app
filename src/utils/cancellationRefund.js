export function getCancellationRefundAudit(booking) {
  if (!booking?.isRejected) {
    return null;
  }

  if (booking.cancellationRefund) {
    return booking.cancellationRefund;
  }

  const attachments = Array.isArray(booking.attachments)
    ? booking.attachments
    : [];
  const cancellationAttachments = attachments
    .filter((item) => item.type === "cancellation" && item.cancellation)
    .sort(
      (left, right) => Number(right.timeCreated || 0) - Number(left.timeCreated || 0)
    );

  return cancellationAttachments[0]?.cancellation || null;
}

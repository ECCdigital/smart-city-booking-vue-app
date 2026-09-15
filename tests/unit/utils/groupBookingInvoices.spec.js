import { describe, expect, it } from "vitest";
import {
  collectGroupCancellationReceipts,
  collectGroupInvoices,
  collectGroupReceipts,
} from "@/utils/groupBookingInvoices";

/**
 * A series' documents hang on every member: an aggregated invoice or
 * cancellation receipt is listed once, a member's own beside it, newest
 * first, each knowing the member it is downloaded from.
 */
describe("collectGroupCancellationReceipts", () => {
  const aggregated = {
    type: "cancellation",
    title: "storno-serie.pdf",
    timeCreated: 1_700_000_000_000,
  };

  it("lists the aggregated receipt once and a member's own beside it", () => {
    const own = {
      type: "cancellation",
      title: "storno-bk-2.pdf",
      timeCreated: 1_700_000_100_000,
    };
    const receipts = collectGroupCancellationReceipts([
      { id: "bk-1", attachments: [aggregated] },
      { id: "bk-2", attachments: [aggregated, own] },
    ]);

    expect(receipts.map((r) => [r.title, r.bookingId])).toEqual([
      ["storno-bk-2.pdf", "bk-2"],
      ["storno-serie.pdf", "bk-1"],
    ]);
  });

  it("lists an untitled receipt of each member, none swallowed by the other", () => {
    const receipts = collectGroupCancellationReceipts([
      { id: "bk-1", attachments: [{ type: "cancellation", timeCreated: 1 }] },
      { id: "bk-2", attachments: [{ type: "cancellation", timeCreated: 2 }] },
    ]);

    expect(receipts.map((r) => r.bookingId)).toEqual(["bk-2", "bk-1"]);
  });

  it("leaves the other attachments to their own lists", () => {
    const invoice = { type: "invoice", name: "re-1.pdf" };
    const members = [{ id: "bk-1", attachments: [aggregated, invoice] }, null];

    expect(collectGroupCancellationReceipts(members)).toHaveLength(1);
    expect(collectGroupInvoices(members)).toEqual([
      { ...invoice, bookingId: "bk-1" },
    ]);
  });
});

describe("collectGroupReceipts", () => {
  const aggregated = {
    type: "receipt",
    title: "beleg-serie.pdf",
    timeCreated: 1_700_000_000_000,
  };

  it("lists the aggregated receipt once and a member's own beside it, newest first", () => {
    const own = {
      type: "receipt",
      title: "beleg-bk-2.pdf",
      timeCreated: 1_700_000_100_000,
    };
    const receipts = collectGroupReceipts([
      { id: "bk-1", attachments: [aggregated] },
      { id: "bk-2", attachments: [aggregated, own] },
    ]);

    expect(receipts.map((r) => [r.title, r.bookingId])).toEqual([
      ["beleg-bk-2.pdf", "bk-2"],
      ["beleg-serie.pdf", "bk-1"],
    ]);
  });

  it("lists an untitled receipt of each member, none swallowed by the other", () => {
    const receipts = collectGroupReceipts([
      { id: "bk-1", attachments: [{ type: "receipt", timeCreated: 1 }] },
      { id: "bk-2", attachments: [{ type: "receipt", timeCreated: 2 }] },
    ]);

    expect(receipts.map((r) => r.bookingId)).toEqual(["bk-2", "bk-1"]);
  });

  it("leaves invoices and cancellation receipts to their own lists", () => {
    const members = [
      {
        id: "bk-1",
        attachments: [
          aggregated,
          { type: "invoice", name: "re-1.pdf" },
          { type: "cancellation", title: "storno.pdf" },
        ],
      },
      null,
    ];

    expect(collectGroupReceipts(members).map((r) => r.title)).toEqual([
      "beleg-serie.pdf",
    ]);
  });
});

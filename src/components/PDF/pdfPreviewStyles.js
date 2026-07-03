// Keep in sync with PRINT_CSS pdf-items rules in pdf-service.js

export const PDF_ITEMS_PREVIEW_CSS = `
  table.pdf-items { width: 100%; border-collapse: collapse; }
  table.pdf-items--summary td {
    padding: 3px 6px;
    font-size: 10px;
    line-height: 1.4;
    vertical-align: top;
    border-bottom: 1px solid #ddd;
  }
  table.pdf-items--summary td.label { width: 40%; color: #333; }
  table.pdf-items--summary td.value { text-align: right; }
  table.pdf-items--summary tr.totals td { font-weight: bold; }
  table.pdf-items--summary tr.objects td.value { line-height: 1.5; }
  table.pdf-items--summary tr.booking-sep td {
    border-top: 2px solid #bbb;
    padding-top: 6px;
    border-bottom: none;
  }
  table.pdf-items--compact th,
  table.pdf-items--compact td {
    padding: 2px 6px;
    font-size: 9px;
    line-height: 1.4;
    vertical-align: top;
    border: none;
    text-align: left;
  }
  table.pdf-items--compact thead th {
    background: #eee;
    border-bottom: 1px solid #bbb;
    font-weight: bold;
  }
  table.pdf-items--compact tbody tr.item:nth-child(even) td { background: #f5f5f5; }
  table.pdf-items--compact .num { text-align: right; white-space: nowrap; }
  table.pdf-items--compact td.sub {
    color: #555;
    font-size: 8px;
    padding-top: 0;
    padding-bottom: 4px;
  }
  table.pdf-items--compact tr.coupon td { color: #555; }
  table.pdf-items--compact tr.totals-sub td {
    padding-top: 4px;
    border-top: 2px solid #000;
    text-align: right;
    color: #444;
  }
  table.pdf-items--compact tr.brutto td {
    font-weight: bold;
    font-size: 10px;
    border-bottom: 2px solid #000;
    padding-bottom: 4px;
    background: none;
    text-align: right;
  }
  table.pdf-items--compact tr.brutto td:first-child,
  table.pdf-items--compact tr.totals-sub td:first-child { text-align: left; }
  table.pdf-items--compact tr.meta td {
    font-size: 10px;
    color: #444;
    background: none;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
  }
  table.pdf-items--detailed th,
  table.pdf-items--detailed td {
    padding: 4px 6px;
    font-size: 10px;
    line-height: 1.4;
    vertical-align: top;
    border: none;
    text-align: left;
  }
  table.pdf-items--detailed thead th {
    background: #eee;
    border-bottom: 1px solid #bbb;
    font-weight: bold;
  }
  table.pdf-items--detailed tbody tr.item:nth-child(even) td { background: #f5f5f5; }
  table.pdf-items--detailed .num { text-align: right; white-space: nowrap; }
  .pdf-booking-meta {
    font-size: 10px;
    color: #666;
    line-height: 1.6;
    margin: 0 0 8px;
  }
  table.pdf-items--detailed td.sub {
    color: #555;
    font-size: 9px;
    padding-top: 0;
    padding-bottom: 6px;
  }
  table.pdf-items--detailed ul.item-list {
    margin: 4px 0 0;
    padding-left: 18px;
  }
  table.pdf-items--detailed tr.coupon td { color: #555; }
  table.pdf-items--detailed tr.netto td {
    padding-top: 8px;
    border-top: 2px solid #000;
  }
  table.pdf-items--detailed tr.netto td,
  table.pdf-items--detailed tr.mwst td,
  table.pdf-items--detailed tr.brutto td { text-align: right; }
  table.pdf-items--detailed tr.netto td:first-child,
  table.pdf-items--detailed tr.mwst td:first-child,
  table.pdf-items--detailed tr.brutto td:first-child { text-align: left; }
  table.pdf-items--detailed tr.brutto td {
    font-weight: bold;
    border-bottom: 2px solid #000;
    padding-bottom: 4px;
  }
`;

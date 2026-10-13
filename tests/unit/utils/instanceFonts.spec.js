import { afterEach, describe, expect, it, vi } from "vitest";
import { brotliCompressSync } from "node:zlib";
import { fontDefaultWeight } from "@/utils/instanceFonts";

// The tags of the woff2 table directory by index (W3C WOFF2, 5.1).
const KNOWN_TAGS = { glyf: 10, loca: 11, gasp: 17, fvar: 47 };

function base128(value) {
  const bytes = [value & 0x7f];
  for (let rest = value >>> 7; rest > 0; rest >>>= 7) {
    bytes.unshift((rest & 0x7f) | 0x80);
  }
  return bytes;
}

function ascii(text) {
  return [...text].map((char) => char.charCodeAt(0));
}

/** An `fvar` table with the axes `[tag, min, default, max]`. */
function fvar(axes) {
  const view = new DataView(new ArrayBuffer(16 + axes.length * 20));
  view.setUint16(0, 1);
  view.setUint16(4, 16);
  view.setUint16(6, 2);
  view.setUint16(8, axes.length);
  view.setUint16(10, 20);
  axes.forEach(([tag, min, value, max], index) => {
    const offset = 16 + index * 20;
    ascii(tag).forEach((byte, i) => view.setUint8(offset + i, byte));
    view.setInt32(offset + 4, min * 65536);
    view.setInt32(offset + 8, value * 65536);
    view.setInt32(offset + 12, max * 65536);
  });
  return new Uint8Array(view.buffer);
}

/**
 * A woff2 file of the given tables. A table either has a known tag or is
 * written with its tag in full; `glyf` and `loca` stay transformed, as a
 * real encoder leaves them, so their directory entry carries two lengths.
 */
function woff2(tables) {
  // Untransformed tables carry the original length alone.
  const entries = [];
  for (const { tag, data } of tables) {
    const index = KNOWN_TAGS[tag];
    entries.push(index === undefined ? 63 : index);
    if (index === undefined) entries.push(...ascii(tag));
    const transformed = tag === "glyf" || tag === "loca";
    entries.push(...base128(transformed ? data.length + 10 : data.length));
    if (transformed) entries.push(...base128(data.length));
  }
  const stream = brotliCompressSync(
    Buffer.concat(tables.map(({ data }) => Buffer.from(data)))
  );
  const header = new DataView(new ArrayBuffer(48));
  ascii("wOF2").forEach((byte, i) => header.setUint8(i, byte));
  header.setUint32(4, 0x00010000);
  header.setUint32(8, 48 + entries.length + stream.length);
  header.setUint16(12, tables.length);
  header.setUint32(20, stream.length);
  const file = Buffer.concat([
    Buffer.from(header.buffer),
    Buffer.from(entries),
    stream,
  ]);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.length);
}

const glyf = { tag: "glyf", data: new Uint8Array(64).fill(7) };
const loca = { tag: "loca", data: new Uint8Array(8) };
const gasp = { tag: "gasp", data: new Uint8Array(12).fill(1) };

afterEach(() => vi.unstubAllGlobals());

describe("fontDefaultWeight", () => {
  it("reads the default of the weight axis of a variable font", async () => {
    const file = woff2([
      gasp,
      { tag: "fvar", data: fvar([["wght", 200, 200, 900]]) },
      glyf,
      loca,
    ]);

    expect(await fontDefaultWeight(file)).toBe(200);
  });

  it("finds the weight among other axes and behind tables with a full tag", async () => {
    const file = woff2([
      { tag: "STAT", data: new Uint8Array(20).fill(3) },
      gasp,
      {
        tag: "fvar",
        data: fvar([
          ["opsz", 14, 14, 32],
          ["wght", 100, 400, 900],
        ]),
      },
      glyf,
      loca,
    ]);

    expect(await fontDefaultWeight(file)).toBe(400);
  });

  it("has none for a static font or a variable font without weight axis", async () => {
    expect(await fontDefaultWeight(woff2([gasp, glyf, loca]))).toBeNull();
    expect(
      await fontDefaultWeight(
        woff2([{ tag: "fvar", data: fvar([["wdth", 75, 100, 125]]) }, glyf])
      )
    ).toBeNull();
  });

  it("has none for a file that is no woff2", async () => {
    const ttf = new Uint8Array([0, 1, 0, 0, 0, 4, 0, 0]).buffer;

    expect(await fontDefaultWeight(ttf)).toBeNull();
  });

  it("has none in a browser that cannot unpack Brotli", async () => {
    const file = woff2([{ tag: "fvar", data: fvar([["wght", 1, 200, 900]]) }]);
    vi.stubGlobal(
      "DecompressionStream",
      class {
        constructor(format) {
          throw new TypeError(`Unsupported compression format: '${format}'`);
        }
      }
    );

    expect(await fontDefaultWeight(file)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
describe("the preview file of IBM Plex Sans", () => {
  const sha256 = (name) =>
    createHash("sha256")
      .update(readFileSync(resolve("public/fonts/preview", name)))
      .digest("hex");

  // `fonts/split/woff2/IBM Plex Sans Var-Roman-Latin1.woff2` and
  // `LICENSE.txt` of `@ibm/plex-sans-variable` 0.2.0. Its licence reserves
  // the name "Plex": a subset cut by anyone but IBM, Fontsource's included,
  // is a Modified Version that may not carry it, so the file is IBM's own,
  // byte for byte and only renamed.
  it("is IBM's own latin1 file with IBM's licence", () => {
    expect(sha256("ibm-plex-sans.woff2")).toBe(
      "a18d94ea83c93f0a465d0976d8bc8ecbb031225dbaf76fd201d4e724a972034f"
    );
    expect(sha256("ibm-plex-sans-OFL.txt")).toBe(
      "7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da"
    );
  });
});

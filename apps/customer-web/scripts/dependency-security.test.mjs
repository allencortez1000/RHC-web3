import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Local dependency regression checks only. No provider, wallet or API calls.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const json = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const manifest = json("package.json");
const lock = json("package-lock.json").packages;
function atLeast(value, minimum) {
  assert.match(value, /^\d+\.\d+\.\d+$/, "Only stable exact versions are accepted");
  const a = value.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

test("both frontend manifests and installed Next agree on a patched 15.5 release", () => {
  const customer = json("apps/customer-web/package.json").dependencies.next;
  const admin = json("apps/admin-web/package.json").dependencies.next;
  assert.equal(customer, admin);
  assert.match(customer, /^15\.5\.\d+$/);
  assert.ok(atLeast(customer, "15.5.27"));
  assert.equal(require("next/package.json").version, customer);
});

test("Next lint configuration stays aligned with the frontend framework", () => {
  assert.equal(manifest.devDependencies["eslint-config-next"], json("apps/customer-web/package.json").dependencies.next);
  assert.equal(require("eslint-config-next/package.json").version, manifest.devDependencies["eslint-config-next"]);
});

test("source-map-js resolves to the patched pinned release", () => {
  const pinned = manifest.overrides["source-map-js"];
  assert.ok(atLeast(pinned, "1.2.2"));
  assert.equal(require("source-map-js/package.json").version, pinned);
  assert.equal(lock["node_modules/source-map-js"].version, pinned);
});

test("source map generation and lookup retain ordinary mapping behavior", () => {
  const { SourceMapGenerator, SourceMapConsumer } = require("source-map-js");
  const generator = new SourceMapGenerator({ file: "synthetic-output.css" });
  generator.addMapping({ generated: { line: 1, column: 0 }, original: { line: 2, column: 3 }, source: "synthetic-input.css" });
  const consumer = new SourceMapConsumer(generator.toJSON());
  assert.deepEqual(consumer.originalPositionFor({ line: 1, column: 0 }), { source: "synthetic-input.css", line: 2, column: 3, name: null });
});

test("Sharp package and native runtime agree on the patched version", () => {
  const pinned = manifest.overrides.sharp;
  assert.ok(atLeast(pinned, "0.35.5"));
  assert.equal(json("node_modules/sharp/package.json").version, pinned);
  assert.equal(require("sharp").versions.sharp, pinned);
});

test("bundled SVG rasterizer includes the security-fixed librsvg", () => {
  const version = require("sharp").versions.rsvg;
  assert.equal(typeof version, "string");
  assert.ok(atLeast(version, "2.63.2"));
});

test("Sharp still rasterizes a tiny self-contained synthetic SVG", async () => {
  const sharp = require("sharp");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="black"/></svg>');
  const png = await sharp(svg).resize(1, 1).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1);
  assert.equal(metadata.height, 1);
});

test("Linux and Windows native image packages remain pinned to patched artifacts", () => {
  assert.equal(lock["node_modules/@img/sharp-linux-x64"].version, manifest.overrides.sharp);
  assert.equal(lock["node_modules/@img/sharp-win32-x64"].version, manifest.overrides.sharp);
  assert.ok(atLeast(lock["node_modules/@img/sharp-libvips-linux-x64"].version, "1.3.4"));
});

test("the existing PostCSS security override is retained", () => {
  assert.equal(manifest.overrides["postcss@8.4.31"], "8.5.28");
  assert.equal(require("postcss/package.json").version, "8.5.28");
});

test("runtime audit threshold and shared Thirdweb SDK are not weakened or downgraded", () => {
  assert.equal(manifest.scripts["audit:runtime"], "npm audit --omit=dev --audit-level=high");
  assert.equal(json("apps/customer-web/package.json").dependencies.thirdweb, "5.121.6");
  assert.equal(json("packages/web3/package.json").dependencies.thirdweb, "5.121.6");
  assert.equal(lock["node_modules/thirdweb"].version, "5.121.6");
});
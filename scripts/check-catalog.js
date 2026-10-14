#!/usr/bin/env node
// Sanity-checks the catalog (content/ via data.js) so a typo is caught before it reaches the live site.
// Run:  npm run check
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const data = require(path.join(root, "data.js"));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const dupes = (arr) => arr.filter((v, i) => arr.indexOf(v) !== i);
let optimized = {};
try { optimized = require(path.join(root, "assets/opt/manifest.js")); } catch (e) { warn("assets/opt/manifest.js missing — run `npm run images`"); }
const seen = new Set();
const checkFile = (ref, where) => {
  if (seen.has(ref)) return;
  seen.add(ref);
  if (!ref) return err(`${where}: image path is missing`);
  const abs = path.join(root, ref);
  if (!fs.existsSync(abs)) return err(`${where}: file not found → ${ref}`);
  if (!optimized[ref]) warn(`${where}: ${ref} has no small mobile versions — run \`npm run images\``);
};

const { settings, products, gridCards, categories } = data;

for (const k of ["freeShippingOver", "flatShipping", "taxRate"]) {
  if (typeof settings[k] !== "number" || settings[k] < 0) err(`settings.${k} must be a number ≥ 0`);
}

if (!/^pk_(test|live)_/.test(settings.stripePublishableKey || "")) err("settings.stripePublishableKey must start with pk_test_ or pk_live_");

dupes(products.map(p => p.id)).forEach(d => err(`Duplicate product id "${d}"`));
dupes(products.map(p => p.slug)).forEach(d => err(`Duplicate product slug "${d}"`));

const catKeys = categories.map(c => c.key);
for (const p of products) {
  const w = `Product "${p.id}"`;
  for (const f of ["id", "slug", "name", "category", "categoryKey", "description"]) {
    if (!p[f]) err(`${w}: missing "${f}"`);
  }
  if (!Number.isInteger(p.price) || p.price <= 0) err(`${w}: price must be a whole number of dollars > 0 (got ${p.price})`);
  if (!catKeys.includes(p.categoryKey)) err(`${w}: categoryKey "${p.categoryKey}" is not in categories (${catKeys.join(", ")})`);
  if (!p.colors?.length) err(`${w}: needs at least one colour`);
  else {
    dupes(p.colors.map(c => c.id)).forEach(d => err(`${w}: duplicate colour id "${d}"`));
    if (!p.colors.some(c => c.id === p.defaultColor)) err(`${w}: defaultColor "${p.defaultColor}" is not one of its colours`);
    for (const c of p.colors) {
      if (!/^#[0-9a-f]{6}$/i.test(c.hex || "")) err(`${w} / ${c.id}: hex must look like #1a2b3c`);
      checkFile(c.front, `${w} / ${c.id} front`);
      checkFile(c.back, `${w} / ${c.id} back`);
      if (c.cutout) checkFile(c.cutout, `${w} / ${c.id} cutout`);
    }
  }
  if (!p.sizes?.length) err(`${w}: needs at least one size`);
  else {
    dupes(p.sizes.map(s => s.id)).forEach(d => err(`${w}: duplicate size id "${d}"`));
    if (p.sizes.every(s => s.soldOut)) warn(`${w}: every size is sold out`);
  }
}

for (const [i, g] of gridCards.entries()) {
  const w = `gridCards[${i}]`;
  const p = products.find(x => x.id === g.productId);
  if (!p) { err(`${w}: productId "${g.productId}" doesn't match any product`); continue; }
  if (!p.colors.some(c => c.id === g.colorId)) err(`${w}: colorId "${g.colorId}" isn't a colour of ${p.id}`);
  if (g.overrideImg) checkFile(g.overrideImg, `${w} overrideImg`);
  if (g.overridePrice || g.overrideName) {
    warn(`${w}: "${g.overrideName || p.name}" shows a custom price/name, but adding it to the bag charges the normal price of ${p.id} ($${p.price}). Only use overrides for display.`);
  }
}
for (const p of products) {
  if (!gridCards.some(g => g.productId === p.id)) warn(`Product "${p.id}" is not in gridCards, so it won't show on the home page`);
}
for (const c of categories) checkFile(c.img, `Category "${c.key}"`);

// The checkout server must see exactly what the storefront shows.
try {
  const server = require(path.join(root, "api/_lib/products.js"));
  for (const p of products) {
    if (server.PRICES[p.id] !== p.price) err(`Server price for "${p.id}" doesn't match data.js`);
  }
  const t = server.priceCart([{ productId: products[0].id, colorId: products[0].colors[0].id, sizeId: (products[0].sizes.find(z => !z.soldOut) || {}).id, qty: 1 }]);
  const expect = data.computeTotals(products[0].price);
  if (t.total !== expect.total) err("Server cart total differs from storefront total");
} catch (e) {
  err(`api/_lib/products.js failed to load: ${e.message}`);
}

warnings.forEach(m => console.log("⚠  " + m));
errors.forEach(m => console.log("✗  " + m));
if (errors.length) {
  console.log(`\n${errors.length} problem(s) — fix these before pushing.`);
  process.exit(1);
}
console.log(`\n✓ Catalog OK — ${products.length} products, ${gridCards.length} grid cards${warnings.length ? `, ${warnings.length} warning(s)` : ""}.`);

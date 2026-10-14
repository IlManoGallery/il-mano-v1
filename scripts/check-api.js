#!/usr/bin/env node
// Self-check for the checkout server's money/validation/email code. Runs in `npm run check` and the build.
const assert = require("assert");
const path = require("path");
const root = path.join(__dirname, "..");
const data = require(path.join(root, "data.js"));
const { priceCart } = require(path.join(root, "api/_lib/products.js"));
const { orderConfirmationHtml } = require(path.join(root, "api/_lib/email.js"));

const p = data.products.find(x => x.sizes.some(s => !s.soldOut));
const size = p.sizes.find(s => !s.soldOut).id;
const line = { productId: p.id, colorId: p.colors[0].id, sizeId: size, qty: 2 };

assert.strictEqual(priceCart([line]).subtotal, p.price * 2, "subtotal");
const bad = (it) => assert.throws(() => priceCart(it), undefined, JSON.stringify(it));
bad([]);
bad(Array(16).fill(line));                       // too many lines for Stripe metadata
bad([{ ...line, productId: "constructor" }]);    // inherited object keys aren't products
bad([{ ...line, colorId: "nope" }]);
bad([{ ...line, sizeId: "nope" }]);
bad([{ ...line, qty: 0 }]);
bad([{ ...line, qty: 21 }]);
const sold = p.sizes.find(s => s.soldOut);
if (sold) bad([{ ...line, sizeId: sold.id }]);

const html = orderConfirmationHtml({
  id: "pi_1", amount: 100, subtotal: 1, shipping: 0, tax: 0, createdAt: new Date().toISOString(),
  firstName: "<b>x</b>", cart: [{ id: p.id, c: line.colorId, s: size, q: 1 }],
  shippingAddress: { fn: "a", ln: "b", a1: '<a href="evil">pay</a>', a2: "", city: "c", state: "s", postal: "1", country: "US" },
});
assert(!html.includes("<a href=\"evil\">") && !html.includes("<b>x</b>"), "email must escape customer text");
console.log("✓ API checks OK");

// Server-side view of the catalog. There is no second copy of prices to maintain:
// everything here is derived from data.js (the file the store owner edits), so the
// backend still recomputes totals itself and never trusts a price the browser sends.
const data = require("../../data.js");
let optimized = {};
try { optimized = require("../../assets/opt/manifest.js"); } catch (e) {}
// Emails show small thumbnails — use the 480px copy when one exists.
const emailImage = (p) => (optimized[p] ? `assets/opt/${optimized[p].stem}-${optimized[p].widths[0]}.webp` : p);

const PRICES = {};
const NAMES = {};
const COLOR_NAMES = {};
const IMAGES = {};
const SIZES = {}; // productId -> { sizeId: soldOut }
for (const p of data.products) {
  PRICES[p.id] = p.price;
  NAMES[p.id] = p.name;
  COLOR_NAMES[p.id] = {};
  IMAGES[p.id] = {};
  SIZES[p.id] = Object.fromEntries(p.sizes.map(z => [z.id, !!z.soldOut]));
  for (const c of p.colors) {
    COLOR_NAMES[p.id][c.id] = c.name;
    IMAGES[p.id][c.id] = emailImage(c.front);
  }
}

function priceCart(items) {
  // Max 15 lines keeps the cart summary under Stripe's 500-character metadata limit.
  if (!Array.isArray(items) || items.length === 0 || items.length > 15) {
    throw new Error("Cart is empty or too large");
  }
  let subtotal = 0;
  for (const it of items) {
    const known = Object.hasOwn(PRICES, it.productId);
    const price = known ? PRICES[it.productId] : 0;
    const qty = Number(it.qty);
    const soldOut = known ? SIZES[it.productId][it.sizeId] : undefined; // undefined = unknown size
    if (!known || !Object.hasOwn(COLOR_NAMES[it.productId], it.colorId) || soldOut !== false || !Number.isInteger(qty) || qty <= 0 || qty > 20) {
      throw new Error(`Invalid cart line for product "${it.productId}"`);
    }
    subtotal += price * qty;
  }
  return data.computeTotals(subtotal);
}

module.exports = { PRICES, NAMES, COLOR_NAMES, IMAGES, priceCart };

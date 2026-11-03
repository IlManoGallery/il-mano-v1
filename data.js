/* ════════════════════════════════════════════════════════════════════
   IL MANO — THE ONE FILE TO EDIT for products, prices, shipping & tax.
   See CLIENT-GUIDE.md for step-by-step instructions.

   This file is read by BOTH the website (browser) and the checkout server
   (api/_lib/products.js), so a price changed here is changed everywhere —
   storefront, cart, Stripe charge and confirmation email. After editing, run
   `npm run check` to catch typos before you push.
   ════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════
   IL MANO — catalog logic shared by the storefront and the checkout server.

   The CONTENT (products, prices, shipping/tax, categories, home-page text) is no
   longer edited here: it lives in /content/*.json and is edited through the
   CMS at /admin (see CLIENT-GUIDE.md). `npm run build:content` bundles those
   files into content.generated.js, which this file turns into the shapes the
   site uses. This file is read by BOTH the website (browser) and the checkout
   server (api/_lib/products.js), so a price changed in the CMS is changed
   everywhere — storefront, cart, Stripe charge and confirmation email.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const C = (typeof module !== "undefined" && module.exports)
    ? require("./content.generated.js")
    : window.IL_MANO_CONTENT;

  const settings = C.store;

  // Cart maths shared by the cart drawer, checkout and the server (dollars in, dollars out).
  const computeTotals = (subtotal) => {
    const shipping = subtotal > settings.freeShippingOver || subtotal === 0 ? 0 : settings.flatShipping;
    const tax = Math.round(subtotal * settings.taxRate);
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  };

  // Empty CMS fields come through as "" — turn them back into "not set".
  const blank = (v) => (v === "" || v === undefined ? null : v);

  const categoryDefs = C.home.categories;
  const categoryName = (key) => (categoryDefs.find(c => c.key === key) || {}).name || key;

  // ── Products ───────────────────────────────────────────────────────
  const products = [...C.products]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(p => ({
      ...p,
      category: categoryName(p.categoryKey),
      badge: blank(p.badge),
      colors: p.colors.map(c => ({ ...c, cutout: blank(c.cutout) || undefined })),
    }));

  // Home-page grid: every colour ticked "Show on home page", in product order,
  // then any hand-made special cards (e.g. a bundle).
  const gridCards = [
    ...products.flatMap(p =>
      p.colors.filter(c => c.showOnHome).map(c => ({ productId: p.id, colorId: c.id, badge: blank(c.homeBadge) }))),
    ...(C.home.extraCards || []).map(g => ({ ...g, badge: blank(g.badge) })),
  ];

  const categories = categoryDefs.map(c => {
    if (c.count) return c;
    const n = products.filter(p => p.categoryKey === c.key).length;
    return { ...c, count: n === 0 ? "Coming soon" : `${n} ${n === 1 ? "piece" : "pieces"}` };
  });

  const marqueeItems = C.home.marqueeItems;
  const storyPillars = C.home.storyPillars;

  // Responsive photos: returns {src, srcSet, sizes} for an <img> so phones fetch the small file.
  // Needs the resized copies made by `npm run images`; without them it falls back to the original.
  const IMAGES = (typeof window !== "undefined" ? window.IL_MANO_IMAGES : null) || {};
  const variant = (path, w) => {
    const m = IMAGES[String(path).replace(/^\//, "")];
    if (!m) return path;
    const pick = m.widths.find(x => x >= w) || m.widths[m.widths.length - 1];
    return `assets/opt/${m.stem}-${pick}.webp`;
  };
  const imgAttrs = (path, sizes) => {
    const m = IMAGES[String(path).replace(/^\//, "")];
    if (!m) return { src: path };
    return {
      src: variant(path, 900),
      srcSet: m.widths.map(w => `assets/opt/${m.stem}-${w}.webp ${w}w`).join(", "),
      sizes: sizes || "100vw",
      decoding: "async",
    };
  };

  const DATA = {
    settings, computeTotals, imgAttrs, imgSrc: variant,
    products, gridCards, categories, marqueeItems, storyPillars,
    findProduct: (id) => products.find(p => p.id === id),
  };

  // Browser: window.IL_MANO_DATA.  Node (checkout server / check script): module.exports.
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else window.IL_MANO_DATA = DATA;
})();

const { getStripe } = require("./_lib/clients");
const { sendOrderConfirmation } = require("./_lib/email");

// Stripe needs the raw, unparsed request body to verify the webhook signature.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function orderFromIntent(pi, { stripe, siteUrl }) {
  let card = null;
  if (pi.payment_method) {
    try {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      if (pm.card) card = { brand: pm.card.brand, last4: pm.card.last4 };
    } catch (e) {
      console.error("[stripe-webhook] could not retrieve payment method", e.message);
    }
  }

  let shippingAddress = null;
  try {
    shippingAddress = pi.metadata?.shipAddr ? JSON.parse(pi.metadata.shipAddr) : null;
  } catch (e) { /* leave null if malformed */ }

  return {
    id: pi.id,
    status: "authorized",
    amount: pi.amount,
    currency: pi.currency,
    email: pi.receipt_email,
    firstName: pi.metadata?.firstName || "",
    cart: (pi.metadata?.cart || "").split(";").filter(Boolean).map(l => {
      const [id, c, s, q] = l.split(":");
      return { id, c, s, q: Number(q) };
    }),
    subtotal: Number(pi.metadata?.subtotal || 0),
    shipping: Number(pi.metadata?.shipping || 0),
    tax: Number(pi.metadata?.tax || 0),
    shippingAddress,
    card,
    siteUrl,
    createdAt: new Date().toISOString(),
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed", e.message);
    res.status(400).send(`Webhook Error: ${e.message}`);
    return;
  }

  // Order state lives in Stripe (Dashboard → Payments); no database needed.
  if (event.type === "payment_intent.amount_capturable_updated") {
    try {
      // Stripe delivers events at least once. Re-read the payment (the event may be a stale
      // snapshot) and skip if we already emailed; any failure → 500 → Stripe retries.
      const pi = await stripe.paymentIntents.retrieve(event.data.object.id);
      if (!pi.metadata?.emailed) {
        await sendOrderConfirmation(await orderFromIntent(pi, { stripe, siteUrl: `https://${req.headers.host}` }));
        await stripe.paymentIntents.update(pi.id, { metadata: { emailed: "1" } });
      }
    } catch (e) {
      console.error("[stripe-webhook] handler error", e);
      res.status(500).json({ error: "order processing failed" });
      return;
    }
  }
  res.status(200).json({ received: true });
};

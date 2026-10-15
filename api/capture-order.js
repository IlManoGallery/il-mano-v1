const { getStripe } = require("./_lib/clients");

// Minimal manual-capture endpoint — call later once an order's been reviewed, to
// actually charge the card that was authorized at checkout. Not a real admin panel:
// protected by a single shared secret, meant to be called with curl/Postman.
//
//   curl -X POST https://<site>/api/capture-order \
//     -H "x-admin-secret: $CAPTURE_ADMIN_SECRET" \
//     -H "content-type: application/json" \
//     -d '{"paymentIntentId":"pi_..."}'
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = process.env.CAPTURE_ADMIN_SECRET;
  if (!secret || req.headers["x-admin-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { paymentIntentId } = req.body || {};
  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    res.status(400).json({ error: "paymentIntentId is required" });
    return;
  }

  try {
    const stripe = getStripe();
    const captured = await stripe.paymentIntents.capture(paymentIntentId);

    res.status(200).json({ status: captured.status, amountCaptured: captured.amount_received });
  } catch (e) {
    console.error("[capture-order] error", e);
    res.status(400).json({ error: e.message || "Capture failed" });
  }
};

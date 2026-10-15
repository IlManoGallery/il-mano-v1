const { getResend } = require("./clients");
const { NAMES, COLOR_NAMES, IMAGES, PRICES } = require("./products");

const INK = "#0a0a0a";
const MID = "#8c8780";
const BG = "#f5f4f0";
const LINE = "#ddd8cc";
// Contact address shown in the order email. Set CONTACT_EMAIL in Vercel to change it.
const CONTACT = process.env.CONTACT_EMAIL || "connorvahedi18@gmail.com";
const TOBACCO = "#6b4a2b";

// Customer-typed text goes into HTML — escape it.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (cents) => "$" + (cents / 100).toFixed(2);
const asset = (siteUrl, path) => `${siteUrl}/${path}`;

function stepperHtml() {
  const steps = [
    { n: "01", label: "Received", sub: "Today" },
    { n: "02", label: "In the workshop", sub: "Hand inspection" },
    { n: "03", label: "Shipped", sub: "Charge + tracking" },
  ];
  const cells = steps.map((s, i) => `
    <td width="33%" style="font-family:Helvetica,Arial,sans-serif;text-align:${i === 0 ? "left" : i === 2 ? "right" : "center"};">
      <div style="font-size:10px;letter-spacing:0.1em;color:${i === 0 ? INK : MID};text-transform:uppercase;">${s.n} — ${s.label}</div>
      <div style="font-size:10px;color:${MID};margin-top:2px;">${s.sub}</div>
    </td>`).join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 10px;">
      <tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>${cells}</tr>
    </table>`;
}

function orderConfirmationHtml(order) {
  const siteUrl = order.siteUrl || "https://ilmano.com";

  const rows = order.cart.map(it => {
    const name = esc(NAMES[it.id] || it.id);
    const price = PRICES[it.id] || 0;
    const colorName = esc(COLOR_NAMES[it.id]?.[it.c] || "");
    const imgPath = IMAGES[it.id]?.[it.c] || Object.values(IMAGES[it.id] || {})[0];
    const imgUrl = imgPath ? asset(siteUrl, imgPath) : "";
    const metaBits = [colorName, it.s ? esc(it.s).toUpperCase() : null, `Qty ${it.q}`].filter(Boolean).join(" · ");
    return `
      <tr>
        <td width="72" style="padding:16px 16px 16px 0;border-bottom:1px solid ${LINE};vertical-align:top;">
          ${imgUrl ? `<img src="${imgUrl}" width="72" height="72" alt="${name}" style="display:block;width:72px;height:72px;object-fit:cover;border:1px solid ${LINE};background:#eee;" />` : ""}
        </td>
        <td style="padding:16px 0;border-bottom:1px solid ${LINE};vertical-align:top;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${INK};">${name}</div>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.02em;color:${MID};margin-top:4px;">${metaBits}</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12px;color:${MID};margin-top:8px;">Cut and sewn in Los Angeles.</div>
        </td>
        <td style="padding:16px 0;border-bottom:1px solid ${LINE};vertical-align:top;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${INK};white-space:nowrap;">
          ${fmt(price * it.q * 100)}
        </td>
      </tr>`;
  }).join("");

  const totalRow = (label, cents, strong) => `
    <tr>
      <td style="padding:${strong ? "12px 0 0" : "3px 0"};font-family:Helvetica,Arial,sans-serif;font-size:${strong ? "14px" : "13px"};color:${strong ? INK : MID};${strong ? `font-weight:bold;border-top:1px solid ${LINE};` : ""}">${label}</td>
      <td style="padding:${strong ? "12px 0 0" : "3px 0"};font-family:Helvetica,Arial,sans-serif;font-size:${strong ? "15px" : "13px"};color:${strong ? INK : MID};text-align:right;${strong ? `font-weight:bold;border-top:1px solid ${LINE};` : ""}">${cents === 0 ? "Free" : fmt(cents)}</td>
    </tr>`;

  const s = order.shippingAddress;
  const shipToBlock = s ? `
    ${s.fn || s.ln ? `${esc(s.fn)} ${esc(s.ln)}<br/>` : ""}
    ${esc(s.a1)}${s.a2 ? ", " + esc(s.a2) : ""}<br/>
    ${esc(s.city)}${s.state ? ", " + esc(s.state) : ""} ${esc(s.postal)}<br/>
    ${esc(s.country)}` : "On file with your order.";

  const paymentBlock = order.card
    ? `${order.card.brand.charAt(0).toUpperCase() + order.card.brand.slice(1)} ending ${order.card.last4}<br/>Authorized ${new Date(order.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
    : "Authorized via Stripe.";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your IL MANO order</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;">Your card is authorized — ${fmt(order.amount)} — order ${order.id}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="padding:28px 24px 20px;text-align:center;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.2em;color:${INK};">IL&nbsp;MANO</span>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;color:${MID};text-transform:uppercase;margin-top:6px;">Los Angeles · 34.05° N</div>
            </td>
          </tr>

          <tr>
            <td>
              <img src="${asset(siteUrl, "assets/hero-palms.jpg")}" width="600" alt="IL MANO — Los Angeles" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
            </td>
          </tr>

          <tr>
            <td style="padding:32px 24px 0;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${TOBACCO};">Order received</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:28px;line-height:1.3;color:${INK};padding-top:8px;">
                Thank you${order.firstName ? ", " + esc(order.firstName) : ""}.
              </div>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${INK};padding-top:16px;">
                Your piece is now on the bench in our Los Angeles workshop, where every garment is inspected by hand before it leaves. Your card has been authorized, not charged — we only complete the charge once your order ships, and you'll receive tracking the moment it's on its way.
              </div>
              ${stepperHtml()}
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 0;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${MID};border-top:1px solid ${LINE};padding-top:20px;">— Your selection</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                ${rows}
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${totalRow("Subtotal", order.subtotal * 100 || 0)}
                ${totalRow("Shipping", order.shipping * 100 || 0)}
                ${totalRow("Tax", order.tax * 100 || 0)}
                ${totalRow("Total authorized", order.amount, true)}
              </table>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${MID};padding-top:6px;">Charged only when your order ships.</div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};padding-top:20px;">
                <tr>
                  <td width="50%" style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${MID};vertical-align:top;">
                    Shipping to
                    <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:normal;text-transform:none;color:${INK};line-height:1.6;margin-top:6px;">${shipToBlock}</div>
                  </td>
                  <td width="50%" style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${MID};vertical-align:top;">
                    Payment
                    <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:normal;text-transform:none;color:${INK};line-height:1.6;margin-top:6px;">${paymentBlock}</div>
                  </td>
                </tr>
              </table>
              <div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${MID};padding-top:16px;">REF ${order.id}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};">
                <tr>
                  <td style="padding:40px 32px;text-align:center;">
                    <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a8a29a;">— Summer 2026 · Volume 01</div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px;line-height:1.5;color:#f5f4f0;padding-top:14px;">
                      "Dust on the leather. Sun on the cotton.<br/>A wardrobe that ages with the road."
                    </div>
                    <div style="padding-top:22px;">
                      <a href="${siteUrl}/#collection" style="display:inline-block;border:1px solid #f5f4f0;color:#f5f4f0;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:12px 24px;">Continue the collection →</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 24px 8px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${INK};">Questions about your order?</div>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MID};line-height:1.7;padding-top:6px;">
                Simply reply to this email, or write <a href="mailto:${esc(CONTACT)}" style="color:${INK};">${esc(CONTACT)}</a>.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 24px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${MID};">
              <a href="${siteUrl}/#collection" style="color:${MID};text-decoration:none;">Clothing</a>
              &nbsp;·&nbsp;
              <a href="${siteUrl}/#story" style="color:${MID};text-decoration:none;">Our Story</a>
              &nbsp;·&nbsp;
              <a href="${siteUrl}/faq" style="color:${MID};text-decoration:none;">FAQ</a>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 0;text-align:center;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:0.16em;color:${INK};">IL&nbsp;MANO</span>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 24px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${MID};line-height:1.7;">
              Manufactured in Los Angeles, CA.<br/>
              <a href="${siteUrl}/privacy" style="color:${MID};">Privacy</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendOrderConfirmation(order) {
  const resend = getResend();
  // ORDER_NOTIFY_EMAIL routes every confirmation to one inbox (e.g. the store owner)
  // instead of the customer — needed while sending from onboarding@resend.dev, which
  // only delivers to the Resend account's own address.
  const to = process.env.ORDER_NOTIFY_EMAIL || order.email;
  if (!resend || !to) return;
  const { error } = await resend.emails.send({
    from: process.env.ORDER_EMAIL_FROM || "IL MANO <onboarding@resend.dev>",
    to,
    replyTo: order.email || undefined,
    subject: process.env.ORDER_NOTIFY_EMAIL
      ? `New order from ${order.email || "unknown"} — IL MANO`
      : "We've got your order — IL MANO",
    html: orderConfirmationHtml(order),
  }).catch((e) => ({ error: e }));
  // Never let an email failure break order processing — just log it.
  if (error) console.error("[email] order confirmation failed", error);
}

module.exports = { sendOrderConfirmation, orderConfirmationHtml };
